-- ==========================================
-- SQL SCHEMA FOR AI ENGLISH MENTOR & PORTAL
-- Chạy câu lệnh SQL này trong Supabase SQL Editor để khởi tạo các bảng đồng bộ dữ liệu
-- ==========================================

-- 1. Tạo bảng lịch sử dịch câu (ai_english_history)
CREATE TABLE IF NOT EXISTS public.ai_english_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_name TEXT NOT NULL,
    vietnamese_text TEXT NOT NULL,
    english_translation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tạo bảng sổ tay từ vựng (ai_english_vocab)
CREATE TABLE IF NOT EXISTS public.ai_english_vocab (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_name TEXT NOT NULL,
    word TEXT NOT NULL,
    phonetic TEXT NOT NULL,
    translation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Bật Row Level Security (RLS) để bảo vệ database
ALTER TABLE public.ai_english_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_english_vocab ENABLE ROW LEVEL SECURITY;

-- 4. Tạo Policy cho phép Đọc/Ghi công khai không cần Auth (Vì là dự án cá nhân, không có Login)
-- a) Cho bảng lịch sử (ai_english_history)
CREATE POLICY "Allow public read access on history" ON public.ai_english_history 
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on history" ON public.ai_english_history 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete access on history" ON public.ai_english_history 
    FOR DELETE USING (true);

-- b) Cho bảng từ vựng (ai_english_vocab)
CREATE POLICY "Allow public read access on vocab" ON public.ai_english_vocab 
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on vocab" ON public.ai_english_vocab 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete access on vocab" ON public.ai_english_vocab 
    FOR DELETE USING (true);
