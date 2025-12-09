"use client"

import { IconChevronRight } from "@tabler/icons-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

const PAGE_TITLES: Record<string, string> = {
  "/": "Главная",
  "/finances": "Финансы",
  "/mopeds": "Мопеды",
  "/mopeds/rentals": "Мопеды → Аренды",
  "/mopeds/inventory": "Мопеды → Учет",
  "/mopeds/contacts": "Мопеды → Контакты",
  "/motorcycles": "Мотоциклы",
  "/cars": "Авто",
  "/apartments": "Квартиры",
  "/clients": "Клиенты",
  "/projects": "Проекты",
  "/settings": "Настройки",
  "/help": "Помощь",
  "/users": "Пользователи",
}

export function Breadcrumbs() {
  const pathname = usePathname()
  
  // Определяем breadcrumbs для вложенных маршрутов
  const getBreadcrumbs = () => {
    if (pathname.startsWith("/mopeds/")) {
      const parts = pathname.split("/").filter(Boolean)
      const crumbs = []
      if (parts[0] === "mopeds") {
        crumbs.push({ label: "Мопеды", href: "/mopeds" })
        if (parts[1] === "rentals") {
          crumbs.push({ label: "Аренды", href: null })
        } else if (parts[1] === "inventory") {
          crumbs.push({ label: "Учет", href: null })
        } else if (parts[1] === "contacts") {
          crumbs.push({ label: "Контакты", href: null })
        }
      }
      return crumbs
    }
    
    const title = PAGE_TITLES[pathname]
    if (title) {
      return [{ label: title, href: null }]
    }
    
    return []
  }

  const breadcrumbs = getBreadcrumbs()

  if (breadcrumbs.length === 0) return null

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 && <IconChevronRight className="h-4 w-4" />}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className={index === breadcrumbs.length - 1 ? "text-foreground font-medium" : ""}>
              {crumb.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
