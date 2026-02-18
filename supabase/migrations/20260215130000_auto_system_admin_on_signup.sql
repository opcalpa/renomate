-- Automatically grant system_admin to carl.palmquist@gmail.com on signup
-- This ensures the admin account is always properly configured after db resets

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, is_system_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    -- Automatically grant system admin to specific email
    CASE WHEN NEW.email = 'carl.palmquist@gmail.com' THEN TRUE ELSE FALSE END
  );
  RETURN NEW;
END;
$$;

-- Also update any existing profile (in case they already signed up)
UPDATE profiles
SET is_system_admin = TRUE
WHERE email = 'carl.palmquist@gmail.com';
