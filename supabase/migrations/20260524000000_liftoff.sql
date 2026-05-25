-- Tables for Liftoff Workout Tracker Clone

-- Custom Exercises table
CREATE TABLE IF NOT EXISTS public.custom_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    equipment TEXT NOT NULL,
    instructions TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own custom exercises"
    ON public.custom_exercises FOR ALL USING (auth.uid() = user_id);

-- Routines table (Stores custom templates)
CREATE TABLE IF NOT EXISTS public.routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    exercises JSONB NOT NULL, -- Stores array of routine exercises
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own routines"
    ON public.routines FOR ALL USING (auth.uid() = user_id);

-- Workout Logs table (History records)
CREATE TABLE IF NOT EXISTS public.workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    duration_seconds INTEGER NOT NULL,
    total_volume FLOAT NOT NULL,
    prs_broken INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own workout logs"
    ON public.workout_logs FOR ALL USING (auth.uid() = user_id);

-- Workout Sets table (Individual sets logged inside workouts)
CREATE TABLE IF NOT EXISTS public.workout_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_log_id UUID REFERENCES public.workout_logs(id) ON DELETE CASCADE NOT NULL,
    exercise_id TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight FLOAT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT true,
    is_pr BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own workout sets"
    ON public.workout_sets FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workout_logs
            WHERE public.workout_logs.id = public.workout_sets.workout_log_id
            AND public.workout_logs.user_id = auth.uid()
        )
    );

-- Personal Records table (User bests)
CREATE TABLE IF NOT EXISTS public.personal_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    exercise_id TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    weight FLOAT NOT NULL,
    reps INTEGER NOT NULL,
    estimated_one_rep_max FLOAT NOT NULL,
    achieved_at TIMESTAMPTZ NOT NULL,
    workout_log_id UUID REFERENCES public.workout_logs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own personal records"
    ON public.personal_records FOR ALL USING (auth.uid() = user_id);
