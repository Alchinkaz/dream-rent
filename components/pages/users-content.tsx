"use client"

import { useEffect, useMemo, useState } from "react"
import { IconShieldLock, IconTrash, IconUserPlus, IconPencil, IconChevronDown } from "@tabler/icons-react"
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

export function UsersContent() {
  const { isAdmin, user: currentUser } = useAuth()
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

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
    setEditForm({
      name: user.name,
      email: user.email,
      password: "", // Не показываем пароль при редактировании
      permissions: user.permissions || [],
      tabPermissions: user.tabPermissions || {},
    })
    setError("")
    setSuccess("")
  }

  const handleEditSubmit = async () => {
    if (!editingUser) return
    setError("")
    setSuccess("")

    const updates: Partial<AppUser> = {
      name: editForm.name.trim(),
      permissions: editForm.permissions,
      tabPermissions: editForm.tabPermissions,
    }

    // Обновляем email только если он изменился
    if (editForm.email.trim() !== editingUser.email) {
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

    setSuccess("Пользователь обновлен")
    setEditingUser(null)
    const usersList = await getUsers()
    setUsers(usersList)
  }

  const handleEditPermissionToggle = (permission: AccessPermission) => {
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

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const renderSectionTabs = (section: SectionWithTabs, isEdit = false) => {
    const formData = isEdit ? editForm : form
    const hasAccess = formData.permissions.includes(section)
    const tabs = SECTION_TABS[section]
    const isOpen = openSections[section]

    if (!hasAccess) return null

    return (
      <div key={section} className="space-y-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => toggleSection(section)}
            >
              <span>{SECTION_LABELS[section]}</span>
              <IconChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <div className="font-semibold text-sm">{SECTION_LABELS[section]}</div>
              {tabs.map((tab) => (
                <div key={tab} className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">{TAB_LABELS[tab]}</div>
                  <div className="flex gap-2">
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
    <div className="py-8 px-4 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Пользователи</h1>
          <p className="text-sm text-muted-foreground">Управление доступами пользователей.</p>
        </div>
        <Badge variant="secondary">
          Всего: {users.length}
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6 items-start">
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
                <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 max-h-[200px] overflow-y-auto">
                  {MAIN_PERMISSIONS.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-sm cursor-pointer">
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
                        <div className="flex justify-end gap-2">
                          {u.email === "info@dreamrent.kz" ? (
                            <Badge variant="secondary">Защищено</Badge>
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Диалог редактирования пользователя */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать пользователя</DialogTitle>
            <DialogDescription>
              Измените права доступа пользователя {editingUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
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
            </div>

            <div className="space-y-2">
              <Label>Права на вкладки разделов</Label>
              <div className="space-y-2">
                {(Object.keys(SECTION_TABS) as SectionWithTabs[]).map((section) => 
                  renderSectionTabs(section, true)
                )}
              </div>
              {editForm.permissions.filter(p => ['mopeds', 'cars', 'motorcycles', 'apartments'].includes(p)).length === 0 && (
                <p className="text-xs text-muted-foreground">Выберите разделы с вкладками выше</p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Отмена
              </Button>
              <Button onClick={handleEditSubmit}>
                Сохранить изменения
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
