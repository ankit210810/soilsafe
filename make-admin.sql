-- SoilSafe: make ONE existing account the administrator.
-- Run this in Supabase SQL Editor.
-- Replace the email below with the exact email used for your admin login.

UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE id = (
  SELECT id FROM auth.users
  WHERE lower(email) = lower('YOUR_ADMIN_EMAIL@example.com')
  LIMIT 1
);

-- Verify the role:
SELECT p.id, u.email, p.full_name, p.role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE lower(u.email) = lower('YOUR_ADMIN_EMAIL@example.com');
