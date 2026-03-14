create table if not exists public.recipe_nutrition_cache (
  recipe_id uuid primary key references public.recipes(id) on delete cascade,
  nutrition jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipe_nutrition_cache enable row level security;

create policy "Anyone can view recipe nutrition cache"
  on public.recipe_nutrition_cache for select
  using (true);

create policy "Authenticated users can insert recipe nutrition cache"
  on public.recipe_nutrition_cache for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update recipe nutrition cache"
  on public.recipe_nutrition_cache for update
  to authenticated
  using (true);

drop trigger if exists update_recipe_nutrition_cache_updated_at on public.recipe_nutrition_cache;
create trigger update_recipe_nutrition_cache_updated_at
  before update on public.recipe_nutrition_cache
  for each row
  execute function public.update_updated_at_column();
