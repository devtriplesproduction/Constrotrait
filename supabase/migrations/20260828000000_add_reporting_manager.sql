-- Migration: 20260828000000_add_reporting_manager.sql
-- Description: Adds reporting_manager_id to profiles table

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reporting_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_reporting_manager_id ON public.profiles(reporting_manager_id);
