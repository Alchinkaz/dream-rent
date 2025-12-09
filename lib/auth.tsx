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
      const currentUserId = getCurrentUserMarker()
      const current = getUserById(currentUserId)
      setUser(current)
      setIsAuthenticated(!!current)
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
