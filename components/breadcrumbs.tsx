"use client"

import { IconChevronRight } from "@tabler/icons-react"
import { useNavigation } from "@/hooks/use-navigation"

export function Breadcrumbs() {
  const { currentPage, selectedWarehouse, setSelectedWarehouse, selectedDepartment, setSelectedDepartment } =
    useNavigation()

  const getBreadcrumbs = () => {
    const crumbs: { label: string; onClick?: () => void }[] = []

    switch (currentPage) {
      case "Home":
      case "home":
        crumbs.push({ label: "Главная" })
        break
      case "Finances":
      case "finances":
        crumbs.push({ label: "Финансы" })
        break
      case "Mopeds":
      case "mopeds":
        crumbs.push({ label: "Мопеды" })
        break
      case "Motorcycles":
      case "motorcycles":
        crumbs.push({ label: "Мотоциклы" })
        break
      case "Cars":
      case "cars":
        crumbs.push({ label: "Авто" })
        break
      case "Apartments":
      case "apartments":
        crumbs.push({ label: "Квартиры" })
        break
      case "Clients":
      case "clients":
        crumbs.push({ label: "Клиенты" })
        break
      case "Users":
      case "users":
        crumbs.push({ label: "Пользователи" })
        break
      case "settings":
        crumbs.push({ label: "Настройки" })
        break
    }

    return crumbs
  }

  const breadcrumbs = getBreadcrumbs()

  if (breadcrumbs.length === 0) return null

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 && <IconChevronRight className="h-4 w-4" />}
          {crumb.onClick ? (
            <button onClick={crumb.onClick} className="hover:text-foreground transition-colors">
              {crumb.label}
            </button>
          ) : (
            <span className={index === breadcrumbs.length - 1 ? "text-foreground font-medium" : ""}>{crumb.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
