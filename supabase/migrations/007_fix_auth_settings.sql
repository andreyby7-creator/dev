-- Миграция для исправления настроек аутентификации

-- Создаем функцию для ручного создания пользователя без подтверждения
CREATE OR REPLACE FUNCTION public.create_user_without_confirmation(
  user_email text,
  user_password text,
  user_first_name text DEFAULT '',
  user_last_name text DEFAULT '',
  user_role user_role DEFAULT 'user'
)
RETURNS uuid AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Создаем пользователя в auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_super_admin,
    confirmed_at,
    email_change_confirm_status,
    banned_until,
    reauthentication_sent_at,
    last_sign_in_at,
    app_metadata,
    user_metadata,
    identities,
    last_sign_in_with_password,
    last_sign_in_with_password_changed_at,
    email_change,
    email_change_token_new,
    recovery_sent_at,
    email_change_sent_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token
  )
  VALUES (
    (SELECT id FROM auth.instances LIMIT 1),
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object('first_name', user_first_name, 'last_name', user_last_name, 'role', user_role),
    false,
    NOW(),
    0,
    NULL,
    NULL,
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('first_name', user_first_name, 'last_name', user_last_name, 'role', user_role),
    '[]'::jsonb,
    NOW(),
    NOW(),
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  )
  RETURNING id INTO new_user_id;

  -- Создаем запись в нашей таблице users
  INSERT INTO public.users (id, email, role, first_name, last_name, is_active)
  VALUES (new_user_id, user_email, user_role, user_first_name, user_last_name, true);

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
