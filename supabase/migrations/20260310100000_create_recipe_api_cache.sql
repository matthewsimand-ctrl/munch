CREATE TABLE IF NOT EXISTS public.recipe_api_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  external_id text NOT NULL,
  name text NOT NULL,
  image text NOT NULL DEFAULT '',
  cook_time text NOT NULL DEFAULT '30 min',
  difficulty text NOT NULL DEFAULT 'Intermediate',
  ingredients text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  instructions text[] NOT NULL DEFAULT '{}',
  source text NOT NULL,
  source_url text,
  raw_api_payload jsonb,
  cuisine text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recipe_api_cache_expires_at_idx
  ON public.recipe_api_cache (expires_at);

CREATE INDEX IF NOT EXISTS recipe_api_cache_source_idx
  ON public.recipe_api_cache (source);

ALTER TABLE public.recipe_api_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-expired cached recipes"
  ON public.recipe_api_cache FOR SELECT
  USING (expires_at > now());

CREATE TRIGGER update_recipe_api_cache_updated_at
  BEFORE UPDATE ON public.recipe_api_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
