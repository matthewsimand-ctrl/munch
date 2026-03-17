#!/usr/bin/env python3
"""
Incrementally sync structured recipes from the Wikibooks Cookbook.

This script is intended for scheduled/batch operation. It discovers all
Cookbook namespace pages via the MediaWiki API, tracks latest revision ids,
re-parses only changed pages, and maintains:

- a durable snapshot JSONL of the latest known recipes
- a per-run delta JSONL with upserts/deletes
- an optional SQL file for upsertable recipe rows

Usage:
    python3 scripts/sync_wikibooks_cookbook.py \
      --state data/wikibooks_sync_state.json \
      --snapshot data/wikibooks_snapshot.jsonl \
      --delta-output data/wikibooks_runs/2026-03-16.jsonl \
      --sql-output data/wikibooks_runs/2026-03-16.sql \
      --source community-seed \
      --chef munch \
      --created-by e280c6c4-4c73-4085-9851-634f69bc7e68 \
      --chef-profile-url /chef/e280c6c4-4c73-4085-9851-634f69bc7e68
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from typing import Dict, Iterable, Iterator, List, Optional, Tuple

from import_wikibooks_cookbook import (
    build_session,
    build_source_url,
    ensure_parent_dir,
    fetch_recipe_page,
    get_cookbook_namespace_id,
    parse_recipe,
)
from jsonl_to_recipes_sql import build_insert_sql


API_URL = "https://en.wikibooks.org/w/api.php"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_json(path: str, default):
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def save_json_atomic(path: str, payload) -> None:
    ensure_parent_dir(path)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=os.path.dirname(os.path.abspath(path)) or ".", delete=False) as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
        temp_path = handle.name
    os.replace(temp_path, path)


def load_snapshot(path: str) -> Dict[str, Dict]:
    snapshot: Dict[str, Dict] = {}
    if not os.path.exists(path):
        return snapshot

    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                recipe = json.loads(line)
            except json.JSONDecodeError:
                continue

            source_url = str(recipe.get("source_url") or "").strip()
            if source_url:
                snapshot[source_url] = recipe

    return snapshot


def save_jsonl_atomic(path: str, rows: Iterable[Dict]) -> None:
    ensure_parent_dir(path)
    abs_dir = os.path.dirname(os.path.abspath(path)) or "."
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=abs_dir, delete=False) as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
        temp_path = handle.name
    os.replace(temp_path, path)


def api_get(session, params: Dict, delay: float) -> Dict:
    import time

    time.sleep(delay)
    response = session.get(API_URL, params=params, timeout=60)
    response.raise_for_status()
    payload = response.json()
    if "error" in payload:
        raise RuntimeError(f"MediaWiki API error: {payload['error']}")
    return payload


def fetch_page_index(session, delay: float) -> Iterator[Dict]:
    namespace_id = get_cookbook_namespace_id(session, delay)
    logging.info("Resolved Cookbook namespace id: %s", namespace_id)

    gapcontinue: Optional[str] = None
    discovered = 0

    while True:
        params = {
            "action": "query",
            "generator": "allpages",
            "gapnamespace": namespace_id,
            "gaplimit": "max",
            "gapfilterredir": "nonredirects",
            "prop": "revisions|info",
            "rvprop": "ids|timestamp",
            "rvlimit": 1,
            "inprop": "url",
            "format": "json",
            "formatversion": "2",
        }
        if gapcontinue:
            params["gapcontinue"] = gapcontinue

        payload = api_get(session, params, delay)
        pages = payload.get("query", {}).get("pages", []) or []
        pages.sort(key=lambda page: str(page.get("title") or ""))

        for page in pages:
            title = str(page.get("title") or "").strip()
            if not title:
                continue

            revision = (page.get("revisions") or [{}])[0] or {}
            discovered += 1
            yield {
                "title": title,
                "source_url": build_source_url(title),
                "revid": revision.get("revid"),
                "parentid": revision.get("parentid"),
                "revision_timestamp": revision.get("timestamp"),
            }

        logging.info("Indexed %s pages so far", discovered)
        gapcontinue = payload.get("continue", {}).get("gapcontinue")
        if not gapcontinue:
            break


def build_delta_upsert(recipe: Dict, title: str, revid: Optional[int], revision_timestamp: Optional[str], synced_at: str) -> Dict:
    return {
        "action": "upsert",
        "title": title,
        "source_url": recipe.get("source_url"),
        "revid": revid,
        "revision_timestamp": revision_timestamp,
        "synced_at": synced_at,
        "recipe": recipe,
    }


def build_delta_delete(source_url: str, title: str, revid: Optional[int], revision_timestamp: Optional[str], synced_at: str, reason: str) -> Dict:
    return {
        "action": "delete",
        "title": title,
        "source_url": source_url,
        "revid": revid,
        "revision_timestamp": revision_timestamp,
        "synced_at": synced_at,
        "reason": reason,
    }


def save_sql(path: str, statements: List[str], source_jsonl: str) -> None:
    ensure_parent_dir(path)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("-- Generated by scripts/sync_wikibooks_cookbook.py\n")
        handle.write(f"-- Source delta JSONL: {source_jsonl}\n\n")
        handle.write("begin;\n\n")
        for statement in statements:
            handle.write(statement)
            handle.write("\n\n")
        handle.write("commit;\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Incrementally sync Wikibooks Cookbook recipes.")
    parser.add_argument("--state", default="data/wikibooks_sync_state.json")
    parser.add_argument("--snapshot", default="data/wikibooks_cookbook_snapshot.jsonl")
    parser.add_argument("--delta-output", default=None, help="Write this run's upserts/deletes as JSONL.")
    parser.add_argument("--sql-output", default=None, help="Optional SQL file generated from upsert deltas.")
    parser.add_argument("--delay", type=float, default=0.15, help="Delay between API calls in seconds.")
    parser.add_argument("--max-pages", type=int, default=None, help="Optional page cap for testing.")
    parser.add_argument("--source", default="community-seed", help="recipes.source for generated SQL upserts.")
    parser.add_argument("--chef", default="munch", help="recipes.chef for generated SQL upserts.")
    parser.add_argument("--created-by", default=None, help="Optional recipes.created_by UUID for generated SQL.")
    parser.add_argument("--chef-profile-url", default=None, help="Optional chef profile URL for generated SQL payloads.")
    parser.add_argument("--public", dest="is_public", action="store_true", default=True)
    parser.add_argument("--private", dest="is_public", action="store_false")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    args = parser.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s %(levelname)s %(message)s",
    )
    logging.info("Starting Wikibooks sync.")
    logging.info("State file: %s", args.state)
    logging.info("Snapshot file: %s", args.snapshot)
    if args.delta_output:
        logging.info("Delta output: %s", args.delta_output)
    if args.sql_output:
        logging.info("SQL output: %s", args.sql_output)

    state = load_json(args.state, {})
    snapshot = load_snapshot(args.snapshot)
    pages_state: Dict[str, Dict] = state.get("pages", {}) if isinstance(state.get("pages"), dict) else {}
    previous_urls = set(pages_state.keys())
    seen_urls: set[str] = set()
    delta_rows: List[Dict] = []
    sql_statements: List[str] = []
    synced_at = utc_now_iso()

    indexed = 0
    changed = 0
    unchanged = 0
    deleted = 0
    skipped = 0
    failed = 0

    session = build_session()

    try:
        for page in fetch_page_index(session, args.delay):
            indexed += 1
            title = page["title"]
            source_url = page["source_url"]
            revid = page.get("revid")
            revision_timestamp = page.get("revision_timestamp")
            seen_urls.add(source_url)

            previous = pages_state.get(source_url, {})
            if previous.get("revid") == revid and source_url in snapshot:
                unchanged += 1
            else:
                logging.info("Syncing %s", title)
                try:
                    parse_data = fetch_recipe_page(session, title, args.delay)
                    recipe = parse_recipe(parse_data) if parse_data else None
                except Exception:
                    failed += 1
                    logging.exception("Failed to sync %s", title)
                    recipe = None

                if recipe:
                    changed += 1
                    snapshot[source_url] = recipe
                    delta_rows.append(build_delta_upsert(recipe, title, revid, revision_timestamp, synced_at))
                    statement = build_insert_sql(
                        recipe=recipe,
                        source=args.source,
                        chef=args.chef,
                        created_by=args.created_by,
                        is_public=args.is_public,
                        chef_profile_url=args.chef_profile_url,
                    )
                    if statement:
                        sql_statements.append(statement)
                    pages_state[source_url] = {
                        "title": title,
                        "revid": revid,
                        "revision_timestamp": revision_timestamp,
                        "last_status": "recipe",
                        "last_synced_at": synced_at,
                    }
                else:
                    if source_url in snapshot:
                        deleted += 1
                        del snapshot[source_url]
                        delta_rows.append(
                            build_delta_delete(
                                source_url=source_url,
                                title=title,
                                revid=revid,
                                revision_timestamp=revision_timestamp,
                                synced_at=synced_at,
                                reason="page-no-longer-parseable-as-recipe",
                            )
                        )
                    else:
                        skipped += 1

                    pages_state[source_url] = {
                        "title": title,
                        "revid": revid,
                        "revision_timestamp": revision_timestamp,
                        "last_status": "non_recipe",
                        "last_synced_at": synced_at,
                    }

            if indexed % 50 == 0:
                logging.info(
                    "Progress: indexed=%s changed=%s unchanged=%s deleted=%s skipped=%s failed=%s",
                    indexed,
                    changed,
                    unchanged,
                    deleted,
                    skipped,
                    failed,
                )

            if args.max_pages and indexed >= args.max_pages:
                logging.warning("Reached --max-pages=%s, stopping early", args.max_pages)
                break

        if not args.max_pages:
            removed_urls = previous_urls - seen_urls
            for source_url in sorted(removed_urls):
                previous = pages_state.pop(source_url, {})
                if source_url in snapshot:
                    deleted += 1
                    del snapshot[source_url]
                    delta_rows.append(
                        build_delta_delete(
                            source_url=source_url,
                            title=str(previous.get("title") or source_url.rsplit("/", 1)[-1]),
                            revid=previous.get("revid"),
                            revision_timestamp=previous.get("revision_timestamp"),
                            synced_at=synced_at,
                            reason="page-removed-from-cookbook-namespace",
                        )
                    )

        ordered_snapshot = [snapshot[key] for key in sorted(snapshot, key=lambda value: snapshot[value].get("title", ""))]
        save_jsonl_atomic(args.snapshot, ordered_snapshot)

        if args.delta_output:
            save_jsonl_atomic(args.delta_output, delta_rows)

        if args.sql_output:
            save_sql(args.sql_output, sql_statements, args.delta_output or args.snapshot)

        state = {
            "dataset": "wikibooks_cookbook",
            "last_sync_at": synced_at,
            "stats": {
                "indexed": indexed,
                "changed": changed,
                "unchanged": unchanged,
                "deleted": deleted,
                "skipped": skipped,
                "failed": failed,
                "snapshot_recipes": len(snapshot),
            },
            "pages": pages_state,
        }
        save_json_atomic(args.state, state)

        logging.info(
            "Done. indexed=%s changed=%s unchanged=%s deleted=%s skipped=%s failed=%s snapshot=%s",
            indexed,
            changed,
            unchanged,
            deleted,
            skipped,
            failed,
            len(snapshot),
        )
        return 0
    except KeyboardInterrupt:
        logging.warning("Interrupted; saving current state and snapshot.")
        ordered_snapshot = [snapshot[key] for key in sorted(snapshot, key=lambda value: snapshot[value].get("title", ""))]
        save_jsonl_atomic(args.snapshot, ordered_snapshot)
        state = {
            "dataset": "wikibooks_cookbook",
            "last_sync_at": state.get("last_sync_at"),
            "interrupted_at": utc_now_iso(),
            "stats": {
                "indexed": indexed,
                "changed": changed,
                "unchanged": unchanged,
                "deleted": deleted,
                "skipped": skipped,
                "failed": failed,
                "snapshot_recipes": len(snapshot),
            },
            "pages": pages_state,
        }
        save_json_atomic(args.state, state)
        if args.delta_output:
            save_jsonl_atomic(args.delta_output, delta_rows)
        if args.sql_output:
            save_sql(args.sql_output, sql_statements, args.delta_output or args.snapshot)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
