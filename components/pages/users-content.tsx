"use client"

import { useEffect, useMemo, useState } from "react"
import { IconShieldLock, IconTrash, IconUserPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  type AccessPermission,
  type AppUser,
  type UserRole,
  type TabPermission,
  type SectionWithTabs,
  PERMISSION_LABELS,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_DEFAULT_TAB_PERMISSIONS,
  TAB_LABELS,
  ACCESS_LEVEL_LABELS,
  SECTION_TABS,
  SECTION_LABELS,
  addUser,
  deleteUser,
  getUsers,
} from "@/lib/users-store"
import { useAuth } from "@/lib/auth"

type FormState = {
  name: string
  email: string
  password: string
  role: UserRole
  permissions: AccessPermission[]
  tabPermissions: Record<string, TabPermission[]>
}

// Основные доступы (без вложенных, типа mopeds.rentals)
const MAIN_PERMISSIONS: AccessPermission[] = [
  "dashboard",
  "finances",
  "motorcycles",
  "mopeds",
  "cars",
  "apartments",
  "clients",
  "projects",
  "settings",
  "help",
  "users",
]

export function UsersContent() {
  const { isAdmin, user: currentUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    role: "manager",
    permissions: ROLE_DEFAULT_PERMISSIONS.manager,
    tabPermissions: ROLE_DEFAULT_TAB_PERMISSIONS.manager,
  })
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  useEffect(() => {
    const load = () => setUsers(getUsers())
    load()

    const handler = () => load()
    if (typeof window !== "undefined") {
      window.addEventListener("users-updated", handler)
      return () => window.removeEventListener("users-updated", handler)
    }
  }, [])

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      role: "manager",
      permissions: ROLE_DEFAULT_PERMISSIONS.manager,
      tabPermissions: ROLE_DEFAULT_TAB_PERMISSIONS.manager,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.email.trim() || !form.password.trim() || !form.name.trim()) {
      setError("Заполните имя, email и пароль")
      return
    }

    const { error: addError } = addUser({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password.trim(),
      role: form.role,
      permissions: form.permissions,
      tabPermissions: form.tabPermissions,
    })

    if (addError) {
      setError(addError)
      return
    }

    setSuccess("Пользователь добавлен")
    resetForm()
    setUsers(getUsers())
  }

  const handlePermissionToggle = (permission: AccessPermission) => {
    setForm((prev) => {
      const hasPermission = prev.permissions.includes(permission)
      const nextPermissions = hasPermission
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission]
      
      // Если снимаем доступ к разделу, удаляем права на его вкладки
      let nextTabPermissions = { ...prev.tabPermissions }
      if (hasPermission && (permission === "mopeds" || permission === "cars" || permission === "motorcycles" || permission === "apartments")) {
        const { [permission]: removed, ...rest } = nextTabPermissions
        nextTabPermissions = rest
      }
      
      return { ...prev, permissions: nextPermissions, tabPermissions: nextTabPermissions }
    })
  }

  const handleRoleChange = (role: UserRole) => {
    setForm((prev) => ({
      ...prev,
      role,
      permissions: ROLE_DEFAULT_PERMISSIONS[role],
      tabPermissions: ROLE_DEFAULT_TAB_PERMISSIONS[role],
    }))
  }
  
  const handleTabPermissionChange = (section: string, tab: string, access: "view" | "edit" | "none") => {
    setForm((prev) => {
      const sectionPerms = prev.tabPermissions[section] || []
      const existingIndex = sectionPerms.findIndex((p) => p.tab === tab)
      let newSectionPerms: TabPermission[]
      
      if (existingIndex >= 0) {
        newSectionPerms = [...sectionPerms]
        newSectionPerms[existingIndex] = { tab: tab as any, access }
      } else {
        newSectionPerms = [...sectionPerms, { tab: tab as any, access }]
      }
      
      return {
        ...prev,
        tabPermissions: {
          ...prev.tabPermissions,
          [section]: newSectionPerms,
        },
      }
    })
  }
  
  const getTabAccess = (section: string, tab: string): "view" | "edit" | "none" => {
    const sectionPerms = form.tabPermissions[section] || []
    const tabPerm = sectionPerms.find((p) => p.tab === tab)
    return tabPerm?.access || "none"
  }

  const handleDelete = (id: string) => {
    const target = users.find((u) => u.id === id)
    if (!target) return
    if (target.email === currentUser?.email) {
      setError("Нельзя удалить себя")
      return
    }
    const result = deleteUser(id)
    if (!result.success && result.error) {
      setError(result.error)
      return
    }
    setUsers(getUsers())
  }

  const adminOnly = useMemo(
    () => users.filter((u) => u.role === "admin").map((u) => u.email),
    [users],
  )

  if (!isAdmin) {
    return (
      <div className="py-8 px-4 lg:px-8">
        <Card className="max-w-xl border-dashed">
          <CardHeader className="flex items-center gap-2">
            <IconShieldLock className="size-5 text-muted-foreground" />
            <CardTitle>Доступ ограничен</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Раздел &laquo;Пользователи&raquo; доступен только администраторам.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="py-8 px-4 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Пользователи</h1>
          <p className="text-sm text-muted-foreground">Управление ролями и доступами внутри системы.</p>
        </div>
        <Badge variant="secondary">
          Администраторы: {adminOnly.length} · Всего: {users.length}
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 items-start">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <IconUserPlus className="size-4" />
              Добавить пользователя
            </CardTitle>
            <p className="text-xs text-muted-foreground">Email будет использоваться для входа в систему.</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Например, Иван Иванов"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Минимум 6 символов"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Роль</Label>
                <Select value={form.role} onValueChange={(value: UserRole) => handleRoleChange(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Администратор</SelectItem>
                    <SelectItem value="manager">Менеджер</SelectItem>
                    <SelectItem value="viewer">Наблюдатель</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Доступы</Label>
                <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                  {MAIN_PERMISSIONS.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.permissions.includes(permission)}
                        onCheckedChange={() => handlePermissionToggle(permission)}
                      />
                      <span>{PERMISSION_LABELS[permission]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Права на вкладки</Label>
                <div className="space-y-4 rounded-lg border p-3">
                  {(Object.keys(SECTION_TABS) as SectionWithTabs[]).map((section) => {
                    const hasAccess = form.permissions.includes(section)
                    const tabs = SECTION_TABS[section]
                    
                    return (
                      <div key={section} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold">{SECTION_LABELS[section]}</div>
                          {!hasAccess && (
                            <Badge variant="outline" className="text-xs">
                              Нет доступа к разделу
                            </Badge>
                          )}
                        </div>
                        {hasAccess && (
                          <div className="space-y-2 pl-4 border-l-2">
                            {tabs.map((tab) => (
                              <div key={tab} className="space-y-1">
                                <div className="text-xs text-muted-foreground">{TAB_LABELS[tab]}</div>
                                <div className="flex gap-3">
                                  {(["none", "view", "edit"] as const).map((access) => (
                                    <label key={access} className="flex items-center gap-2 text-xs">
                                      <input
                                        type="radio"
                                        name={`${section}-${tab}`}
                                        checked={getTabAccess(section, tab) === access}
                                        onChange={() => handleTabPermissionChange(section, tab, access)}
                                        className="size-3"
                                      />
                                      <span>{ACCESS_LEVEL_LABELS[access]}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-emerald-600">{success}</p>}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Сохранить
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Очистить
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Список пользователей</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">Пока нет пользователей.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Доступы</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role === "admin" ? "Администратор" : u.role === "manager" ? "Менеджер" : "Наблюдатель"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <div className="flex flex-wrap gap-1">
                          {u.permissions.slice(0, 6).map((p) => (
                            <Badge key={p} variant="outline">
                              {PERMISSION_LABELS[p]}
                            </Badge>
                          ))}
                          {u.permissions.length > 6 && (
                            <Badge variant="outline">+{u.permissions.length - 6}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {u.email === "info@dreamrent.kz" ? (
                            <Badge variant="secondary">Защищено</Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(u.id)}
                              aria-label="Удалить"
                            >
                              <IconTrash className="size-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

