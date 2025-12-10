"use client"

import { supabase } from './supabase'

export type UserRole = "admin" | "manager" | "viewer"

export type AccessPermission =
  | "dashboard"
  | "finances"
  | "motorcycles"
  | "mopeds"
  | "mopeds.rentals"
  | "mopeds.inventory"
  | "mopeds.contacts"
  | "cars"
  | "apartments"
  | "clients"
  | "projects"
  | "settings"
  | "help"
  | "users"

export type TabAccessLevel = "view" | "edit" | "none"

export type TabName = "rentals" | "inventory" | "contacts"

export type TabPermission = {
  tab: TabName
  access: TabAccessLevel
}

// Разделы, которые имеют вкладки
export type SectionWithTabs = "mopeds" | "cars" | "motorcycles" | "apartments"

// Конфигурация вкладок для каждого раздела
export const SECTION_TABS: Record<SectionWithTabs, TabName[]> = {
  mopeds: ["rentals", "inventory", "contacts"],
  cars: ["rentals", "inventory", "contacts"],
  motorcycles: ["rentals", "inventory", "contacts"],
  apartments: ["rentals", "inventory", "contacts"],
}

// Названия разделов для отображения
export const SECTION_LABELS: Record<SectionWithTabs, string> = {
  mopeds: "Мопеды",
  cars: "Авто",
  motorcycles: "Мотоциклы",
  apartments: "Квартиры",
}

export type AppUser = {
  id: string
  name: string
  email: string
  password: string
  role: UserRole
  permissions: AccessPermission[]
  tabPermissions?: Record<string, TabPermission[]> // Например: { "mopeds": [{ tab: "rentals", access: "edit" }, ...] }
  createdAt: string
}

const CACHE_KEY = 'crm_users_cache'
const CACHE_TIMESTAMP_KEY = 'crm_users_cache_timestamp'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 минут

export const PERMISSION_LABELS: Record<AccessPermission, string> = {
  dashboard: "Главная",
  finances: "Финансы",
  motorcycles: "Мотоциклы",
  mopeds: "Мопеды",
  "mopeds.rentals": "Мопеды → Аренды",
  "mopeds.inventory": "Мопеды → Учет",
  "mopeds.contacts": "Мопеды → Контакты",
  cars: "Авто",
  apartments: "Квартиры",
  clients: "Клиенты",
  projects: "Проекты",
  settings: "Настройки",
  help: "Помощь",
  users: "Пользователи",
}

export const TAB_LABELS: Record<string, string> = {
  rentals: "Аренды",
  inventory: "Учет",
  contacts: "Контакты",
}

export const ACCESS_LEVEL_LABELS: Record<TabAccessLevel, string> = {
  view: "Только просмотр",
  edit: "Редактирование",
  none: "Нет доступа",
}

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, AccessPermission[]> = {
  admin: Object.keys(PERMISSION_LABELS) as AccessPermission[],
  manager: [
    "dashboard",
    "clients",
    "mopeds",
    "motorcycles",
    "cars",
    "apartments",
    "projects",
    "finances",
  ],
  viewer: ["dashboard", "clients", "mopeds", "motorcycles"],
}

export const ROLE_DEFAULT_TAB_PERMISSIONS: Record<UserRole, Record<string, TabPermission[]>> = {
  admin: {
    mopeds: [
      { tab: "rentals", access: "edit" },
      { tab: "inventory", access: "edit" },
      { tab: "contacts", access: "edit" },
    ],
    cars: [
      { tab: "rentals", access: "edit" },
      { tab: "inventory", access: "edit" },
      { tab: "contacts", access: "edit" },
    ],
    motorcycles: [
      { tab: "rentals", access: "edit" },
      { tab: "inventory", access: "edit" },
      { tab: "contacts", access: "edit" },
    ],
    apartments: [
      { tab: "rentals", access: "edit" },
      { tab: "inventory", access: "edit" },
      { tab: "contacts", access: "edit" },
    ],
  },
  manager: {
    mopeds: [
      { tab: "rentals", access: "edit" },
      { tab: "inventory", access: "edit" },
      { tab: "contacts", access: "edit" },
    ],
    cars: [
      { tab: "rentals", access: "edit" },
      { tab: "inventory", access: "edit" },
      { tab: "contacts", access: "edit" },
    ],
    motorcycles: [
      { tab: "rentals", access: "edit" },
      { tab: "inventory", access: "edit" },
      { tab: "contacts", access: "edit" },
    ],
    apartments: [
      { tab: "rentals", access: "edit" },
      { tab: "inventory", access: "edit" },
      { tab: "contacts", access: "edit" },
    ],
  },
  viewer: {
    mopeds: [
      { tab: "rentals", access: "view" },
      { tab: "inventory", access: "view" },
      { tab: "contacts", access: "view" },
    ],
  },
}

const DEFAULT_ADMIN_EMAIL = "info@dreamrent.kz"

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

// Функции для работы с localStorage кэшем
export function getCachedUsers(): AppUser[] | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
    
    if (!cached || !timestamp) return null
    
    const age = Date.now() - parseInt(timestamp, 10)
    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY)
      localStorage.removeItem(CACHE_TIMESTAMP_KEY)
      return null
    }
    
    return JSON.parse(cached) as AppUser[]
  } catch (error) {
    console.error('Error reading users cache:', error)
    return null
  }
}

function setCachedUsers(users: AppUser[]): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(users))
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
  } catch (error) {
    console.error('Error saving users cache:', error)
  }
}

function clearUsersCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem(CACHE_TIMESTAMP_KEY)
}

// Map database column names to our type
function mapDbToUser(dbUser: any): AppUser {
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    password: dbUser.password,
    role: dbUser.role as UserRole,
    permissions: (dbUser.permissions || []) as AccessPermission[],
    tabPermissions: (dbUser.tab_permissions || {}) as Record<string, TabPermission[]>,
    createdAt: dbUser.created_at,
  }
}

// Map our type to database column names
function mapUserToDb(user: Partial<AppUser>): any {
  const dbUser: any = {}
  if (user.name !== undefined) dbUser.name = user.name
  if (user.email !== undefined) dbUser.email = normalizeEmail(user.email)
  if (user.password !== undefined) dbUser.password = user.password
  if (user.role !== undefined) dbUser.role = user.role
  if (user.permissions !== undefined) dbUser.permissions = user.permissions
  if (user.tabPermissions !== undefined) dbUser.tab_permissions = user.tabPermissions
  return dbUser
}

function ensureAdminPresent(users: AppUser[]): AppUser[] {
  const hasAdmin = users.some((u) => normalizeEmail(u.email) === normalizeEmail(DEFAULT_ADMIN_EMAIL))
  if (hasAdmin) return users
  
  // Если админа нет, добавляем его из базы или создаем дефолтного
  // Это должно быть редко, так как админ создается при миграции
  return users
}

export async function getUsers(): Promise<AppUser[]> {
  // Сначала проверяем кэш
  const cached = getCachedUsers()
  if (cached) {
    // Возвращаем кэшированные данные сразу, но продолжаем обновление в фоне
    setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          const mapped = data.map(mapDbToUser)
          const finalUsers = ensureAdminPresent(mapped)
          setCachedUsers(finalUsers)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event("users-updated"))
          }
        }
      } catch (error) {
        console.error('Error refreshing users cache:', error)
      }
    }, 0)
    return cached
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return []
    }

    const mapped = data.map(mapDbToUser)
    const finalUsers = ensureAdminPresent(mapped)
    setCachedUsers(finalUsers)
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event("users-updated"))
    }
    
    return finalUsers
  } catch (error) {
    console.error('Error fetching users:', error)
    return []
  }
}

export function getUserById(id: string | null): AppUser | null {
  if (!id) return null
  // Для синхронного доступа используем кэш
  const cached = getCachedUsers()
  if (cached) {
    return cached.find((u) => u.id === id) || null
  }
  return null
}

export async function findUserByCredentials(email: string, password: string): Promise<AppUser | null> {
  try {
    const normalizedEmail = normalizeEmail(email)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single()

    if (error || !data) {
      return null
    }

    const user = mapDbToUser(data)
    return user.password === password ? user : null
  } catch (error) {
    console.error('Error finding user by credentials:', error)
    return null
  }
}

export async function addUser(newUser: Omit<AppUser, "id" | "createdAt">): Promise<{ user?: AppUser; error?: string }> {
  try {
    const normalizedEmail = normalizeEmail(newUser.email)
    
    // Проверяем, существует ли пользователь с таким email
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .single()

    if (existing) {
      return { error: "Пользователь с таким email уже существует" }
    }

    const dbUser = mapUserToDb({
      ...newUser,
      email: normalizedEmail,
      permissions: newUser.permissions.length ? newUser.permissions : ROLE_DEFAULT_PERMISSIONS[newUser.role],
      tabPermissions: newUser.tabPermissions || ROLE_DEFAULT_TAB_PERMISSIONS[newUser.role],
    })
    
    const { data, error } = await supabase
      .from('users')
      .insert([dbUser])
      .select()
      .single()

    if (error) {
      console.error('Error adding user:', error)
      return { error: error.message || "Ошибка при добавлении пользователя" }
    }

    const user = mapDbToUser(data)
    clearUsersCache()
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event("users-updated"))
    }
    
    return { user }
  } catch (error) {
    console.error('Error adding user:', error)
    return { error: "Ошибка при добавлении пользователя" }
  }
}

export async function updateUser(id: string, updates: Partial<Omit<AppUser, "id" | "createdAt">>): Promise<{ user?: AppUser; error?: string }> {
  try {
    // Получаем текущего пользователя
    const { data: existingData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingData) {
      return { error: "Пользователь не найден" }
    }

    const existing = mapDbToUser(existingData)

    // Проверяем, не пытаемся ли изменить роль стандартного администратора
    if (normalizeEmail(existing.email) === normalizeEmail(DEFAULT_ADMIN_EMAIL) && updates.role && updates.role !== "admin") {
      return { error: "Нельзя изменить роль стандартного администратора" }
    }

    // Если обновляется email, проверяем уникальность
    if (updates.email && normalizeEmail(updates.email) !== normalizeEmail(existing.email)) {
      const { data: emailCheck } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizeEmail(updates.email))
        .single()

      if (emailCheck) {
        return { error: "Пользователь с таким email уже существует" }
      }
    }

    const dbUpdates = mapUserToDb({
      ...updates,
      permissions: updates.permissions?.length ? updates.permissions : existing.permissions,
    })
    
    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return { error: error.message || "Ошибка при обновлении пользователя" }
    }

    const updated = mapDbToUser(data)
    clearUsersCache()
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event("users-updated"))
    }
    
    return { user: updated }
  } catch (error) {
    console.error('Error updating user:', error)
    return { error: "Ошибка при обновлении пользователя" }
  }
}

export async function deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Получаем пользователя перед удалением
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !userData) {
      return { success: false, error: "Пользователь не найден" }
    }

    const user = mapDbToUser(userData)

    if (normalizeEmail(user.email) === normalizeEmail(DEFAULT_ADMIN_EMAIL)) {
      return { success: false, error: "Нельзя удалить стандартного администратора" }
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting user:', error)
      return { success: false, error: error.message || "Ошибка при удалении пользователя" }
    }

    clearUsersCache()
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event("users-updated"))
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { success: false, error: "Ошибка при удалении пользователя" }
  }
}

// Функции для работы с текущим пользователем (используют localStorage)
const CURRENT_USER_KEY = "currentUserId"

export function clearCurrentUserMarker() {
  if (typeof window === "undefined") return
  localStorage.removeItem(CURRENT_USER_KEY)
}

export function setCurrentUserMarker(userId: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(CURRENT_USER_KEY, userId)
}

export function getCurrentUserMarker(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(CURRENT_USER_KEY)
}
