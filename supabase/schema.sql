-- Supabase Schema for AI Calorie Tracker

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_icon TEXT DEFAULT 'person',
  gender TEXT CHECK (gender IN ('male', 'female')),
  age INTEGER,
  weight_kg NUMERIC(5, 2),
  height_cm NUMERIC(5, 2),
  activity_level TEXT DEFAULT 'moderate',
  fitness_goal TEXT DEFAULT 'fat_loss',
  goal_pace TEXT DEFAULT 'standard',
  diet_type TEXT DEFAULT 'balanced',
  target_calories INTEGER,
  target_protein_g INTEGER,
  target_carbs_g INTEGER,
  target_fat_g INTEGER,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Migration for existing profile tables
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_icon TEXT DEFAULT 'person',
  ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS fitness_goal TEXT DEFAULT 'fat_loss',
  ADD COLUMN IF NOT EXISTS goal_pace TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS diet_type TEXT DEFAULT 'balanced';

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING ((select auth.uid()) = id);

-- 2. Meals Table
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  meal_type TEXT DEFAULT 'snack' CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  calories NUMERIC(7, 2) NOT NULL,
  protein_g NUMERIC(6, 2) NOT NULL,
  carbs_g NUMERIC(6, 2) NOT NULL,
  fat_g NUMERIC(6, 2) NOT NULL,
  fiber_g NUMERIC(6, 2) DEFAULT 0,
  sugar_g NUMERIC(6, 2) DEFAULT 0,
  sodium_mg NUMERIC(7, 2) DEFAULT 0,
  potassium_mg NUMERIC(7, 2) DEFAULT 0,
  food_items JSONB DEFAULT '[]'::JSONB NOT NULL,
  image_url TEXT,
  logged_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Migration for existing meals table (Cronometer Micronutrient Spec)
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS fiber_g NUMERIC(6, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sugar_g NUMERIC(6, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sodium_mg NUMERIC(7, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS potassium_mg NUMERIC(7, 2) DEFAULT 0;

-- Index for querying meals by user and date
CREATE INDEX IF NOT EXISTS meals_user_logged_at_idx ON public.meals(user_id, logged_at DESC);

-- Enable RLS on meals
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own meals" ON public.meals;
CREATE POLICY "Users can view their own meals"
  ON public.meals FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own meals" ON public.meals;
CREATE POLICY "Users can insert their own meals"
  ON public.meals FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own meals" ON public.meals;
CREATE POLICY "Users can update their own meals"
  ON public.meals FOR UPDATE
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own meals" ON public.meals;
CREATE POLICY "Users can delete their own meals"
  ON public.meals FOR DELETE
  USING ((select auth.uid()) = user_id);

-- 3. Storage Bucket for Meal Images (private: photos are served through short-lived signed URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-images', 'meal-images', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Allow public read of meal images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read their own meal images" ON storage.objects;
CREATE POLICY "Allow users to read their own meal images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'meal-images' AND (select auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Allow authenticated users to upload meal images" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload meal images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'meal-images' AND (select auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Allow users to delete their own meal images" ON storage.objects;
CREATE POLICY "Allow users to delete their own meal images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'meal-images' AND (select auth.uid())::text = (storage.foldername(name))[1]);

-- 4. Server-Side Aggregate RPC for Analytics (98% Bandwidth Reduction)
CREATE OR REPLACE FUNCTION public.get_weekly_macro_summary(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  log_date DATE,
  total_calories NUMERIC,
  total_protein_g NUMERIC,
  total_carbs_g NUMERIC,
  total_fat_g NUMERIC,
  meal_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: Verify caller owns the requested telemetry
  IF p_user_id != (select auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized access to user %', p_user_id;
  END IF;

  RETURN QUERY
  SELECT
    DATE(m.logged_at) AS log_date,
    COALESCE(ROUND(SUM(m.calories)), 0) AS total_calories,
    COALESCE(ROUND(SUM(m.protein_g)), 0) AS total_protein_g,
    COALESCE(ROUND(SUM(m.carbs_g)), 0) AS total_carbs_g,
    COALESCE(ROUND(SUM(m.fat_g)), 0) AS total_fat_g,
    COUNT(m.id) AS meal_count
  FROM public.meals m
  WHERE m.user_id = p_user_id
    AND m.logged_at >= p_start_date
    AND m.logged_at <= p_end_date
  GROUP BY DATE(m.logged_at)
  ORDER BY log_date ASC;
END;
$$;

-- 5. Per-User AI Quota (called by the analyze-meal Edge Function)
-- Every AI request is recorded so one account cannot run up unbounded provider costs.
CREATE TABLE IF NOT EXISTS public.ai_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('analyze', 'chat')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_requests_user_kind_created_idx
  ON public.ai_requests(user_id, kind, created_at DESC);

-- RLS on with no policies: rows are only reachable through consume_ai_quota below.
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_kind TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := (select auth.uid());
  v_limit INTEGER := LEAST(GREATEST(p_limit, 1), 500);
  v_window INTERVAL := make_interval(secs => LEAST(GREATEST(p_window_seconds, 60), 86400));
  v_recent INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Serialize concurrent requests from the same user so the count cannot be raced.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  DELETE FROM public.ai_requests
  WHERE user_id = v_user_id AND created_at < now() - INTERVAL '1 day';

  SELECT COUNT(*) INTO v_recent
  FROM public.ai_requests
  WHERE user_id = v_user_id AND kind = p_kind AND created_at > now() - v_window;

  IF v_recent >= v_limit THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.ai_requests (user_id, kind) VALUES (v_user_id, p_kind);
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(TEXT, INTEGER, INTEGER) TO authenticated;
