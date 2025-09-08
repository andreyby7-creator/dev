-- Удаляем проблемные политики
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Super admins can view all users" ON users;
DROP POLICY IF EXISTS "Super admins can insert users" ON users;
DROP POLICY IF EXISTS "Super admins can update users" ON users;

-- Создаем исправленные RLS политики для users
CREATE POLICY "Enable read access for authenticated users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on id" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS политики для user_profiles (оставляем как есть)
-- Они работают корректно
