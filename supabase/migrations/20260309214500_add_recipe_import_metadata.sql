ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS cuisine text,
  ADD COLUMN IF NOT EXISTS servings integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS raw_api_payload jsonb;
