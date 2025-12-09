import { supabase } from './supabase'
import type { DealWithFields } from './types/crm-fields'

const CACHE_KEY = 'crm_deals_cache'
const CACHE_TIMESTAMP_KEY = 'crm_deals_cache_timestamp'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 минут

// Функции для работы с localStorage кэшем
function getCachedDeals(): DealWithFields[] | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
    
    if (!cached || !timestamp) return null
    
    const age = Date.now() - parseInt(timestamp, 10)
    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY)
      localStorage.removeItem(CACHE_TIMESTAMP_KEY)
      return null
    }
    
    return JSON.parse(cached) as DealWithFields[]
  } catch (error) {
    console.error('Error reading deals cache:', error)
    return null
  }
}

function setCachedDeals(deals: DealWithFields[]): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(deals))
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
  } catch (error) {
    console.error('Error saving deals cache:', error)
  }
}

function clearDealsCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem(CACHE_TIMESTAMP_KEY)
}

// Map database column names to our DealWithFields type
function mapDbToDeal(dbDeal: any): DealWithFields {
  return {
    id: dbDeal.id,
    clientName: dbDeal.client_name,
    phone: dbDeal.phone,
    stage: dbDeal.stage,
    source: dbDeal.source,
    manager: dbDeal.manager,
    dates: dbDeal.dates,
    dateStart: dbDeal.date_start,
    dateEnd: dbDeal.date_end,
    moped: dbDeal.moped,
    mopedId: dbDeal.moped_id,
    amount: dbDeal.amount,
    paymentType: dbDeal.payment_type,
    pricePerDay: dbDeal.price_per_day,
    depositAmount: dbDeal.deposit_amount,
    contactName: dbDeal.contact_name,
    contactIIN: dbDeal.contact_iin,
    contactDocNumber: dbDeal.contact_doc_number,
    contactPhone: dbDeal.contact_phone,
    contactStatus: dbDeal.contact_status,
    emergencyContactName: dbDeal.emergency_contact_name,
    emergencyContactIIN: dbDeal.emergency_contact_iin,
    emergencyContactDocNumber: dbDeal.emergency_contact_doc_number,
    emergencyContactPhone: dbDeal.emergency_contact_phone,
    emergencyContactStatus: dbDeal.emergency_contact_status,
    status: dbDeal.status,
    priority: dbDeal.priority,
    assignees: dbDeal.assignees,
    comments: dbDeal.comments || 0,
    links: dbDeal.links || 0,
    tasks: dbDeal.tasks || { completed: 0, total: 0 },
    customFields: dbDeal.custom_fields,
    comment: dbDeal.comment,
    createdAt: dbDeal.created_at,
  }
}

// Map our DealWithFields type to database column names
function mapDealToDb(deal: Partial<DealWithFields>): any {
  const dbDeal: any = {}
  if (deal.clientName !== undefined) dbDeal.client_name = deal.clientName
  if (deal.phone !== undefined) dbDeal.phone = deal.phone
  if (deal.stage !== undefined) dbDeal.stage = deal.stage
  if (deal.source !== undefined) dbDeal.source = deal.source
  if (deal.manager !== undefined) dbDeal.manager = deal.manager
  if (deal.dates !== undefined) dbDeal.dates = deal.dates
  if (deal.dateStart !== undefined) dbDeal.date_start = deal.dateStart
  if (deal.dateEnd !== undefined) dbDeal.date_end = deal.dateEnd
  if (deal.moped !== undefined) dbDeal.moped = deal.moped
  if (deal.mopedId !== undefined) dbDeal.moped_id = deal.mopedId
  if (deal.amount !== undefined) dbDeal.amount = deal.amount
  if (deal.paymentType !== undefined) dbDeal.payment_type = deal.paymentType
  if (deal.pricePerDay !== undefined) dbDeal.price_per_day = deal.pricePerDay
  if (deal.depositAmount !== undefined) dbDeal.deposit_amount = deal.depositAmount
  if (deal.contactName !== undefined) dbDeal.contact_name = deal.contactName
  if (deal.contactIIN !== undefined) dbDeal.contact_iin = deal.contactIIN
  if (deal.contactDocNumber !== undefined) dbDeal.contact_doc_number = deal.contactDocNumber
  if (deal.contactPhone !== undefined) dbDeal.contact_phone = deal.contactPhone
  if (deal.contactStatus !== undefined) dbDeal.contact_status = deal.contactStatus
  if (deal.emergencyContactName !== undefined) dbDeal.emergency_contact_name = deal.emergencyContactName
  if (deal.emergencyContactIIN !== undefined) dbDeal.emergency_contact_iin = deal.emergencyContactIIN
  if (deal.emergencyContactDocNumber !== undefined) dbDeal.emergency_contact_doc_number = deal.emergencyContactDocNumber
  if (deal.emergencyContactPhone !== undefined) dbDeal.emergency_contact_phone = deal.emergencyContactPhone
  if (deal.emergencyContactStatus !== undefined) dbDeal.emergency_contact_status = deal.emergencyContactStatus
  if (deal.status !== undefined) dbDeal.status = deal.status
  if (deal.priority !== undefined) dbDeal.priority = deal.priority
  if (deal.assignees !== undefined) dbDeal.assignees = deal.assignees
  if (deal.comments !== undefined) dbDeal.comments = deal.comments
  if (deal.links !== undefined) dbDeal.links = deal.links
  if (deal.tasks !== undefined) dbDeal.tasks = deal.tasks
  if (deal.customFields !== undefined) dbDeal.custom_fields = deal.customFields
  if (deal.comment !== undefined) dbDeal.comment = deal.comment
  return dbDeal
}

export async function getDeals(): Promise<DealWithFields[]> {
  // Сначала проверяем кэш
  const cached = getCachedDeals()
  if (cached) {
    // Возвращаем кэшированные данные сразу, но продолжаем обновление в фоне
    setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('deals')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          const mapped = data.map(mapDbToDeal)
          setCachedDeals(mapped)
        }
      } catch (error) {
        console.error('Error refreshing deals cache:', error)
      }
    }, 0)
    return cached
  }

  try {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching deals:', error)
      return []
    }

    const mapped = data.map(mapDbToDeal)
    setCachedDeals(mapped)
    return mapped
  } catch (error) {
    console.error('Error fetching deals:', error)
    return []
  }
}

export async function getDealById(id: string): Promise<DealWithFields | null> {
  try {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching deal:', error)
      return null
    }

    return mapDbToDeal(data)
  } catch (error) {
    console.error('Error fetching deal:', error)
    return null
  }
}

export async function getDealsByStage(stageId: string): Promise<DealWithFields[]> {
  try {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('stage', stageId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching deals by stage:', error)
      return []
    }

    return data.map(mapDbToDeal)
  } catch (error) {
    console.error('Error fetching deals by stage:', error)
    return []
  }
}

export async function createDeal(deal: Partial<DealWithFields>): Promise<DealWithFields | null> {
  try {
    const dbDeal = mapDealToDb(deal)
    
    const { data, error } = await supabase
      .from('deals')
      .insert([dbDeal])
      .select()
      .single()

    if (error) {
      console.error('Error creating deal:', error)
      return null
    }

    const newDeal = mapDbToDeal(data)
    clearDealsCache()
    return newDeal
  } catch (error) {
    console.error('Error creating deal:', error)
    return null
  }
}

export async function updateDeal(id: string, updates: Partial<DealWithFields>): Promise<DealWithFields | null> {
  try {
    const dbUpdates = mapDealToDb(updates)
    
    const { data, error } = await supabase
      .from('deals')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating deal:', error)
      return null
    }

    const updated = mapDbToDeal(data)
    clearDealsCache()
    return updated
  } catch (error) {
    console.error('Error updating deal:', error)
    return null
  }
}

export async function deleteDeal(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting deal:', error)
      return false
    }

    clearDealsCache()
    return true
  } catch (error) {
    console.error('Error deleting deal:', error)
    return false
  }
}

export async function moveDealToStage(dealId: string, stageId: string): Promise<DealWithFields | null> {
  const result = await updateDeal(dealId, { stage: stageId })
  // updateDeal уже очищает кэш
  return result
}
