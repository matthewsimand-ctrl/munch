create type public.kitchen_member_role as enum ('owner', 'editor', 'viewer');
create type public.kitchen_invite_status as enum ('pending', 'accepted', 'revoked', 'expired');

create table public.kitchens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kitchens enable row level security;

create table public.kitchen_memberships (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.kitchen_member_role not null default 'viewer',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (kitchen_id, user_id)
);

create or replace function public.is_kitchen_member(target_kitchen_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.kitchen_memberships
    where kitchen_id = target_kitchen_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_kitchen(target_kitchen_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.kitchen_memberships
    where kitchen_id = target_kitchen_id
      and user_id = auth.uid()
      and role in ('owner', 'editor')
  );
$$;

create policy "Kitchen members can view kitchens"
  on public.kitchens for select
  to authenticated
  using (public.is_kitchen_member(id));

create policy "Users can create kitchens"
  on public.kitchens for insert
  to authenticated
  with check (owner_user_id = auth.uid());

create policy "Kitchen owners can update kitchens"
  on public.kitchens for update
  to authenticated
  using (owner_user_id = auth.uid());

create policy "Kitchen owners can delete kitchens"
  on public.kitchens for delete
  to authenticated
  using (owner_user_id = auth.uid());

create trigger update_kitchens_updated_at
  before update on public.kitchens
  for each row
  execute function public.update_updated_at_column();

alter table public.kitchen_memberships enable row level security;

create policy "Kitchen members can view memberships"
  on public.kitchen_memberships for select
  to authenticated
  using (public.is_kitchen_member(kitchen_id));

create policy "Kitchen owners can add memberships"
  on public.kitchen_memberships for insert
  to authenticated
  with check (
    exists (
      select 1 from public.kitchens
      where id = kitchen_id
        and owner_user_id = auth.uid()
    )
  );

create policy "Kitchen owners can update memberships"
  on public.kitchen_memberships for update
  to authenticated
  using (
    exists (
      select 1 from public.kitchens
      where id = kitchen_id
        and owner_user_id = auth.uid()
    )
  );

create policy "Kitchen owners or self can delete memberships"
  on public.kitchen_memberships for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.kitchens
      where id = kitchen_id
        and owner_user_id = auth.uid()
    )
  );

create table public.kitchen_invites (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  email text not null,
  role public.kitchen_member_role not null default 'viewer',
  invited_by uuid not null references auth.users(id) on delete cascade,
  status public.kitchen_invite_status not null default 'pending',
  invite_token uuid not null default gen_random_uuid(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.kitchen_invites enable row level security;

create policy "Kitchen members can view invites"
  on public.kitchen_invites for select
  to authenticated
  using (public.is_kitchen_member(kitchen_id));

create policy "Kitchen editors can create invites"
  on public.kitchen_invites for insert
  to authenticated
  with check (public.can_edit_kitchen(kitchen_id));

create policy "Kitchen editors can update invites"
  on public.kitchen_invites for update
  to authenticated
  using (public.can_edit_kitchen(kitchen_id));

create table public.kitchen_recipe_shares (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  shared_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (kitchen_id, recipe_id)
);

alter table public.kitchen_recipe_shares enable row level security;

create policy "Kitchen members can view recipe shares"
  on public.kitchen_recipe_shares for select
  to authenticated
  using (public.is_kitchen_member(kitchen_id));

create policy "Kitchen editors can share recipes"
  on public.kitchen_recipe_shares for insert
  to authenticated
  with check (
    public.can_edit_kitchen(kitchen_id)
    and exists (
      select 1
      from public.recipes
      where id = recipe_id
        and (
          is_public = true
          or created_by = auth.uid()
        )
    )
  );

create policy "Kitchen editors can remove recipe shares"
  on public.kitchen_recipe_shares for delete
  to authenticated
  using (public.can_edit_kitchen(kitchen_id));

create table public.kitchen_cookbooks (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  name text not null,
  cover_image text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kitchen_cookbooks enable row level security;

create policy "Kitchen members can view cookbooks"
  on public.kitchen_cookbooks for select
  to authenticated
  using (public.is_kitchen_member(kitchen_id));

create policy "Kitchen editors can create cookbooks"
  on public.kitchen_cookbooks for insert
  to authenticated
  with check (public.can_edit_kitchen(kitchen_id) and created_by = auth.uid());

create policy "Kitchen editors can update cookbooks"
  on public.kitchen_cookbooks for update
  to authenticated
  using (public.can_edit_kitchen(kitchen_id));

create policy "Kitchen editors can delete cookbooks"
  on public.kitchen_cookbooks for delete
  to authenticated
  using (public.can_edit_kitchen(kitchen_id));

create trigger update_kitchen_cookbooks_updated_at
  before update on public.kitchen_cookbooks
  for each row
  execute function public.update_updated_at_column();

create table public.kitchen_cookbook_recipes (
  id uuid primary key default gen_random_uuid(),
  cookbook_id uuid not null references public.kitchen_cookbooks(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (cookbook_id, recipe_id)
);

alter table public.kitchen_cookbook_recipes enable row level security;

create policy "Kitchen members can view cookbook recipes"
  on public.kitchen_cookbook_recipes for select
  to authenticated
  using (
    exists (
      select 1
      from public.kitchen_cookbooks kc
      where kc.id = cookbook_id
        and public.is_kitchen_member(kc.kitchen_id)
    )
  );

create policy "Kitchen editors can add cookbook recipes"
  on public.kitchen_cookbook_recipes for insert
  to authenticated
  with check (
    added_by = auth.uid()
    and exists (
      select 1
      from public.kitchen_cookbooks kc
      where kc.id = cookbook_id
        and public.can_edit_kitchen(kc.kitchen_id)
    )
  );

create policy "Kitchen editors can remove cookbook recipes"
  on public.kitchen_cookbook_recipes for delete
  to authenticated
  using (
    exists (
      select 1
      from public.kitchen_cookbooks kc
      where kc.id = cookbook_id
        and public.can_edit_kitchen(kc.kitchen_id)
    )
  );

create table public.kitchen_pantry_items (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  name text not null,
  quantity text not null default '1',
  category text,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kitchen_pantry_items enable row level security;

create policy "Kitchen members can view pantry items"
  on public.kitchen_pantry_items for select
  to authenticated
  using (public.is_kitchen_member(kitchen_id));

create policy "Kitchen editors can create pantry items"
  on public.kitchen_pantry_items for insert
  to authenticated
  with check (public.can_edit_kitchen(kitchen_id));

create policy "Kitchen editors can update pantry items"
  on public.kitchen_pantry_items for update
  to authenticated
  using (public.can_edit_kitchen(kitchen_id));

create policy "Kitchen editors can delete pantry items"
  on public.kitchen_pantry_items for delete
  to authenticated
  using (public.can_edit_kitchen(kitchen_id));

create trigger update_kitchen_pantry_items_updated_at
  before update on public.kitchen_pantry_items
  for each row
  execute function public.update_updated_at_column();

create table public.kitchen_grocery_lists (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  name text not null default 'Shared Grocery List',
  created_by uuid not null references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kitchen_grocery_lists enable row level security;

create policy "Kitchen members can view grocery lists"
  on public.kitchen_grocery_lists for select
  to authenticated
  using (public.is_kitchen_member(kitchen_id));

create policy "Kitchen editors can create grocery lists"
  on public.kitchen_grocery_lists for insert
  to authenticated
  with check (public.can_edit_kitchen(kitchen_id) and created_by = auth.uid());

create policy "Kitchen editors can update grocery lists"
  on public.kitchen_grocery_lists for update
  to authenticated
  using (public.can_edit_kitchen(kitchen_id));

create policy "Kitchen editors can delete grocery lists"
  on public.kitchen_grocery_lists for delete
  to authenticated
  using (public.can_edit_kitchen(kitchen_id));

create trigger update_kitchen_grocery_lists_updated_at
  before update on public.kitchen_grocery_lists
  for each row
  execute function public.update_updated_at_column();

create table public.kitchen_grocery_items (
  id uuid primary key default gen_random_uuid(),
  grocery_list_id uuid not null references public.kitchen_grocery_lists(id) on delete cascade,
  name text not null,
  quantity text not null default '1',
  category text,
  section text,
  checked boolean not null default false,
  added_by uuid references auth.users(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kitchen_grocery_items enable row level security;

create policy "Kitchen members can view grocery items"
  on public.kitchen_grocery_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.kitchen_grocery_lists kgl
      where kgl.id = grocery_list_id
        and public.is_kitchen_member(kgl.kitchen_id)
    )
  );

create policy "Kitchen editors can create grocery items"
  on public.kitchen_grocery_items for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.kitchen_grocery_lists kgl
      where kgl.id = grocery_list_id
        and public.can_edit_kitchen(kgl.kitchen_id)
    )
  );

create policy "Kitchen editors can update grocery items"
  on public.kitchen_grocery_items for update
  to authenticated
  using (
    exists (
      select 1
      from public.kitchen_grocery_lists kgl
      where kgl.id = grocery_list_id
        and public.can_edit_kitchen(kgl.kitchen_id)
    )
  );

create policy "Kitchen editors can delete grocery items"
  on public.kitchen_grocery_items for delete
  to authenticated
  using (
    exists (
      select 1
      from public.kitchen_grocery_lists kgl
      where kgl.id = grocery_list_id
        and public.can_edit_kitchen(kgl.kitchen_id)
    )
  );

create trigger update_kitchen_grocery_items_updated_at
  before update on public.kitchen_grocery_items
  for each row
  execute function public.update_updated_at_column();

create table public.kitchen_meal_plans (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  week_start date not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kitchen_id, week_start)
);

alter table public.kitchen_meal_plans enable row level security;

create policy "Kitchen members can view kitchen meal plans"
  on public.kitchen_meal_plans for select
  to authenticated
  using (public.is_kitchen_member(kitchen_id));

create policy "Kitchen editors can create kitchen meal plans"
  on public.kitchen_meal_plans for insert
  to authenticated
  with check (public.can_edit_kitchen(kitchen_id) and created_by = auth.uid());

create policy "Kitchen editors can update kitchen meal plans"
  on public.kitchen_meal_plans for update
  to authenticated
  using (public.can_edit_kitchen(kitchen_id));

create policy "Kitchen editors can delete kitchen meal plans"
  on public.kitchen_meal_plans for delete
  to authenticated
  using (public.can_edit_kitchen(kitchen_id));

create trigger update_kitchen_meal_plans_updated_at
  before update on public.kitchen_meal_plans
  for each row
  execute function public.update_updated_at_column();

create table public.kitchen_meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.kitchen_meal_plans(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  recipe_data jsonb,
  day_of_week integer not null check (day_of_week between 0 and 6),
  meal_type text not null default 'dinner',
  servings integer not null default 2,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.kitchen_meal_plan_items enable row level security;

create policy "Kitchen members can view kitchen meal plan items"
  on public.kitchen_meal_plan_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.kitchen_meal_plans kmp
      where kmp.id = meal_plan_id
        and public.is_kitchen_member(kmp.kitchen_id)
    )
  );

create policy "Kitchen editors can create kitchen meal plan items"
  on public.kitchen_meal_plan_items for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.kitchen_meal_plans kmp
      where kmp.id = meal_plan_id
        and public.can_edit_kitchen(kmp.kitchen_id)
    )
  );

create policy "Kitchen editors can update kitchen meal plan items"
  on public.kitchen_meal_plan_items for update
  to authenticated
  using (
    exists (
      select 1
      from public.kitchen_meal_plans kmp
      where kmp.id = meal_plan_id
        and public.can_edit_kitchen(kmp.kitchen_id)
    )
  );

create policy "Kitchen editors can delete kitchen meal plan items"
  on public.kitchen_meal_plan_items for delete
  to authenticated
  using (
    exists (
      select 1
      from public.kitchen_meal_plans kmp
      where kmp.id = meal_plan_id
        and public.can_edit_kitchen(kmp.kitchen_id)
    )
  );

create index kitchen_memberships_user_id_idx on public.kitchen_memberships (user_id);
create index kitchen_recipe_shares_kitchen_id_idx on public.kitchen_recipe_shares (kitchen_id);
create index kitchen_pantry_items_kitchen_id_idx on public.kitchen_pantry_items (kitchen_id);
create index kitchen_grocery_lists_kitchen_id_idx on public.kitchen_grocery_lists (kitchen_id);
create index kitchen_meal_plans_kitchen_id_week_start_idx on public.kitchen_meal_plans (kitchen_id, week_start desc);

insert into public.kitchen_memberships (kitchen_id, user_id, role, invited_by)
select id, owner_user_id, 'owner', owner_user_id
from public.kitchens
on conflict (kitchen_id, user_id) do nothing;
