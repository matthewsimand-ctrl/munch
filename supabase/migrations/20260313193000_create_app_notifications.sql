create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists app_notifications_user_created_idx
  on public.app_notifications (user_id, created_at desc);

create index if not exists app_notifications_user_unread_idx
  on public.app_notifications (user_id, read_at);

alter table public.app_notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.app_notifications;
create policy "Users can view own notifications"
  on public.app_notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can update own notifications" on public.app_notifications;
create policy "Users can update own notifications"
  on public.app_notifications for update
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Authenticated users can insert notifications" on public.app_notifications;
create policy "Authenticated users can insert notifications"
  on public.app_notifications for insert
  to authenticated
  with check (true);
