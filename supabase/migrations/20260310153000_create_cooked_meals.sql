create table public.cooked_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null,
  recipe_name text not null,
  cooked_at timestamptz not null default now(),
  estimated_savings numeric(8,2),
  savings_source text not null default 'ai_estimate',
  metadata jsonb
);

alter table public.cooked_meals enable row level security;

create index cooked_meals_user_id_cooked_at_idx
  on public.cooked_meals (user_id, cooked_at desc);

create policy "Users can view their own cooked meals"
  on public.cooked_meals
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own cooked meals"
  on public.cooked_meals
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own cooked meals"
  on public.cooked_meals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
