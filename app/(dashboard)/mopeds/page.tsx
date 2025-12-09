"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"

export default function MopedsRedirectPage() {
  const router = useRouter()
  const { hasTabAccess } = useAuth()
  
  useEffect(() => {
    // Определяем первую доступную вкладку
    if (hasTabAccess("mopeds", "rentals", "view")) {
      router.replace("/mopeds/rentals")
    } else if (hasTabAccess("mopeds", "inventory", "view")) {
      router.replace("/mopeds/inventory")
    } else if (hasTabAccess("mopeds", "contacts", "view")) {
      router.replace("/mopeds/contacts")
    } else {
      router.replace("/")
    }
  }, [router, hasTabAccess])
  
  return <div className="flex h-screen items-center justify-center">Перенаправление...</div>
}

