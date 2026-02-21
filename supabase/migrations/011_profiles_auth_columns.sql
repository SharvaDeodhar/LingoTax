-- Add auth metadata columns to profiles for settings page and analytics
-- has_password: true if user has email+password identity linked (NOT storing the password)
-- primary_auth_provider: first provider used to sign up ('google', 'email', etc.)
-- last_sign_in_at: cached from auth.users for display purposes

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_password         BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS primary_auth_provider TEXT,
  ADD COLUMN IF NOT EXISTS last_sign_in_at       TIMESTAMPTZ;

-- Update handle_new_user trigger to also populate primary_auth_provider
-- raw_app_meta_data->>'provider' is set by Supabase Auth on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider TEXT;
BEGIN
  v_provider := COALESCE(
    NEW.raw_app_meta_data->>'provider',
    'email'
  );

  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    avatar_url,
    primary_auth_provider,
    has_password
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    v_provider,
    -- has_password = true only if signing up via email+password (not OTP, not OAuth)
    CASE WHEN v_provider = 'email' AND NEW.encrypted_password IS NOT NULL THEN true ELSE false END
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
