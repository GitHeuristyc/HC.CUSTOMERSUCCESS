-- Run this in: Supabase dashboard → SQL Editor → New query → Run
-- Adds the link from public.users to auth.users so Supabase Auth can resolve
-- the application user from a logged-in session by email.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID
  REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
