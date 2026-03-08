-- Add default_servings to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_servings integer NOT NULL DEFAULT 2;

-- Meal plan table
CREATE TABLE public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal plans" ON public.meal_plans FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create own meal plans" ON public.meal_plans FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own meal plans" ON public.meal_plans FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own meal plans" ON public.meal_plans FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Meal plan items
CREATE TABLE public.meal_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  recipe_id text NOT NULL,
  recipe_data jsonb,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  meal_type text NOT NULL DEFAULT 'dinner',
  servings integer NOT NULL DEFAULT 2,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal plan items" ON public.meal_plan_items FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_plan_id AND mp.user_id = auth.uid()));
CREATE POLICY "Users can create own meal plan items" ON public.meal_plan_items FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_plan_id AND mp.user_id = auth.uid()));
CREATE POLICY "Users can update own meal plan items" ON public.meal_plan_items FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_plan_id AND mp.user_id = auth.uid()));
CREATE POLICY "Users can delete own meal plan items" ON public.meal_plan_items FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_plan_id AND mp.user_id = auth.uid()));