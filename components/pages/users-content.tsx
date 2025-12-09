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
  PERMISSION_LABELS,
  ROLE_DEFAULT_PERMISSIONS,
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
}

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as AccessPermission[]

export function UsersContent() {
  const { isAdmin, user: currentUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    role: "manager",
    permissions: ROLE_DEFAULT_PERMISSIONS.manager,
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
      return { ...prev, permissions: nextPermissions }
    })
  }

  const handleRoleChange = (role: UserRole) => {
    setForm((prev) => ({
      ...prev,
      role,
      permissions: ROLE_DEFAULT_PERMISSIONS[role],
    }))
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
                  {ALL_PERMISSIONS.map((permission) => (
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

