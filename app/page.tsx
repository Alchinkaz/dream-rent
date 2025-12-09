"use client"

import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useNavigation } from "@/hooks/use-navigation"
import { useEffect } from "react"
import { ProtectedRoute } from "@/lib/auth"

import { DashboardOldContent } from "@/components/pages/dashboard-old-content"
import { DashboardNewContent } from "@/components/pages/dashboard-new-content"
import { ProjectsContent } from "@/components/pages/projects-content"
import { FinanceContent } from "@/components/pages/finance-content"
import { MopedsContent } from "@/components/pages/mopeds-content"
import { MotorcyclesContent } from "@/components/pages/motorcycles-content"
import { CarsContent } from "@/components/pages/cars-content"
import { ApartmentsContent } from "@/components/pages/apartments-content"
import { ClientsContent } from "@/components/pages/clients-content"
import { SettingsContent } from "@/components/pages/settings-content"
import { GetHelpContent } from "@/components/pages/get-help-content"
import { UsersContent } from "@/components/pages/users-content"

export default function Page() {
  const { currentPage } = useNavigation()

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const goto = params.get("goto")
      if (goto) {
        import("@/hooks/use-navigation").then(({ useNavigation }) => {
          const { setCurrentPage } = useNavigation.getState()
          setCurrentPage(goto)
        })
      }
    } catch {}
  }, [])

  const getPageTitle = () => {
    switch (currentPage) {
      case "dashboard-old":
        return "Старая панель"
      case "finances":
        return "Финансы"
      case "mopeds":
        return "Мопеды"
      case "motorcycles":
        return "Мотоциклы"
      case "cars":
        return "Авто"
      case "apartments":
        return "Квартиры"
      case "clients":
        return "Клиенты"
      case "projects":
        return "Проекты"
      case "settings":
        return "Настройки"
      case "help":
        return "Помощь"
      case "users":
        return "Пользователи"
      case "Home":
      default:
        return "Главная"
    }
  }

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard-old":
        return <DashboardOldContent />
      case "finances":
        return <FinanceContent />
      case "mopeds":
        return <MopedsContent />
      case "motorcycles":
        return <MotorcyclesContent />
      case "cars":
        return <CarsContent />
      case "apartments":
        return <ApartmentsContent />
      case "clients":
        return <ClientsContent />
      case "projects":
        return <ProjectsContent />
      case "settings":
        return <SettingsContent />
      case "help":
        return <GetHelpContent />
      case "users":
        return <UsersContent />
      case "Home":
      default:
        return <DashboardNewContent />
    }
  }

  return (
    <ProtectedRoute>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 64)",
            "--header-height": "calc(var(--spacing) * 16)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" collapsible="icon" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">{renderContent()}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}
