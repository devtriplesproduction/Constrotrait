-- Migration to add documents and profile_photo to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_photo TEXT,
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
