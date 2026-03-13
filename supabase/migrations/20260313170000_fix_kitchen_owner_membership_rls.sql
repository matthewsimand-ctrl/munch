create policy "Kitchen owners can view own kitchens"
  on public.kitchens for select
  to authenticated
  using (owner_user_id = auth.uid());
