# Инструкция по настройке Supabase

## Шаг 1: Создание базы данных

1. Откройте ваш проект в Supabase Dashboard: https://quhcqhntmkinzidfixab.supabase.co
2. Перейдите в раздел **SQL Editor**
3. Откройте файл `supabase-schema.sql` в корне проекта
4. Скопируйте **всё содержимое** файла
5. Вставьте в SQL Editor в Supabase
6. Нажмите **RUN** (или Ctrl+Enter)
7. Дождитесь сообщения об успешном выполнении

## Шаг 2: Установка зависимостей

Установите Supabase клиент:

\`\`\`bash
npm install
# или
pnpm install
# или
yarn install
\`\`\`

## Шаг 3: Проверка переменных окружения

Убедитесь, что файл `.env.local` создан в корне проекта и содержит:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=https://quhcqhntmkinzidfixab.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

## Шаг 4: Готово!

Теперь вы можете использовать Supabase в проекте:

\`\`\`typescript
import { supabase, supabaseAdmin } from '@/lib/supabase'

// Клиентский код
const { data, error } = await supabase.from('contacts').select('*')

// Серверный код (с полными правами)
const { data, error } = await supabaseAdmin.from('deals').select('*')
\`\`\`

## Созданные таблицы

- `contacts` - Контакты
- `mopeds` - Мопеды
- `deals` - Сделки/Аренды
- `kanban_stages` - Канбан стадии
- `kanban_custom_fields` - Кастомные поля
- `kanban_field_groups` - Группы полей
- `document_templates` - Шаблоны документов
- `warehouses` - Склады
- `resources` - Ресурсы
- `users` - Пользователи системы
- `departments` - Отделы
- `employees` - Сотрудники
- `counterparties` - Контрагенты
- `counterparty_contacts` - Связи контрагентов с контактами

## Важно!

⚠️ **SUPABASE_SERVICE_ROLE_KEY** имеет полные права доступа к базе данных. Никогда не используйте его в клиентском коде!

✅ Используйте `supabase` для клиентского кода
✅ Используйте `supabaseAdmin` только в API routes или серверных компонентах Next.js

## Миграция данных

Если у вас уже есть данные в localStorage, вы можете создать скрипт для их миграции в Supabase.
