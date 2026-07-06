-- Cleanup mock/demo records from database tables
-- Execute this script in your Supabase SQL Editor to wipe test progress and mock payments completely

-- 1. Clean payment logs
truncate table public.payment_history cascade;

-- 2. Clean practice and learning states
truncate table public.user_progress cascade;
truncate table public.user_sentence_history cascade;
truncate table public.user_lesson_progress cascade;
truncate table public.user_learning_state cascade;

-- 3. Reset actual profiles learning stats back to 0 so they can start fresh
update public.profiles
set exp = 0,
    level = 1,
    streak = 0,
    accuracy = 0.00,
    total_answers = 0,
    correct_answers = 0,
    last_study_date = null;
