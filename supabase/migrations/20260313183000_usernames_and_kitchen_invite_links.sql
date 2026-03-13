alter table public.profiles
  add column if not exists username text;

update public.profiles
set username = 'chef_' || replace(left(user_id::text, 8), '-', '')
where username is null or btrim(username) = '';

alter table public.profiles
  alter column username set not null;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_format'
  ) then
    alter table public.profiles
      add constraint profiles_username_format
      check (username ~ '^[a-z0-9_]{3,24}$');
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'chef_' || replace(left(new.id::text, 8), '-', '')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop policy if exists "Anyone can view profile identities" on public.profiles;
create policy "Anyone can view profile identities"
  on public.profiles for select
  using (true);

create or replace function public.is_username_available(candidate text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized text;
begin
  normalized := lower(regexp_replace(coalesce(candidate, ''), '[^a-z0-9_]', '', 'g'));

  if normalized !~ '^[a-z0-9_]{3,24}$' then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles
    where lower(username) = normalized
      and user_id <> auth.uid()
  );
end;
$$;

alter table public.kitchen_invites
  alter column email drop not null;

create or replace function public.get_kitchen_invite_preview(invite_uuid uuid)
returns table (
  invite_id uuid,
  kitchen_id uuid,
  kitchen_name text,
  role public.kitchen_member_role,
  email text,
  status public.kitchen_invite_status,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ki.id,
    ki.kitchen_id,
    k.name,
    ki.role,
    ki.email,
    ki.status,
    ki.expires_at
  from public.kitchen_invites ki
  join public.kitchens k on k.id = ki.kitchen_id
  where ki.invite_token = invite_uuid
  limit 1;
$$;

create or replace function public.accept_kitchen_invite(invite_uuid uuid)
returns table (
  kitchen_id uuid,
  kitchen_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  current_user_email text;
  invite_row public.kitchen_invites%rowtype;
  kitchen_row public.kitchens%rowtype;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Please sign in to accept this invite.';
  end if;

  select *
  into invite_row
  from public.kitchen_invites
  where invite_token = invite_uuid
  limit 1;

  if invite_row.id is null then
    raise exception 'This invite could not be found.';
  end if;

  if invite_row.status <> 'pending' then
    raise exception 'This invite is no longer active.';
  end if;

  if invite_row.expires_at is not null and invite_row.expires_at < now() then
    raise exception 'This invite has expired.';
  end if;

  select *
  into kitchen_row
  from public.kitchens
  where id = invite_row.kitchen_id;

  select email
  into current_user_email
  from auth.users
  where id = current_user_id;

  if invite_row.email is not null and lower(invite_row.email) <> lower(coalesce(current_user_email, '')) then
    raise exception 'Please sign in with the invited email address to accept this invite.';
  end if;

  insert into public.kitchen_memberships (kitchen_id, user_id, role, invited_by)
  values (invite_row.kitchen_id, current_user_id, invite_row.role, invite_row.invited_by)
  on conflict (kitchen_id, user_id) do update
    set role = excluded.role;

  update public.kitchen_invites
  set status = 'accepted'
  where id = invite_row.id;

  return query
  select kitchen_row.id, kitchen_row.name;
end;
$$;
