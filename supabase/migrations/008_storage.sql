-- Migration 008: Supabase Storage Buckets & Policies

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('notes', 'notes', false, 20971520, ARRAY['application/pdf', 'text/plain', 'text/markdown', 'image/jpeg', 'image/png']),
  ('ai-images', 'ai-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('tutor-videos', 'tutor-videos', false, 524288000, ARRAY['video/mp4', 'video/webm']),
  ('exports', 'exports', false, 104857600, ARRAY['application/json', 'application/pdf', 'text/csv'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Avatar public view" ON storage.objects;
CREATE POLICY "Avatar public view" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar authenticated upload" ON storage.objects;
CREATE POLICY "Avatar authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Avatar user update own" ON storage.objects;
CREATE POLICY "Avatar user update own" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Private user docs select" ON storage.objects;
CREATE POLICY "Private user docs select" ON storage.objects
  FOR SELECT USING (bucket_id IN ('documents', 'notes', 'exports') AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Private user docs insert" ON storage.objects;
CREATE POLICY "Private user docs insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('documents', 'notes', 'exports') AND auth.uid()::text = (storage.foldername(name))[1]);
