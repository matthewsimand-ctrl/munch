-- Allow anyone to read public profile info (display_name, avatar_url) for chef attribution
CREATE POLICY "Anyone can view public profile info"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);