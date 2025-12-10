"use client"

import { useEffect, useMemo, useState } from "react"
import { IconShieldLock, IconTrash, IconUserPlus, IconPencil, IconChevronDown } from "@tabler/icons-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useIsTablet } from "@/hooks/use-tablet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  type AccessPermission,
  type AppUser,
  type TabPermission,
  type SectionWithTabs,
  PERMISSION_LABELS,
  TAB_LABELS,
  ACCESS_LEVEL_LABELS,
  SECTION_TABS,
  SECTION_LABELS,
  addUser,
  deleteUser,
  updateUser,
  getUsers,
} from "@/lib/users-store"
import { useAuth } from "@/lib/auth"

type FormState = {
  name: string
  email: string
  password: string
  permissions: AccessPermission[]
  tabPermissions: Record<string, TabPermission[]>
}

// Основные доступы
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

// Все права на вкладки для всех разделов
const ALL_TAB_PERMISSIONS: Record<string, TabPermission[]> = {
  mopeds: [
    { tab: "rentals", access: "edit" },
    { tab: "inventory", access: "edit" },
    { tab: "contacts", access: "edit" },
  ],
  cars: [
    { tab: "rentals", access: "edit" },
    { tab: "inventory", access: "edit" },
    { tab: "contacts", access: "edit" },
  ],
  motorcycles: [
    { tab: "rentals", access: "edit" },
    { tab: "inventory", access: "edit" },
    { tab: "contacts", access: "edit" },
  ],
  apartments: [
    { tab: "rentals", access: "edit" },
    { tab: "inventory", access: "edit" },
    { tab: "contacts", access: "edit" },
  ],
}

export function UsersContent() {
  const { isAdmin, user: currentUser } = useAuth()
  const isMobile = useIsMobile()
  const [users, setUsers] = useState<AppUser[]>([])
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    permissions: [],
    tabPermissions: {},
  })
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [editForm, setEditForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    permissions: [],
    tabPermissions: {},
  })

  useEffect(() => {
    const load = async () => {
      const usersList = await getUsers()
      setUsers(usersList)
    }
    load()

    const handler = () => {
      load()
    }
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
      permissions: [],
      tabPermissions: {},
    })
    setError("")
    setSuccess("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.email.trim() || !form.password.trim() || !form.name.trim()) {
      setError("Заполните имя, email и пароль")
      return
    }

    const { error: addError } = await addUser({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password.trim(),
      permissions: form.permissions,
      tabPermissions: form.tabPermissions,
    })

    if (addError) {
      setError(addError)
      return
    }

    setSuccess("Пользователь добавлен")
    resetForm()
    const usersList = await getUsers()
    setUsers(usersList)
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

  const handleTabPermissionChange = (section: string, tab: string, access: "view" | "edit" | "none", isEdit = false) => {
    // Блокируем изменение прав на вкладки для дефолтного администратора
    if (isEdit && editingUser?.email.toLowerCase() === "info@dreamrent.kz") {
      return
    }
    
    const updateFn = (prev: FormState) => {
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
    }

    if (isEdit) {
      setEditForm(updateFn)
    } else {
      setForm(updateFn)
    }
  }
  
  const getTabAccess = (section: string, tab: string, isEdit = false): "view" | "edit" | "none" => {
    const formData = isEdit ? editForm : form
    const sectionPerms = formData.tabPermissions[section] || []
    const tabPerm = sectionPerms.find((p) => p.tab === tab)
    return tabPerm?.access || "none"
  }

  const handleDelete = async (id: string) => {
    const target = users.find((u) => u.id === id)
    if (!target) return
    if (target.email === currentUser?.email) {
      setError("Нельзя удалить себя")
      return
    }
    const result = await deleteUser(id)
    if (!result.success && result.error) {
      setError(result.error)
      return
    }
    const usersList = await getUsers()
    setUsers(usersList)
  }

  const handleEdit = (user: AppUser) => {
    setEditingUser(user)
    // Для дефолтного администратора всегда показываем все права
    const isDefaultAdmin = user.email.toLowerCase() === "info@dreamrent.kz"
    setEditForm({
      name: user.name,
      email: user.email,
      password: "", // Не показываем пароль при редактировании
      permissions: isDefaultAdmin ? MAIN_PERMISSIONS : (user.permissions || []),
      tabPermissions: isDefaultAdmin ? ALL_TAB_PERMISSIONS : (user.tabPermissions || {}),
    })
    setError("")
    setSuccess("")
  }

  const handleEditSubmit = async () => {
    if (!editingUser) return
    setError("")
    setSuccess("")

    const isDefaultAdmin = editingUser.email.toLowerCase() === "info@dreamrent.kz"
    
    const updates: Partial<AppUser> = {
      name: editForm.name.trim(),
      // Для дефолтного администратора не отправляем права - они будут восстановлены автоматически в updateUser
      permissions: isDefaultAdmin ? undefined : editForm.permissions,
      tabPermissions: isDefaultAdmin ? undefined : editForm.tabPermissions,
    }

    // Обновляем email только если он изменился (и это не дефолтный администратор)
    if (!isDefaultAdmin && editForm.email.trim() !== editingUser.email) {
      updates.email = editForm.email.trim()
    }

    // Обновляем пароль только если он указан
    if (editForm.password.trim()) {
      updates.password = editForm.password.trim()
    }

    const { error: updateError } = await updateUser(editingUser.id, updates)

    if (updateError) {
      setError(updateError)
      return
    }

    setSuccess(isDefaultAdmin ? "Пользователь обновлен (права защищены и восстановлены до максимальных)" : "Пользователь обновлен")
    setEditingUser(null)
    const usersList = await getUsers()
    setUsers(usersList)
  }

  const handleEditPermissionToggle = (permission: AccessPermission) => {
    // Блокируем изменение прав для дефолтного администратора
    if (editingUser?.email.toLowerCase() === "info@dreamrent.kz") {
      return
    }
    
    setEditForm((prev) => {
      const hasPermission = prev.permissions.includes(permission)
      const nextPermissions = hasPermission
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission]
      
      let nextTabPermissions = { ...prev.tabPermissions }
      if (hasPermission && (permission === "mopeds" || permission === "cars" || permission === "motorcycles" || permission === "apartments")) {
        const { [permission]: removed, ...rest } = nextTabPermissions
        nextTabPermissions = rest
      }
      
      return { ...prev, permissions: nextPermissions, tabPermissions: nextTabPermissions }
    })
  }


  const renderSectionTabs = (section: SectionWithTabs, isEdit = false) => {
    const formData = isEdit ? editForm : form
    const hasAccess = formData.permissions.includes(section)
    const tabs = SECTION_TABS[section]

    if (!hasAccess) return null

    return (
      <div key={section} className="space-y-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between"
            >
              <span>{SECTION_LABELS[section]}</span>
              <IconChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80">
            <div className="space-y-3">
              <div className="font-semibold text-xs sm:text-sm">{SECTION_LABELS[section]}</div>
              {tabs.map((tab) => (
                <div key={tab} className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">{TAB_LABELS[tab]}</div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {(["none", "view", "edit"] as const).map((access) => (
                      <label key={access} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name={`${section}-${tab}-${isEdit ? 'edit' : 'new'}`}
                          checked={getTabAccess(section, tab, isEdit) === access}
                          onChange={() => handleTabPermissionChange(section, tab, access, isEdit)}
                          className="size-3"
                        />
                        <span>{ACCESS_LEVEL_LABELS[access]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

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
    <div className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4 lg:px-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Пользователи</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Управление доступами пользователей.</p>
        </div>
        <Badge variant="secondary" className="w-fit">
          Всего: {users.length}
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-4 sm:gap-6 items-start">
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
                <Label>Доступы к разделам</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border p-2 sm:p-3 max-h-[200px] overflow-y-auto">
                  {MAIN_PERMISSIONS.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
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
                <Label>Права на вкладки разделов</Label>
                <div className="space-y-2">
                  {(Object.keys(SECTION_TABS) as SectionWithTabs[]).map((section) => 
                    renderSectionTabs(section, false)
                  )}
                </div>
                {form.permissions.filter(p => ['mopeds', 'cars', 'motorcycles', 'apartments'].includes(p)).length === 0 && (
                  <p className="text-xs text-muted-foreground">Выберите разделы с вкладками выше</p>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-emerald-600">{success}</p>}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" className="flex-1 w-full sm:w-auto">
                  Сохранить
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">
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
            ) : isMobile ? (
              // Мобильная версия - карточки
              <div className="space-y-3">
                {users.map((u) => (
                  <Card key={u.id} className="border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm truncate">{u.name}</h3>
                            {u.email.toLowerCase() === "info@dreamrent.kz" && (
                              <Badge variant="default" className="text-xs flex-shrink-0">Полный админ</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(u)}
                            aria-label="Редактировать"
                          >
                            <IconPencil className="size-4" />
                          </Button>
                          {u.email.toLowerCase() !== "info@dreamrent.kz" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDelete(u.id)}
                              aria-label="Удалить"
                            >
                              <IconTrash className="size-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {u.permissions.slice(0, 3).map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {PERMISSION_LABELS[p]}
                          </Badge>
                        ))}
                        {u.permissions.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{u.permissions.length - 3}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Десктопная версия - таблица
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Доступы</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="flex flex-wrap gap-1">
                            {u.permissions.slice(0, 5).map((p) => (
                              <Badge key={p} variant="outline" className="text-xs">
                                {PERMISSION_LABELS[p]}
                              </Badge>
                            ))}
                            {u.permissions.length > 5 && (
                              <Badge variant="outline" className="text-xs">+{u.permissions.length - 5}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 items-center">
                            {u.email.toLowerCase() === "info@dreamrent.kz" ? (
                              <>
                                <Badge variant="default" className="mr-2">Полный админ</Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(u)}
                                  aria-label="Редактировать"
                                  title="Просмотр прав (все права защищены)"
                                >
                                  <IconPencil className="size-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(u)}
                                  aria-label="Редактировать"
                                >
                                  <IconPencil className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(u.id)}
                                  aria-label="Удалить"
                                >
                                  <IconTrash className="size-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Диалог редактирования пользователя */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Редактировать пользователя</DialogTitle>
            <DialogDescription>
              Измените права доступа пользователя {editingUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editingUser?.email.toLowerCase() === "info@dreamrent.kz" && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Полный администратор:</strong> Этот пользователь всегда имеет все права доступа. Изменения прав будут автоматически восстановлены.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Имя</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => {
                  if (editingUser?.email.toLowerCase() !== "info@dreamrent.kz") {
                    setEditForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                }}
                disabled={editingUser?.email.toLowerCase() === "info@dreamrent.kz"}
                required
              />
              {editingUser?.email.toLowerCase() === "info@dreamrent.kz" && (
                <p className="text-xs text-muted-foreground">Email дефолтного администратора нельзя изменить</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Новый пароль (оставьте пустым, чтобы не менять)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Оставьте пустым, чтобы не менять"
              />
            </div>

            <div className="space-y-2">
              <Label>Доступы к разделам</Label>
              {editingUser?.email.toLowerCase() === "info@dreamrent.kz" ? (
                <div className="rounded-lg border p-3 bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">Все права защищены для дефолтного администратора</p>
                  <div className="grid grid-cols-2 gap-2">
                    {MAIN_PERMISSIONS.map((permission) => (
                      <div key={permission} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={true} disabled />
                        <span className="text-muted-foreground">{PERMISSION_LABELS[permission]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 max-h-[200px] overflow-y-auto">
                  {MAIN_PERMISSIONS.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={editForm.permissions.includes(permission)}
                        onCheckedChange={() => handleEditPermissionToggle(permission)}
                      />
                      <span>{PERMISSION_LABELS[permission]}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Права на вкладки разделов</Label>
              {editingUser?.email.toLowerCase() === "info@dreamrent.kz" ? (
                <div className="rounded-lg border p-3 bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-3">Все права на вкладки защищены - установлено "Редактирование" для всех разделов</p>
                  {(Object.keys(SECTION_TABS) as SectionWithTabs[]).map((section) => {
                    const tabs = SECTION_TABS[section]
                    return (
                      <div key={section} className="mb-3 last:mb-0">
                        <div className="font-medium text-sm mb-2">{SECTION_LABELS[section]}</div>
                        <div className="pl-4 space-y-1">
                          {tabs.map((tab) => (
                            <div key={tab} className="text-xs text-muted-foreground">
                              {TAB_LABELS[tab]}: <span className="font-medium">Редактирование</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {(Object.keys(SECTION_TABS) as SectionWithTabs[]).map((section) => 
                      renderSectionTabs(section, true)
                    )}
                  </div>
                  {editForm.permissions.filter(p => ['mopeds', 'cars', 'motorcycles', 'apartments'].includes(p)).length === 0 && (
                    <p className="text-xs text-muted-foreground">Выберите разделы с вкладками выше</p>
                  )}
                </>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}

            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingUser(null)} className="w-full sm:w-auto">
                Отмена
              </Button>
              <Button onClick={handleEditSubmit} className="w-full sm:w-auto">
                Сохранить изменения
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
