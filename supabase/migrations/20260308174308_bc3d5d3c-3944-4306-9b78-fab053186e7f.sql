ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS cuisine text DEFAULT null;

UPDATE public.recipes SET cuisine = 'Mexican' WHERE name ILIKE '%taco%' OR name ILIKE '%enchilada%' OR name ILIKE '%burrito%';
UPDATE public.recipes SET cuisine = 'Italian' WHERE name ILIKE '%pasta%' OR name ILIKE '%spaghetti%' OR name ILIKE '%risotto%';
UPDATE public.recipes SET cuisine = 'Asian' WHERE name ILIKE '%stir%fry%' OR name ILIKE '%ramen%' OR name ILIKE '%pad thai%';
UPDATE public.recipes SET cuisine = 'American' WHERE name ILIKE '%burger%' OR name ILIKE '%mac%cheese%';
UPDATE public.recipes SET cuisine = 'Mediterranean' WHERE name ILIKE '%greek%' OR name ILIKE '%hummus%' OR name ILIKE '%falafel%';