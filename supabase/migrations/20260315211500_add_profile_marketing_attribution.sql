alter table public.profiles
  add column if not exists discovery_source text,
  add column if not exists discovery_source_detail text;
