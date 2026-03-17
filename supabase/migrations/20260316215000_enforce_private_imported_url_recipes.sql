create or replace function public.enforce_imported_url_recipe_visibility()
returns trigger
language plpgsql
as $$
begin
  if lower(coalesce(new.source, '')) = 'imported'
     and nullif(btrim(coalesce(new.source_url, '')), '') is not null then
    new.is_public := false;
  end if;

  return new;
end;
$$;

drop trigger if exists recipes_enforce_imported_url_recipe_visibility on public.recipes;

create trigger recipes_enforce_imported_url_recipe_visibility
before insert or update of source, source_url, is_public
on public.recipes
for each row
execute function public.enforce_imported_url_recipe_visibility();

update public.recipes
set is_public = false
where lower(coalesce(source, '')) = 'imported'
  and nullif(btrim(coalesce(source_url, '')), '') is not null
  and is_public = true;
