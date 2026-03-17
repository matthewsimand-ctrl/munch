#!/usr/bin/env python3
"""
Import structured recipes from the Wikibooks Cookbook into JSONL.

Features:
- Discovers all pages in the "Cookbook:" namespace via MediaWiki API
- Fetches rendered HTML for each page via MediaWiki API
- Extracts structured recipe fields
- Incrementally writes JSONL for resume safety
- Handles pagination, retries, rate limiting, logging, and resume

Dependencies:
    pip install requests beautifulsoup4

Usage:
    python scripts/import_wikibooks_cookbook.py \
        --output data/wikibooks_cookbook_recipes.jsonl \
        --state data/wikibooks_cookbook_state.json \
        --delay 0.25 \
        --log-level INFO
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from typing import Dict, Iterable, Iterator, List, Optional, Set, Tuple

import requests
from bs4 import BeautifulSoup, Tag
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


API_URL = "https://en.wikibooks.org/w/api.php"
BASE_PAGE_URL = "https://en.wikibooks.org/wiki/{}"
USER_AGENT = "MunchWikibooksCookbookImporter/1.0 (recipe dataset import)"

HEADINGS_INGREDIENTS = {
    "ingredient",
    "ingredients",
}
HEADINGS_INSTRUCTIONS = {
    "directions",
    "instruction",
    "instructions",
    "method",
    "preparation",
    "preparation method",
    "procedure",
    "steps",
}
HEADINGS_INSTRUCTIONS_PREFIXES = (
    "directions",
    "instruction",
    "instructions",
    "method",
    "preparation",
    "procedure",
    "steps",
)
HEADINGS_STOP = {
    "external links",
    "history",
    "notes",
    "nutrition",
    "references",
    "see also",
    "tips",
    "variations",
}
META_LABEL_MAP = {
    "cook time": "cook_time",
    "cooking time": "cook_time",
    "prep time": "prep_time",
    "preparation time": "prep_time",
    "ready in": "total_time",
    "serves": "servings",
    "servings": "servings",
    "total time": "total_time",
    "yield": "servings",
}


def build_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=5,
        connect=5,
        read=5,
        status=5,
        backoff_factor=1.0,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=20, pool_maxsize=20)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update({"User-Agent": USER_AGENT})
    return session


def clean_text(text: Optional[str]) -> str:
    if not text:
        return ""

    cleaned = text.replace("\xa0", " ")
    cleaned = re.sub(r"\[[^\]]*\]", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip(" \t\r\n:-")


def ensure_parent_dir(path: str) -> None:
    parent = os.path.dirname(os.path.abspath(path))
    if parent:
        os.makedirs(parent, exist_ok=True)


def save_recipe(recipe: Dict, output_path: str) -> None:
    ensure_parent_dir(output_path)
    with open(output_path, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(recipe, ensure_ascii=False) + "\n")


def load_processed_urls(output_path: str) -> Set[str]:
    processed: Set[str] = set()
    if not os.path.exists(output_path):
        return processed

    with open(output_path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError:
                continue

            source_url = payload.get("source_url")
            if isinstance(source_url, str) and source_url:
                processed.add(source_url)

    return processed


def load_state(state_path: str) -> Dict:
    if not os.path.exists(state_path):
        return {}
    with open(state_path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def save_state(state_path: str, state: Dict) -> None:
    ensure_parent_dir(state_path)
    tmp_path = f"{state_path}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as handle:
        json.dump(state, handle, ensure_ascii=False, indent=2)
    os.replace(tmp_path, state_path)


def api_get(session: requests.Session, params: Dict, delay: float) -> Dict:
    time.sleep(delay)
    response = session.get(API_URL, params=params, timeout=60)
    response.raise_for_status()
    payload = response.json()
    if "error" in payload:
        raise RuntimeError(f"MediaWiki API error: {payload['error']}")
    return payload


def normalize_heading(text: str) -> str:
    normalized = clean_text(text).lower()
    return re.sub(r"\s+", " ", normalized)


def heading_matches(heading: str, exact_matches: Set[str], prefix_matches: Tuple[str, ...] = ()) -> bool:
    if heading in exact_matches:
        return True
    return any(heading.startswith(prefix) for prefix in prefix_matches)


def build_source_url(title: str) -> str:
    return BASE_PAGE_URL.format(title.replace(" ", "_"))


def get_cookbook_namespace_id(session: requests.Session, delay: float) -> int:
    payload = api_get(
        session,
        {
            "action": "query",
            "meta": "siteinfo",
            "siprop": "namespaces|namespacealiases",
            "format": "json",
        },
        delay,
    )

    namespaces = payload["query"]["namespaces"]
    for ns_id, ns_info in namespaces.items():
        name = ns_info.get("*") or ""
        canonical = ns_info.get("canonical") or ""
        if name == "Cookbook" or canonical == "Cookbook":
            return int(ns_id)

    for alias in payload["query"].get("namespacealiases", []):
        if alias.get("*") == "Cookbook":
            return int(alias["id"])

    raise RuntimeError("Could not find 'Cookbook' namespace id via siteinfo.")


def fetch_recipe_titles(
    session: requests.Session,
    delay: float,
    resume_continue: Optional[str] = None,
) -> Iterator[Tuple[str, Optional[str]]]:
    namespace_id = get_cookbook_namespace_id(session, delay)
    logging.info("Resolved Cookbook namespace id: %s", namespace_id)

    apcontinue = resume_continue
    discovered = 0

    while True:
        params = {
            "action": "query",
            "list": "allpages",
            "apnamespace": namespace_id,
            "aplimit": "max",
            "apfilterredir": "nonredirects",
            "format": "json",
        }
        if apcontinue:
            params["apcontinue"] = apcontinue

        payload = api_get(session, params, delay)
        pages = payload.get("query", {}).get("allpages", [])
        next_continue = payload.get("continue", {}).get("apcontinue")

        for page in pages:
            discovered += 1
            yield page["title"], next_continue

        logging.info("Discovered %s titles so far", discovered)

        if not next_continue:
            break
        apcontinue = next_continue


def fetch_recipe_page(session: requests.Session, title: str, delay: float) -> Optional[Dict]:
    params = {
        "action": "parse",
        "page": title,
        "prop": "text|categories",
        "format": "json",
        "formatversion": "2",
        "disablelimitreport": 1,
        "disableeditsection": 1,
        "disabletoc": 1,
    }

    try:
        payload = api_get(session, params, delay)
    except requests.HTTPError as error:
        logging.warning("HTTP failure for '%s': %s", title, error)
        return None
    except RuntimeError as error:
        logging.warning("API failure for '%s': %s", title, error)
        return None

    return payload.get("parse")


def extract_list_items(node: Tag) -> List[str]:
    items: List[str] = []
    for item in node.find_all("li", recursive=False):
        text = clean_text(item.get_text(" ", strip=True))
        if text:
            items.append(text)
    return items


def collect_section_nodes(heading_node: Tag) -> List[Tag]:
    nodes: List[Tag] = []
    anchor = heading_node.parent if heading_node.parent and isinstance(heading_node.parent, Tag) else heading_node
    for sibling in anchor.next_siblings:
        if isinstance(sibling, Tag) and (
            sibling.name in {"h1", "h2", "h3", "h4", "h5"}
            or sibling.select_one("h1, h2, h3, h4, h5")
        ):
            break
        if isinstance(sibling, Tag):
            nodes.append(sibling)
    return nodes


def split_instruction_paragraph(text: str) -> List[str]:
    normalized = clean_text(text)
    if not normalized:
        return []

    numbered = re.split(r"(?:(?:^|\s)(?:\d+[\).\s]+))", normalized)
    numbered = [clean_text(part) for part in numbered if clean_text(part)]
    if len(numbered) >= 2:
        return numbered

    sentence_parts = re.split(r"(?<=[.!?])\s+(?=[A-Z])", normalized)
    return [clean_text(part) for part in sentence_parts if clean_text(part)]


def extract_meta_from_text(text: str, meta: Dict[str, Optional[str]]) -> None:
    normalized = clean_text(text)
    if not normalized:
        return

    match = re.match(r"^\s*([A-Za-z ][A-Za-z ]{1,40})\s*:\s*(.+?)\s*$", normalized)
    if not match:
        return

    label = normalize_heading(match.group(1))
    value = clean_text(match.group(2))
    key = META_LABEL_MAP.get(label)
    if key and value and not meta.get(key):
        meta[key] = value


def extract_meta_from_table(table: Tag, meta: Dict[str, Optional[str]], tags: List[str]) -> None:
    for row in table.find_all("tr"):
        cells = row.find_all(["th", "td"], recursive=False)
        if len(cells) < 2:
            extract_meta_from_text(row.get_text(" ", strip=True), meta)
            continue

        label = normalize_heading(cells[0].get_text(" ", strip=True))
        value_text = clean_text(cells[1].get_text(" ", strip=True))
        if not label or not value_text:
            continue

        if label == "category":
            tags.append(value_text.lower())
            continue

        if label == "time":
            raw_value = cells[1].get_text("\n", strip=True)
            parts = [clean_text(part) for part in re.split(r"\n+", raw_value) if clean_text(part)]
            if parts:
                for part in parts:
                    extract_meta_from_text(part, meta)
            else:
                extract_meta_from_text(f"total time: {value_text}", meta)
            continue

        key = META_LABEL_MAP.get(label)
        if key and not meta.get(key):
            meta[key] = value_text


def parse_recipe(parse_data: Dict) -> Optional[Dict]:
    title = parse_data.get("title", "")
    html = parse_data.get("text", "")
    categories = parse_data.get("categories", []) or []

    if not title.startswith("Cookbook:") or not html:
        return None

    recipe_title = clean_text(title.split("Cookbook:", 1)[-1])
    source_url = build_source_url(title)

    soup = BeautifulSoup(html, "html.parser")
    root = soup.select_one(".mw-parser-output") or soup

    for artifact in root.select(
        ".hatnote, .metadata, .mw-editsection, .reference, .reflist, "
        ".toc, .thumb, .noprint, script, style, sup.reference, table.navbox"
    ):
        artifact.decompose()

    ingredients: List[str] = []
    instructions: List[str] = []
    tags: List[str] = []
    meta: Dict[str, Optional[str]] = {
        "servings": None,
        "prep_time": None,
        "cook_time": None,
        "total_time": None,
    }

    for node in root.find_all(["table", "p"], recursive=True):
        if node.name == "table":
            extract_meta_from_table(node, meta, tags)
        elif node.name == "p":
            extract_meta_from_text(node.get_text(" ", strip=True), meta)

    for heading_node in root.find_all(["h1", "h2", "h3", "h4", "h5"]):
        heading = normalize_heading(heading_node.get_text(" ", strip=True))
        if heading in HEADINGS_STOP:
            continue

        section_nodes = collect_section_nodes(heading_node)
        if heading_matches(heading, HEADINGS_INGREDIENTS):
            for node in section_nodes:
                if node.name in {"ul", "ol"}:
                    ingredients.extend(extract_list_items(node))
                elif node.name == "p":
                    text = clean_text(node.get_text(" ", strip=True))
                    if text:
                        parts = re.split(r"\s*[•·]\s*|\s{2,}|;\s*", text)
                        ingredients.extend(clean_text(part) for part in parts if clean_text(part))

        if heading_matches(heading, HEADINGS_INSTRUCTIONS, HEADINGS_INSTRUCTIONS_PREFIXES):
            for node in section_nodes:
                if node.name in {"ol", "ul"}:
                    instructions.extend(extract_list_items(node))
                elif node.name == "p":
                    instructions.extend(split_instruction_paragraph(node.get_text(" ", strip=True)))

    ingredients = list(dict.fromkeys(clean_text(item) for item in ingredients if clean_text(item)))
    instructions = list(dict.fromkeys(clean_text(item) for item in instructions if clean_text(item)))

    for category in categories:
        name = clean_text(category.get("category", ""))
        name = re.sub(r"^Cookbook\s*", "", name, flags=re.I)
        name = re.sub(r"^Recipes?\s*", "", name, flags=re.I)
        name = clean_text(name)
        if name:
            tags.append(name.lower())
    tags = list(dict.fromkeys(tags))

    if len(ingredients) < 2 or not instructions:
        return None

    return {
        "title": recipe_title,
        "ingredients": ingredients,
        "instructions": instructions,
        "servings": meta["servings"],
        "prep_time": meta["prep_time"],
        "cook_time": meta["cook_time"],
        "total_time": meta["total_time"],
        "tags": tags,
        "source_url": source_url,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Import Wikibooks Cookbook recipes to JSONL.")
    parser.add_argument("--output", default="data/wikibooks_cookbook_recipes.jsonl")
    parser.add_argument("--state", default="data/wikibooks_cookbook_state.json")
    parser.add_argument("--delay", type=float, default=0.25, help="Delay between API calls in seconds.")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    parser.add_argument("--max-pages", type=int, default=None, help="Optional page limit for testing.")
    args = parser.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s %(levelname)s %(message)s",
        stream=sys.stdout,
    )

    session = build_session()
    state = load_state(args.state)
    processed_urls = load_processed_urls(args.output)
    resume_continue = state.get("apcontinue")

    logging.info("Loaded %s already-saved recipes from output", len(processed_urls))

    discovered = int(state.get("stats", {}).get("discovered", 0))
    saved = int(state.get("stats", {}).get("saved", 0))
    skipped = int(state.get("stats", {}).get("skipped", 0))
    failed = int(state.get("stats", {}).get("failed", 0))

    try:
        for title, next_continue in fetch_recipe_titles(session, args.delay, resume_continue=resume_continue):
            discovered += 1
            source_url = build_source_url(title)

            if source_url in processed_urls:
                logging.debug("Skipping already-saved page: %s", title)
            else:
                logging.info("Processing %s", title)
                try:
                    page_data = fetch_recipe_page(session, title, args.delay)
                    if not page_data:
                        failed += 1
                    else:
                        recipe = parse_recipe(page_data)
                        if recipe:
                            save_recipe(recipe, args.output)
                            processed_urls.add(recipe["source_url"])
                            saved += 1
                            logging.info("Saved recipe: %s", recipe["title"])
                        else:
                            skipped += 1
                            logging.info("Skipped non-recipe or unparseable page: %s", title)
                except Exception:
                    failed += 1
                    logging.exception("Unexpected failure while processing %s", title)

            state["apcontinue"] = next_continue
            state["stats"] = {
                "discovered": discovered,
                "saved": saved,
                "skipped": skipped,
                "failed": failed,
            }
            save_state(args.state, state)

            if discovered % 25 == 0:
                logging.info(
                    "Progress: discovered=%s saved=%s skipped=%s failed=%s",
                    discovered,
                    saved,
                    skipped,
                    failed,
                )

            if args.max_pages and discovered >= args.max_pages:
                logging.warning("Reached --max-pages=%s, stopping early", args.max_pages)
                break

    except KeyboardInterrupt:
        logging.warning("Interrupted. Resume state saved to %s", args.state)
        save_state(args.state, state)
        return 130

    logging.info(
        "Done. discovered=%s saved=%s skipped=%s failed=%s output=%s",
        discovered,
        saved,
        skipped,
        failed,
        args.output,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
