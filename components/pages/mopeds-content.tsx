"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { SortableContext, useSortable, horizontalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  IconLayoutKanban,
  IconTable,
  IconSearch,
  IconPlus,
  IconSettings,
  IconAdjustments,
  IconDotsVertical,
  IconUser,
  IconUpload,
  IconTrash,
  IconPencil,
} from "@tabler/icons-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { EnhancedDealCard } from "@/components/enhanced-deal-card"
import { DealDetailModal } from "@/components/deal-detail-modal"
import { StageManagementDialog } from "@/components/stage-management-dialog"
import { FieldConfigurationDialog } from "@/components/field-configuration-dialog"
import type { DealWithFields, KanbanStage, CustomField, FieldGroup } from "@/lib/types/crm-fields"
import {
  getKanbanStages,
  saveKanbanStages,
  getCustomFields,
  saveCustomFields,
  getFieldGroups,
  saveFieldGroups,
} from "@/lib/crm-fields-store"
import { MopedsInventory } from "@/components/mopeds-inventory"
import { getMopeds, type Moped } from "@/lib/mopeds-store"
import { getContacts, addContact, updateContact, deleteContact, type Contact } from "@/lib/contacts-store"
import { useToast } from "@/hooks/use-toast"
import { getDeals, createDeal, updateDeal, deleteDeal } from "@/lib/deals-store"
import { supabase } from "@/lib/supabase"

// Define the missing constants
const STATUS_LABELS = {
  active: "Активный",
  inactive: "Неактивный",
  blocked: "Заблокирован",
}

const STATUS_VARIANTS = {
  active: "success",
  inactive: "secondary",
  blocked: "destructive",
}

function SortableCard({
  deal,
  onClick,
  mopedMap,
}: { deal: DealWithFields; onClick: () => void; mopedMap?: Map<string, Moped> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const filteredListeners = React.useMemo(() => {
    if (!listeners) return {}

    const newListeners: Record<string, any> = {}
    Object.keys(listeners).forEach((key) => {
      const originalListener = listeners[key as keyof typeof listeners]
      newListeners[key] = (event: any) => {
        // Check if the click target or any parent has data-no-drag attribute
        let target = event.target as HTMLElement
        while (target) {
          if (target.hasAttribute?.("data-no-drag")) {
            return // Don't trigger drag
          }
          target = target.parentElement as HTMLElement
        }
        // Call original listener if not on a no-drag element
        if (typeof originalListener === "function") {
          originalListener(event)
        }
      }
    })
    return newListeners
  }, [listeners])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab active:cursor-grabbing"
      {...attributes}
      {...filteredListeners}
    >
      <EnhancedDealCard deal={deal} onClick={onClick} mopedMap={mopedMap} />
    </div>
  )
}

function KanbanColumn({
  stage,
  deals,
  onCardClick,
  onAddDeal,
  onEditStage,
  onDeleteStage,
  mopedMap,
}: {
  stage: KanbanStage
  deals: DealWithFields[]
  onCardClick: (deal: DealWithFields) => void
  onAddDeal: (stageId: string) => void
  onEditStage?: (stageId: string) => void
  onDeleteStage?: (stageId: string) => void
  mopedMap?: Map<string, Moped>
}) {
  const { setNodeRef } = useSortable({
    id: stage.id,
    data: { type: "column", stage },
  })

  const lightBackgroundColor = `${stage.color}15` // Add 15 (hex for ~8% opacity) to the color

  return (
    <div className="flex flex-col gap-3 min-w-[320px] rounded-lg p-4" style={{ backgroundColor: lightBackgroundColor }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <h3 className="font-semibold text-base text-foreground">{stage.name}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-background/80"
            onClick={() => onAddDeal(stage.id)}
            title="Добавить заявку"
          >
            <IconPlus className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/80" title="Настройки стадии">
                <IconDotsVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditStage?.(stage.id)}>Редактировать стадию</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeleteStage?.(stage.id)} className="text-destructive">
                Удалить стадию
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-280px)]">
        <SortableContext items={deals.map((d) => d.id)}>
          <div ref={setNodeRef} className="space-y-3 pb-4 min-h-[100px]">
            {deals.map((deal) => (
              <SortableCard key={deal.id} deal={deal} onClick={() => onCardClick(deal)} mopedMap={mopedMap} />
            ))}
            {deals.length === 0 && (
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground text-sm bg-background/50">
                Нет заявок
              </div>
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  )
}

export function MopedsContent() {
  const pathname = usePathname()
  const router = useRouter()
  const { hasTabAccess } = useAuth()
  
  // Определяем активную вкладку из URL
  const getActiveTab = (): "rentals" | "inventory" | "contacts" | null => {
    if (pathname.includes("/rentals")) return "rentals"
    if (pathname.includes("/inventory")) return "inventory"
    if (pathname.includes("/contacts")) return "contacts"
    return null // Если на /mopeds без вкладки
  }
  
  // Проверяем доступ к вкладкам
  const canAccessRentals = hasTabAccess("mopeds", "rentals", "view")
  const canAccessInventory = hasTabAccess("mopeds", "inventory", "view")
  const canAccessContacts = hasTabAccess("mopeds", "contacts", "view")
  
  const canEditRentals = hasTabAccess("mopeds", "rentals", "edit")
  const canEditInventory = hasTabAccess("mopeds", "inventory", "edit")
  const canEditContacts = hasTabAccess("mopeds", "contacts", "edit")
  
  // Определяем первую доступную вкладку для редиректа
  const getDefaultTab = (): "rentals" | "inventory" | "contacts" => {
    if (canAccessRentals) return "rentals"
    if (canAccessInventory) return "inventory"
    if (canAccessContacts) return "contacts"
    return "rentals" // Fallback
  }
  
  const [activeFilter, setActiveFilter] = React.useState<"rentals" | "inventory" | "contacts">(() => {
    const tab = getActiveTab()
    return tab || getDefaultTab()
  })
  
  // Редирект на первую доступную вкладку, если на /mopeds без вкладки
  React.useEffect(() => {
    const tab = getActiveTab()
    if (!tab && pathname === "/mopeds") {
      const defaultTab = getDefaultTab()
      router.replace(`/mopeds/${defaultTab}`)
      setActiveFilter(defaultTab)
    } else if (tab && tab !== activeFilter) {
      setActiveFilter(tab)
    }
  }, [pathname, router, activeFilter, canAccessRentals, canAccessInventory, canAccessContacts])
  const [currentView, setCurrentView] = React.useState<"kanban" | "table">("kanban")
  const [deals, setDeals] = React.useState<DealWithFields[]>([])
  const [stages, setStages] = React.useState<KanbanStage[]>([])
  const [customFields, setCustomFields] = React.useState<CustomField[]>([])
  const [fieldGroups, setFieldGroups] = React.useState<FieldGroup[]>([])
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)
  const [selectedDeal, setSelectedDeal] = React.useState<DealWithFields | null>(null)
  const [isStageManagementOpen, setIsStageManagementOpen] = React.useState(false)
  const [isFieldConfigOpen, setIsFieldConfigOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [mopeds, setMopeds] = React.useState<Moped[]>([])
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [contactSearchQuery, setContactSearchQuery] = React.useState("")
  const [isContactDialogOpen, setIsContactDialogOpen] = React.useState(false)
  const [viewingContact, setViewingContact] = React.useState<Contact | null>(null)
  const [isViewContactModalOpen, setIsViewContactModalOpen] = React.useState(false)
  const [editingContact, setEditingContact] = React.useState<Contact | null>(null)

  const [isEmergencyContactPopoverOpen, setIsEmergencyContactPopoverOpen] = React.useState(false)
  const [emergencyContactSearchQuery, setEmergencyContactSearchQuery] = React.useState("")
  const [selectedEmergencyContact, setSelectedEmergencyContact] = React.useState<Contact | null>(null)
  const [emergencyContactId, setEmergencyContactId] = React.useState<string>("")

  const [addContactFormData, setAddContactFormData] = React.useState({
    name: "",
    phone: "",
    photo: "",
    iin: "",
    docNumber: "",
    status: "active" as keyof typeof STATUS_LABELS,
    emergencyContactId: "",
  })

  const [viewContactFormData, setViewContactFormData] = React.useState({
    name: "",
    phone: "",
    photo: "",
    iin: "",
    docNumber: "",
    status: "active" as keyof typeof STATUS_LABELS,
    emergencyContactId: "",
  })

  const mopedMap = React.useMemo(() => new Map(mopeds.map((m) => [m.id, m])), [mopeds])
  const { toast } = useToast()

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [loadedStages, loadedFields, loadedGroups, loadedDeals] = await Promise.all([
          getKanbanStages(),
          getCustomFields(),
          getFieldGroups(),
          getDeals(),
        ])
        console.log("[MopedsContent] Loaded data:", {
          stages: loadedStages.length,
          fields: loadedFields.length,
          groups: loadedGroups.length,
          deals: loadedDeals.length,
        })
        setStages(loadedStages)
        setCustomFields(loadedFields)
        setFieldGroups(loadedGroups)
        setDeals(loadedDeals)
        // Preload mopeds once for instant lookups
        try {
          const [loadedMopeds, loadedContacts] = await Promise.all([getMopeds(), getContacts()])
          console.log("[MopedsContent] Loaded mopeds/contacts:", {
            mopeds: loadedMopeds.length,
            contacts: loadedContacts.length,
          })
          setMopeds(loadedMopeds)
          setContacts(loadedContacts)
        } catch (e) {
          console.error("Error preloading mopeds/contacts", e)
        }
      } catch (error) {
        console.error("[MopedsContent] Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()

    const channel = supabase
      .channel("deals-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deals",
        },
        (payload: any) => {
          console.log("[v0] Deal update received:", payload)
          setDeals((prevDeals) => {
            if (payload.eventType === "DELETE") {
              return prevDeals.filter((d) => d.id !== payload.old.id)
            }

            const updatedDeal = {
              id: payload.new.id || payload.old.id,
              clientName: payload.new.client_name,
              phone: payload.new.phone,
              stage: payload.new.stage,
              source: payload.new.source,
              manager: payload.new.manager,
              dates: payload.new.dates,
              dateStart: payload.new.date_start,
              dateEnd: payload.new.date_end,
              moped: payload.new.moped,
              mopedId: payload.new.moped_id,
              amount: payload.new.amount,
              paymentType: payload.new.payment_type,
              pricePerDay: payload.new.price_per_day,
              depositAmount: payload.new.deposit_amount,
              contactName: payload.new.contact_name,
              contactIIN: payload.new.contact_iin,
              contactDocNumber: payload.new.contact_doc_number,
              contactPhone: payload.new.contact_phone,
              contactStatus: payload.new.contact_status,
              emergencyContactName: payload.new.emergency_contact_name,
              emergencyContactIIN: payload.new.emergency_contact_iin,
              emergencyContactDocNumber: payload.new.emergency_contact_doc_number,
              emergencyContactPhone: payload.new.emergency_contact_phone,
              emergencyContactStatus: payload.new.emergency_contact_status,
              status: payload.new.status,
              priority: payload.new.priority,
              assignees: payload.new.assignees,
              comments: payload.new.comments || 0,
              links: payload.new.links || 0,
              tasks: payload.new.tasks || { completed: 0, total: 0 },
              customFields: payload.new.custom_fields,
              comment: payload.new.comment,
              createdAt: payload.new.created_at,
            }

            const existingDealIndex = prevDeals.findIndex((d) => d.id === updatedDeal.id)
            if (existingDealIndex > -1) {
              const newDeals = [...prevDeals]
              newDeals[existingDealIndex] = updatedDeal
              return newDeals
            } else {
              return [updatedDeal, ...prevDeals]
            }
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor),
  )

  const dealsByStage = React.useMemo(() => {
    const grouped: Record<string, DealWithFields[]> = {}
    stages.forEach((stage) => {
      grouped[stage.id] = deals.filter((deal) => deal.stage === stage.id)
    })
    return grouped
  }, [deals, stages])

  const filteredContacts = React.useMemo(() => {
    if (!contactSearchQuery) return contacts
    const query = contactSearchQuery.toLowerCase()
    return contacts.filter(
      (contact) => contact.name.toLowerCase().includes(query) || contact.phone.toLowerCase().includes(query),
    )
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

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const activeDeal = deals.find((d) => d.id === active.id)
    if (!activeDeal) {
      setActiveId(null)
      return
    }

    let newStageId: string | null = null

    // Check if dropped over a column
    const overColumn = stages.find((s) => s.id === over.id)
    if (overColumn && activeDeal.stage !== overColumn.id) {
      newStageId = overColumn.id
    }

    // Check if dropped over another deal (to determine the column)
    if (!newStageId) {
      const overDeal = deals.find((d) => d.id === over.id)
      if (overDeal && activeDeal.stage !== overDeal.stage) {
        newStageId = overDeal.stage
      }
    }

    // Update in Supabase if stage changed
    if (newStageId) {
      const updatedDeal = await updateDeal(activeDeal.id, { stage: newStageId })
      if (updatedDeal) {
        setDeals((prevDeals) => prevDeals.map((deal) => (deal.id === activeDeal.id ? updatedDeal : deal)))
      }
    }

    setActiveId(null)
  }

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : null

  const handleAddDealToStage = (stageId: string) => {
    const newDeal: DealWithFields = {
      id: `temp-${Date.now()}`,
      clientName: "",
      phone: "",
      stage: stageId,
      createdAt: new Date().toISOString(),
      status: "not-started",
      priority: "low",
      comments: 0,
      links: 0,
      tasks: { completed: 0, total: 0 },
    }
    setSelectedDeal(newDeal)
    setIsDetailModalOpen(true)
  }

  const handleEditStage = (stageId: string) => {
    setIsStageManagementOpen(true)
  }

  async function handleDeleteStage(stageId: string) {
    const updatedStages = stages.filter((s) => s.id !== stageId)
    setStages(updatedStages)
    await saveKanbanStages(updatedStages)
  }

  async function handleSaveDeal(updatedDeal: DealWithFields) {
    if (!updatedDeal.clientName || !updatedDeal.clientName.trim()) {
      return
    }

    let savedDeal: DealWithFields | null = null

    if (updatedDeal.id.startsWith("temp-")) {
      savedDeal = await createDeal(updatedDeal)
    } else {
      savedDeal = await updateDeal(updatedDeal.id, updatedDeal)
    }

    if (savedDeal) {
      setDeals((prev) => {
        // remove temp items
        const withoutTemps = prev.filter((d) => !d.id.startsWith("temp-"))
        // replace existing by id if present, otherwise prepend
        const index = withoutTemps.findIndex((d) => d.id === savedDeal!.id)
        if (index !== -1) {
          const next = [...withoutTemps]
          next[index] = savedDeal!
          return next
        }
        return [savedDeal!, ...withoutTemps]
      })
    } else {
      toast({
        title: "Не удалось сохранить сделку",
        description: "Проверьте подключение к базе данных",
        variant: "destructive" as any,
      })
    }
  }

  async function handleDeleteDeal(dealId: string) {
    const success = await deleteDeal(dealId)
    if (success) {
      setDeals((prev) => prev.filter((d) => d.id !== dealId))
    }
  }

  const handleSaveStages = (newStages: KanbanStage[]) => {
    console.log("Saving stages:", newStages)
    setStages(newStages)
    saveKanbanStages(newStages)
    console.log("Stages saved successfully")
  }

  const handleSaveFields = (newFields: CustomField[], newGroups: FieldGroup[]) => {
    setCustomFields(newFields)
    setFieldGroups(newGroups)
    saveCustomFields(newFields)
    saveFieldGroups(newGroups)
  }

  const handleCardClick = (deal: DealWithFields) => {
    setSelectedDeal(deal)
    setIsDetailModalOpen(true)
  }

  const handleOpenAddContactDialog = () => {
    setEditingContact(null)
    setIsContactDialogOpen(true)
  }

  const handleViewContact = (contact: Contact) => {
    setEditingContact(contact)
    setIsContactDialogOpen(true)
  }

  async function handleSaveContact(contactData: any) {
    if (!contactData.name || !contactData.phone) {
      return
    }

    if (editingContact) {
      await updateContact(editingContact.id, contactData)
    } else {
      await addContact(contactData)
    }

    const loadedContacts = await getContacts()
    setContacts(loadedContacts)
    setIsContactDialogOpen(false)
    setEditingContact(null)
  }

  const handleRemoveEmergencyContact = () => {
    setSelectedEmergencyContact(null)
    setEmergencyContactId("")
    if (isContactDialogOpen) {
      setAddContactFormData({ ...addContactFormData, emergencyContactId: "" })
    } else {
      setViewContactFormData({ ...viewContactFormData, emergencyContactId: "" })
    }
  }

  const refreshContacts = async () => {
    try {
      const loadedContacts = await getContacts()
      setContacts(loadedContacts)
    } catch (e) {
      console.error("Failed to refresh contacts", e)
    }
  }

  // Removed handleFileUpload, handleDrag, handleDrop as they are now part of ImageUploadSection

  async function handleSaveAddContact() {
    if (!addContactFormData.name || !addContactFormData.phone) {
      return
    }

    const newContact = await addContact(addContactFormData)
    if (newContact) {
      const loadedContacts = await getContacts()
      setContacts(loadedContacts)
    }
    setIsContactDialogOpen(false)
    setAddContactFormData({
      name: "",
      phone: "",
      photo: "",
      iin: "",
      docNumber: "",
      status: "active",
      emergencyContactId: "",
    })
    // Removed image related state resets as they are handled in the new modal
    setSelectedEmergencyContact(null)
    setEmergencyContactId("")
  }

  async function handleSaveContactFromView() {
    if (!viewContactFormData.name || !viewContactFormData.phone || !viewingContact) {
      return
    }

    await updateContact(viewingContact.id, viewContactFormData)
    const loadedContacts = await getContacts()
    setContacts(loadedContacts)
    setIsViewContactModalOpen(false)
    setViewingContact(null)
    // Removed image related state resets as they are handled in the new modal
    setSelectedEmergencyContact(null)
    setEmergencyContactId("")
  }

  async function handleDeleteContact(id: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    if (confirm("Вы уверены, что хотите удалить этот контакт?")) {
      await deleteContact(id)
      const loadedContacts = await getContacts()
      setContacts(loadedContacts)
    }
  }

  // Removed ImageUploadSection component definition as it's now a standalone component below

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="border-b px-4 lg:px-6 mb-3">
        <nav className="flex gap-6 overflow-x-auto" aria-label="Mopeds filter">
          {canAccessRentals && (
            <Link
              href="/mopeds/rentals"
              className={`text-muted-foreground hover:text-foreground relative whitespace-nowrap border-b-2 text-sm font-medium transition-colors pb-3.5 ${
                activeFilter === "rentals" ? "text-foreground border-foreground" : "border-transparent"
              }`}
            >
              Аренды
            </Link>
          )}
          {canAccessInventory && (
            <Link
              href="/mopeds/inventory"
              className={`text-muted-foreground hover:text-foreground relative whitespace-nowrap border-b-2 text-sm font-medium transition-colors pb-3.5 ${
                activeFilter === "inventory" ? "text-foreground border-foreground" : "border-transparent"
              }`}
            >
              Учет
            </Link>
          )}
          {canAccessContacts && (
            <Link
              href="/mopeds/contacts"
              className={`text-muted-foreground hover:text-foreground relative whitespace-nowrap border-b-2 text-sm font-medium transition-colors pb-3.5 ${
                activeFilter === "contacts" ? "text-foreground border-foreground" : "border-transparent"
              }`}
            >
              Контакты
            </Link>
          )}
        </nav>
      </div>

      {activeFilter === "contacts" ? (
        <div className="px-4 lg:px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени или телефону..."
                value={contactSearchQuery}
                onChange={(e) => setContactSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {canEditContacts && (
              <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleOpenAddContactDialog}>
                    <IconPlus className="size-4 mr-2" />
                    Добавить клиента
                  </Button>
                </DialogTrigger>
              <DialogContent className="!max-w-4xl w-[85vw] max-h-[95vh] h-[95vh] overflow-hidden flex flex-col p-0">
                <ContactDetailModal
                  contact={editingContact}
                  contacts={contacts}
                  onSave={handleSaveContact}
                  onClose={() => setIsContactDialogOpen(false)}
                  onDelete={editingContact ? () => handleDeleteContact(editingContact.id) : undefined}
                />
              </DialogContent>
            </Dialog>
            )}
          </div>

          <div className="space-y-3">
            {filteredContacts.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 border rounded-lg">
                {contactSearchQuery ? "Клиенты не найдены" : "Нет клиентов. Добавьте первого клиента."}
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-4 px-4 py-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleViewContact(contact)}
                >
                  <div className="size-12 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                    {(contact as any).photo ? (
                      <img
                        src={(contact as any).photo || "/placeholder.svg"}
                        alt={contact.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <IconUser className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base">{contact.name}</h3>
                      {contact.status && (
                        <Badge variant={STATUS_VARIANTS[contact.status as keyof typeof STATUS_VARIANTS]}>
                          {STATUS_LABELS[contact.status as keyof typeof STATUS_LABELS]}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{contact.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                  {canEditContacts && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteContact(contact.id, e)}
                      aria-label="Удалить"
                    >
                      <IconTrash className="size-4 text-destructive" />
                    </Button>
                  )}
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Removed the old Dialog for view contact */}
        </div>
      ) : activeFilter === "inventory" ? (
        <div className="px-4 lg:px-6">
          <MopedsInventory />
        </div>
      ) : (
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по клиентам, телефону..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {currentView === "kanban" ? (
                      <>
                        <IconLayoutKanban className="size-4 mr-2" />
                        Вид: Канбан
                      </>
                    ) : (
                      <>
                        <IconTable className="size-4 mr-2" />
                        Вид: Таблица
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setCurrentView("kanban")}>
                    <IconLayoutKanban className="size-4 mr-2" />
                    Канбан
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCurrentView("table")}>
                    <IconTable className="size-4 mr-2" />
                    Таблица
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <IconSettings className="size-4 mr-2" />
                    Настройки
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsStageManagementOpen(true)}>
                    <IconAdjustments className="size-4 mr-2" />
                    Стадии
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsFieldConfigOpen(true)}>
                    <IconSettings className="size-4 mr-2" />
                    Поля
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {canEditRentals && (
                <Button size="sm" onClick={() => handleAddDealToStage(stages[0]?.id || "new")}>
                  <IconPlus className="size-4" />
                  Новая заявка
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Загрузка данных...</p>
              </div>
            </div>
          ) : currentView === "kanban" ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <ScrollArea className="w-full">
                <div className="flex gap-4 pb-4">
                  <SortableContext items={stages.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
                    {stages.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>Нет стадий. Загрузите стадии из базы данных.</p>
                      </div>
                    ) : (
                      stages.map((stage) => (
                        <KanbanColumn
                          key={stage.id}
                          stage={stage}
                          deals={dealsByStage[stage.id] || []}
                          onCardClick={handleCardClick}
                          onAddDeal={handleAddDealToStage}
                          onEditStage={handleEditStage}
                          onDeleteStage={handleDeleteStage}
                          mopedMap={mopedMap}
                        />
                      ))
                    )}
                  </SortableContext>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              <DragOverlay>{activeDeal ? <EnhancedDealCard deal={activeDeal} /> : null}</DragOverlay>
            </DndContext>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Стадия</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Приоритет</TableHead>
                    <TableHead>Даты</TableHead>
                    <TableHead>Мопед</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Источник</TableHead>
                    <TableHead>Создано</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => {
                    const stage = stages.find((s) => s.id === deal.stage)
                    return (
                      <TableRow key={deal.id} className="cursor-pointer" onClick={() => handleCardClick(deal)}>
                        <TableCell className="font-medium">{deal.clientName}</TableCell>
                        <TableCell>{deal.phone}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{ backgroundColor: stage?.color, color: "white", borderColor: stage?.color }}
                          >
                            {stage?.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{deal.status || "not-started"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{deal.priority || "low"}</Badge>
                        </TableCell>
                        <TableCell>{deal.dates || "—"}</TableCell>
                        <TableCell>{deal.moped || "—"}</TableCell>
                        <TableCell>{deal.amount || "—"}</TableCell>
                        <TableCell>{deal.source || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(deal.createdAt).toLocaleDateString("ru-RU")}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      <DealDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        deal={selectedDeal}
        onSave={handleSaveDeal}
        onDelete={handleDeleteDeal}
        initialMopeds={mopeds}
        initialContacts={contacts}
      />

      <StageManagementDialog
        open={isStageManagementOpen}
        onOpenChange={setIsStageManagementOpen}
        stages={stages}
        onSave={handleSaveStages}
      />

      <FieldConfigurationDialog
        open={isFieldConfigOpen}
        onOpenChange={setIsFieldConfigOpen}
        fields={customFields}
        groups={fieldGroups}
        onSave={handleSaveFields}
      />
    </div>
  )
}

function ContactDetailModal({
  contact,
  contacts,
  onSave,
  onClose,
  onDelete,
}: {
  contact: Contact | null
  contacts: Contact[]
  onSave: (contact: any) => void
  onClose: () => void
  onDelete?: () => void
}) {
  const [activeTab, setActiveTab] = React.useState<"main" | "history" | "settings">("main")
  const [formData, setFormData] = React.useState({
    name: contact?.name || "",
    phone: contact?.phone || "",
    photo: (contact as any)?.photo || "",
    iin: contact?.iin || "",
    docNumber: contact?.docNumber || "",
    status: (contact?.status || "active") as "active" | "inactive" | "blocked",
    emergencyContactId: (contact as any)?.emergencyContactId || "",
  })
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
    onSave(formData)
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
      <div className="flex flex-col gap-6 p-8 pb-6 border-b shrink-0">
        <div className="flex items-center gap-3 group">
          <div className="relative pb-1">
            <h1 className="text-3xl font-bold">{isNewContact ? "Новый клиент" : formData.name}</h1>
            <span className="absolute -bottom-0 left-0 w-full h-[1px] bg-border group-hover:bg-foreground transition-colors" />
          </div>
        </div>

        <div className="border-b -mb-6 -mx-8 px-8">
          <nav className="flex gap-6" aria-label="Contact sections">
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
              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
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

              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
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

              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
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
                        <p className="text-sm font-medium truncate">{selectedEmergencyContact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{selectedEmergencyContact.phone}</p>
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
                      <PopoverContent className="w-[250px] p-0" align="start">
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

              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <div className="text-sm text-muted-foreground">ИИН</div>
                <div>
                  <Input
                    value={formData.iin}
                    onChange={(e) => setFormData({ ...formData, iin: e.target.value })}
                    placeholder="123456789012"
                    className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <div className="text-sm text-muted-foreground">Номер документа</div>
                <div>
                  <Input
                    value={formData.docNumber}
                    onChange={(e) => setFormData({ ...formData, docNumber: e.target.value })}
                    placeholder="N12345678"
                    className="border-none shadow-none h-8 focus-visible:ring-0 px-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
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
                <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
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

      <div className="flex items-center justify-end gap-2 px-8 py-4 border-t bg-muted/30 shrink-0">
        <Button variant="outline" onClick={onClose}>
          Отмена
        </Button>
        <Button onClick={handleSave} disabled={!formData.name || !formData.phone}>
          {isNewContact ? "Добавить" : "Сохранить"}
        </Button>
      </div>

      <ContactImageEditModal
        open={isImageEditModalOpen}
        onOpenChange={setIsImageEditModalOpen}
        currentUrl={formData.photo}
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
