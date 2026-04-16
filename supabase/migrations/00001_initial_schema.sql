-- ============================================
-- Acuo Gym App - Initial Schema
-- ============================================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Gyms
-- ============================================

CREATE TABLE gyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gyms are viewable by authenticated users" ON gyms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gyms are insertable by authenticated users" ON gyms
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- Gym Members (junction: user <-> gym with role)
-- ============================================

CREATE TABLE gym_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('member', 'coach', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, user_id, role)
);

ALTER TABLE gym_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memberships" ON gym_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Gym members can view co-members" ON gym_members
  FOR SELECT TO authenticated
  USING (gym_id IN (SELECT gm.gym_id FROM gym_members gm WHERE gm.user_id = auth.uid()));

CREATE POLICY "Gym members insertable by authenticated" ON gym_members
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Gym members updatable by authenticated" ON gym_members
  FOR UPDATE TO authenticated USING (true);

-- Helper: check if user has a role at a gym
CREATE OR REPLACE FUNCTION is_gym_role(p_gym_id uuid, p_role text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM gym_members
    WHERE gym_id = p_gym_id
      AND user_id = auth.uid()
      AND role = p_role
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_gym_member(p_gym_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM gym_members
    WHERE gym_id = p_gym_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- Plans
-- ============================================

CREATE TABLE plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL,
  billing_period text CHECK (billing_period IN ('monthly', 'yearly')),
  class_count integer,
  is_active boolean NOT NULL DEFAULT true,
  stripe_price_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by authenticated users" ON plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Plans insertable by authenticated" ON plans
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Plans updatable by authenticated" ON plans
  FOR UPDATE TO authenticated USING (true);

-- ============================================
-- Subscriptions
-- ============================================

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  classes_used integer NOT NULL DEFAULT 0,
  period_start timestamptz,
  period_end timestamptz,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Subscriptions insertable by authenticated" ON subscriptions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Subscriptions updatable by authenticated" ON subscriptions
  FOR UPDATE TO authenticated USING (true);

-- ============================================
-- Programs
-- ============================================

CREATE TABLE programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Programs viewable by authenticated" ON programs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Programs insertable by authenticated" ON programs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Programs updatable by authenticated" ON programs
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Programs deletable by authenticated" ON programs
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- Program Enrollments
-- ============================================

CREATE TABLE program_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, user_id)
);

ALTER TABLE program_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollments" ON program_enrollments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Enrollments insertable by authenticated" ON program_enrollments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can delete own enrollments" ON program_enrollments
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================
-- Workouts
-- ============================================

CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  date date NOT NULL,
  title text NOT NULL,
  description text,
  format text NOT NULL CHECK (format IN ('time', 'amrap')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workouts viewable by authenticated" ON workouts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Workouts insertable by authenticated" ON workouts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Workouts updatable by authenticated" ON workouts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Workouts deletable by authenticated" ON workouts
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- Workout Stats
-- ============================================

CREATE TABLE workout_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  time_seconds integer,
  amrap_rounds integer,
  amrap_reps integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workout_id, user_id)
);

ALTER TABLE workout_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats" ON workout_stats
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Stats viewable by gym members" ON workout_stats
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own stats" ON workout_stats
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own stats" ON workout_stats
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ============================================
-- Classes
-- ============================================

CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  default_coach_id uuid REFERENCES profiles(id),
  capacity integer,
  duration_minutes integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Classes viewable by authenticated" ON classes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Classes insertable by authenticated" ON classes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Classes updatable by authenticated" ON classes
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Classes deletable by authenticated" ON classes
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- Class Schedules
-- ============================================

CREATE TABLE class_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schedules viewable by authenticated" ON class_schedules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Schedules insertable by authenticated" ON class_schedules
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Schedules deletable by authenticated" ON class_schedules
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- Class Occurrences
-- ============================================

CREATE TABLE class_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  coach_id uuid REFERENCES profiles(id),
  is_cancelled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, date, start_time)
);

ALTER TABLE class_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Occurrences viewable by authenticated" ON class_occurrences
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Occurrences insertable by authenticated" ON class_occurrences
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Occurrences updatable by authenticated" ON class_occurrences
  FOR UPDATE TO authenticated USING (true);

-- ============================================
-- Class Signups
-- ============================================

CREATE TABLE class_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES class_occurrences(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checked_in boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz,
  checked_in_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (occurrence_id, user_id)
);

ALTER TABLE class_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own signups" ON class_signups
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Signups viewable by gym members" ON class_signups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own signups" ON class_signups
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Signups updatable by authenticated" ON class_signups
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete own signups" ON class_signups
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX idx_gym_members_gym_id ON gym_members(gym_id);
CREATE INDEX idx_gym_members_user_id ON gym_members(user_id);
CREATE INDEX idx_plans_gym_id ON plans(gym_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_gym_id ON subscriptions(gym_id);
CREATE INDEX idx_programs_gym_id ON programs(gym_id);
CREATE INDEX idx_program_enrollments_user_id ON program_enrollments(user_id);
CREATE INDEX idx_workouts_program_id ON workouts(program_id);
CREATE INDEX idx_workouts_date ON workouts(date);
CREATE INDEX idx_workout_stats_workout_id ON workout_stats(workout_id);
CREATE INDEX idx_workout_stats_user_id ON workout_stats(user_id);
CREATE INDEX idx_classes_gym_id ON classes(gym_id);
CREATE INDEX idx_class_schedules_class_id ON class_schedules(class_id);
CREATE INDEX idx_class_occurrences_class_id ON class_occurrences(class_id);
CREATE INDEX idx_class_occurrences_date ON class_occurrences(date);
CREATE INDEX idx_class_signups_occurrence_id ON class_signups(occurrence_id);
CREATE INDEX idx_class_signups_user_id ON class_signups(user_id);

-- ============================================
-- Storage buckets
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('gym-logos', 'gym-logos', true);

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Gym logos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'gym-logos');

CREATE POLICY "Gym logos uploadable by authenticated" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'gym-logos');

CREATE POLICY "Gym logos updatable by authenticated" ON storage.objects
  FOR UPDATE USING (bucket_id = 'gym-logos');

CREATE POLICY "Gym logos deletable by authenticated" ON storage.objects
  FOR DELETE USING (bucket_id = 'gym-logos');
