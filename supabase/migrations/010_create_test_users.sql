-- Создание тестовых пользователей для всех ролей
-- Используем функцию create_simple_user для создания пользователей

-- 1. SUPER_ADMIN пользователь
SELECT public.create_simple_user(
    'superadmin@testsalespot.by',
    'SuperAdmin123!',
    'super_admin',
    'Супер',
    'Администратор',
    '+375291234567'
);

-- 2. NETWORK_MANAGER пользователь
SELECT public.create_simple_user(
    'networkmanager@testsalespot.by',
    'NetworkManager123!',
    'network_manager',
    'Сетевой',
    'Менеджер',
    '+375292345678'
);

-- 3. STORE_MANAGER пользователь
SELECT public.create_simple_user(
    'storemanager@testsalespot.by',
    'StoreManager123!',
    'store_manager',
    'Магазинный',
    'Менеджер',
    '+375293456789'
);

-- 4. BRAND_MANAGER пользователь
SELECT public.create_simple_user(
    'brandmanager@testsalespot.by',
    'BrandManager123!',
    'brand_manager',
    'Брендовый',
    'Менеджер',
    '+375294567890'
);

-- 5. USER пользователь
SELECT public.create_simple_user(
    'user@testsalespot.by',
    'User123!',
    'user',
    'Обычный',
    'Пользователь',
    '+375295678901'
);

-- Создание тестовых сетей
INSERT INTO public.networks (id, name, description, logo_url, website_url, manager_id)
VALUES 
    (
        gen_random_uuid(),
        'Тестовая Сеть Магазинов',
        'Тестовая сеть для демонстрации функциональности',
        'https://via.placeholder.com/150x150?text=Network',
        'https://testnetwork.by',
        (SELECT id FROM public.users WHERE email = 'networkmanager@testsalespot.by' LIMIT 1)
    ),
    (
        gen_random_uuid(),
        'Другая Тестовая Сеть',
        'Вторая тестовая сеть для демонстрации',
        'https://via.placeholder.com/150x150?text=Network2',
        'https://testnetwork2.by',
        (SELECT id FROM public.users WHERE email = 'networkmanager@testsalespot.by' LIMIT 1)
    );

-- Создание тестовых магазинов
INSERT INTO public.stores (id, name, description, address, phone, email, website_url, logo_url, network_id, manager_id, latitude, longitude, working_hours)
VALUES 
    (
        gen_random_uuid(),
        'Тестовый Магазин №1',
        'Первый тестовый магазин в сети',
        'ул. Тестовая, 1, Минск, Беларусь',
        '+375291111111',
        'store1@testnetwork.by',
        'https://store1.testnetwork.by',
        'https://via.placeholder.com/150x150?text=Store1',
        (SELECT id FROM public.networks WHERE name = 'Тестовая Сеть Магазинов' LIMIT 1),
        (SELECT id FROM public.users WHERE email = 'storemanager@testsalespot.by' LIMIT 1),
        53.902284,
        27.561831,
        '{"monday": {"open": "09:00", "close": "21:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "friday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "20:00"}, "sunday": {"open": "10:00", "close": "18:00"}}'
    ),
    (
        gen_random_uuid(),
        'Тестовый Магазин №2',
        'Второй тестовый магазин в сети',
        'ул. Другая, 2, Минск, Беларусь',
        '+375292222222',
        'store2@testnetwork.by',
        'https://store2.testnetwork.by',
        'https://via.placeholder.com/150x150?text=Store2',
        (SELECT id FROM public.networks WHERE name = 'Тестовая Сеть Магазинов' LIMIT 1),
        (SELECT id FROM public.users WHERE email = 'storemanager@testsalespot.by' LIMIT 1),
        53.908284,
        27.571831,
        '{"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "22:00"}, "saturday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "09:00", "close": "19:00"}}'
    );

-- Создание тестовых брендов
INSERT INTO public.brands (id, name, description, logo_url, website_url, manager_id, category)
VALUES 
    (
        gen_random_uuid(),
        'Тестовый Бренд',
        'Тестовый бренд для демонстрации функциональности',
        'https://via.placeholder.com/150x150?text=Brand',
        'https://testbrand.by',
        (SELECT id FROM public.users WHERE email = 'brandmanager@testsalespot.by' LIMIT 1),
        'electronics'
    ),
    (
        gen_random_uuid(),
        'Другой Тестовый Бренд',
        'Второй тестовый бренд для демонстрации',
        'https://via.placeholder.com/150x150?text=Brand2',
        'https://testbrand2.by',
        (SELECT id FROM public.users WHERE email = 'brandmanager@testsalespot.by' LIMIT 1),
        'clothing'
    );

-- Создание тестовых карт лояльности
INSERT INTO public.loyalty_cards (id, name, description, discount_percentage, points_multiplier, network_id, store_id, brand_id, created_by, status, valid_from, valid_until, terms_conditions)
VALUES 
    (
        gen_random_uuid(),
        'Тестовая Карта Сети',
        'Тестовая карта лояльности сети магазинов',
        10.0,
        1.5,
        (SELECT id FROM public.networks WHERE name = 'Тестовая Сеть Магазинов' LIMIT 1),
        NULL,
        NULL,
        (SELECT id FROM public.users WHERE email = 'networkmanager@testsalespot.by' LIMIT 1),
        'active',
        NOW(),
        NOW() + INTERVAL '1 year',
        'Тестовые условия использования карты лояльности сети'
    ),
    (
        gen_random_uuid(),
        'Тестовая Карта Магазина',
        'Тестовая карта лояльности конкретного магазина',
        15.0,
        2.0,
        NULL,
        (SELECT id FROM public.stores WHERE name = 'Тестовый Магазин №1' LIMIT 1),
        NULL,
        (SELECT id FROM public.users WHERE email = 'storemanager@testsalespot.by' LIMIT 1),
        'active',
        NOW(),
        NOW() + INTERVAL '6 months',
        'Тестовые условия использования карты лояльности магазина'
    ),
    (
        gen_random_uuid(),
        'Тестовая Карта Бренда',
        'Тестовая карта лояльности бренда',
        20.0,
        2.5,
        NULL,
        NULL,
        (SELECT id FROM public.brands WHERE name = 'Тестовый Бренд' LIMIT 1),
        (SELECT id FROM public.users WHERE email = 'brandmanager@testsalespot.by' LIMIT 1),
        'active',
        NOW(),
        NOW() + INTERVAL '2 years',
        'Тестовые условия использования карты лояльности бренда'
    );

-- Обновление пользователей с привязкой к сетям, магазинам и брендам
UPDATE public.users 
SET 
    network_id = (SELECT id FROM public.networks WHERE name = 'Тестовая Сеть Магазинов' LIMIT 1),
    store_id = (SELECT id FROM public.stores WHERE name = 'Тестовый Магазин №1' LIMIT 1),
    brand_id = (SELECT id FROM public.brands WHERE name = 'Тестовый Бренд' LIMIT 1)
WHERE email = 'user@testsalespot.by';

-- Создание тестовых активаций карт лояльности
INSERT INTO public.card_activations (id, user_id, loyalty_card_id, activated_at, status, points_earned, total_spent)
VALUES 
    (
        gen_random_uuid(),
        (SELECT id FROM public.users WHERE email = 'user@testsalespot.by' LIMIT 1),
        (SELECT id FROM public.loyalty_cards WHERE name = 'Тестовая Карта Сети' LIMIT 1),
        NOW() - INTERVAL '1 day',
        'active',
        150,
        1000.00
    ),
    (
        gen_random_uuid(),
        (SELECT id FROM public.users WHERE email = 'user@testsalespot.by' LIMIT 1),
        (SELECT id FROM public.loyalty_cards WHERE name = 'Тестовая Карта Магазина' LIMIT 1),
        NOW() - INTERVAL '2 days',
        'active',
        200,
        800.00
    ),
    (
        gen_random_uuid(),
        (SELECT id FROM public.users WHERE email = 'user@testsalespot.by' LIMIT 1),
        (SELECT id FROM public.loyalty_cards WHERE name = 'Тестовая Карта Бренда' LIMIT 1),
        NOW() - INTERVAL '3 days',
        'active',
        300,
        1200.00
    );

-- Создание тестовых транзакций
INSERT INTO public.transactions (id, user_id, loyalty_card_id, amount, points_earned, transaction_type, status, created_at)
VALUES 
    (
        gen_random_uuid(),
        (SELECT id FROM public.users WHERE email = 'user@testsalespot.by' LIMIT 1),
        (SELECT id FROM public.loyalty_cards WHERE name = 'Тестовая Карта Сети' LIMIT 1),
        500.00,
        75,
        'purchase',
        'completed',
        NOW() - INTERVAL '1 hour'
    ),
    (
        gen_random_uuid(),
        (SELECT id FROM public.users WHERE email = 'user@testsalespot.by' LIMIT 1),
        (SELECT id FROM public.loyalty_cards WHERE name = 'Тестовая Карта Магазина' LIMIT 1),
        300.00,
        60,
        'purchase',
        'completed',
        NOW() - INTERVAL '2 hours'
    ),
    (
        gen_random_uuid(),
        (SELECT id FROM public.users WHERE email = 'user@testsalespot.by' LIMIT 1),
        (SELECT id FROM public.loyalty_cards WHERE name = 'Тестовая Карта Бренда' LIMIT 1),
        800.00,
        200,
        'purchase',
        'completed',
        NOW() - INTERVAL '3 hours'
    );

-- Создание тестовых уведомлений
INSERT INTO public.notifications (id, user_id, title, message, type, status, created_at, read_at)
VALUES 
    (
        gen_random_uuid(),
        (SELECT id FROM public.users WHERE email = 'user@testsalespot.by' LIMIT 1),
        'Добро пожаловать!',
        'Добро пожаловать в SaleSpot BY! Активируйте карты лояльности и получайте скидки.',
        'welcome',
        'sent',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '23 hours'
    ),
    (
        gen_random_uuid(),
        (SELECT id FROM public.users WHERE email = 'user@testsalespot.by' LIMIT 1),
        'Новая акция!',
        'В вашем любимом магазине действует скидка 20% на все товары!',
        'promotion',
        'sent',
        NOW() - INTERVAL '2 hours',
        NULL
    ),
    (
        gen_random_uuid(),
        (SELECT id FROM public.users WHERE email = 'user@testsalespot.by' LIMIT 1),
        'Начислены баллы',
        'За покупку на сумму 500 BYN вам начислено 75 баллов.',
        'points',
        'sent',
        NOW() - INTERVAL '1 hour',
        NULL
    );

-- Комментарии для документации
COMMENT ON TABLE public.users IS 'Тестовые пользователи созданы для демонстрации функциональности системы ролей';
COMMENT ON TABLE public.networks IS 'Тестовые сети созданы для демонстрации функциональности';
COMMENT ON TABLE public.stores IS 'Тестовые магазины созданы для демонстрации функциональности';
COMMENT ON TABLE public.brands IS 'Тестовые бренды созданы для демонстрации функциональности';
COMMENT ON TABLE public.loyalty_cards IS 'Тестовые карты лояльности созданы для демонстрации функциональности';
COMMENT ON TABLE public.card_activations IS 'Тестовые активации карт созданы для демонстрации функциональности';
COMMENT ON TABLE public.transactions IS 'Тестовые транзакции созданы для демонстрации функциональности';
COMMENT ON TABLE public.notifications IS 'Тестовые уведомления созданы для демонстрации функциональности';
