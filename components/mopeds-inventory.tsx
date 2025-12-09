"use client"

import * as React from "react"
import { IconPlus, IconPencil, IconTrash, IconSearch, IconUpload, IconFilter } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getMopeds, addMoped, updateMoped, deleteMoped, type Moped } from "@/lib/mopeds-store"

const STATUS_LABELS = {
  available: "Доступен",
  rented: "В аренде",
  maintenance: "На обслуживании",
}

const STATUS_VARIANTS = {
  available: "default" as const,
  rented: "secondary" as const,
  maintenance: "outline" as const,
}

const CONDITION_LABELS = {
  new: "Новый",
  good: "Исправен",
  broken: "Сломан",
}

export function MopedsInventory() {
  const [mopeds, setMopeds] = React.useState<Moped[]>([])
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [viewingMoped, setViewingMoped] = React.useState<Moped | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = React.useState(false)
  const [statusFilters, setStatusFilters] = React.useState<string[]>([])
  const [conditionFilters, setConditionFilters] = React.useState<string[]>([])

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [addFormData, setAddFormData] = React.useState({
    brand: "",
    model: "",
    licensePlate: "",
    photo: "",
    status: "available" as Moped["status"],
    grnz: "",
    vinCode: "",
    color: "",
    mileage: "",
    condition: "good" as "new" | "good" | "broken",
    insuranceDate: "",
    techInspectionDate: "",
  })

  const [viewFormData, setViewFormData] = React.useState({
    brand: "",
    model: "",
    licensePlate: "",
    photo: "",
    status: "available" as Moped["status"],
    grnz: "",
    vinCode: "",
    color: "",
    mileage: "",
    condition: "good" as "new" | "good" | "broken",
    insuranceDate: "",
    techInspectionDate: "",
  })

  React.useEffect(() => {
    const loadMopeds = async () => {
      try {
        const loadedMopeds = await getMopeds()
        console.log("[MopedsInventory] Loaded mopeds:", loadedMopeds.length)
        setMopeds(loadedMopeds)
      } catch (error) {
        console.error("[MopedsInventory] Error loading mopeds:", error)
      }
    }
    loadMopeds()
  }, [])

  const filteredMopeds = React.useMemo(() => {
    let filtered = mopeds

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (moped) =>
          moped.brand.toLowerCase().includes(query) ||
          moped.model.toLowerCase().includes(query) ||
          moped.licensePlate.toLowerCase().includes(query),
      )
    }

    if (statusFilters.length > 0) {
      filtered = filtered.filter((moped) => statusFilters.includes(moped.status))
    }

    if (conditionFilters.length > 0) {
      filtered = filtered.filter((moped) => {
        const mopedCondition = (moped as any).condition || "good"
        console.log(
          "[v0] Filtering moped:",
          moped.brand,
          moped.model,
          "condition:",
          mopedCondition,
          "filters:",
          conditionFilters,
        )
        return conditionFilters.includes(mopedCondition)
      })
    }

    return filtered
  }, [mopeds, searchQuery, statusFilters, conditionFilters])

  const toggleStatusFilter = (status: string) => {
    setStatusFilters((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]))
  }

  const toggleConditionFilter = (condition: string) => {
    setConditionFilters((prev) =>
      prev.includes(condition) ? prev.filter((c) => c !== condition) : [...prev, condition],
    )
  }

  const handleOpenAddDialog = () => {
    setAddFormData({
      brand: "",
      model: "",
      licensePlate: "",
      photo: "",
      status: "available",
      grnz: "",
      vinCode: "",
      color: "",
      mileage: "",
      condition: "good",
      insuranceDate: "",
      techInspectionDate: "",
    })
    setIsDialogOpen(true)
  }

  const handleViewMoped = (moped: Moped) => {
    setViewingMoped(moped)
    setViewFormData({
      brand: moped.brand,
      model: moped.model,
      licensePlate: moped.licensePlate,
      photo: moped.photo || "",
      status: moped.status,
      grnz: (moped as any).grnz || "",
      vinCode: (moped as any).vinCode || "",
      color: (moped as any).color || "",
      mileage: (moped as any).mileage || "",
      condition: (moped as any).condition || "good",
      insuranceDate: (moped as any).insuranceDate || "",
      techInspectionDate: (moped as any).techInspectionDate || "",
    })
    setIsViewModalOpen(true)
  }

  async function handleSaveAdd() {
    if (!addFormData.brand || !addFormData.model || !addFormData.licensePlate) {
      return
    }

    const newMoped = await addMoped(addFormData)
    if (newMoped) {
      const loadedMopeds = await getMopeds()
      setMopeds(loadedMopeds)
    }
    setIsDialogOpen(false)
    setAddFormData({
      brand: "",
      model: "",
      licensePlate: "",
      photo: "",
      status: "available",
      grnz: "",
      vinCode: "",
      color: "",
      mileage: "",
      condition: "good",
      insuranceDate: "",
      techInspectionDate: "",
    })
  }

  async function handleSaveFromView() {
    if (!viewFormData.brand || !viewFormData.model || !viewFormData.licensePlate || !viewingMoped) {
      return
    }

    await updateMoped(viewingMoped.id, viewFormData)
    const loadedMopeds = await getMopeds()
    setMopeds(loadedMopeds)
    setIsViewModalOpen(false)
    setViewingMoped(null)
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    if (confirm("Вы уверены, что хотите удалить этот мопед?")) {
      await deleteMoped(id)
      const loadedMopeds = await getMopeds()
      setMopeds(loadedMopeds)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по марке, модели или номеру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <IconFilter className="size-4 mr-2" />
              Фильтр
              {(statusFilters.length > 0 || conditionFilters.length > 0) && (
                <Badge variant="secondary" className="ml-2 px-1 min-w-5 h-5 rounded-full">
                  {statusFilters.length + conditionFilters.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Статус</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={statusFilters.includes("available")}
              onCheckedChange={() => toggleStatusFilter("available")}
            >
              Доступен
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilters.includes("rented")}
              onCheckedChange={() => toggleStatusFilter("rented")}
            >
              В аренде
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilters.includes("maintenance")}
              onCheckedChange={() => toggleStatusFilter("maintenance")}
            >
              На обслуживании
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Состояние</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={conditionFilters.includes("new")}
              onCheckedChange={() => toggleConditionFilter("new")}
            >
              Новый
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={conditionFilters.includes("good")}
              onCheckedChange={() => toggleConditionFilter("good")}
            >
              Исправен
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={conditionFilters.includes("broken")}
              onCheckedChange={() => toggleConditionFilter("broken")}
            >
              Сломан
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAddDialog}>
              <IconPlus className="size-4 mr-2" />
              Добавить мопед
            </Button>
          </DialogTrigger>
          <DialogContent className="!max-w-4xl w-[85vw] max-h-[95vh] h-[95vh] overflow-hidden flex flex-col p-0">
            <MopedDetailModal
              moped={null}
              formData={addFormData}
              setFormData={setAddFormData}
              onSave={handleSaveAdd}
              onDelete={undefined}
              onClose={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {filteredMopeds.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 border rounded-lg">
            {searchQuery || statusFilters.length > 0 || conditionFilters.length > 0
              ? "Мопеды не найдены"
              : "Нет мопедов. Добавьте первый мопед."}
          </div>
        ) : (
          filteredMopeds.map((moped) => (
            <div
              key={moped.id}
              className="flex items-center gap-4 px-4 py-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => handleViewMoped(moped)}
            >
              <div className="size-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={moped.photo || "/placeholder.svg?height=48&width=48"}
                  alt={`${moped.brand} ${moped.model}`}
                  className="size-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base">
                    {moped.brand} {moped.model}
                  </h3>
                  <Badge variant={STATUS_VARIANTS[moped.status]}>{STATUS_LABELS[moped.status]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Гос. номер: {moped.licensePlate} • Добавлен: {new Date(moped.createdAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={(e) => handleDelete(moped.id, e)} aria-label="Удалить">
                  <IconTrash className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="!max-w-4xl w-[85vw] max-h-[95vh] h-[95vh] overflow-hidden flex flex-col p-0">
          <MopedDetailModal
            moped={viewingMoped}
            formData={viewFormData}
            setFormData={setViewFormData}
            onSave={handleSaveFromView}
            onDelete={() => viewingMoped && handleDelete(viewingMoped.id)}
            onClose={() => setIsViewModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ImageEditModal({
  open,
  onOpenChange,
  currentUrl,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUrl: string
  onSave: (url: string) => void
}) {
  const [imageUrl, setImageUrl] = React.useState(currentUrl)
  const [dragActive, setDragActive] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setImageUrl(currentUrl)
  }, [currentUrl])

  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setImageUrl(result)
    }
    reader.readAsDataURL(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleSave = () => {
    onSave(imageUrl)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Редактировать изображение</h2>

          <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted">
            <img
              src={imageUrl || "/placeholder.svg?height=400&width=400&query=scooter"}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>

          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Загрузить</TabsTrigger>
              <TabsTrigger value="url">Ссылка</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0])
                    }
                  }}
                />
                <IconUpload className="size-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">Перетащите изображение сюда или</p>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Выбрать файл
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label>URL изображения</Label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave}>Сохранить</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MopedDetailModal({
  moped,
  formData,
  setFormData,
  onSave,
  onDelete,
  onClose,
}: {
  moped: Moped | null
  formData: any
  setFormData: any
  onSave: () => void
  onDelete: (() => void) | undefined
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = React.useState<"main" | "history" | "settings">("main")
  const [isImageEditModalOpen, setIsImageEditModalOpen] = React.useState(false)

  const isNewMoped = !moped

  const handleImageSave = (url: string) => {
    setFormData({ ...formData, photo: url })
  }

  return (
    <>
      <div className="flex flex-col gap-6 p-8 pb-6 border-b shrink-0">
        <div className="flex items-center gap-3 group">
          <div className="relative pb-1">
            <h1 className="text-3xl font-bold">{isNewMoped ? "Новый мопед" : `${formData.brand} ${formData.model}`}</h1>
            <span className="absolute -bottom-0 left-0 w-full h-[1px] bg-border group-hover:bg-foreground transition-colors" />
          </div>
        </div>

        <div className="border-b -mb-6 -mx-8 px-8">
          <nav className="flex gap-6" aria-label="Moped sections">
            <button
              onClick={() => setActiveTab("main")}
              className={`text-muted-foreground hover:text-foreground relative whitespace-nowrap border-b-2 text-sm font-medium transition-colors pb-3.5 ${
                activeTab === "main" ? "text-foreground border-foreground" : "border-transparent"
              }`}
            >
              Основные
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`text-muted-foreground hover:text-foreground relative whitespace-nowrap border-b-2 text-sm font-medium transition-colors pb-3.5 ${
                activeTab === "history" ? "text-foreground border-foreground" : "border-transparent"
              }`}
            >
              История
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`text-muted-foreground hover:text-foreground relative whitespace-nowrap border-b-2 text-sm font-medium transition-colors pb-3.5 ${
                activeTab === "settings" ? "text-foreground border-foreground" : "border-transparent"
              }`}
            >
              Настройки
            </button>
          </nav>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {activeTab === "main" ? (
          <div className="flex gap-6">
            <div className="w-[280px] flex-shrink-0">
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted group sticky top-0">
                <img
                  src={formData.photo || "/placeholder.svg?height=400&width=400&query=scooter"}
                  alt={isNewMoped ? "Новый мопед" : `${formData.brand} ${formData.model}`}
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsImageEditModalOpen(true)}
                >
                  <IconPencil className="size-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <div className="text-sm text-muted-foreground">Марка</div>
                <div>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Honda"
                    className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <div className="text-sm text-muted-foreground">Модель</div>
                <div>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Dio"
                    className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <div className="text-sm text-muted-foreground">Гос. номер</div>
                <div>
                  <Input
                    placeholder="А123ВС77"
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                    className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <div className="text-sm text-muted-foreground">№ Тех паспорта</div>
                <div>
                  <Input
                    placeholder="№ Тех паспорта"
                    value={formData.grnz}
                    onChange={(e) => setFormData({ ...formData, grnz: e.target.value })}
                    className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <div className="text-sm text-muted-foreground">VIN-Code</div>
                <div>
                  <Input
                    placeholder="1HGBH41JXMN109186"
                    value={formData.vinCode}
                    onChange={(e) => setFormData({ ...formData, vinCode: e.target.value })}
                    className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <div className="text-sm text-muted-foreground">Цвет</div>
                <div>
                  <Input
                    placeholder="Красный"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <div className="text-sm text-muted-foreground">Пробег</div>
                <div>
                  <Input
                    placeholder="15000 км"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                    className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <div className="text-sm text-muted-foreground">Состояние</div>
                <div>
                  <Select
                    value={formData.condition}
                    onValueChange={(value: "new" | "good" | "broken") => setFormData({ ...formData, condition: value })}
                  >
                    <SelectTrigger className="border-none shadow-none h-8 focus:ring-0 px-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Новый</SelectItem>
                      <SelectItem value="good">Исправен</SelectItem>
                      <SelectItem value="broken">Сломан</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <div className="text-sm text-muted-foreground">Дата страховки</div>
                <div>
                  <Input
                    type="date"
                    value={formData.insuranceDate}
                    onChange={(e) => setFormData({ ...formData, insuranceDate: e.target.value })}
                    className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <div className="text-sm text-muted-foreground">Дата Тех-Осмотра</div>
                <div>
                  <Input
                    type="date"
                    value={formData.techInspectionDate}
                    onChange={(e) => setFormData({ ...formData, techInspectionDate: e.target.value })}
                    className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <div className="text-sm text-muted-foreground">Статус</div>
                <div>
                  <Select
                    value={formData.status}
                    onValueChange={(value: Moped["status"]) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="border-none shadow-none h-8 focus:ring-0 px-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Доступен</SelectItem>
                      <SelectItem value="rented">В аренде</SelectItem>
                      <SelectItem value="maintenance">На обслуживании</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!isNewMoped && moped?.createdAt && (
                <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                  <div className="text-sm text-muted-foreground">Дата создания</div>
                  <div>
                    <span className="text-sm">{new Date(moped.createdAt).toLocaleDateString("ru-RU")}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "history" ? (
          <div className="space-y-4">
            <div className="text-center text-muted-foreground py-12 border rounded-lg">
              История аренд и изменений будет отображаться здесь
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {onDelete && (
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-2 text-destructive">Опасная зона</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Удаление мопеда необратимо. Все данные будут потеряны.
                </p>
                <Button variant="destructive" onClick={onDelete}>
                  <IconTrash className="size-4 mr-2" />
                  Удалить мопед
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-8 py-4 border-t bg-muted/30 shrink-0">
        <Button variant="outline" onClick={onClose}>
          Отмена
        </Button>
        <Button onClick={onSave} disabled={!formData.brand || !formData.model || !formData.licensePlate}>
          {isNewMoped ? "Добавить" : "Сохранить"}
        </Button>
      </div>

      <ImageEditModal
        open={isImageEditModalOpen}
        onOpenChange={setIsImageEditModalOpen}
        currentUrl={formData.photo}
        onSave={handleImageSave}
      />
    </>
  )
}
