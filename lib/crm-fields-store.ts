import { supabase } from './supabase'
import type { CustomField, FieldGroup, KanbanStage } from "./types/crm-fields"

const STAGES_CACHE_KEY = 'crm_stages_cache'
const STAGES_CACHE_TIMESTAMP_KEY = 'crm_stages_cache_timestamp'
const FIELDS_CACHE_KEY = 'crm_fields_cache'
const FIELDS_CACHE_TIMESTAMP_KEY = 'crm_fields_cache_timestamp'
const GROUPS_CACHE_KEY = 'crm_groups_cache'
const GROUPS_CACHE_TIMESTAMP_KEY = 'crm_groups_cache_timestamp'
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 минут (эти данные меняются реже)

// Функции для работы с localStorage кэшем
function getCachedStages(): KanbanStage[] | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(STAGES_CACHE_KEY)
    const timestamp = localStorage.getItem(STAGES_CACHE_TIMESTAMP_KEY)
    if (!cached || !timestamp) return null
    const age = Date.now() - parseInt(timestamp, 10)
    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(STAGES_CACHE_KEY)
      localStorage.removeItem(STAGES_CACHE_TIMESTAMP_KEY)
      return null
    }
    return JSON.parse(cached) as KanbanStage[]
  } catch (error) {
    console.error('Error reading stages cache:', error)
    return null
  }
}

function setCachedStages(stages: KanbanStage[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STAGES_CACHE_KEY, JSON.stringify(stages))
    localStorage.setItem(STAGES_CACHE_TIMESTAMP_KEY, Date.now().toString())
  } catch (error) {
    console.error('Error saving stages cache:', error)
  }
}

function clearStagesCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STAGES_CACHE_KEY)
  localStorage.removeItem(STAGES_CACHE_TIMESTAMP_KEY)
}

function getCachedFields(): CustomField[] | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(FIELDS_CACHE_KEY)
    const timestamp = localStorage.getItem(FIELDS_CACHE_TIMESTAMP_KEY)
    if (!cached || !timestamp) return null
    const age = Date.now() - parseInt(timestamp, 10)
    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(FIELDS_CACHE_KEY)
      localStorage.removeItem(FIELDS_CACHE_TIMESTAMP_KEY)
      return null
    }
    return JSON.parse(cached) as CustomField[]
  } catch (error) {
    console.error('Error reading fields cache:', error)
    return null
  }
}

function setCachedFields(fields: CustomField[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(FIELDS_CACHE_KEY, JSON.stringify(fields))
    localStorage.setItem(FIELDS_CACHE_TIMESTAMP_KEY, Date.now().toString())
  } catch (error) {
    console.error('Error saving fields cache:', error)
  }
}

function clearFieldsCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(FIELDS_CACHE_KEY)
  localStorage.removeItem(FIELDS_CACHE_TIMESTAMP_KEY)
}

function getCachedGroups(): FieldGroup[] | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(GROUPS_CACHE_KEY)
    const timestamp = localStorage.getItem(GROUPS_CACHE_TIMESTAMP_KEY)
    if (!cached || !timestamp) return null
    const age = Date.now() - parseInt(timestamp, 10)
    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(GROUPS_CACHE_KEY)
      localStorage.removeItem(GROUPS_CACHE_TIMESTAMP_KEY)
      return null
    }
    return JSON.parse(cached) as FieldGroup[]
  } catch (error) {
    console.error('Error reading groups cache:', error)
    return null
  }
}

function setCachedGroups(groups: FieldGroup[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(GROUPS_CACHE_KEY, JSON.stringify(groups))
    localStorage.setItem(GROUPS_CACHE_TIMESTAMP_KEY, Date.now().toString())
  } catch (error) {
    console.error('Error saving groups cache:', error)
  }
}

function clearGroupsCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(GROUPS_CACHE_KEY)
  localStorage.removeItem(GROUPS_CACHE_TIMESTAMP_KEY)
}

// Default field groups
export const DEFAULT_FIELD_GROUPS: FieldGroup[] = [
  { id: "basic", name: "Основное", order: 0 },
  { id: "stats", name: "Статистика", order: 1 },
]

// Default custom fields
export const DEFAULT_CUSTOM_FIELDS: CustomField[] = [
  { id: "budget", name: "Бюджет сделки", type: "number", required: true, groupId: "basic" },
  { id: "brief", name: "Бриф", type: "text", required: false, groupId: "basic" },
  { id: "kp", name: "КП", type: "text", required: true, groupId: "basic" },
  {
    id: "objections",
    name: "Возражения",
    type: "list",
    required: false,
    options: ["Цена", "Качество", "Сроки"],
    groupId: "basic",
  },
  { id: "requisites", name: "Реквизиты", type: "text", required: false, groupId: "basic" },
  { id: "invoice", name: "Счет", type: "text", required: false, groupId: "basic" },
  {
    id: "rejection-reason",
    name: "Причины отказа",
    type: "list",
    required: false,
    options: ["Дорого", "Не подходит", "Нашли другого", "Передумали", "Не отвечает", "Другое"],
    groupId: "basic",
  },
]

// Default stages
export const DEFAULT_STAGES: KanbanStage[] = [
  { id: "new", name: "Новая заявка", color: "#64748b", order: 0 },
  { id: "in-work", name: "Принято в работу", color: "#3b82f6", order: 1 },
  { id: "qualified", name: "Квалификация пройдена", color: "#06b6d4", order: 2 },
  { id: "proposal-sent", name: "Предложение отправлено", color: "#a855f7", order: 3 },
  { id: "prepaid", name: "Предоплата получена", color: "#6366f1", order: 4 },
  { id: "confirmed", name: "Бронь подтверждена", color: "#22c55e", order: 5 },
  { id: "issued", name: "Мопед выдан", color: "#10b981", order: 6 },
  { id: "inspection-scheduled", name: "Осмотр назначен", color: "#14b8a6", order: 7 },
  { id: "inspection-overdue", name: "Осмотр просрочен", color: "#f97316", order: 8 },
  { id: "inspection-done", name: "Осмотр проведен", color: "#84cc16", order: 9 },
  { id: "extended", name: "Аренда продлена", color: "#8b5cf6", order: 10 },
  { id: "overdue", name: "Аренда просрочена", color: "#ef4444", order: 11 },
  { id: "incident", name: "ЧП", color: "#dc2626", order: 12 },
  { id: "returned", name: "Мопед возвращен", color: "#0ea5e9", order: 13 },
  { id: "completed", name: "Аренда завершена", color: "#6b7280", order: 14 },
]

// Map database to CustomField
function mapDbToCustomField(dbField: any): CustomField {
  return {
    id: dbField.id,
    name: dbField.name,
    type: dbField.type,
    required: dbField.required,
    options: dbField.options,
    groupId: dbField.group_id,
  }
}

// Map CustomField to database
function mapCustomFieldToDb(field: CustomField): any {
  return {
    id: field.id,
    name: field.name,
    type: field.type,
    required: field.required,
    options: field.options,
    group_id: field.groupId,
  }
}

// Map database to FieldGroup
function mapDbToFieldGroup(dbGroup: any): FieldGroup {
  return {
    id: dbGroup.id,
    name: dbGroup.name,
    order: dbGroup.order_num,
  }
}

// Map FieldGroup to database
function mapFieldGroupToDb(group: FieldGroup): any {
  return {
    id: group.id,
    name: group.name,
    order_num: group.order,
  }
}

// Map database to KanbanStage
function mapDbToKanbanStage(dbStage: any): KanbanStage {
  return {
    id: dbStage.id,
    name: dbStage.name,
    color: dbStage.color,
    order: dbStage.order_num,
  }
}

// Map KanbanStage to database
function mapKanbanStageToDb(stage: KanbanStage): any {
  return {
    id: stage.id,
    name: stage.name,
    color: stage.color,
    order_num: stage.order,
  }
}

// Kanban Stages Functions
export async function getKanbanStages(): Promise<KanbanStage[]> {
  // Сначала проверяем кэш
  const cached = getCachedStages()
  if (cached) {
    // Возвращаем кэшированные данные сразу, но продолжаем обновление в фоне
    setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('kanban_stages')
          .select('*')
          .order('order_num', { ascending: true })

        if (!error && data && data.length > 0) {
          const mapped = data.map(mapDbToKanbanStage)
          setCachedStages(mapped)
        }
      } catch (error) {
        console.error('Error refreshing stages cache:', error)
      }
    }, 0)
    return cached
  }

  try {
    const { data, error } = await supabase
      .from('kanban_stages')
      .select('*')
      .order('order_num', { ascending: true })

    if (error) {
      console.error('Error fetching kanban stages:', error)
      return []
    }

    // If no stages in database, initialize with default stages once
    if (!data || data.length === 0) {
      // Insert default stages
      const dbStages = DEFAULT_STAGES.map(mapKanbanStageToDb)
      const { error: insertError } = await supabase
        .from('kanban_stages')
        .insert(dbStages)

      if (insertError) {
        console.error('Error initializing default stages:', insertError)
        return []
      }

      // Сохраняем в кэш и возвращаем
      setCachedStages(DEFAULT_STAGES)
      return DEFAULT_STAGES
    }

    const mapped = data.map(mapDbToKanbanStage)
    setCachedStages(mapped)
    return mapped
  } catch (error) {
    console.error('Error fetching kanban stages:', error)
    return []
  }
}

export async function saveKanbanStages(stages: KanbanStage[]): Promise<void> {
  try {
    // Get existing stages from database
    const { data: existingStages } = await supabase
      .from('kanban_stages')
      .select('id')

    const existingIds = existingStages?.map(s => s.id) || []
    const newIds = stages.map(s => s.id)

    // Delete stages that are not in the new list
    const idsToDelete = existingIds.filter(id => !newIds.includes(id))
    if (idsToDelete.length > 0) {
      // First, update deals that reference deleted stages to use a default stage
      const defaultStageId = newIds[0] || 'new'
      await supabase
        .from('deals')
        .update({ stage: defaultStageId })
        .in('stage', idsToDelete)

      // Then delete the stages
      const { error: deleteError } = await supabase
        .from('kanban_stages')
        .delete()
        .in('id', idsToDelete)

      if (deleteError) {
        console.error('Error deleting kanban stages:', deleteError)
      }
    }

    // Upsert (insert or update) all stages
    const dbStages = stages.map(mapKanbanStageToDb)
    for (const stage of dbStages) {
      const { error } = await supabase
        .from('kanban_stages')
        .upsert(stage, { onConflict: 'id' })

      if (error) {
        console.error(`Error upserting stage ${stage.id}:`, error)
      }
    }

    // Обновляем кэш
    setCachedStages(stages)
  } catch (error) {
    console.error('Error saving kanban stages:', error)
  }
}

// Custom Fields Functions
export async function getCustomFields(): Promise<CustomField[]> {
  // Сначала проверяем кэш
  const cached = getCachedFields()
  if (cached) {
    // Возвращаем кэшированные данные сразу, но продолжаем обновление в фоне
    setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('kanban_custom_fields')
          .select('*')
          .order('id', { ascending: true })

        if (!error && data && data.length > 0) {
          const mapped = data.map(mapDbToCustomField)
          setCachedFields(mapped)
        }
      } catch (error) {
        console.error('Error refreshing fields cache:', error)
      }
    }, 0)
    return cached
  }

  try {
    const { data, error } = await supabase
      .from('kanban_custom_fields')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Error fetching custom fields:', error)
      const defaults = DEFAULT_CUSTOM_FIELDS
      setCachedFields(defaults)
      return defaults
    }

    if (!data || data.length === 0) {
      const defaults = DEFAULT_CUSTOM_FIELDS
      setCachedFields(defaults)
      return defaults
    }

    const mapped = data.map(mapDbToCustomField)
    setCachedFields(mapped)
    return mapped
  } catch (error) {
    console.error('Error fetching custom fields:', error)
    const defaults = DEFAULT_CUSTOM_FIELDS
    setCachedFields(defaults)
    return defaults
  }
}

export async function saveCustomFields(fields: CustomField[]): Promise<void> {
  try {
    // Delete all existing fields and insert new ones
    await supabase.from('kanban_custom_fields').delete().neq('id', '')

    const dbFields = fields.map(mapCustomFieldToDb)
    const { error } = await supabase
      .from('kanban_custom_fields')
      .insert(dbFields)

    if (error) {
      console.error('Error saving custom fields:', error)
      return
    }

    // Обновляем кэш
    setCachedFields(fields)
  } catch (error) {
    console.error('Error saving custom fields:', error)
  }
}

// Field Groups Functions
export async function getFieldGroups(): Promise<FieldGroup[]> {
  // Сначала проверяем кэш
  const cached = getCachedGroups()
  if (cached) {
    // Возвращаем кэшированные данные сразу, но продолжаем обновление в фоне
    setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('kanban_field_groups')
          .select('*')
          .order('order_num', { ascending: true })

        if (!error && data && data.length > 0) {
          const mapped = data.map(mapDbToFieldGroup)
          setCachedGroups(mapped)
        }
      } catch (error) {
        console.error('Error refreshing groups cache:', error)
      }
    }, 0)
    return cached
  }

  try {
    const { data, error } = await supabase
      .from('kanban_field_groups')
      .select('*')
      .order('order_num', { ascending: true })

    if (error) {
      console.error('Error fetching field groups:', error)
      const defaults = DEFAULT_FIELD_GROUPS
      setCachedGroups(defaults)
      return defaults
    }

    if (!data || data.length === 0) {
      const defaults = DEFAULT_FIELD_GROUPS
      setCachedGroups(defaults)
      return defaults
    }

    const mapped = data.map(mapDbToFieldGroup)
    setCachedGroups(mapped)
    return mapped
  } catch (error) {
    console.error('Error fetching field groups:', error)
    const defaults = DEFAULT_FIELD_GROUPS
    setCachedGroups(defaults)
    return defaults
  }
}

export async function saveFieldGroups(groups: FieldGroup[]): Promise<void> {
  try {
    // Delete all existing groups and insert new ones
    await supabase.from('kanban_field_groups').delete().neq('id', '')

    const dbGroups = groups.map(mapFieldGroupToDb)
    const { error } = await supabase
      .from('kanban_field_groups')
      .insert(dbGroups)

    if (error) {
      console.error('Error saving field groups:', error)
      return
    }

    // Обновляем кэш
    setCachedGroups(groups)
  } catch (error) {
    console.error('Error saving field groups:', error)
  }
}
