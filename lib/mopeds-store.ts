import { supabase } from './supabase'

export type Moped = {
  id: string
  brand: string
  model: string
  licensePlate: string
  photo?: string
  status: "available" | "rented" | "maintenance"
  grnz?: string | null
  vinCode?: string | null
  color?: string | null
  mileage?: number | string | null
  condition?: "new" | "good" | "broken" | null
  insuranceDate?: string | null
  techInspectionDate?: string | null
  createdAt: string
  createdBy?: string // Имя пользователя, который создал запись
}

const CACHE_KEY = 'crm_mopeds_cache'
const CACHE_TIMESTAMP_KEY = 'crm_mopeds_cache_timestamp'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 минут
const MAX_CACHE_SIZE_BYTES = 3 * 1024 * 1024 // 3MB лимит (более консервативный)
const MAX_CACHE_ITEMS = 500 // Максимум записей в кэше

// Флаг для логирования предупреждения только один раз за сессию
let hasLoggedCacheWarning = false

// Simple in-memory cache to avoid repeated full fetches per card/modal
let mopedCache: Map<string, Moped> | null = null
let mopedCacheTimestamp = 0
const MOPED_CACHE_TTL_MS = 60_000

// Функции для работы с localStorage кэшем
export function getCachedMopeds(): Moped[] | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
    
    if (!cached || !timestamp) return null
    
    const age = Date.now() - parseInt(timestamp, 10)
    if (age > CACHE_TTL_MS) {
      // Кэш устарел
      localStorage.removeItem(CACHE_KEY)
      localStorage.removeItem(CACHE_TIMESTAMP_KEY)
      return null
    }
    
    return JSON.parse(cached) as Moped[]
  } catch (error) {
    console.error('Error reading mopeds cache:', error)
    return null
  }
}

// Создает облегченную версию мопеда без фото для кэширования
function createLightweightMoped(moped: Moped): Omit<Moped, 'photo'> & { photo?: never } {
  const { photo, ...rest } = moped
  return rest
}

function setCachedMopeds(mopeds: Moped[]): void {
  if (typeof window === 'undefined') return
  
  try {
    // Ограничиваем количество записей
    const limitedMopeds = mopeds.slice(0, MAX_CACHE_ITEMS)
    
    // Сначала пробуем сохранить полные данные
    let dataToStore = JSON.stringify(limitedMopeds)
    const sizeInBytes = new Blob([dataToStore]).size
    
    // Если данные слишком большие, создаем облегченную версию без фото
    if (sizeInBytes > MAX_CACHE_SIZE_BYTES) {
      const lightweightMopeds = limitedMopeds.map(createLightweightMoped)
      dataToStore = JSON.stringify(lightweightMopeds)
      const lightweightSize = new Blob([dataToStore]).size
      
      // Если облегченная версия тоже слишком большая, уменьшаем количество записей
      if (lightweightSize > MAX_CACHE_SIZE_BYTES) {
        // Пробуем сохранить только первые 200 записей без фото
        const furtherLimited = mopeds.slice(0, 200).map(createLightweightMoped)
        dataToStore = JSON.stringify(furtherLimited)
        const finalSize = new Blob([dataToStore]).size
        
        if (finalSize > MAX_CACHE_SIZE_BYTES) {
          // Если даже это не помещается, просто не сохраняем кэш
          // Логируем предупреждение только один раз за сессию
          if (!hasLoggedCacheWarning) {
            console.warn('Mopeds cache too large, skipping cache save. Data will be fetched from server.')
            hasLoggedCacheWarning = true
          }
          return
        }
      }
    }
    
    localStorage.setItem(CACHE_KEY, dataToStore)
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
  } catch (error: any) {
    // Если ошибка QuotaExceededError, очищаем старый кэш и пробуем снова с облегченными данными
    if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
      if (!hasLoggedCacheWarning) {
        console.warn('localStorage quota exceeded, clearing old cache and retrying with lightweight data')
        hasLoggedCacheWarning = true
      }
      try {
        localStorage.removeItem(CACHE_KEY)
        localStorage.removeItem(CACHE_TIMESTAMP_KEY)
        // Пробуем сохранить только первые 200 записей без фото
        const limitedMopeds = mopeds.slice(0, 200).map(createLightweightMoped)
        const dataToStore = JSON.stringify(limitedMopeds)
        const sizeInBytes = new Blob([dataToStore]).size
        if (sizeInBytes < MAX_CACHE_SIZE_BYTES) {
          localStorage.setItem(CACHE_KEY, dataToStore)
          localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
        }
      } catch (retryError) {
        // Тихая ошибка - не логируем повторно
      }
    } else {
      // Логируем только неожиданные ошибки
      if (!hasLoggedCacheWarning) {
        console.error('Error saving mopeds cache:', error)
        hasLoggedCacheWarning = true
      }
    }
  }
}

function clearMopedsCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem(CACHE_TIMESTAMP_KEY)
}

// Map database column names to our type
function mapDbToMoped(dbMoped: any): Moped {
  return {
    id: dbMoped.id,
    brand: dbMoped.brand,
    model: dbMoped.model,
    licensePlate: dbMoped.license_plate,
    photo: dbMoped.photo,
    status: dbMoped.status,
    grnz: dbMoped.grnz,
    vinCode: dbMoped.vin_code,
    color: dbMoped.color,
    mileage: dbMoped.mileage,
    condition: dbMoped.condition,
    insuranceDate: dbMoped.insurance_date,
    techInspectionDate: dbMoped.tech_inspection_date,
    createdAt: dbMoped.created_at,
    createdBy: dbMoped.created_by,
  }
}

function normalizeText(value: string | null | undefined) {
  if (value === undefined) return undefined
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeDate(value: string | null | undefined) {
  if (value === undefined) return undefined
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeMileage(value: number | string | null | undefined) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value === "number") return isNaN(value) ? null : value
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed.replace(/[^0-9.]/g, ""))
  return isNaN(parsed) ? null : parsed
}

// Map our type to database column names
function mapMopedToDb(moped: Partial<Moped>): any {
  const dbMoped: any = {}
  if (moped.brand !== undefined) dbMoped.brand = moped.brand
  if (moped.model !== undefined) dbMoped.model = moped.model
  if (moped.licensePlate !== undefined) dbMoped.license_plate = moped.licensePlate
  if (moped.photo !== undefined) dbMoped.photo = moped.photo
  if (moped.status !== undefined) dbMoped.status = moped.status
  if (moped.grnz !== undefined) dbMoped.grnz = normalizeText(moped.grnz ?? null)
  if (moped.vinCode !== undefined) dbMoped.vin_code = normalizeText(moped.vinCode ?? null)
  if (moped.color !== undefined) dbMoped.color = normalizeText(moped.color ?? null)
  if (moped.mileage !== undefined) dbMoped.mileage = normalizeMileage(moped.mileage)
  if (moped.condition !== undefined) dbMoped.condition = moped.condition || null
  if (moped.insuranceDate !== undefined) dbMoped.insurance_date = normalizeDate(moped.insuranceDate)
  if (moped.techInspectionDate !== undefined) dbMoped.tech_inspection_date = normalizeDate(moped.techInspectionDate)
  if (moped.createdBy !== undefined) dbMoped.created_by = moped.createdBy
  return dbMoped
}

export async function getMopeds(): Promise<Moped[]> {
  // Сначала проверяем кэш
  const cached = getCachedMopeds()
  if (cached) {
    // Обновляем in-memory кэш
    mopedCache = new Map(cached.map((m: Moped) => [m.id, m]))
    mopedCacheTimestamp = Date.now()
    // Возвращаем кэшированные данные сразу, но продолжаем обновление в фоне
    setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('mopeds')
          .select('*')
          .order('brand', { ascending: true })

        if (!error && data) {
          const mapped = data.map(mapDbToMoped)
          setCachedMopeds(mapped)
          mopedCache = new Map(mapped.map((m: Moped) => [m.id, m]))
          mopedCacheTimestamp = Date.now()
        }
      } catch (error) {
        console.error('Error refreshing mopeds cache:', error)
      }
    }, 0)
    return cached
  }

  try {
    const { data, error } = await supabase
      .from('mopeds')
      .select('*')
      .order('brand', { ascending: true })

    if (error) {
      console.error('Error fetching mopeds:', error)
      return []
    }

    const mapped = data.map(mapDbToMoped)
    // Сохраняем в кэш
    setCachedMopeds(mapped)
    // refresh in-memory cache
    mopedCache = new Map(mapped.map((m: Moped) => [m.id, m]))
    mopedCacheTimestamp = Date.now()
    return mapped
  } catch (error) {
    console.error('Error fetching mopeds:', error)
    return []
  }
}

export async function getMopedByIdCached(id: string): Promise<Moped | null> {
  try {
    const cacheValid = mopedCache && Date.now() - mopedCacheTimestamp < MOPED_CACHE_TTL_MS
    if (!cacheValid) {
      const all = await getMopeds()
      mopedCache = new Map(all.map((m) => [m.id, m]))
      mopedCacheTimestamp = Date.now()
    }
    return (mopedCache && mopedCache.get(id)) || null
  } catch (e) {
    console.error('Error reading cached moped by id:', e)
    return null
  }
}

export async function saveMopeds(mopeds: Moped[]): Promise<void> {
  // This function is not really needed with Supabase, but kept for compatibility
  // We'll update each moped individually or in batch
  try {
    for (const moped of mopeds) {
      const dbMoped = mapMopedToDb(moped)
      await supabase
        .from('mopeds')
        .update(dbMoped)
        .eq('id', moped.id)
    }
  } catch (error) {
    console.error('Error saving mopeds:', error)
  }
}

export async function addMoped(moped: Omit<Moped, "id" | "createdAt">): Promise<Moped | null> {
  try {
    const dbMoped = mapMopedToDb(moped)
    
    const { data, error } = await supabase
      .from('mopeds')
      .insert([dbMoped])
      .select()
      .single()

    if (error) {
      console.error('Error adding moped:', error)
      return null
    }

    const newMoped = mapDbToMoped(data)
    // Инвалидируем кэш
    clearMopedsCache()
    return newMoped
  } catch (error) {
    console.error('Error adding moped:', error)
    return null
  }
}

export async function updateMoped(id: string, updates: Partial<Omit<Moped, "id" | "createdAt">>): Promise<void> {
  try {
    const dbUpdates = mapMopedToDb(updates)
    
    const { error } = await supabase
      .from('mopeds')
      .update(dbUpdates)
      .eq('id', id)

    if (error) {
      console.error('Error updating moped:', error)
      return
    }

    // Инвалидируем кэш
    clearMopedsCache()
  } catch (error) {
    console.error('Error updating moped:', error)
  }
}

export async function deleteMoped(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('mopeds')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting moped:', error)
      return
    }

    // Инвалидируем кэш
    clearMopedsCache()
  } catch (error) {
    console.error('Error deleting moped:', error)
  }
}
