-- Отладочная миграция для проверки триггера

-- Создаем функцию для проверки триггера
CREATE OR REPLACE FUNCTION public.check_trigger_function()
RETURNS TABLE(function_name text, exist_check boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'handle_new_user'::text,
    EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'handle_new_user' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Проверяем существование триггера
CREATE OR REPLACE FUNCTION public.check_trigger_exists()
RETURNS TABLE(trigger_name text, exist_check boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'on_auth_user_created'::text,
    EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'on_auth_user_created' 
      AND tgrelid = (SELECT oid FROM pg_class WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth'))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Включаем логирование для отладки
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Добавляем политику для вставки через триггер
CREATE POLICY "Enable insert for trigger" ON users
  FOR INSERT WITH CHECK (true);
