"use client"

import { useEffect } from "react"

import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

import * as React from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { IconTrash, IconChevronDown, IconUser, IconScooter } from "@tabler/icons-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { DealWithFields, CustomField, FieldGroup, FieldValue, KanbanStage } from "@/lib/types/crm-fields"
import { getCustomFields, getFieldGroups, getKanbanStages } from "@/lib/crm-fields-store"
import { getContacts, addContact, findContactByNameOrPhone, type Contact } from "@/lib/contacts-store"
import { getMopedByIdCached, getMopeds, addMoped, updateMoped, type Moped } from "@/lib/mopeds-store"
import { useAuth } from "@/lib/auth"
import { useIsMobile } from "@/hooks/use-mobile"
import { useIsTablet } from "@/hooks/use-tablet"
import { MopedDetailModal } from "@/components/moped-detail-modal"

type DealDetailModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal: DealWithFields | null
  onSave: (deal: DealWithFields) => void
  onDelete?: (dealId: string) => void
  initialMopeds?: Moped[]
  initialContacts?: Contact[]
}

function formatDateRu(date: Date): string {
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

const STATUS_VARIANTS: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  active: "default",
  inactive: "secondary",
  blocked: "destructive",
  available: "default",
  rented: "secondary",
  maintenance: "outline",
}

const STATUS_LABELS: Record<string, string> = {
  active: "Активный",
  inactive: "Неактивный",
  blocked: "Заблокирован",
  available: "Доступен",
  rented: "В аренде",
  maintenance: "На обслуживании",
}

export function DealDetailModal({
  open,
  onOpenChange,
  deal,
  onSave,
  onDelete,
  initialMopeds,
  initialContacts,
}: DealDetailModalProps) {
  const { username } = useAuth() // Get authenticated user from auth context
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const [customFields, setCustomFields] = React.useState<CustomField[]>([])
  const [fieldGroups, setFieldGroups] = React.useState<FieldGroup[]>([])
  const [stages, setStages] = React.useState<KanbanStage[]>([])
  const [editedDeal, setEditedDeal] = React.useState<DealWithFields | null>(null)
  const [isEditingName, setIsEditingName] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"main" | "settings">("main")
  const [contacts, setContacts] = React.useState<Array<{ id: string; name: string; phone: string }>>(
    initialContacts || [],
  )
  const [mopeds, setMopeds] = React.useState<Moped[]>(initialMopeds || [])
  const [selectedDateStart, setSelectedDateStart] = React.useState<Date | undefined>(undefined)
  const [selectedDateEnd, setSelectedDateEnd] = React.useState<Date | undefined>(undefined)
  const [isContactOpen, setIsContactOpen] = React.useState(false)
  const [isEmergencyContactOpen, setIsEmergencyContactOpen] = React.useState(false)
  const [savedContact, setSavedContact] = React.useState<Contact | null>(null)
  const [savedEmergencyContact, setSavedEmergencyContact] = React.useState<Contact | null>(null)
  const [viewingContactModal, setViewingContactModal] = React.useState<Contact | null>(null)
  const [isContactDetailOpen, setIsContactDetailOpen] = React.useState(false)
  const [isMopedOpen, setIsMopedOpen] = React.useState(false)
  const [savedMoped, setSavedMoped] = React.useState<Moped | null>(null)
  const [mopedSearchQuery, setMopedSearchQuery] = React.useState("")
  const [viewingMopedModal, setViewingMopedModal] = React.useState<Moped | null>(null)
  const [isMopedDetailOpen, setIsMopedDetailOpen] = React.useState(false)
  const [mopedFormData, setMopedFormData] = React.useState({
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
  const [isMopedPopoverOpen, setIsMopedPopoverOpen] = React.useState(false)
  const [isContactPopoverOpen, setIsContactPopoverOpen] = React.useState(false)
  const [isEmergencyContactPopoverOpen, setIsEmergencyContactPopoverOpen] = React.useState(false)
  const [contactSearchQuery, setContactSearchQuery] = React.useState("")
  const [emergencyContactSearchQuery, setEmergencyContactSearchQuery] = React.useState("")
  const [isCreatingEmergencyContact, setIsCreatingEmergencyContact] = React.useState(false)

  const filteredMopeds = React.useMemo(() => {
    return mopedSearchQuery
      ? mopeds.filter(
          (m) =>
            m.licensePlate.toLowerCase().includes(mopedSearchQuery.toLowerCase()) ||
            m.brand.toLowerCase().includes(mopedSearchQuery.toLowerCase()) ||
            m.model.toLowerCase().includes(mopedSearchQuery.toLowerCase()),
        )
      : mopeds
  }, [mopeds, mopedSearchQuery])

  const filteredContacts = React.useMemo(() => {
    return contactSearchQuery
      ? contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
            c.phone.toLowerCase().includes(contactSearchQuery.toLowerCase()),
        )
      : contacts
  }, [contacts, contactSearchQuery])

  const filteredEmergencyContacts = React.useMemo(() => {
    return emergencyContactSearchQuery
      ? contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(emergencyContactSearchQuery.toLowerCase()) ||
            c.phone.toLowerCase().includes(emergencyContactSearchQuery.toLowerCase()),
        )
      : contacts
  }, [contacts, emergencyContactSearchQuery])

  useEffect(() => {
    // Seed from props immediately for instant UI
    if (initialContacts && initialContacts.length) {
      setContacts(initialContacts)
    }
    if (initialMopeds && initialMopeds.length) {
      setMopeds(initialMopeds)
    }
    const loadData = async () => {
      const [loadedFields, loadedGroups, loadedStages, loadedContacts, loadedMopeds] = await Promise.all([
        getCustomFields(),
        getFieldGroups(),
        getKanbanStages(),
        getContacts(),
        getMopeds(),
      ])
      setCustomFields(loadedFields)
      setFieldGroups(loadedGroups)
      setStages(loadedStages)
      setContacts(loadedContacts)
      setMopeds(loadedMopeds)
    }
    loadData()
  }, [initialContacts, initialMopeds])

  const refreshContacts = async () => {
    try {
      const loadedContacts = await getContacts()
      setContacts(loadedContacts)
    } catch (e) {
      console.error("Failed to refresh contacts", e)
    }
  }

  const refreshMopeds = async () => {
    try {
      const loadedMopeds = await getMopeds()
      setMopeds(loadedMopeds)
    } catch (e) {
      console.error("Failed to refresh mopeds", e)
    }
  }

  useEffect(() => {
    if (deal) {
      setEditedDeal({ ...deal })
      if (deal.dateStart) {
        try {
          const parsedDate = new Date(deal.dateStart)
          if (!isNaN(parsedDate.getTime())) {
            setSelectedDateStart(parsedDate)
          }
        } catch (e) {
          // Invalid date, ignore
        }
      }
      if (deal.dateEnd) {
        try {
          const parsedDate = new Date(deal.dateEnd)
          if (!isNaN(parsedDate.getTime())) {
            setSelectedDateEnd(parsedDate)
          }
        } catch (e) {
          // Invalid date, ignore
        }
      }

      const loadContactData = async () => {
        if (deal.contactName || deal.contactPhone) {
          const existingContact = await findContactByNameOrPhone(deal.contactName, deal.contactPhone)
          if (existingContact) {
            setSavedContact(existingContact)
          }
        }

        if (deal.emergencyContactName || deal.emergencyContactPhone) {
          const existingEmergencyContact = await findContactByNameOrPhone(
            deal.emergencyContactName,
            deal.emergencyContactPhone,
          )
          if (existingEmergencyContact) {
            setSavedEmergencyContact(existingEmergencyContact)
          }
        }
      }
      loadContactData()

      const loadMopedData = async () => {
        if (deal.mopedId) {
          const existingMoped = await getMopedByIdCached(deal.mopedId)
          if (existingMoped) {
            setSavedMoped(existingMoped)
          }
        }
      }
      loadMopedData()
    }
  }, [deal])

  if (!editedDeal) return null

  const currentStage = stages.length > 0 ? stages.find((s) => s.id === editedDeal.stage) : undefined
  const currentStageIndex = stages.length > 0 ? stages.findIndex((s) => s.id === editedDeal.stage) : -1
  const progressPercentage = stages.length > 0 ? ((currentStageIndex + 1) / stages.length) * 100 : 0

  const handleSave = () => {
    if (!editedDeal.clientName || !editedDeal.clientName.trim()) {
      return
    }
    onSave(editedDeal)
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (onDelete && editedDeal.id) {
      onDelete(editedDeal.id)
      onOpenChange(false)
    }
  }

  const handleStageChange = (newStageId: string) => {
    setEditedDeal({ ...editedDeal, stage: newStageId })
  }

  const getFieldValue = (fieldId: string): any => {
    const fieldValue = editedDeal.customFields?.find((f) => f.fieldId === fieldId)
    return fieldValue?.value ?? ""
  }

  const setFieldValue = (fieldId: string, value: any) => {
    const existingFields = editedDeal.customFields || []
    const fieldIndex = existingFields.findIndex((f) => f.fieldId === fieldId)

    let newFields: FieldValue[]
    if (fieldIndex >= 0) {
      newFields = [...existingFields]
      newFields[fieldIndex] = { fieldId, value }
    } else {
      newFields = [...existingFields, { fieldId, value }]
    }

    setEditedDeal({ ...editedDeal, customFields: newFields })
  }

  const renderField = (field: CustomField) => {
    const value = getFieldValue(field.id)

    switch (field.type) {
      case "text":
        return (
          <div key={field.id} className="grid gap-2">
            <Label htmlFor={field.id}>
              {field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              value={value}
              onChange={(e) => setFieldValue(field.id, e.target.value)}
              placeholder={`Введите ${field.name.toLowerCase()}`}
              rows={3}
            />
          </div>
        )

      case "number":
        return (
          <div key={field.id} className="grid gap-2">
            <Label htmlFor={field.id}>
              {field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="number"
              value={value}
              onChange={(e) => setFieldValue(field.id, e.target.value)}
              placeholder={`Введите ${field.name.toLowerCase()}`}
            />
          </div>
        )

      case "flag":
        return (
          <div key={field.id} className="flex items-center gap-2">
            <Checkbox id={field.id} checked={!!value} onCheckedChange={(checked) => setFieldValue(field.id, checked)} />
            <Label htmlFor={field.id} className="cursor-pointer">
              {field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        )

      case "list":
        return (
          <div key={field.id} className="grid gap-2">
            <Label htmlFor={field.id}>
              {field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select value={value} onValueChange={(val) => setFieldValue(field.id, val)}>
              <SelectTrigger id={field.id}>
                <SelectValue placeholder={`Выберите ${field.name.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case "multilist":
        return (
          <div key={field.id} className="grid gap-2">
            <Label>
              {field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="space-y-2 border rounded-md p-3">
              {field.options?.map((option) => {
                const selectedValues = Array.isArray(value) ? value : []
                const isChecked = selectedValues.includes(option)
                return (
                  <div key={option} className="flex items-center gap-2">
                    <Checkbox
                      id={`${field.id}-${option}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const newValues = checked
                          ? [...selectedValues, option]
                          : selectedValues.filter((v) => v !== option)
                        setFieldValue(field.id, newValues)
                      }}
                    />
                    <Label htmlFor={`${field.id}-${option}`} className="cursor-pointer text-sm">
                      {option}
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>
        )

      case "date":
        return (
          <div key={field.id} className="grid gap-2">
            <Label htmlFor={field.id}>
              {field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input id={field.id} type="date" value={value} onChange={(e) => setFieldValue(field.id, e.target.value)} />
          </div>
        )

      default:
        return null
    }
  }

  async function handleContactBlur() {
    if (!editedDeal.contactName || !editedDeal.contactPhone) return
    if (savedContact) return // Already saved

    // Check if contact exists
    const existingContact = await findContactByNameOrPhone(editedDeal.contactName, editedDeal.contactPhone)

    if (existingContact) {
      // Pull data from existing contact
      setEditedDeal({
        ...editedDeal,
        contactName: existingContact.name,
        contactPhone: existingContact.phone,
        contactIIN: existingContact.iin || editedDeal.contactIIN,
        contactDocNumber: existingContact.docNumber || editedDeal.contactDocNumber,
        contactStatus: existingContact.status || editedDeal.contactStatus,
      })
      setSavedContact(existingContact)
    } else {
      // Create new contact
      const newContact = await addContact({
        name: editedDeal.contactName,
        phone: editedDeal.contactPhone,
        email: "",
        iin: editedDeal.contactIIN,
        docNumber: editedDeal.contactDocNumber,
        status: editedDeal.contactStatus,
        createdBy: username || undefined,
      })
      if (newContact) {
        setSavedContact(newContact)
        const loadedContacts = await getContacts()
        setContacts(loadedContacts)
      }
    }
  }

  const handleContactKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleContactBlur()
    }
  }

  async function handleEmergencyContactBlur() {
    if (!editedDeal.emergencyContactName || !editedDeal.emergencyContactPhone) return
    if (savedEmergencyContact) return // Already saved

    // Check if contact exists
    const existingContact = await findContactByNameOrPhone(
      editedDeal.emergencyContactName,
      editedDeal.emergencyContactPhone,
    )

    if (existingContact) {
      // Pull data from existing contact
      setEditedDeal({
        ...editedDeal,
        emergencyContactName: existingContact.name,
        emergencyContactPhone: existingContact.phone,
        emergencyContactIIN: existingContact.iin || editedDeal.emergencyContactIIN,
        emergencyContactDocNumber: existingContact.docNumber || editedDeal.emergencyContactDocNumber,
        emergencyContactStatus: existingContact.status || editedDeal.emergencyContactStatus,
      })
      setSavedEmergencyContact(existingContact)
    } else {
      // Create new contact
      const newContact = await addContact({
        name: editedDeal.emergencyContactName,
        phone: editedDeal.emergencyContactPhone,
        email: "",
        iin: editedDeal.emergencyContactIIN,
        docNumber: editedDeal.emergencyContactDocNumber,
        status: editedDeal.emergencyContactStatus,
        createdBy: username || undefined,
      })
      if (newContact) {
        setSavedEmergencyContact(newContact)
        const loadedContacts = await getContacts()
        setContacts(loadedContacts)
      }
    }
  }

  const handleEmergencyContactKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleEmergencyContactBlur()
    }
  }

  const handleMopedLicensePlateBlur = () => {
    if (!mopedSearchQuery) return
    if (savedMoped) return // Already saved

    const existingMoped = findMopedByLicensePlate(mopedSearchQuery)
    if (existingMoped) {
      setSavedMoped(existingMoped)
      setEditedDeal({ ...editedDeal, mopedId: existingMoped.id })
      setMopedSearchQuery("")
    }
  }

  const handleMopedKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleMopedLicensePlateBlur()
    }
  }

  const handleRemoveContact = () => {
    setSavedContact(null)
    setEditedDeal({
      ...editedDeal,
      contactName: "",
      contactPhone: "",
      contactIIN: "",
      contactDocNumber: "",
      contactStatus: "",
    })
  }

  const handleRemoveEmergencyContact = () => {
    setSavedEmergencyContact(null)
    setEditedDeal({
      ...editedDeal,
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactIIN: "",
      emergencyContactDocNumber: "",
      emergencyContactStatus: "",
    })
  }

  const handleOpenContactDetail = (contact: Contact) => {
    setViewingContactModal(contact)
    setIsContactDetailOpen(true)
  }

  async function handleSaveContactFromModal(updatedContact: Contact) {
    // Update the contact in the contacts store
    const allContacts = await getContacts()
    const contactIndex = allContacts.findIndex((c) => c.id === updatedContact.id)
    if (contactIndex >= 0) {
      allContacts[contactIndex] = updatedContact
      // Update saved contact references
      if (savedContact?.id === updatedContact.id) {
        setSavedContact(updatedContact)
      }
      if (savedEmergencyContact?.id === updatedContact.id) {
        setSavedEmergencyContact(updatedContact)
      }
      setContacts([...allContacts])
    }
    setIsContactDetailOpen(false)
  }

  const findMopedByLicensePlate = (licensePlate: string): Moped | undefined => {
    return mopeds.find((m) => m.licensePlate.toLowerCase() === licensePlate.toLowerCase())
  }

  const handleSelectMoped = (selectedMoped: Moped) => {
    setSavedMoped(selectedMoped)
    setEditedDeal({ ...editedDeal, mopedId: selectedMoped.id })
    setMopedSearchQuery("")
    setIsMopedPopoverOpen(false)
  }

  const handleCreateMoped = async () => {
    if (!mopedFormData.brand || !mopedFormData.model || !mopedFormData.licensePlate) {
      return
    }
    
    const newMoped = await addMoped({
      ...mopedFormData,
      createdBy: username || undefined,
    } as any)
    
    if (newMoped) {
      await refreshMopeds()
      handleSelectMoped(newMoped)
      setIsMopedDetailOpen(false)
      setViewingMopedModal(null)
      // Reset form
      setMopedFormData({
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
  }

  const handleCreateContact = async (contactData: Omit<Contact, "id" | "createdAt">) => {
    const newContact = await addContact({
      ...contactData,
      createdBy: username || undefined,
    })
    if (newContact) {
      await refreshContacts()
      if (isCreatingEmergencyContact) {
        handleSelectEmergencyContact(newContact)
      } else {
        handleSelectContact(newContact)
      }
      setIsContactDetailOpen(false)
      setViewingContactModal(null)
      setIsCreatingEmergencyContact(false)
    }
  }

  const handleOpenMopedDetail = (moped: Moped) => {
    setViewingMopedModal(moped)
    setMopedFormData({
      brand: moped.brand,
      model: moped.model,
      licensePlate: moped.licensePlate,
      photo: moped.photo || "",
      status: moped.status || "available",
      grnz: (moped as any).grnz || "",
      vinCode: (moped as any).vinCode || "",
      color: (moped as any).color || "",
      mileage: (moped as any).mileage || "",
      condition: (moped as any).condition || "good",
      insuranceDate: (moped as any).insuranceDate || "",
      techInspectionDate: (moped as any).techInspectionDate || "",
    })
    setIsMopedDetailOpen(true)
  }

  const handleSaveMopedFromModal = async () => {
    if (!viewingMopedModal) return
    
    // Update moped
    const updatedMoped = await updateMoped(viewingMopedModal.id, {
      ...mopedFormData,
    } as any)
    
    if (updatedMoped) {
      // Refresh mopeds list to reflect changes
      const latest = await getMopeds()
      setMopeds(latest)
      if (savedMoped?.id === updatedMoped.id) {
        setSavedMoped(updatedMoped)
      }
    }
    setIsMopedDetailOpen(false)
    setViewingMopedModal(null)
  }

  const handleRemoveMoped = () => {
    setSavedMoped(null)
    setEditedDeal({ ...editedDeal, mopedId: undefined })
    setMopedSearchQuery("")
  }

  const handleSelectContact = (selectedContact: Contact) => {
    setSavedContact(selectedContact)
    setEditedDeal({
      ...editedDeal,
      contactName: selectedContact.name,
      contactPhone: selectedContact.phone,
      contactIIN: selectedContact.iin || "",
      contactDocNumber: selectedContact.docNumber || "",
      contactStatus: selectedContact.status || "",
    })
    setContactSearchQuery("")
    setIsContactPopoverOpen(false)
  }

  const handleSelectEmergencyContact = (selectedContact: Contact) => {
    setSavedEmergencyContact(selectedContact)
    setEditedDeal({
      ...editedDeal,
      emergencyContactName: selectedContact.name,
      emergencyContactPhone: selectedContact.phone,
      emergencyContactIIN: selectedContact.iin || "",
      emergencyContactDocNumber: selectedContact.docNumber || "",
      emergencyContactStatus: selectedContact.status || "",
    })
    setEmergencyContactSearchQuery("")
    setIsEmergencyContactPopoverOpen(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`!max-w-4xl ${isMobile ? 'w-[100vw] h-[100vh] max-h-[100vh] m-0 rounded-none' : isTablet ? 'w-[95vw] max-h-[95vh] h-[95vh]' : 'w-[85vw] max-h-[95vh] h-[95vh]'} overflow-hidden flex flex-col p-0 ${isMobile ? 'm-0 rounded-none' : ''}`}>
          <DialogTitle className="sr-only">{isNewDeal ? "Новая заявка" : "Редактировать заявку"}</DialogTitle>
          <DialogDescription className="sr-only">{isNewDeal ? "Создайте новую заявку на аренду" : "Измените информацию о заявке"}</DialogDescription>
          <div className="flex flex-col gap-6 p-8 pb-6 border-b shrink-0">
            <div className="flex items-center gap-3 group">
              <div className="relative pb-1">
                {isEditingName ? (
                  <Input
                    value={editedDeal.clientName}
                    onChange={(e) => setEditedDeal({ ...editedDeal, clientName: e.target.value })}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setIsEditingName(false)
                      }
                    }}
                    className={`!font-bold border-none shadow-none bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 ${isMobile ? 'text-xl' : 'text-3xl'}`}
                    style={isMobile ? { fontSize: "1.25rem", lineHeight: "1.75rem" } : { fontSize: "1.875rem", lineHeight: "2.25rem" }}
                    autoFocus
                    placeholder="Введите название сделки"
                  />
                ) : (
                  <h1
                    className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold cursor-text transition-colors`}
                    onClick={() => setIsEditingName(true)}
                  >
                    {editedDeal.clientName || "Нажмите для добавления названия"}
                  </h1>
                )}
                <span className="absolute -bottom-0 left-0 w-full h-[1px] bg-border group-hover:bg-foreground transition-colors" />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 px-3 gap-2 bg-transparent"
                      style={{
                        backgroundColor: currentStage?.color ? currentStage.color + "20" : undefined,
                        borderColor: currentStage?.color,
                        color: currentStage?.color,
                      }}
                    >
                      <span className="font-medium">{currentStage?.name || "Выберите стадию"}</span>
                      <IconChevronDown className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[200px]">
                    {stages.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Нет доступных стадий</div>
                    ) : (
                      stages.map((stage) => (
                        <DropdownMenuItem key={stage.id} onClick={() => handleStageChange(stage.id)}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                            <span>{stage.name}</span>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="text-sm text-muted-foreground">
                  {currentStageIndex >= 0 ? currentStageIndex + 1 : 0} из {stages.length}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <div className={`border-b ${isMobile ? '-mb-4 -mx-4 px-4' : '-mb-6 -mx-8 px-8'}`}>
              <nav className={`flex ${isMobile ? 'gap-4' : 'gap-6'} overflow-x-auto scrollbar-hide`} aria-label="Deal sections">
                <button
                  onClick={() => setActiveTab("main")}
                  className={`text-muted-foreground hover:text-foreground relative whitespace-nowrap border-b-2 text-sm font-medium transition-colors pb-3.5 ${
                    activeTab === "main" ? "text-foreground border-foreground" : "border-transparent"
                  }`}
                >
                  Основные
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

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className={`${isMobile ? 'px-4 py-4' : isTablet ? 'px-6 py-5' : 'px-8 py-6'}`}>
              {activeTab === "main" ? (
                <div className="space-y-1">
                  <div className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[180px_1fr]'} items-${isMobile ? 'start' : 'center'} gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2`}>
                    <div className="text-sm text-muted-foreground hover:underline cursor-pointer">Ответственный</div>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarImage src="/placeholder.svg?height=24&width=24" alt={username || "Account"} />
                        <AvatarFallback>{username?.charAt(0).toUpperCase() || "A"}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{username || "Accountant"}</span>
                    </div>
                  </div>

                  <div className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[180px_1fr]'} items-${isMobile ? 'start' : 'center'} gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2`}>
                    <div className="text-sm text-muted-foreground">Мопед</div>
                    <div>
                      {savedMoped ? (
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                            {savedMoped.photo ? (
                              <img
                                src={savedMoped.photo || "/placeholder.svg"}
                                alt={`${savedMoped.brand} ${savedMoped.model}`}
                                className="size-full object-cover"
                              />
                            ) : (
                              <IconScooter className="size-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {savedMoped.brand} {savedMoped.model}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{savedMoped.licensePlate}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMoped()}
                            className="h-6 w-6 flex-shrink-0"
                            aria-label="Открепить мопед"
                          >
                            <IconTrash className="size-3 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Popover
                          open={isMopedPopoverOpen}
                          onOpenChange={(open) => {
                            setIsMopedPopoverOpen(open)
                            if (open) refreshMopeds()
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="h-8 px-2 text-sm bg-transparent" data-no-drag>
                              Добавить мопед
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className={`${isMobile ? 'w-[calc(100vw-2rem)]' : 'w-[250px]'} p-0`} align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="Поиск по номеру или модели..."
                                value={mopedSearchQuery}
                                onValueChange={setMopedSearchQuery}
                              />
                              <CommandList>
                                <CommandEmpty>Мопеды не найдены</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    onSelect={() => {
                                      setIsMopedPopoverOpen(false)
                                      setViewingMopedModal(null)
                                      setMopedFormData({
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
                                      setIsMopedDetailOpen(true)
                                    }}
                                    className="cursor-pointer border-t"
                                  >
                                    <div className="flex items-center gap-2 w-full text-primary">
                                      <IconScooter className="size-4" />
                                      <span className="text-sm font-medium">Создать новый мопед</span>
                                    </div>
                                  </CommandItem>
                                  {filteredMopeds.map((moped) => (
                                    <CommandItem
                                      key={moped.id}
                                      value={`${moped.brand} ${moped.model} ${moped.licensePlate}`}
                                      onSelect={() => handleSelectMoped(moped)}
                                      className="cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <div className="size-8 rounded overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                                          {moped.photo ? (
                                            <img
                                              src={moped.photo || "/placeholder.svg"}
                                              alt={`${moped.brand} ${moped.model}`}
                                              className="size-full object-cover"
                                            />
                                          ) : (
                                            <IconScooter className="size-4 text-muted-foreground" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium">
                                            {moped.brand} {moped.model}
                                          </p>
                                          <p className="text-xs text-muted-foreground">{moped.licensePlate}</p>
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
                    <div className="text-sm text-muted-foreground">Основной Контакт</div>
                    <div>
                      {savedContact ? (
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                            {savedContact.photo ? (
                              <img
                                src={savedContact.photo || "/placeholder.svg"}
                                alt={savedContact.name}
                                className="size-full object-cover"
                              />
                            ) : (
                              <IconUser className="size-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{savedContact.name || ""}</p>
                            <p className="text-xs text-muted-foreground truncate">{savedContact.phone || ""}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveContact()}
                            className="h-6 w-6 flex-shrink-0"
                            aria-label="Открепить контакт"
                          >
                            <IconTrash className="size-3 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Popover
                          open={isContactPopoverOpen}
                          onOpenChange={(open) => {
                            setIsContactPopoverOpen(open)
                            if (open) refreshContacts()
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="h-8 px-2 text-sm bg-transparent" data-no-drag>
                              Добавить контакт
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className={`${isMobile ? 'w-[calc(100vw-2rem)]' : 'w-[250px]'} p-0`} align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="Поиск по имени или номеру..."
                                value={contactSearchQuery}
                                onValueChange={setContactSearchQuery}
                              />
                              <CommandList>
                                <CommandEmpty>Контакты не найдены</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    onSelect={() => {
                                      setIsContactPopoverOpen(false)
                                      setViewingContactModal(null)
                                      setIsCreatingEmergencyContact(false)
                                      setIsContactDetailOpen(true)
                                    }}
                                    className="cursor-pointer border-t"
                                  >
                                    <div className="flex items-center gap-2 w-full text-primary">
                                      <IconUser className="size-4" />
                                      <span className="text-sm font-medium">Создать новый контакт</span>
                                    </div>
                                  </CommandItem>
                                  {filteredContacts.map((contact) => (
                                    <CommandItem
                                      key={contact.id}
                                      value={`${contact.name} ${contact.phone}`}
                                      onSelect={() => handleSelectContact(contact)}
                                      className="cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <div className="size-8 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                                          {contact.photo ? (
                                            <img
                                              src={contact.photo || "/placeholder.svg"}
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
                    <div className="text-sm text-muted-foreground">Экстренный Контакт</div>
                    <div>
                      {savedEmergencyContact ? (
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                            {savedEmergencyContact.photo ? (
                              <img
                                src={savedEmergencyContact.photo || "/placeholder.svg"}
                                alt={savedEmergencyContact.name}
                                className="size-full object-cover"
                              />
                            ) : (
                              <IconUser className="size-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{savedEmergencyContact.name || ""}</p>
                            <p className="text-xs text-muted-foreground truncate">{savedEmergencyContact.phone || ""}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveEmergencyContact()}
                            className="h-6 w-6 flex-shrink-0"
                            aria-label="Открепить контакт"
                          >
                            <IconTrash className="size-3 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Popover
                          open={isEmergencyContactPopoverOpen}
                          onOpenChange={(open) => {
                            setIsEmergencyContactPopoverOpen(open)
                            if (open) refreshContacts()
                          }}
                        >
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
                                  <CommandItem
                                    onSelect={() => {
                                      setIsEmergencyContactPopoverOpen(false)
                                      setViewingContactModal(null)
                                      setIsCreatingEmergencyContact(true)
                                      setIsContactDetailOpen(true)
                                    }}
                                    className="cursor-pointer border-t"
                                  >
                                    <div className="flex items-center gap-2 w-full text-primary">
                                      <IconUser className="size-4" />
                                      <span className="text-sm font-medium">Создать новый контакт</span>
                                    </div>
                                  </CommandItem>
                                  {filteredEmergencyContacts.map((contact) => (
                                    <CommandItem
                                      key={contact.id}
                                      value={`${contact.name} ${contact.phone}`}
                                      onSelect={() => handleSelectEmergencyContact(contact)}
                                      className="cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <div className="size-8 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                                          {contact.photo ? (
                                            <img
                                              src={contact.photo || "/placeholder.svg"}
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
                    <div className="text-sm text-muted-foreground hover:underline cursor-pointer">Дата аренды</div>
                    <div className="flex items-center gap-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            className="justify-start text-left font-normal border-none shadow-none h-8 px-0 hover:bg-transparent w-auto"
                          >
                            {selectedDateStart ? formatDateRu(selectedDateStart) : "Начало"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDateStart}
                            onSelect={(date) => {
                              setSelectedDateStart(date)
                              if (date) {
                                setEditedDeal({ ...editedDeal, dateStart: date.toISOString() })
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <span className="text-muted-foreground px-1">—</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            className="justify-start text-left font-normal border-none shadow-none h-8 px-0 hover:bg-transparent w-auto"
                          >
                            {selectedDateEnd ? formatDateRu(selectedDateEnd) : "Конец"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDateEnd}
                            onSelect={(date) => {
                              setSelectedDateEnd(date)
                              if (date) {
                                setEditedDeal({ ...editedDeal, dateEnd: date.toISOString() })
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[180px_1fr]'} items-${isMobile ? 'start' : 'center'} gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2`}>
                    <div className="text-sm text-muted-foreground hover:underline cursor-pointer">Общая Сумма</div>
                    <div>
                      <Input
                        value={editedDeal.amount || ""}
                        onChange={(e) => setEditedDeal({ ...editedDeal, amount: e.target.value })}
                        placeholder="Не указана"
                        className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                      />
                    </div>
                  </div>

                  <div className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[180px_1fr]'} items-${isMobile ? 'start' : 'center'} gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2`}>
                    <div className="text-sm text-muted-foreground hover:underline cursor-pointer">Вид оплаты</div>
                    <div>
                      <Select
                        value={editedDeal.paymentType || ""}
                        onValueChange={(value) => setEditedDeal({ ...editedDeal, paymentType: value })}
                      >
                        <SelectTrigger className="border-none shadow-none h-8 focus:ring-0 px-0">
                          <SelectValue placeholder="Не указан" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Kaspi перевод">Kaspi перевод</SelectItem>
                          <SelectItem value="Наличные">Наличные</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[180px_1fr]'} items-${isMobile ? 'start' : 'center'} gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2`}>
                    <div className="text-sm text-muted-foreground hover:underline cursor-pointer">Цена за сутки</div>
                    <div>
                      <Input
                        value={editedDeal.pricePerDay || ""}
                        onChange={(e) => setEditedDeal({ ...editedDeal, pricePerDay: e.target.value })}
                        placeholder="Не указана"
                        className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                      />
                    </div>
                  </div>

                  <div className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[180px_1fr]'} items-${isMobile ? 'start' : 'center'} gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2`}>
                    <div className="text-sm text-muted-foreground hover:underline cursor-pointer">Сумма страховки</div>
                    <div>
                      <Input
                        value={editedDeal.depositAmount || ""}
                        onChange={(e) => setEditedDeal({ ...editedDeal, depositAmount: e.target.value })}
                        placeholder="Не указана"
                        className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                      />
                    </div>
                  </div>

                  <div className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[180px_1fr]'} items-${isMobile ? 'start' : 'center'} gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2`}>
                    <div className="text-sm text-muted-foreground">Источник</div>
                    <div>
                      <Select
                        value={editedDeal.source || ""}
                        onValueChange={(value) => setEditedDeal({ ...editedDeal, source: value })}
                      >
                        <SelectTrigger className="border-none shadow-none h-8 focus:ring-0 px-0">
                          <SelectValue placeholder="Не указан" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Сайт">Сайт</SelectItem>
                          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                          <SelectItem value="Telegram">Telegram</SelectItem>
                          <SelectItem value="Instagram">Instagram</SelectItem>
                          <SelectItem value="Телефон">Телефон</SelectItem>
                          <SelectItem value="Рекомендация">Рекомендация</SelectItem>
                          <SelectItem value="Старый клиент">Старый клиент</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className={`${isMobile ? 'flex flex-col gap-2' : 'grid grid-cols-[180px_1fr]'} items-${isMobile ? 'start' : 'center'} gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2`}>
                    <div className="text-sm text-muted-foreground">Комментарий</div>
                    <div>
                      <Input
                        value={editedDeal.comment || ""}
                        onChange={(e) => setEditedDeal({ ...editedDeal, comment: e.target.value })}
                        placeholder="Не указан"
                        className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-2 text-destructive">Опасная зона</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Удаление сделки необратимо. Все данные будут потеряны.
                    </p>
                    <Button variant="destructive" onClick={handleDelete} disabled={!onDelete}>
                      <IconTrash className="size-4 mr-2" />
                      Удалить сделку
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className={`flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 ${isMobile ? 'px-4' : 'px-8'} py-4 border-t bg-muted/30 shrink-0`}>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={!editedDeal.clientName || !editedDeal.clientName.trim()} className="w-full sm:w-auto">
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isContactDetailOpen} onOpenChange={(open) => {
        setIsContactDetailOpen(open)
        if (!open) {
          setViewingContactModal(null)
          setIsCreatingEmergencyContact(false)
        }
      }}>
        <DialogContent className={`${isMobile ? 'w-[100vw] h-[100vh] max-h-[100vh] m-0 rounded-none' : 'sm:max-w-[500px]'} max-h-[85vh] overflow-y-auto scrollbar-hide`} hideClose>
          <DialogTitle className="sr-only">
            {viewingContactModal ? "Редактировать контакт" : isCreatingEmergencyContact ? "Создать экстренный контакт" : "Создать контакт"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {viewingContactModal ? "Измените информацию о контакте" : "Заполните информацию о новом контакте"}
          </DialogDescription>
          <ContactDetailView
            contact={viewingContactModal}
            onSave={viewingContactModal ? handleSaveContactFromModal : handleCreateContact}
            onClose={() => {
              setIsContactDetailOpen(false)
              setViewingContactModal(null)
              setIsCreatingEmergencyContact(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isMopedDetailOpen} onOpenChange={(open) => {
        setIsMopedDetailOpen(open)
        if (!open) {
          setViewingMopedModal(null)
        }
      }}>
        <DialogContent className={`${isMobile ? 'w-[100vw] h-[100vh] max-h-[100vh] m-0 rounded-none' : '!max-w-4xl w-[85vw]'} max-h-[95vh] h-[95vh] overflow-hidden flex flex-col p-0`} hideClose>
          <DialogTitle className="sr-only">
            {viewingMopedModal ? "Редактировать мопед" : "Создать мопед"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {viewingMopedModal ? "Измените информацию о мопеде" : "Заполните информацию о новом мопеде"}
          </DialogDescription>
          <MopedDetailModal
            moped={viewingMopedModal}
            formData={mopedFormData}
            setFormData={setMopedFormData}
            onSave={viewingMopedModal ? handleSaveMopedFromModal : handleCreateMoped}
            onDelete={undefined}
            onClose={() => {
              setIsMopedDetailOpen(false)
              setViewingMopedModal(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

function ContactDetailView({
  contact,
  onSave,
  onClose,
}: {
  contact: Contact | null
  onSave: (contact: Contact | Omit<Contact, "id" | "createdAt">) => void
  onClose: () => void
}) {
  const isNew = !contact
  const [formData, setFormData] = React.useState({
    name: contact?.name || "",
    phone: contact?.phone || "",
    email: contact?.email || "",
    photo: (contact as any)?.photo || "",
    iin: contact?.iin || "",
    docNumber: contact?.docNumber || "",
    status: (contact?.status || "active") as "active" | "inactive" | "blocked",
  })
  const [isEditingImage, setIsEditingImage] = React.useState(false)
  const [imageUrl, setImageUrl] = React.useState((contact as any).photo || "")

  const STATUS_LABELS = {
    active: "Активный",
    inactive: "Неактивный",
    blocked: "Заблокирован",
  }

  const handleSave = () => {
    if (isNew) {
      onSave({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        iin: formData.iin || null,
        docNumber: formData.docNumber || null,
        status: formData.status,
        photo: formData.photo || null,
      })
    } else {
      const updatedContact: Contact = {
        ...contact,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        iin: formData.iin,
        docNumber: formData.docNumber,
        status: formData.status,
        photo: formData.photo,
      } as Contact
      onSave(updatedContact)
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted group flex items-center justify-center">
        {formData.photo ? (
          <img src={formData.photo || "/placeholder.svg"} alt={isNew ? "Новый контакт" : formData.name} className="w-full h-full object-cover" />
        ) : (
          <IconUser className="size-24 text-muted-foreground" />
        )}
      </div>

      <div className="group">
        <input
          type="text"
          value={isNew && !formData.name ? "Новый контакт" : formData.name}
          onChange={(e) => {
            const value = e.target.value
            if (value === "Новый контакт") {
              setFormData({ ...formData, name: "" })
            } else {
              setFormData({ ...formData, name: value })
            }
          }}
          placeholder="Новый контакт"
          className="w-full text-xl font-semibold bg-transparent border-none outline-none px-0"
        />
        <div className="h-px bg-border mt-1 group-hover:bg-foreground/20 transition-colors" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground w-32 flex-shrink-0">Телефон</span>
          <Input
            placeholder="+7 (777) 123-45-67"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground w-32 flex-shrink-0">Email</span>
          <Input
            placeholder="email@example.com"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground w-32 flex-shrink-0">ИИН</span>
          <Input
            placeholder="123456789012"
            value={formData.iin}
            onChange={(e) => setFormData({ ...formData, iin: e.target.value })}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground w-32 flex-shrink-0">Номер документа</span>
          <Input
            placeholder="N12345678"
            value={formData.docNumber}
            onChange={(e) => setFormData({ ...formData, docNumber: e.target.value })}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground w-32 flex-shrink-0">Статус</span>
          <Select
            value={formData.status}
            onValueChange={(value: "active" | "inactive" | "blocked") => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger className="flex-1">
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

      <div className="flex items-center justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Закрыть
        </Button>
        <Button onClick={handleSave} disabled={!formData.name || !formData.phone}>
          {isNew ? "Создать" : "Сохранить изменения"}
        </Button>
      </div>
    </div>
  )
}


