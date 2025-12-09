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
} from "./users-store"

type AuthContextType = {
  isAuthenticated: boolean
  user: AppUser | null
  username: string | null
  isAdmin: boolean
  login: (email: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const hydrateUser = () => {
      const authStatus = localStorage.getItem("isAuthenticated")
      const currentUserId = getCurrentUserMarker()
      let current = getUserById(currentUserId)
      
      // Если есть флаг авторизации, но пользователь не найден, попробуем найти по email
      if (authStatus === "true" && !current) {
        // Попробуем найти админа по умолчанию
        const adminEmail = "info@dreamrent.kz"
        const users = getUsers()
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
    const handler = () => hydrateUser()
    if (typeof window !== "undefined") {
      window.addEventListener("users-updated", handler)
      return () => window.removeEventListener("users-updated", handler)
    }
  }, [])

  const login = (email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password.trim()

    const found = findUserByCredentials(trimmedEmail, trimmedPassword)
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
  const isAdmin = useMemo(() => {
    const role = user?.role || ""
    const result = role.toLowerCase() === "admin"
    // Отладка (можно убрать после проверки)
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.log("[Auth] User role check:", { role, result, user: user?.email })
    }
    return result
  }, [user])

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Загрузка...</div>
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, username, isAdmin, login, logout }}>
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
