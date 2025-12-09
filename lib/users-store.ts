"use client"

export type UserRole = "admin" | "manager" | "viewer"

export type AccessPermission =
  | "dashboard"
  | "finances"
  | "motorcycles"
  | "mopeds"
  | "cars"
  | "apartments"
  | "clients"
  | "projects"
  | "settings"
  | "help"
  | "users"

export type AppUser = {
  id: string
  name: string
  email: string
  password: string
  role: UserRole
  permissions: AccessPermission[]
  createdAt: string
}

const STORAGE_KEY = "crm_users"
const CURRENT_USER_KEY = "currentUserId"

export const PERMISSION_LABELS: Record<AccessPermission, string> = {
  dashboard: "Главная",
  finances: "Финансы",
  motorcycles: "Мотоциклы",
  mopeds: "Мопеды",
  cars: "Авто",
  apartments: "Квартиры",
  clients: "Клиенты",
  projects: "Проекты",
  settings: "Настройки",
  help: "Помощь",
  users: "Пользователи",
}

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, AccessPermission[]> = {
  admin: Object.keys(PERMISSION_LABELS) as AccessPermission[],
  manager: ["dashboard", "clients", "mopeds", "motorcycles", "cars", "apartments", "projects", "finances"],
  viewer: ["dashboard", "clients", "mopeds", "motorcycles"],
}

const DEFAULT_ADMIN: AppUser = {
  id: "admin-default",
  name: "Администратор",
  email: "info@dreamrent.kz",
  password: "kyadr3thcxvsgxok)Rca",
  role: "admin",
  permissions: ROLE_DEFAULT_PERMISSIONS.admin,
  createdAt: new Date().toISOString(),
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function readFromStorage(): AppUser[] {
  if (typeof window === "undefined") {
    return [DEFAULT_ADMIN]
  }

  const stored = localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([DEFAULT_ADMIN]))
    return [DEFAULT_ADMIN]
  }

  try {
    const parsed = JSON.parse(stored) as AppUser[]
    return ensureAdminPresent(parsed)
  } catch (error) {
    console.error("Ошибка чтения списка пользователей, сбрасываю в дефолт:", error)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([DEFAULT_ADMIN]))
    return [DEFAULT_ADMIN]
  }
}

function writeToStorage(users: AppUser[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
  window.dispatchEvent(new Event("users-updated"))
}

function ensureAdminPresent(users: AppUser[]): AppUser[] {
  const hasAdmin = users.some((u) => normalizeEmail(u.email) === normalizeEmail(DEFAULT_ADMIN.email))
  if (hasAdmin) return users
  return [{ ...DEFAULT_ADMIN }, ...users]
}

export function getUsers(): AppUser[] {
  return readFromStorage()
}

export function getUserById(id: string | null): AppUser | null {
  if (!id) return null
  const users = getUsers()
  return users.find((u) => u.id === id) || null
}

export function findUserByCredentials(email: string, password: string): AppUser | null {
  const users = getUsers()
  const normalizedEmail = normalizeEmail(email)
  const user = users.find((u) => normalizeEmail(u.email) === normalizedEmail)
  if (!user) return null
  return user.password === password ? user : null
}

export function addUser(newUser: Omit<AppUser, "id" | "createdAt">): { user?: AppUser; error?: string } {
  const users = getUsers()
  const normalizedEmail = normalizeEmail(newUser.email)

  if (users.some((u) => normalizeEmail(u.email) === normalizedEmail)) {
    return { error: "Пользователь с таким email уже существует" }
  }

  const user: AppUser = {
    ...newUser,
    id: crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`,
    email: normalizedEmail,
    permissions: newUser.permissions.length ? newUser.permissions : ROLE_DEFAULT_PERMISSIONS[newUser.role],
    createdAt: new Date().toISOString(),
  }

  const updated = ensureAdminPresent([...users, user])
  writeToStorage(updated)

  return { user }
}

export function updateUser(id: string, updates: Partial<Omit<AppUser, "id" | "createdAt">>): { user?: AppUser; error?: string } {
  const users = getUsers()
  const index = users.findIndex((u) => u.id === id)
  if (index === -1) return { error: "Пользователь не найден" }

  const existing = users[index]

  if (normalizeEmail(existing.email) === normalizeEmail(DEFAULT_ADMIN.email) && updates.role && updates.role !== "admin") {
    return { error: "Нельзя изменить роль стандартного администратора" }
  }

  const updatedUser: AppUser = {
    ...existing,
    ...updates,
    email: updates.email ? normalizeEmail(updates.email) : existing.email,
    permissions: updates.permissions?.length ? updates.permissions : existing.permissions,
  }

  users[index] = updatedUser
  const finalUsers = ensureAdminPresent(users)
  writeToStorage(finalUsers)

  return { user: updatedUser }
}

export function deleteUser(id: string): { success: boolean; error?: string } {
  const users = getUsers()
  const user = users.find((u) => u.id === id)
  if (!user) return { success: false, error: "Пользователь не найден" }

  if (normalizeEmail(user.email) === normalizeEmail(DEFAULT_ADMIN.email)) {
    return { success: false, error: "Нельзя удалить стандартного администратора" }
  }

  const filtered = users.filter((u) => u.id !== id)
  const finalUsers = ensureAdminPresent(filtered)
  writeToStorage(finalUsers)
  return { success: true }
}

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

