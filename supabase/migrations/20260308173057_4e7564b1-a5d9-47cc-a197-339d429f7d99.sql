
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image text NOT NULL DEFAULT '',
  cook_time text NOT NULL DEFAULT '30 min',
  difficulty text NOT NULL DEFAULT 'Intermediate',
  ingredients text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  instructions text[] NOT NULL DEFAULT '{}',
  source text DEFAULT 'community',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Everyone can read public recipes
CREATE POLICY "Anyone can view public recipes"
  ON public.recipes FOR SELECT
  USING (is_public = true);

-- Authenticated users can view their own private recipes
CREATE POLICY "Users can view own recipes"
  ON public.recipes FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Authenticated users can create recipes
CREATE POLICY "Users can create recipes"
  ON public.recipes FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Users can update their own recipes
CREATE POLICY "Users can update own recipes"
  ON public.recipes FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Users can delete their own recipes
CREATE POLICY "Users can delete own recipes"
  ON public.recipes FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Allow anon to read public recipes (for non-logged-in users)
CREATE POLICY "Anon can view public recipes"
  ON public.recipes FOR SELECT
  TO anon
  USING (is_public = true);

-- Updated_at trigger
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
