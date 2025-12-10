-- =====================================================
-- Kazdream Database Schema for Supabase
-- =====================================================
-- Этот файл содержит все SQL команды для создания
-- таблиц базы данных в Supabase
-- Скопируйте и вставьте в SQL Editor в Supabase
-- =====================================================

-- =====================================================
-- 1. КОНТАКТЫ (Contacts)
-- =====================================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    iin TEXT,
    doc_number TEXT,
    status TEXT DEFAULT 'active',
    photo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для contacts
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_iin ON contacts(iin);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);

-- =====================================================
-- 2. МОПЕДЫ (Mopeds)
-- =====================================================
CREATE TABLE IF NOT EXISTS mopeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    license_plate TEXT NOT NULL UNIQUE,
    photo TEXT,
    status TEXT NOT NULL CHECK (status IN ('available', 'rented', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для mopeds
CREATE INDEX IF NOT EXISTS idx_mopeds_license_plate ON mopeds(license_plate);
CREATE INDEX IF NOT EXISTS idx_mopeds_status ON mopeds(status);
CREATE INDEX IF NOT EXISTS idx_mopeds_brand_model ON mopeds(brand, model);

-- =====================================================
-- 3. КАНБАН СТАДИИ (Kanban Stages)
-- =====================================================
CREATE TABLE IF NOT EXISTS kanban_stages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    order_num INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для kanban_stages
CREATE INDEX IF NOT EXISTS idx_kanban_stages_order ON kanban_stages(order_num);

-- Вставка дефолтных стадий
INSERT INTO kanban_stages (id, name, color, order_num) VALUES
    ('new', 'Новая заявка', '#64748b', 0),
    ('in-work', 'Принято в работу', '#3b82f6', 1),
    ('qualified', 'Квалификация пройдена', '#06b6d4', 2),
    ('proposal-sent', 'Предложение отправлено', '#a855f7', 3),
    ('prepaid', 'Предоплата получена', '#6366f1', 4),
    ('confirmed', 'Бронь подтверждена', '#22c55e', 5),
    ('issued', 'Мопед выдан', '#10b981', 6),
    ('inspection-scheduled', 'Осмотр назначен', '#14b8a6', 7),
    ('inspection-overdue', 'Осмотр просрочен', '#f97316', 8),
    ('inspection-done', 'Осмотр проведен', '#84cc16', 9),
    ('extended', 'Аренда продлена', '#8b5cf6', 10),
    ('overdue', 'Аренда просрочена', '#ef4444', 11),
    ('incident', 'ЧП', '#dc2626', 12),
    ('returned', 'Мопед возвращен', '#0ea5e9', 13),
    ('completed', 'Аренда завершена', '#6b7280', 14)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. СДЕЛКИ/АРЕНДЫ (Deals/Rentals)
-- =====================================================
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    stage TEXT NOT NULL REFERENCES kanban_stages(id),
    source TEXT,
    manager TEXT,
    dates TEXT,
    date_start DATE,
    date_end DATE,
    moped TEXT,
    moped_id UUID REFERENCES mopeds(id) ON DELETE SET NULL,
    amount TEXT,
    payment_type TEXT,
    price_per_day TEXT,
    deposit_amount TEXT,
    
    -- Контактные данные
    contact_name TEXT,
    contact_iin TEXT,
    contact_doc_number TEXT,
    contact_phone TEXT,
    contact_status TEXT,
    
    -- Контакт для экстренной связи
    emergency_contact_name TEXT,
    emergency_contact_iin TEXT,
    emergency_contact_doc_number TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_status TEXT,
    
    -- Статус и приоритет
    status TEXT CHECK (status IN ('not-started', 'in-research', 'on-track', 'complete')),
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
    
    -- Assignees как JSONB массив
    assignees JSONB DEFAULT '[]'::jsonb,
    
    -- Counters
    comments INTEGER DEFAULT 0,
    links INTEGER DEFAULT 0,
    
    -- Tasks как JSONB объект
    tasks JSONB DEFAULT '{"completed": 0, "total": 0}'::jsonb,
    
    -- Custom fields как JSONB массив
    custom_fields JSONB DEFAULT '[]'::jsonb,
    
    -- Комментарий
    comment TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для deals
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_moped_id ON deals(moped_id);
CREATE INDEX IF NOT EXISTS idx_deals_phone ON deals(phone);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_priority ON deals(priority);
CREATE INDEX IF NOT EXISTS idx_deals_date_start ON deals(date_start);
CREATE INDEX IF NOT EXISTS idx_deals_date_end ON deals(date_end);

-- =====================================================
-- 5. КАНБАН ПОЛЯ (Kanban Custom Fields)
-- =====================================================
CREATE TABLE IF NOT EXISTS kanban_custom_fields (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text', 'number', 'flag', 'list', 'multilist', 'date')),
    required BOOLEAN DEFAULT FALSE,
    options JSONB, -- Для list и multilist типов
    group_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для kanban_custom_fields
CREATE INDEX IF NOT EXISTS idx_kanban_custom_fields_group ON kanban_custom_fields(group_id);

-- Вставка дефолтных полей
INSERT INTO kanban_custom_fields (id, name, type, required, group_id) VALUES
    ('budget', 'Бюджет сделки', 'number', true, 'basic'),
    ('brief', 'Бриф', 'text', false, 'basic'),
    ('kp', 'КП', 'text', true, 'basic'),
    ('objections', 'Возражения', 'list', false, 'basic'),
    ('requisites', 'Реквизиты', 'text', false, 'basic'),
    ('invoice', 'Счет', 'text', false, 'basic'),
    ('rejection-reason', 'Причины отказа', 'list', false, 'basic')
ON CONFLICT (id) DO NOTHING;

-- Обновление полей с опциями
UPDATE kanban_custom_fields SET options = '["Цена", "Качество", "Сроки"]'::jsonb WHERE id = 'objections';
UPDATE kanban_custom_fields SET options = '["Дорого", "Не подходит", "Нашли другого", "Передумали", "Не отвечает", "Другое"]'::jsonb WHERE id = 'rejection-reason';

-- =====================================================
-- 6. КАНБАН ГРУППЫ ПОЛЕЙ (Kanban Field Groups)
-- =====================================================
CREATE TABLE IF NOT EXISTS kanban_field_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    order_num INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для kanban_field_groups
CREATE INDEX IF NOT EXISTS idx_kanban_field_groups_order ON kanban_field_groups(order_num);

-- Вставка дефолтных групп
INSERT INTO kanban_field_groups (id, name, order_num) VALUES
    ('basic', 'Основное', 0),
    ('stats', 'Статистика', 1)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. ШАБЛОНЫ ДОКУМЕНТОВ (Document Templates)
-- =====================================================
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]'::jsonb, -- Массив строк
    content BYTEA NOT NULL, -- Бинарный контент файла
    document_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для document_templates
CREATE INDEX IF NOT EXISTS idx_document_templates_document_type ON document_templates(document_type);
CREATE INDEX IF NOT EXISTS idx_document_templates_created_at ON document_templates(created_at);

-- =====================================================
-- 8. СКЛАДЫ (Warehouses)
-- =====================================================
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    resource_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для warehouses
CREATE INDEX IF NOT EXISTS idx_warehouses_type ON warehouses(type);

-- =====================================================
-- 9. РЕСУРСЫ (Resources)
-- =====================================================
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для resources
CREATE INDEX IF NOT EXISTS idx_resources_warehouse_id ON resources(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);

-- =====================================================
-- 10. ОТДЕЛЫ (Departments)
-- =====================================================
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    employee_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для departments
CREATE INDEX IF NOT EXISTS idx_departments_type ON departments(type);

-- =====================================================
-- 11. СОТРУДНИКИ (Employees)
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    department UUID REFERENCES departments(id) ON DELETE SET NULL,
    contact TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для employees
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- =====================================================
-- 12. КОНТРАГЕНТЫ (Counterparties)
-- =====================================================
CREATE TABLE IF NOT EXISTS counterparties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    contact TEXT NOT NULL,
    inn TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
    contact_ids JSONB DEFAULT '[]'::jsonb, -- Массив ID контактов
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для counterparties
CREATE INDEX IF NOT EXISTS idx_counterparties_inn ON counterparties(inn);
CREATE INDEX IF NOT EXISTS idx_counterparties_status ON counterparties(status);
CREATE INDEX IF NOT EXISTS idx_counterparties_type ON counterparties(type);

-- =====================================================
-- 13. СВЯЗИ КОНТРАГЕНТОВ С КОНТАКТАМИ (Counterparty Contacts)
-- =====================================================
CREATE TABLE IF NOT EXISTS counterparty_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    counterparty_id UUID NOT NULL REFERENCES counterparties(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(counterparty_id, contact_id)
);

-- Индексы для counterparty_contacts
CREATE INDEX IF NOT EXISTS idx_counterparty_contacts_counterparty ON counterparty_contacts(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_counterparty_contacts_contact ON counterparty_contacts(contact_id);

-- =====================================================
-- 14. ФУНКЦИИ ДЛЯ ОБНОВЛЕНИЯ updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mopeds_updated_at ON mopeds;
CREATE TRIGGER update_mopeds_updated_at BEFORE UPDATE ON mopeds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kanban_stages_updated_at ON kanban_stages;
CREATE TRIGGER update_kanban_stages_updated_at BEFORE UPDATE ON kanban_stages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deals_updated_at ON deals;
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kanban_custom_fields_updated_at ON kanban_custom_fields;
CREATE TRIGGER update_kanban_custom_fields_updated_at BEFORE UPDATE ON kanban_custom_fields
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kanban_field_groups_updated_at ON kanban_field_groups;
CREATE TRIGGER update_kanban_field_groups_updated_at BEFORE UPDATE ON kanban_field_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_templates_updated_at ON document_templates;
CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON document_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_warehouses_updated_at ON warehouses;
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resources_updated_at ON resources;
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_counterparties_updated_at ON counterparties;
CREATE TRIGGER update_counterparties_updated_at BEFORE UPDATE ON counterparties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 15. ROW LEVEL SECURITY (RLS) POLICY
-- =====================================================
-- Включаем RLS для всех таблиц
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mopeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_field_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterparties ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterparty_contacts ENABLE ROW LEVEL SECURITY;

-- Создаем политики для чтения и записи всем авторизованным пользователям
-- Для production лучше настроить более строгие политики

-- Контакты
DROP POLICY IF EXISTS "Allow all access to contacts" ON contacts;
CREATE POLICY "Allow all access to contacts" ON contacts
    FOR ALL USING (true) WITH CHECK (true);

-- Мопеды
DROP POLICY IF EXISTS "Allow all access to mopeds" ON mopeds;
CREATE POLICY "Allow all access to mopeds" ON mopeds
    FOR ALL USING (true) WITH CHECK (true);

-- Канбан стадии
DROP POLICY IF EXISTS "Allow all access to kanban_stages" ON kanban_stages;
CREATE POLICY "Allow all access to kanban_stages" ON kanban_stages
    FOR ALL USING (true) WITH CHECK (true);

-- Сделки
DROP POLICY IF EXISTS "Allow all access to deals" ON deals;
CREATE POLICY "Allow all access to deals" ON deals
    FOR ALL USING (true) WITH CHECK (true);

-- Канбан поля
DROP POLICY IF EXISTS "Allow all access to kanban_custom_fields" ON kanban_custom_fields;
CREATE POLICY "Allow all access to kanban_custom_fields" ON kanban_custom_fields
    FOR ALL USING (true) WITH CHECK (true);

-- Канбан группы полей
DROP POLICY IF EXISTS "Allow all access to kanban_field_groups" ON kanban_field_groups;
CREATE POLICY "Allow all access to kanban_field_groups" ON kanban_field_groups
    FOR ALL USING (true) WITH CHECK (true);

-- Шаблоны документов
DROP POLICY IF EXISTS "Allow all access to document_templates" ON document_templates;
CREATE POLICY "Allow all access to document_templates" ON document_templates
    FOR ALL USING (true) WITH CHECK (true);

-- Склады
DROP POLICY IF EXISTS "Allow all access to warehouses" ON warehouses;
CREATE POLICY "Allow all access to warehouses" ON warehouses
    FOR ALL USING (true) WITH CHECK (true);

-- Ресурсы
DROP POLICY IF EXISTS "Allow all access to resources" ON resources;
CREATE POLICY "Allow all access to resources" ON resources
    FOR ALL USING (true) WITH CHECK (true);

-- Отделы
DROP POLICY IF EXISTS "Allow all access to departments" ON departments;
CREATE POLICY "Allow all access to departments" ON departments
    FOR ALL USING (true) WITH CHECK (true);

-- Сотрудники
DROP POLICY IF EXISTS "Allow all access to employees" ON employees;
CREATE POLICY "Allow all access to employees" ON employees
    FOR ALL USING (true) WITH CHECK (true);

-- Контрагенты
DROP POLICY IF EXISTS "Allow all access to counterparties" ON counterparties;
CREATE POLICY "Allow all access to counterparties" ON counterparties
    FOR ALL USING (true) WITH CHECK (true);

-- Связи контрагентов с контактами
DROP POLICY IF EXISTS "Allow all access to counterparty_contacts" ON counterparty_contacts;
CREATE POLICY "Allow all access to counterparty_contacts" ON counterparty_contacts
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 15. ПОЛЬЗОВАТЕЛИ (Users)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    permissions JSONB DEFAULT '[]'::jsonb, -- Массив строк с разрешениями на разделы
    tab_permissions JSONB DEFAULT '{}'::jsonb, -- Объект с правами на вкладки: { "mopeds": [{ "tab": "rentals", "access": "edit" }] }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Удаляем индекс на role, если он существует (должен быть до удаления колонки)
DROP INDEX IF EXISTS idx_users_role;

-- Удаляем колонку role, если она существует (для миграции существующих таблиц)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users DROP COLUMN role;
    END IF;
END $$;

-- Индексы для users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Удаляем индекс на role, если он существует
DROP INDEX IF EXISTS idx_users_role;

-- Вставка дефолтного администратора
INSERT INTO users (id, name, email, password, permissions, tab_permissions) VALUES
    ('00000000-0000-0000-0000-000000000001'::uuid, 'Администратор', 'info@dreamrent.kz', 'kyadr3thcxvsgxok)Rca', 
     '["dashboard", "finances", "motorcycles", "mopeds", "cars", "apartments", "clients", "projects", "settings", "help", "users"]'::jsonb,
     '{"mopeds": [{"tab": "rentals", "access": "edit"}, {"tab": "inventory", "access": "edit"}, {"tab": "contacts", "access": "edit"}], "cars": [{"tab": "rentals", "access": "edit"}, {"tab": "inventory", "access": "edit"}, {"tab": "contacts", "access": "edit"}], "motorcycles": [{"tab": "rentals", "access": "edit"}, {"tab": "inventory", "access": "edit"}, {"tab": "contacts", "access": "edit"}], "apartments": [{"tab": "rentals", "access": "edit"}, {"tab": "inventory", "access": "edit"}, {"tab": "contacts", "access": "edit"}]}'::jsonb)
ON CONFLICT (email) DO NOTHING;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS политика для users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to users" ON users;
CREATE POLICY "Allow all access to users" ON users
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- ГОТОВО!
-- =====================================================
-- Все таблицы созданы и настроены
-- RLS политики применены
-- Триггеры для updated_at настроены
-- Индексы созданы для оптимизации запросов
-- =====================================================
