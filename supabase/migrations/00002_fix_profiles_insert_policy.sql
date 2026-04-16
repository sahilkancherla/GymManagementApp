-- The handle_new_user() trigger needs to insert into profiles.
-- It runs in the context of the newly created auth user, so we need
-- a SECURITY DEFINER on the function to bypass RLS, or an INSERT policy.
-- Using SECURITY DEFINER is cleaner since the trigger should always succeed.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
