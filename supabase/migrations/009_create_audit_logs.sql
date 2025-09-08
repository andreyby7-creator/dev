-- Создание таблицы audit_logs для системы аудита
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'warning', 'info')),
    resource_type TEXT,
    resource_id TEXT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_role ON public.audit_logs(user_role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON public.audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON public.audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON public.audit_logs(ip_address);

-- Создание составного индекса для частых запросов
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON public.audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_role_timestamp ON public.audit_logs(user_role, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON public.audit_logs(action, timestamp DESC);

-- RLS политики для audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- SUPER_ADMIN может видеть все логи
CREATE POLICY "super_admin_can_view_all_audit_logs" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

-- NETWORK_MANAGER может видеть логи своей сети
CREATE POLICY "network_manager_can_view_network_audit_logs" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.networks n ON n.manager_id = u.id
            JOIN public.stores s ON s.network_id = n.id
            WHERE u.id = auth.uid()
            AND u.role = 'network_manager'
            AND (
                audit_logs.resource_type = 'network' AND audit_logs.resource_id = n.id::text
                OR audit_logs.resource_type = 'store' AND audit_logs.resource_id = s.id::text
                OR audit_logs.user_id IN (
                    SELECT id FROM public.users WHERE network_id = n.id
                )
            )
        )
    );

-- STORE_MANAGER может видеть логи своего магазина
CREATE POLICY "store_manager_can_view_store_audit_logs" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.stores s ON s.manager_id = u.id
            WHERE u.id = auth.uid()
            AND u.role = 'store_manager'
            AND (
                audit_logs.resource_type = 'store' AND audit_logs.resource_id = s.id::text
                OR audit_logs.user_id IN (
                    SELECT id FROM public.users WHERE store_id = s.id
                )
            )
        )
    );

-- BRAND_MANAGER может видеть логи своего бренда
CREATE POLICY "brand_manager_can_view_brand_audit_logs" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.brands b ON b.manager_id = u.id
            WHERE u.id = auth.uid()
            AND u.role = 'brand_manager'
            AND (
                audit_logs.resource_type = 'brand' AND audit_logs.resource_id = b.id::text
                OR audit_logs.user_id IN (
                    SELECT id FROM public.users WHERE brand_id = b.id
                )
            )
        )
    );

-- USER может видеть только свои логи
CREATE POLICY "user_can_view_own_audit_logs" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'user'
            AND audit_logs.user_id = auth.uid()
        )
    );

-- Политика для вставки - любой аутентифицированный пользователь может создавать логи
CREATE POLICY "authenticated_users_can_insert_audit_logs" ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Функция для автоматического логирования действий пользователей
CREATE OR REPLACE FUNCTION public.log_user_action(
    p_user_id UUID,
    p_user_role TEXT,
    p_action TEXT,
    p_status TEXT DEFAULT 'success',
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        user_role,
        action,
        status,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        p_user_id,
        p_user_role,
        p_action,
        p_status,
        p_resource_type,
        p_resource_id,
        p_details,
        p_ip_address,
        p_user_agent,
        p_metadata
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Триггер для автоматического логирования изменений в таблице users
CREATE OR REPLACE FUNCTION public.audit_user_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_user_action(
            NEW.id,
            NEW.role,
            'user_register',
            'success',
            'user',
            NEW.id::text,
            jsonb_build_object(
                'email', NEW.email,
                'first_name', NEW.first_name,
                'last_name', NEW.last_name,
                'role', NEW.role
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_user_action(
            NEW.id,
            NEW.role,
            'user_update_profile',
            'success',
            'user',
            NEW.id::text,
            jsonb_build_object(
                'changed_fields', (
                    SELECT jsonb_object_agg(key, value)
                    FROM jsonb_each(to_jsonb(NEW)) AS new_data(key, value)
                    WHERE key IN ('email', 'first_name', 'last_name', 'role', 'phone')
                    AND value IS DISTINCT FROM (
                        SELECT value FROM jsonb_each(to_jsonb(OLD)) AS old_data(key, value)
                        WHERE old_data.key = new_data.key
                    )
                )
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.log_user_action(
            OLD.id,
            OLD.role,
            'user_delete_account',
            'success',
            'user',
            OLD.id::text,
            jsonb_build_object(
                'email', OLD.email,
                'first_name', OLD.first_name,
                'last_name', OLD.last_name,
                'role', OLD.role
            )
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Создание триггера для таблицы users
DROP TRIGGER IF EXISTS trigger_audit_user_changes ON public.users;
CREATE TRIGGER trigger_audit_user_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.audit_user_changes();

-- Функция для очистки старых логов (автоматическая архивация)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(p_days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.audit_logs
    WHERE timestamp < NOW() - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$;

-- Создание представления для статистики аудита
CREATE OR REPLACE VIEW public.audit_stats AS
SELECT
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE status = 'success') as success_count,
    COUNT(*) FILTER (WHERE status = 'failure') as failure_count,
    COUNT(*) FILTER (WHERE status = 'warning') as warning_count,
    COUNT(*) FILTER (WHERE status = 'info') as info_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT user_role) as unique_roles,
    COUNT(DISTINCT action) as unique_actions,
    MIN(timestamp) as first_action,
    MAX(timestamp) as last_action
FROM public.audit_logs;

-- RLS для представления статистики
ALTER VIEW public.audit_stats SET (security_invoker = true);

-- Комментарии для документации
COMMENT ON TABLE public.audit_logs IS 'Таблица для хранения логов аудита действий пользователей';
COMMENT ON COLUMN public.audit_logs.id IS 'Уникальный идентификатор записи аудита';
COMMENT ON COLUMN public.audit_logs.user_id IS 'ID пользователя, выполнившего действие';
COMMENT ON COLUMN public.audit_logs.user_role IS 'Роль пользователя на момент выполнения действия';
COMMENT ON COLUMN public.audit_logs.action IS 'Тип выполненного действия';
COMMENT ON COLUMN public.audit_logs.status IS 'Статус выполнения действия (success/failure/warning/info)';
COMMENT ON COLUMN public.audit_logs.resource_type IS 'Тип ресурса, к которому относится действие';
COMMENT ON COLUMN public.audit_logs.resource_id IS 'ID ресурса, к которому относится действие';
COMMENT ON COLUMN public.audit_logs.details IS 'Дополнительные детали действия в формате JSON';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'IP адрес пользователя';
COMMENT ON COLUMN public.audit_logs.user_agent IS 'User-Agent браузера';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Дополнительные метаданные';
COMMENT ON COLUMN public.audit_logs.timestamp IS 'Время выполнения действия';
