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
  food_items JSONB DEFAULT '[]'::JSONB NOT NULL,
  image_url TEXT,
  logged_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

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

-- 3. Storage Bucket for Meal Images
INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-images', 'meal-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Allow public read of meal images" ON storage.objects;
CREATE POLICY "Allow public read of meal images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'meal-images');

DROP POLICY IF EXISTS "Allow authenticated users to upload meal images" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload meal images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'meal-images' AND (select auth.role()) = 'authenticated');

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
