"use client"

import { supabase } from './supabase'

export type Contact = {
  id: string
  name: string
  phone: string
  email?: string | null
  iin?: string | null
  docNumber?: string | null
  status?: string
  photo?: string | null
  emergencyContactId?: string | null
  createdAt: string
}

const CACHE_KEY = 'crm_contacts_cache'
const CACHE_TIMESTAMP_KEY = 'crm_contacts_cache_timestamp'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 минут

// Функции для работы с localStorage кэшем
function getCachedContacts(): Contact[] | null {
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
    
    return JSON.parse(cached) as Contact[]
  } catch (error) {
    console.error('Error reading contacts cache:', error)
    return null
  }
}

function setCachedContacts(contacts: Contact[]): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(contacts))
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
  } catch (error) {
    console.error('Error saving contacts cache:', error)
  }
}

function clearContactsCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem(CACHE_TIMESTAMP_KEY)
}

// Map database column names to our type
function mapDbToContact(dbContact: any): Contact {
  return {
    id: dbContact.id,
    name: dbContact.name,
    phone: dbContact.phone,
    email: dbContact.email,
    iin: dbContact.iin,
    docNumber: dbContact.doc_number,
    status: dbContact.status,
    photo: dbContact.photo,
    emergencyContactId: dbContact.emergency_contact_id,
    createdAt: dbContact.created_at,
  }
}

// Map our type to database column names
function mapContactToDb(contact: Partial<Contact>): any {
  const dbContact: any = {}
  if (contact.name !== undefined) dbContact.name = contact.name
  if (contact.phone !== undefined) dbContact.phone = contact.phone
  if (contact.email !== undefined) dbContact.email = normalizeOptionalText(contact.email)
  if (contact.iin !== undefined) dbContact.iin = normalizeOptionalText(contact.iin)
  if (contact.docNumber !== undefined) dbContact.doc_number = normalizeOptionalText(contact.docNumber)
  if (contact.status !== undefined) dbContact.status = contact.status
  if (contact.photo !== undefined) dbContact.photo = normalizeOptionalText(contact.photo)
  if (contact.emergencyContactId !== undefined) {
    const value =
      contact.emergencyContactId && contact.emergencyContactId.trim() !== "" ? contact.emergencyContactId : null
    dbContact.emergency_contact_id = value
  }
  return dbContact
}

function normalizeOptionalText(value?: string | null) {
  if (value === undefined) return undefined
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export async function getContacts(): Promise<Contact[]> {
  // Сначала проверяем кэш
  const cached = getCachedContacts()
  if (cached) {
    // Возвращаем кэшированные данные сразу, но продолжаем обновление в фоне
    setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          const mapped = data.map(mapDbToContact)
          setCachedContacts(mapped)
        }
      } catch (error) {
        console.error('Error refreshing contacts cache:', error)
      }
    }, 0)
    return cached
  }

  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching contacts:', error)
      return []
    }

    const mapped = data.map(mapDbToContact)
    setCachedContacts(mapped)
    return mapped
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return []
  }
}

export async function addContact(contact: Omit<Contact, "id" | "createdAt">): Promise<Contact | null> {
  try {
    const dbContact = mapContactToDb(contact)
    
    const { data, error } = await supabase
      .from('contacts')
      .insert([dbContact])
      .select()
      .single()

    if (error) {
      console.error('Error adding contact:', error)
      return null
    }

    const newContact = mapDbToContact(data)
    clearContactsCache()
    return newContact
  } catch (error) {
    console.error('Error adding contact:', error)
    return null
  }
}

export async function updateContact(id: string, updates: Partial<Omit<Contact, "id" | "createdAt">>): Promise<Contact | null> {
  try {
    const dbUpdates = mapContactToDb(updates)
    
    const { data, error } = await supabase
      .from('contacts')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating contact:', error)
      return null
    }

    const updated = mapDbToContact(data)
    clearContactsCache()
    return updated
  } catch (error) {
    console.error('Error updating contact:', error)
    return null
  }
}

export async function deleteContact(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting contact:', error)
      return false
    }

    clearContactsCache()
    return true
  } catch (error) {
    console.error('Error deleting contact:', error)
    return false
  }
}

export async function findContactByNameOrPhone(name?: string, phone?: string): Promise<Contact | null> {
  try {
    if (!name && !phone) return null

    let query = supabase.from('contacts').select('*')

    if (name && phone) {
      query = query.or(`name.ilike.%${name}%,phone.eq.${phone}`)
    } else if (name) {
      query = query.ilike('name', `%${name}%`)
    } else if (phone) {
      query = query.eq('phone', phone)
    }

    const { data, error } = await query.single()

    if (error) {
      // No rows returned
      return null
    }

    return mapDbToContact(data)
  } catch (error) {
    console.error('Error finding contact:', error)
    return null
  }
}
