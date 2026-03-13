import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const inputPath = process.argv[2];
const shouldApply = process.argv.includes("--apply");

if (!inputPath) {
  console.error("Usage: node scripts/import-seed-recipes.mjs <file.jsonl> [--apply]");
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, "utf8");
const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

const allowedDifficulties = new Set(["Beginner", "Intermediate", "Advanced"]);
const seenSourceUrls = new Set();
const seenNameKeys = new Set();
const validRecipes = [];
const rejected = [];

for (const [index, line] of lines.entries()) {
  let recipe;
  try {
    recipe = JSON.parse(line);
  } catch {
    rejected.push({ line: index + 1, reason: "Invalid JSON" });
    continue;
  }

  const name = String(recipe.name || "").trim();
  const sourceUrl = String(recipe.source_url || "").trim();
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients.map(String).map((v) => v.trim()).filter(Boolean) : [];
  const instructions = Array.isArray(recipe.instructions) ? recipe.instructions.map(String).map((v) => v.trim()).filter(Boolean) : [];
  const difficulty = String(recipe.difficulty || "").trim();
  const tags = Array.isArray(recipe.tags) ? recipe.tags.map(String).map((v) => v.trim().toLowerCase()).filter(Boolean) : [];
  const servings = Number.parseInt(String(recipe.servings || 0), 10);
  const nameKey = name.toLowerCase();

  if (!name || ingredients.length < 3 || instructions.length < 2) {
    rejected.push({ line: index + 1, reason: "Missing required recipe data" });
    continue;
  }

  if (!allowedDifficulties.has(difficulty)) {
    rejected.push({ line: index + 1, reason: `Invalid difficulty: ${difficulty}` });
    continue;
  }

  if ((sourceUrl && seenSourceUrls.has(sourceUrl)) || seenNameKeys.has(nameKey)) {
    rejected.push({ line: index + 1, reason: "Duplicate recipe" });
    continue;
  }

  if (sourceUrl) {
    seenSourceUrls.add(sourceUrl);
  }
  seenNameKeys.add(nameKey);

  validRecipes.push({
    id: randomUUID(),
    name,
    image: String(recipe.image || "").trim(),
    cook_time: String(recipe.cook_time || "30 min").trim() || "30 min",
    difficulty,
    ingredients,
    tags,
    instructions,
    source: "community-seed",
    source_url: sourceUrl || null,
    chef: String(recipe.chef || "").trim() || null,
    cuisine: String(recipe.cuisine || "").trim() || null,
    servings: Number.isFinite(servings) && servings > 0 ? servings : 4,
    is_public: true,
    created_by: null,
  });
}

console.log(`Read ${lines.length} line(s)`);
console.log(`Valid recipes: ${validRecipes.length}`);
console.log(`Rejected: ${rejected.length}`);

if (rejected.length > 0) {
  console.log("Rejected rows:");
  for (const item of rejected) {
    console.log(`- line ${item.line}: ${item.reason}`);
  }
}

if (!shouldApply) {
  console.log("Dry run only. Re-run with --apply to insert into Supabase.");
  process.exit(0);
}

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

for (let i = 0; i < validRecipes.length; i += 50) {
  const batch = validRecipes.slice(i, i + 50);
  const { error } = await supabase.from("recipes").insert(batch);
  if (error) {
    console.error(`Batch starting at ${i + 1} failed: ${error.message}`);
    process.exit(1);
  }
  console.log(`Inserted ${Math.min(i + 50, validRecipes.length)} / ${validRecipes.length}`);
}

console.log("Import complete.");
