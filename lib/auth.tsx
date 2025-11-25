"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type AuthContextType = {
  isAuthenticated: boolean
  username: string | null
  login: (username: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated on mount
    const authStatus = localStorage.getItem("isAuthenticated")
    const storedUsername = localStorage.getItem("username")
    setIsAuthenticated(authStatus === "true")
    setUsername(storedUsername)
    setIsLoading(false)
  }, [])

  const login = (username: string, password: string) => {
    if (username === "info@dreamrent.kz" && password === "kyadr3thcxvsgxok)Rca") {
      localStorage.setItem("isAuthenticated", "true")
      localStorage.setItem("username", username)
      setIsAuthenticated(true)
      setUsername(username)
      return true
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("username")
    setIsAuthenticated(false)
    setUsername(null)
  }

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Загрузка...</div>
  }

  return <AuthContext.Provider value={{ isAuthenticated, username, login, logout }}>{children}</AuthContext.Provider>
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
