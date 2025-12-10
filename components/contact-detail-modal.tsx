"use client"

import * as React from "react"
import { IconPencil, IconTrash, IconUser, IconUpload } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Contact } from "@/lib/contacts-store"

export function ContactDetailModal({
  contact,
  contacts,
  formData,
  setFormData,
  onSave,
  onClose,
  onDelete,
}: {
  contact: Contact | null
  contacts: Contact[]
  formData: {
    name: string
    phone: string
    photo?: string
    iin?: string
    docNumber?: string
    status: "active" | "inactive" | "blocked"
    emergencyContactId?: string
  }
  setFormData: React.Dispatch<React.SetStateAction<any>>
  onSave: () => void
  onClose: () => void
  onDelete?: () => void
}) {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = React.useState<"main" | "history" | "settings">("main")
  const [isImageEditModalOpen, setIsImageEditModalOpen] = React.useState(false)
  const [isEmergencyContactPopoverOpen, setIsEmergencyContactPopoverOpen] = React.useState(false)
  const [emergencyContactSearchQuery, setEmergencyContactSearchQuery] = React.useState("")
  const [selectedEmergencyContact, setSelectedEmergencyContact] = React.useState<Contact | null>(null)

  const isNewContact = !contact

  React.useEffect(() => {
    if (formData.emergencyContactId) {
      const emergencyContact = contacts.find((c) => c.id === formData.emergencyContactId)
      if (emergencyContact) {
        setSelectedEmergencyContact(emergencyContact)
      }
    }
  }, [formData.emergencyContactId, contacts])

  const filteredEmergencyContacts = React.useMemo(() => {
    return emergencyContactSearchQuery
      ? contacts.filter(
          (c) =>
            c.id !== contact?.id &&
            (c.name.toLowerCase().includes(emergencyContactSearchQuery.toLowerCase()) ||
              c.phone.toLowerCase().includes(emergencyContactSearchQuery.toLowerCase())),
        )
      : contacts.filter((c) => c.id !== contact?.id)
  }, [contacts, emergencyContactSearchQuery, contact])

  const handleSave = () => {
    if (!formData.name || !formData.phone) return
    onSave()
  }

  const handleImageSave = (url: string) => {
    setFormData({ ...formData, photo: url })
  }

  const handleSelectEmergencyContact = (contact: Contact) => {
    setSelectedEmergencyContact(contact)
    setFormData({ ...formData, emergencyContactId: contact.id })
    setEmergencyContactSearchQuery("")
    setIsEmergencyContactPopoverOpen(false)
  }

  const handleRemoveEmergencyContact = () => {
    setSelectedEmergencyContact(null)
    setFormData({ ...formData, emergencyContactId: "" })
  }

  return (
    <>
      <div className={`flex flex-col gap-4 sm:gap-6 ${isMobile ? 'p-4 pb-4' : 'p-8 pb-6'} border-b shrink-0`}>
        <div className="flex items-center gap-3 group">
          <div className="relative pb-1">
            <h1 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold`}>{isNewContact ? "Новый клиент" : formData.name}</h1>
            <span className="absolute -bottom-0 left-0 w-full h-[1px] bg-border group-hover:bg-foreground transition-colors" />
          </div>
        </div>

        <div className={`border-b ${isMobile ? '-mb-4 -mx-4 px-4' : '-mb-6 -mx-8 px-8'}`}>
          <nav className={`flex ${isMobile ? 'gap-4' : 'gap-6'} overflow-x-auto scrollbar-hide`} aria-label="Contact sections">
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

      <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-4 py-4' : 'px-8 py-6'}`}>
        {activeTab === "main" ? (
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-4 sm:gap-6`}>
            <div className={`${isMobile ? 'w-full' : 'w-[280px]'} flex-shrink-0`}>
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted group flex items-center justify-center sticky top-0">
                {formData.photo ? (
                  <img
                    src={formData.photo || "/placeholder.svg"}
                    alt={formData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <IconUser className="size-24 text-muted-foreground" />
                )}
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
              <div className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[180px_1fr]'} items-${isMobile ? 'start' : 'center'} gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2`}>
                <div className="text-sm text-muted-foreground">ФИО</div>
                <div>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Иванов Иван Иванович"
                    className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                  />
                </div>
              </div>

              <div className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[180px_1fr]'} items-${isMobile ? 'start' : 'center'} gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2`}>
                <div className="text-sm text-muted-foreground">Телефон</div>
                <div>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+7 (777) 123-45-67"
                    className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                  />
                </div>
              </div>

              <div className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[180px_1fr]'} items-${isMobile ? 'start' : 'center'} gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2`}>
                <div className="text-sm text-muted-foreground">Экстренный контакт</div>
                <div>
                  {selectedEmergencyContact ? (
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                        {(selectedEmergencyContact as any).photo ? (
                          <img
                            src={(selectedEmergencyContact as any).photo || "/placeholder.svg"}
                            alt={selectedEmergencyContact.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <IconUser className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedEmergencyContact.name || ""}</p>
                        <p className="text-xs text-muted-foreground truncate">{selectedEmergencyContact.phone || ""}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveEmergencyContact}
                        className="h-6 w-6 flex-shrink-0"
                        aria-label="Открепить контакт"
                      >
                        <IconTrash className="size-3 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <Popover open={isEmergencyContactPopoverOpen} onOpenChange={setIsEmergencyContactPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-8 px-2 text-sm bg-transparent" data-no-drag>
                          Добавить контакт
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className={`${isMobile ? 'w-[calc(100vw-2rem)]' : 'w-[250px]'} p-0`} align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Поиск по имени или номеру..."
                            value={emergencyContactSearchQuery}
                            onValueChange={setEmergencyContactSearchQuery}
                          />
                          <CommandList>
                            <CommandEmpty>Контакты не найдены</CommandEmpty>
                            <CommandGroup>
                              {filteredEmergencyContacts.map((contact) => (
                                <CommandItem
                                  key={contact.id}
                                  value={`${contact.name} ${contact.phone}`}
                                  onSelect={() => handleSelectEmergencyContact(contact)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <div className="size-8 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                                      {(contact as any).photo ? (
                                        <img
                                          src={(contact as any).photo || "/placeholder.svg"}
                                          alt={contact.name}
                                          className="size-full object-cover"
                                        />
                                      ) : (
                                        <IconUser className="size-4 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">{contact.name}</p>
                                      <p className="text-xs text-muted-foreground">{contact.phone}</p>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>

              <div className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[180px_1fr]'} items-${isMobile ? 'start' : 'center'} gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2`}>
                <div className="text-sm text-muted-foreground">ИИН</div>
                <div>
                  <Input
                    value={formData.iin || ""}
                    onChange={(e) => setFormData({ ...formData, iin: e.target.value })}
                    placeholder="123456789012"
                    className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                  />
                </div>
              </div>

              <div className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[180px_1fr]'} items-${isMobile ? 'start' : 'center'} gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2`}>
                <div className="text-sm text-muted-foreground">Номер документа</div>
                <div>
                  <Input
                    value={formData.docNumber || ""}
                    onChange={(e) => setFormData({ ...formData, docNumber: e.target.value })}
                    placeholder="N12345678"
                    className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                  />
                </div>
              </div>

              <div className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[180px_1fr]'} items-${isMobile ? 'start' : 'center'} gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2`}>
                <div className="text-sm text-muted-foreground">Статус</div>
                <div>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "active" | "inactive" | "blocked") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger className="border-none shadow-none h-8 focus:ring-0 px-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Активный</SelectItem>
                      <SelectItem value="inactive">Неактивный</SelectItem>
                      <SelectItem value="blocked">Заблокирован</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!isNewContact && contact?.createdAt && (
                <div className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[180px_1fr]'} items-${isMobile ? 'start' : 'center'} gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2`}>
                  <div className="text-sm text-muted-foreground">Дата создания</div>
                  <div>
                    <span className="text-sm">{new Date(contact.createdAt).toLocaleDateString("ru-RU")}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "history" ? (
          <div className="space-y-4">
            <div className="text-center text-muted-foreground py-12 border rounded-lg">
              История аренд и взаимодействий будет отображаться здесь
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {onDelete && (
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-2 text-destructive">Опасная зона</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Удаление клиента необратимо. Все данные будут потеряны.
                </p>
                <Button variant="destructive" onClick={onDelete}>
                  <IconTrash className="size-4 mr-2" />
                  Удалить клиента
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 ${isMobile ? 'px-4' : 'px-8'} py-4 border-t bg-muted/30 shrink-0`}>
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Отмена
        </Button>
        <Button onClick={handleSave} disabled={!formData.name || !formData.phone} className="w-full sm:w-auto">
          {isNewContact ? "Добавить" : "Сохранить"}
        </Button>
      </div>

      <ContactImageEditModal
        open={isImageEditModalOpen}
        onOpenChange={setIsImageEditModalOpen}
        currentUrl={formData.photo || ""}
        onSave={handleImageSave}
      />
    </>
  )
}

function ContactImageEditModal({
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
        <DialogTitle className="sr-only">Редактировать фото</DialogTitle>
        <DialogDescription className="sr-only">Загрузите или введите URL изображения для контакта</DialogDescription>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Редактировать фото</h2>

          <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <IconUser className="size-24 text-muted-foreground" />
            )}
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

