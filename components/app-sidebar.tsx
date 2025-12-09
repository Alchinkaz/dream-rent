"use client"

import type * as React from "react"
import {
  IconHome,
  IconSettings,
  IconWallet,
  IconMotorbike,
  IconCar,
  IconBuilding,
  IconUsers,
  IconShieldLock,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarTrigger } from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth"

const data = {
  user: {
    name: "Accountant",
    email: "a@example.com",
    avatar: "/placeholder-user.jpg",
  },
  navClouds: [
    {
      title: "Capture",
      icon: IconWallet,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconWallet,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconWallet,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, isAdmin } = useAuth()
  const navMain = [
    {
      title: "Главная",
      url: "/",
      icon: IconHome,
    },
    {
      title: "Финансы",
      url: "/finances",
      icon: IconWallet,
    },
    {
      title: "Мотоциклы",
      url: "/motorcycles",
      icon: IconMotorbike,
    },
    {
      title: "Мопеды",
      url: "/mopeds",
      icon: IconMotorbike,
    },
    {
      title: "Авто",
      url: "/cars",
      icon: IconCar,
    },
    {
      title: "Квартиры",
      url: "/apartments",
      icon: IconBuilding,
    },
    {
      title: "Клиенты",
      url: "/clients",
      icon: IconUsers,
    },
    ...(isAdmin
      ? [
          {
            title: "Пользователи",
            url: "/users",
            icon: IconShieldLock,
          },
        ]
      : []),
    {
      title: "Настройки",
      url: "/settings",
      icon: IconSettings,
    },
  ]

  const navSecondary: any[] = []

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="pt-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center justify-between py-1.5 pl-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 pt-0 pb-0">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Dream Rent</span>
          </div>
          <SidebarTrigger className="h-8 w-8" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        {navSecondary.length > 0 && <NavSecondary items={navSecondary} className="mt-auto" />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user?.name || data.user.name,
            email: user?.email || data.user.email,
            avatar: data.user.avatar,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
