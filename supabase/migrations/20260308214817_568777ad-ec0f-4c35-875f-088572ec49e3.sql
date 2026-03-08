-- Drop the FK constraint on created_by so stale user IDs don't block inserts
ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_created_by_fkey;

-- Create a storage bucket for recipe photos
INSERT INTO storage.buckets (id, name, public) VALUES ('recipe-photos', 'recipe-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload recipe photos
CREATE POLICY "Users can upload recipe photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'recipe-photos');

-- Allow public read access to recipe photos
CREATE POLICY "Public can view recipe photos"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'recipe-photos');

-- Allow users to delete their own recipe photos
CREATE POLICY "Users can delete own recipe photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'recipe-photos' AND (storage.foldername(name))[1] = auth.uid()::text);