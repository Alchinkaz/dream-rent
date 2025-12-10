"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IconGripVertical, IconTrash, IconPlus, IconPencil, IconCheck, IconDots } from "@tabler/icons-react"
import type { CustomField, FieldGroup, FieldType } from "@/lib/types/crm-fields"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type FieldConfigurationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fields: CustomField[]
  groups: FieldGroup[]
  onSave: (fields: CustomField[], groups: FieldGroup[]) => void
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Текст" },
  { value: "number", label: "Число" },
  { value: "flag", label: "Флаг" },
  { value: "list", label: "Список" },
  { value: "multilist", label: "Мультисписок" },
  { value: "date", label: "Дата" },
]

function SortableFieldItem({
  field,
  onEdit,
  onDelete,
  onToggleRequired,
}: {
  field: CustomField
  onEdit: (field: CustomField) => void
  onDelete: (id: string) => void
  onToggleRequired: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const fieldTypeLabel = FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:bg-accent/50 transition-colors"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <IconGripVertical className="size-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{field.name}</div>
        <div className="text-xs text-muted-foreground">{fieldTypeLabel}</div>
      </div>

      <div className="flex items-center gap-2">
        {field.required && (
          <Badge variant="destructive" className="text-xs">
            Обязательно {field.required ? "4" : ""}
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <IconDots className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(field)}>
              <IconPencil className="size-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleRequired(field.id)}>
              <IconCheck className="size-4 mr-2" />
              {field.required ? "Сделать необязательным" : "Сделать обязательным"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(field.id)} className="text-destructive">
              <IconTrash className="size-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function AddFieldDialog({
  open,
  onOpenChange,
  onAdd,
  groups,
  editingField,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (field: Omit<CustomField, "id">) => void
  groups: FieldGroup[]
  editingField?: CustomField | null
}) {
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<FieldType>("text")
  const [required, setRequired] = React.useState(false)
  const [groupId, setGroupId] = React.useState("")
  const [options, setOptions] = React.useState("")

  React.useEffect(() => {
    if (editingField) {
      setName(editingField.name)
      setType(editingField.type)
      setRequired(editingField.required)
      setGroupId(editingField.groupId || "")
      setOptions(editingField.options?.join(", ") || "")
    } else {
      setName("")
      setType("text")
      setRequired(false)
      setGroupId(groups[0]?.id || "")
      setOptions("")
    }
  }, [editingField, groups, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const fieldData: Omit<CustomField, "id"> = {
      name: name.trim(),
      type,
      required,
      groupId: groupId || undefined,
      options:
        type === "list" || type === "multilist"
          ? options
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined,
    }

    onAdd(fieldData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingField ? "Редактировать поле" : "Добавить поле"}</DialogTitle>
          <DialogDescription>Настройте параметры пользовательского поля</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="field-name">Название поля *</Label>
            <Input
              id="field-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Бюджет сделки"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="field-type">Тип поля *</Label>
            <Select value={type} onValueChange={(value: FieldType) => setType(value)}>
              <SelectTrigger id="field-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="field-group">Группа</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger id="field-group">
                <SelectValue placeholder="Выберите группу" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(type === "list" || type === "multilist") && (
            <div className="grid gap-2">
              <Label htmlFor="field-options">Варианты (через запятую) *</Label>
              <Input
                id="field-options"
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                placeholder="Вариант 1, Вариант 2, Вариант 3"
                required
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox id="field-required" checked={required} onCheckedChange={(checked) => setRequired(!!checked)} />
            <Label htmlFor="field-required" className="cursor-pointer">
              Обязательное поле
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit">{editingField ? "Сохранить" : "Добавить"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function FieldConfigurationDialog({
  open,
  onOpenChange,
  fields,
  groups,
  onSave,
}: FieldConfigurationDialogProps) {
  const [editedFields, setEditedFields] = React.useState<CustomField[]>(fields)
  const [editedGroups, setEditedGroups] = React.useState<FieldGroup[]>(groups)
  const [addFieldOpen, setAddFieldOpen] = React.useState(false)
  const [editingField, setEditingField] = React.useState<CustomField | null>(null)
  const [newGroupName, setNewGroupName] = React.useState("")

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  React.useEffect(() => {
    setEditedFields(fields)
    setEditedGroups(groups)
  }, [fields, groups])

  const fieldsByGroup = React.useMemo(() => {
    const grouped: Record<string, CustomField[]> = {}
    editedFields.forEach((field) => {
      const groupId = field.groupId || "ungrouped"
      if (!grouped[groupId]) {
        grouped[groupId] = []
      }
      grouped[groupId].push(field)
    })
    return grouped
  }, [editedFields])

  const handleDragEnd = (event: DragEndEvent, groupId: string) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const groupFields = fieldsByGroup[groupId] || []
      const oldIndex = groupFields.findIndex((item) => item.id === active.id)
      const newIndex = groupFields.findIndex((item) => item.id === over.id)

      const reordered = arrayMove(groupFields, oldIndex, newIndex)
      const otherFields = editedFields.filter((f) => (f.groupId || "ungrouped") !== groupId)

      setEditedFields([...otherFields, ...reordered])
    }
  }

  const handleAddField = (fieldData: Omit<CustomField, "id">) => {
    if (editingField) {
      setEditedFields(editedFields.map((f) => (f.id === editingField.id ? { ...fieldData, id: f.id } : f)))
      setEditingField(null)
    } else {
      const newField: CustomField = {
        ...fieldData,
        id: `field-${Date.now()}`,
      }
      setEditedFields([...editedFields, newField])
    }
  }

  const handleEditField = (field: CustomField) => {
    setEditingField(field)
    setAddFieldOpen(true)
  }

  const handleDeleteField = (id: string) => {
    setEditedFields(editedFields.filter((f) => f.id !== id))
  }

  const handleToggleRequired = (id: string) => {
    setEditedFields(editedFields.map((f) => (f.id === id ? { ...f, required: !f.required } : f)))
  }

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return

    const newGroup: FieldGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      order: editedGroups.length,
    }

    setEditedGroups([...editedGroups, newGroup])
    setNewGroupName("")
  }

  const handleDeleteGroup = (id: string) => {
    setEditedGroups(editedGroups.filter((g) => g.id !== id))
    setEditedFields(editedFields.map((f) => (f.groupId === id ? { ...f, groupId: undefined } : f)))
  }

  const handleSave = () => {
    onSave(editedFields, editedGroups)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`max-w-4xl ${isMobile ? 'w-[95vw] h-[95vh] max-h-[95vh]' : 'max-h-[90vh]'} overflow-hidden flex flex-col`}>
          <DialogHeader>
            <DialogTitle>Настройка свойств полей и групп</DialogTitle>
            <DialogDescription>
              В amoCRM вы можете добавлять свои уникальные поля и использовать их для любых фильтров и отчетов.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="basic">Основное</TabsTrigger>
                <TabsTrigger value="stats">Статистика</TabsTrigger>
              </TabsList>
              <Button size="sm" onClick={() => setAddFieldOpen(true)}>
                <IconPlus className="size-4 mr-2" />
                Добавить поле
              </Button>
            </div>

            <TabsContent value="basic" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-[calc(90vh-280px)]">
                <div className="space-y-6 pr-4">
                  {/* Group Management */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Название новой группы"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddGroup()
                        }}
                        className="flex-1"
                      />
                      <Button onClick={handleAddGroup} disabled={!newGroupName.trim()} size="sm">
                        <IconPlus className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Fields by Group */}
                  {editedGroups
                    .sort((a, b) => a.order - b.order)
                    .map((group) => {
                      const groupFields = fieldsByGroup[group.id] || []

                      return (
                        <div key={group.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">{group.name}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGroup(group.id)}
                              className="text-destructive"
                            >
                              <IconTrash className="size-4" />
                            </Button>
                          </div>

                          {groupFields.length > 0 ? (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={(e) => handleDragEnd(e, group.id)}
                            >
                              <SortableContext
                                items={groupFields.map((f) => f.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2">
                                  {groupFields.map((field) => (
                                    <SortableFieldItem
                                      key={field.id}
                                      field={field}
                                      onEdit={handleEditField}
                                      onDelete={handleDeleteField}
                                      onToggleRequired={handleToggleRequired}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          ) : (
                            <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
                              Нет полей в этой группе
                            </div>
                          )}
                        </div>
                      )
                    })}

                  {/* Ungrouped Fields */}
                  {fieldsByGroup.ungrouped && fieldsByGroup.ungrouped.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">Без группы</h3>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(e, "ungrouped")}
                      >
                        <SortableContext
                          items={fieldsByGroup.ungrouped.map((f) => f.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {fieldsByGroup.ungrouped.map((field) => (
                              <SortableFieldItem
                                key={field.id}
                                field={field}
                                onEdit={handleEditField}
                                onDelete={handleDeleteField}
                                onToggleRequired={handleToggleRequired}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="stats" className="flex-1 overflow-hidden mt-4">
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Статистика использования полей будет доступна здесь
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave}>Сохранить изменения</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddFieldDialog
        open={addFieldOpen}
        onOpenChange={(open) => {
          setAddFieldOpen(open)
          if (!open) setEditingField(null)
        }}
        onAdd={handleAddField}
        groups={editedGroups}
        editingField={editingField}
      />
    </>
  )
}
