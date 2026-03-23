create table public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_app_state enable row level security;

create policy "Users can view their app state"
  on public.user_app_state
  for select
  using (auth.uid() = user_id);

create policy "Users can create their app state"
  on public.user_app_state
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their app state"
  on public.user_app_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their app state"
  on public.user_app_state
  for delete
  using (auth.uid() = user_id);

create trigger update_user_app_state_updated_at
  before update on public.user_app_state
  for each row
  execute function public.update_updated_at_column();
