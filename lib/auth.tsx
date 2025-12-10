"use client"

import type React from "react"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { AppUser } from "./users-store"
import {
  findUserByCredentials,
  getCurrentUserMarker,
  getUserById,
  setCurrentUserMarker,
  clearCurrentUserMarker,
  getUsers,
  ROLE_DEFAULT_TAB_PERMISSIONS,
} from "./users-store"

type AuthContextType = {
  isAuthenticated: boolean
  user: AppUser | null
  username: string | null
  isAdmin: boolean
  hasPermission: (permission: string) => boolean
  hasTabAccess: (section: string, tab: string, level: "view" | "edit") => boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const hydrateUser = async () => {
      const authStatus = localStorage.getItem("isAuthenticated")
      const currentUserId = getCurrentUserMarker()
      let current = getUserById(currentUserId)
      
      // Если есть флаг авторизации, но пользователь не найден, попробуем найти по email
      if (authStatus === "true" && !current) {
        // Попробуем найти админа по умолчанию
        const adminEmail = "info@dreamrent.kz"
        const users = await getUsers()
        const normalizedAdminEmail = adminEmail.trim().toLowerCase()
        const adminUser = users.find((u) => u.email.trim().toLowerCase() === normalizedAdminEmail)
        if (adminUser) {
          setCurrentUserMarker(adminUser.id)
          current = adminUser
        }
      }
      
      // Если пользователь найден, убедимся что он сохранен правильно
      if (current && authStatus === "true") {
        setUser(current)
        setIsAuthenticated(true)
        // Убедимся что ID сохранен
        if (getCurrentUserMarker() !== current.id) {
          setCurrentUserMarker(current.id)
        }
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
      
      setIsLoading(false)
    }

    hydrateUser()
    const handler = () => {
      hydrateUser()
    }
    if (typeof window !== "undefined") {
      window.addEventListener("users-updated", handler)
      return () => window.removeEventListener("users-updated", handler)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password.trim()

    const found = await findUserByCredentials(trimmedEmail, trimmedPassword)
    if (found) {
      localStorage.setItem("isAuthenticated", "true")
      setCurrentUserMarker(found.id)
      setIsAuthenticated(true)
      setUser(found)
      // Принудительно обновляем состояние для немедленного отображения
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("users-updated"))
      }
      return true
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem("isAuthenticated")
    clearCurrentUserMarker()
    setIsAuthenticated(false)
    setUser(null)
  }

  const username = useMemo(() => user?.name || user?.email || null, [user])
  const isAdmin = useMemo(() => (user?.role || "").toLowerCase() === "admin", [user])
  
  const hasPermission = useMemo(() => {
    return (permission: string) => {
      if (!user) return false
      if (isAdmin) return true
      return user.permissions.includes(permission as any)
    }
  }, [user, isAdmin])
  
  const hasTabAccess = useMemo(() => {
    return (section: string, tab: string, level: "view" | "edit") => {
      if (!user) return false
      if (isAdmin) return true
      
      // Проверяем базовое разрешение на раздел
      if (!user.permissions.includes(section as any)) return false
      
      // Проверяем права на вкладку
      const tabPerms = user.tabPermissions?.[section]
      if (!tabPerms) {
        // Если нет настроек вкладок, используем дефолтные для роли
        const defaultPerms = ROLE_DEFAULT_TAB_PERMISSIONS[user.role]?.[section] || []
        const tabPerm = defaultPerms.find((p) => p.tab === tab)
        if (!tabPerm) return false
        if (tabPerm.access === "none") return false
        if (level === "edit" && tabPerm.access !== "edit") return false
        return true
      }
      
      const tabPerm = tabPerms.find((p) => p.tab === tab)
      if (!tabPerm) return false
      if (tabPerm.access === "none") return false
      if (level === "edit" && tabPerm.access !== "edit") return false
      return true
    }
  }, [user, isAdmin])

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Загрузка...</div>
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, username, isAdmin, hasPermission, hasTabAccess, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
