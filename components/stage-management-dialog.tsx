"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { IconGripVertical, IconTrash, IconPlus } from "@tabler/icons-react"
import type { KanbanStage } from "@/lib/types/crm-fields"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type StageManagementDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  stages: KanbanStage[]
  onSave: (stages: KanbanStage[]) => void
}

const COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#64748b", // slate
  "#6b7280", // gray
]

function SortableStage({
  stage,
  onUpdate,
  onDelete,
}: {
  stage: KanbanStage
  onUpdate: (id: string, updates: Partial<KanbanStage>) => void
  onDelete: (id: string) => void
}) {
  const [showColors, setShowColors] = React.useState(false)
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stage.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-card border rounded-lg p-3">
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
          <IconGripVertical className="size-5 text-muted-foreground" />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColors(!showColors)}
            className="w-8 h-8 rounded-full border-2 border-border hover:scale-110 transition-transform"
            style={{ backgroundColor: stage.color }}
          />
          {showColors && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowColors(false)} />
              <div className="absolute top-10 left-0 z-50 bg-popover border rounded-lg shadow-xl p-3 w-[240px]">
                <div className="grid grid-cols-6 gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        onUpdate(stage.id, { color })
                        setShowColors(false)
                      }}
                      className="w-8 h-8 rounded-full border-2 border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <Input
          value={stage.name}
          onChange={(e) => onUpdate(stage.id, { name: e.target.value })}
          className="flex-1"
          placeholder="Название стадии"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(stage.id)}
          className="text-destructive hover:text-destructive"
        >
          <IconTrash className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function StageManagementDialog({ open, onOpenChange, stages, onSave }: StageManagementDialogProps) {
  const [localStages, setLocalStages] = React.useState<KanbanStage[]>([])
  const [newStageName, setNewStageName] = React.useState("")

  const sensors = useSensors(useSensor(PointerSensor))

  React.useEffect(() => {
    if (open) {
      setLocalStages([...stages])
    }
  }, [open, stages])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setLocalStages((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      const reordered = arrayMove(items, oldIndex, newIndex)
      return reordered.map((stage, index) => ({ ...stage, order: index }))
    })
  }

  const handleUpdate = (id: string, updates: Partial<KanbanStage>) => {
    setLocalStages((prev) => prev.map((stage) => (stage.id === id ? { ...stage, ...updates } : stage)))
  }

  const handleDelete = (id: string) => {
    setLocalStages((prev) => {
      const filtered = prev.filter((stage) => stage.id !== id)
      return filtered.map((stage, index) => ({ ...stage, order: index }))
    })
  }

  const handleAdd = () => {
    if (!newStageName.trim()) return

    const newStage: KanbanStage = {
      id: `stage-${Date.now()}`,
      name: newStageName.trim(),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      order: localStages.length,
    }

    setLocalStages((prev) => [...prev, newStage])
    setNewStageName("")
  }

  const handleSave = () => {
    onSave(localStages)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setLocalStages([...stages])
    setNewStageName("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Управление стадиями</DialogTitle>
          <DialogDescription>
            Создавайте, редактируйте и меняйте порядок стадий. Перетаскивайте для изменения порядка.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Название новой стадии"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={!newStageName.trim()}>
              <IconPlus className="size-4 mr-2" />
              Добавить
            </Button>
          </div>

          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={localStages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {localStages.map((stage) => (
                  <SortableStage key={stage.id} stage={stage} onUpdate={handleUpdate} onDelete={handleDelete} />
                ))}
              </SortableContext>
            </DndContext>

            {localStages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">Нет стадий. Добавьте первую стадию выше.</div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Отмена
          </Button>
          <Button onClick={handleSave}>Сохранить изменения</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
