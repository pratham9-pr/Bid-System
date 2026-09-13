-- =============================================================================
--  DEMONS REIGN AUCTION — TEAM LOGO SUPPORT & STORAGE BUCKET CONFIGURATION
-- =============================================================================
--  Instructions:
--  1. Open your Supabase Dashboard: https://supabase.com/dashboard
--  2. Navigate to your Project -> SQL Editor -> Click "+ New query"
--  3. Paste the contents of this file and click "Run" (or press Ctrl+Enter / Cmd+Enter)
-- =============================================================================

BEGIN;

-- 1. Alter the teams table to add logo_url
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;

-- 2. Create the 'team-logos' public storage bucket in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'team-logos',
    'team-logos',
    true,
    5242880, -- 5 MB limit
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Configure RLS Policies on storage.objects for 'team-logos'

-- Allow public read access to all objects in 'team-logos'
DROP POLICY IF EXISTS "Public Read Access for Team Logos" ON storage.objects;
CREATE POLICY "Public Read Access for Team Logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'team-logos');

-- Allow uploads (INSERT) for both authenticated and anon users
DROP POLICY IF EXISTS "Allow Uploads to Team Logos Bucket" ON storage.objects;
CREATE POLICY "Allow Uploads to Team Logos Bucket"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'team-logos');

-- Allow updates (UPDATE) for both authenticated and anon users
DROP POLICY IF EXISTS "Allow Updates to Team Logos Bucket" ON storage.objects;
CREATE POLICY "Allow Updates to Team Logos Bucket"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'team-logos')
WITH CHECK (bucket_id = 'team-logos');

-- Allow deletes (DELETE) for both authenticated and anon users
DROP POLICY IF EXISTS "Allow Deletes from Team Logos Bucket" ON storage.objects;
CREATE POLICY "Allow Deletes from Team Logos Bucket"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'team-logos');

COMMIT;
