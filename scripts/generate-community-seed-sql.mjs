import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sourcePath = path.join(repoRoot, 'output', 'community-seed-master.cleaned.jsonl');
const targetPath = path.join(
  repoRoot,
  'supabase',
  'migrations',
  '20260315193000_seed_community_seed_recipes.sql',
);

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNullableString(value) {
  if (value === null || value === undefined || String(value).trim() === '') return 'NULL';
  return sqlString(value);
}

function sqlTextArray(values) {
  const safeValues = Array.isArray(values) ? values.map((value) => sqlString(String(value))) : [];
  return `ARRAY[${safeValues.join(', ')}]::text[]`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

const raw = fs.readFileSync(sourcePath, 'utf8');
const rows = raw
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const inserts = rows.map((recipe) => {
  const rawPayload = {
    seed_source: 'community-seed-master.cleaned.jsonl',
    source_brand: 'Munch',
    original_source_url: recipe.source_url ?? null,
    original_chef: recipe.chef ?? null,
  };

  return `insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  ${sqlString(recipe.name)},
  ${sqlNullableString(recipe.image || '')},
  ${sqlString(recipe.cook_time || '30 min')},
  ${sqlString(recipe.difficulty || 'Intermediate')},
  ${sqlTextArray(recipe.ingredients)},
  ${sqlTextArray(recipe.tags)},
  ${sqlTextArray(recipe.instructions)},
  'community-seed',
  ${sqlNullableString(recipe.source_url)},
  'Munch',
  ${sqlNullableString(recipe.cuisine)},
  ${Number.isFinite(recipe.servings) ? recipe.servings : 4},
  ${recipe.is_public === false ? 'false' : 'true'},
  ${sqlJson(rawPayload)}
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower(${sqlString(recipe.name)})
     or (
       ${sqlNullableString(recipe.source_url)} is not null
       and lower(coalesce(existing.source_url, '')) = lower(${sqlNullableString(recipe.source_url)})
     )
);`;
});

const output = `-- Generated from output/community-seed-master.cleaned.jsonl
-- Run this migration to load Munch-curated seed recipes into public.recipes.

begin;

${inserts.join('\n\n')}

commit;
`;

fs.writeFileSync(targetPath, output);
console.log(`Wrote ${rows.length} recipe inserts to ${path.relative(repoRoot, targetPath)}`);
