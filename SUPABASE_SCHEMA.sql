-- ==========================================
-- SQL SCHEMA FOR AI ENGLISH MENTOR & POOP TRACKER
-- Chạy câu lệnh SQL này trong Supabase SQL Editor để khởi tạo toàn bộ bảng và RLS Policy
-- ==========================================

-- 1. Bảng hồ sơ Poop Tracker (poop_profiles)
CREATE TABLE IF NOT EXISTS public.poop_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_name TEXT NOT NULL,
    avatar TEXT,
    target_water INTEGER DEFAULT 2000,
    gender TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Bảng nhật ký đại tiện (poop_logs)
CREATE TABLE IF NOT EXISTS public.poop_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.poop_profiles(id) ON DELETE CASCADE,
    profile_name TEXT,
    type TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    bristol_type INTEGER,
    symptoms TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Bảng nhật ký uống nước (water_logs)
CREATE TABLE IF NOT EXISTS public.water_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.poop_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME WITHOUT TIME ZONE NOT NULL,
    amount INTEGER NOT NULL,
    beverage_type TEXT DEFAULT 'pure_water',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Bảng nhật ký thực đơn ăn uống (food_logs)
CREATE TABLE IF NOT EXISTS public.food_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.poop_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME WITHOUT TIME ZONE NOT NULL,
    food_name TEXT NOT NULL,
    meal_type TEXT,
    portion_size TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Bảng hồ sơ học tập AI English (ai_english_profiles)
CREATE TABLE IF NOT EXISTS public.ai_english_profiles (
    profile_name TEXT PRIMARY KEY,
    user_level TEXT DEFAULT 'B1',
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    last_study_date TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Bảng lịch sử dịch câu AI English (ai_english_history)
CREATE TABLE IF NOT EXISTS public.ai_english_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_name TEXT REFERENCES public.ai_english_profiles(profile_name) ON DELETE CASCADE,
    vietnamese_text TEXT NOT NULL,
    english_translation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Bảng sổ tay từ vựng AI English (ai_english_vocab)
CREATE TABLE IF NOT EXISTS public.ai_english_vocab (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_name TEXT REFERENCES public.ai_english_vocab_profile_name_fkey ON DELETE CASCADE,
    word TEXT NOT NULL,
    phonetic TEXT NOT NULL,
    translation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Bảng lịch sử bài viết Essay AI English (ai_english_essay_history)
CREATE TABLE IF NOT EXISTS public.ai_english_essay_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_name TEXT REFERENCES public.ai_english_profiles(profile_name) ON DELETE CASCADE,
    title TEXT,
    prompt_vi TEXT,
    user_essay TEXT,
    band_score TEXT,
    task_achievement INTEGER,
    coherence_cohesion INTEGER,
    lexical_resource INTEGER,
    grammar_accuracy INTEGER,
    native_rewrite TEXT,
    feedback_vi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật Row Level Security (RLS) cho tất cả các bảng
ALTER TABLE public.poop_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poop_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_english_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_english_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_english_vocab ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_english_essay_history ENABLE ROW LEVEL SECURITY;

-- Cấu hình Public Policy cho phép Đọc, Thêm, Sửa, Xóa (SELECT, INSERT, UPDATE, DELETE)
DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'poop_profiles', 'poop_logs', 'water_logs', 'food_logs',
        'ai_english_profiles', 'ai_english_history', 'ai_english_vocab', 'ai_english_essay_history'
    ]) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public select on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Public select on %I" ON public.%I FOR SELECT USING (true)', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "Public insert on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Public insert on %I" ON public.%I FOR INSERT WITH CHECK (true)', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "Public update on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Public update on %I" ON public.%I FOR UPDATE USING (true)', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "Public delete on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Public delete on %I" ON public.%I FOR DELETE USING (true)', tbl, tbl);
    END LOOP;
END $$;
