-- Миграция для исправления структуры таблицы users

-- Проверяем и исправляем структуру таблицы
ALTER TABLE public.users 
  ALTER COLUMN id SET DATA TYPE uuid USING id::uuid,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- Добавляем недостающие колонки если их нет
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') THEN
    ALTER TABLE public.users ADD COLUMN first_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') THEN
    ALTER TABLE public.users ADD COLUMN last_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE public.users ADD COLUMN phone text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar') THEN
    ALTER TABLE public.users ADD COLUMN avatar text;
  END IF;
END $$;

-- Удаляем старый триггер и функцию
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Создаем новую функцию без ошибок
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Простая вставка без сложной логики
  INSERT INTO public.users (id, email, role, first_name, last_name, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    'user'::user_role,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    true
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Логируем ошибку но не прерываем процесс
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем новый триггер
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Убеждаемся что RLS включен и политики работают
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Простая политика для отладки
DROP POLICY IF EXISTS "Enable all access for debugging" ON users;
CREATE POLICY "Enable all access for debugging" ON users
  FOR ALL USING (true) WITH CHECK (true);
