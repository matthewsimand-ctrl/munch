-- Add servings column to recipes table
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS servings integer NOT NULL DEFAULT 4;