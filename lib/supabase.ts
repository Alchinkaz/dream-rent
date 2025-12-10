import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Debug logging only on client side in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
      url: !!supabaseUrl,
      anonKey: !!supabaseAnonKey,
      serviceRole: !!supabaseServiceRoleKey,
    })
  }
}

// Singleton pattern to avoid multiple instances
let supabaseClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      // In production, log detailed error
      if (typeof window !== 'undefined') {
        console.error('❌ Supabase configuration error:', {
          url: supabaseUrl ? '✅ Set' : '❌ Missing',
          anonKey: supabaseAnonKey ? '✅ Set' : '❌ Missing',
          env: {
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
          },
          message: 'Please check Vercel environment variables are set correctly'
        })
      }
      // Still create client to avoid crashes, but operations will fail
      supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder')
    } else {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    }
  }
  return supabaseClient
}

export const supabase = getSupabaseClient()

// Client для серверной части с полными правами (service role)
export const supabaseAdmin: SupabaseClient | null = supabaseServiceRoleKey && supabaseUrl
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Database Types
export type Database = {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string
          name: string
          phone: string
          email: string | null
          iin: string | null
          doc_number: string | null
          status: string
          photo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          email?: string | null
          iin?: string | null
          doc_number?: string | null
          status?: string
          photo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          email?: string | null
          iin?: string | null
          doc_number?: string | null
          status?: string
          photo?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      mopeds: {
        Row: {
          id: string
          brand: string
          model: string
          license_plate: string
          photo: string | null
          status: 'available' | 'rented' | 'maintenance'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand: string
          model: string
          license_plate: string
          photo?: string | null
          status: 'available' | 'rented' | 'maintenance'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand?: string
          model?: string
          license_plate?: string
          photo?: string | null
          status?: 'available' | 'rented' | 'maintenance'
          created_at?: string
          updated_at?: string
        }
      }
      kanban_stages: {
        Row: {
          id: string
          name: string
          color: string
          order_num: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          color: string
          order_num: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          order_num?: number
          created_at?: string
          updated_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          client_name: string
          phone: string
          stage: string
          source: string | null
          manager: string | null
          dates: string | null
          date_start: string | null
          date_end: string | null
          moped: string | null
          moped_id: string | null
          amount: string | null
          payment_type: string | null
          price_per_day: string | null
          deposit_amount: string | null
          contact_name: string | null
          contact_iin: string | null
          contact_doc_number: string | null
          contact_phone: string | null
          contact_status: string | null
          emergency_contact_name: string | null
          emergency_contact_iin: string | null
          emergency_contact_doc_number: string | null
          emergency_contact_phone: string | null
          emergency_contact_status: string | null
          status: 'not-started' | 'in-research' | 'on-track' | 'complete' | null
          priority: 'low' | 'medium' | 'high' | null
          assignees: any
          comments: number
          links: number
          tasks: any
          custom_fields: any
          comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_name: string
          phone: string
          stage: string
          source?: string | null
          manager?: string | null
          dates?: string | null
          date_start?: string | null
          date_end?: string | null
          moped?: string | null
          moped_id?: string | null
          amount?: string | null
          payment_type?: string | null
          price_per_day?: string | null
          deposit_amount?: string | null
          contact_name?: string | null
          contact_iin?: string | null
          contact_doc_number?: string | null
          contact_phone?: string | null
          contact_status?: string | null
          emergency_contact_name?: string | null
          emergency_contact_iin?: string | null
          emergency_contact_doc_number?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_status?: string | null
          status?: 'not-started' | 'in-research' | 'on-track' | 'complete' | null
          priority?: 'low' | 'medium' | 'high' | null
          assignees?: any
          comments?: number
          links?: number
          tasks?: any
          custom_fields?: any
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_name?: string
          phone?: string
          stage?: string
          source?: string | null
          manager?: string | null
          dates?: string | null
          date_start?: string | null
          date_end?: string | null
          moped?: string | null
          moped_id?: string | null
          amount?: string | null
          payment_type?: string | null
          price_per_day?: string | null
          deposit_amount?: string | null
          contact_name?: string | null
          contact_iin?: string | null
          contact_doc_number?: string | null
          contact_phone?: string | null
          contact_status?: string | null
          emergency_contact_name?: string | null
          emergency_contact_iin?: string | null
          emergency_contact_doc_number?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_status?: string | null
          status?: 'not-started' | 'in-research' | 'on-track' | 'complete' | null
          priority?: 'low' | 'medium' | 'high' | null
          assignees?: any
          comments?: number
          links?: number
          tasks?: any
          custom_fields?: any
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      kanban_custom_fields: {
        Row: {
          id: string
          name: string
          type: 'text' | 'number' | 'flag' | 'list' | 'multilist' | 'date'
          required: boolean
          options: any | null
          group_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          type: 'text' | 'number' | 'flag' | 'list' | 'multilist' | 'date'
          required?: boolean
          options?: any | null
          group_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'text' | 'number' | 'flag' | 'list' | 'multilist' | 'date'
          required?: boolean
          options?: any | null
          group_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      kanban_field_groups: {
        Row: {
          id: string
          name: string
          order_num: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          order_num: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          order_num?: number
          created_at?: string
          updated_at?: string
        }
      }
      document_templates: {
        Row: {
          id: string
          name: string
          file_name: string
          variables: any
          content: Buffer
          document_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          file_name: string
          variables: any
          content: Buffer
          document_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          file_name?: string
          variables?: any
          content?: Buffer
          document_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      warehouses: {
        Row: {
          id: string
          name: string
          type: string
          resource_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          resource_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          resource_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      resources: {
        Row: {
          id: string
          warehouse_id: string
          name: string
          type: string
          quantity: number
          unit: string
          price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          warehouse_id: string
          name: string
          type: string
          quantity?: number
          unit: string
          price?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          warehouse_id?: string
          name?: string
          type?: string
          quantity?: number
          unit?: string
          price?: number
          created_at?: string
          updated_at?: string
        }
      }
      departments: {
        Row: {
          id: string
          name: string
          type: string
          employee_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          employee_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          employee_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          name: string
          position: string
          department: string | null
          contact: string
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          position: string
          department?: string | null
          contact: string
          status: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          position?: string
          department?: string | null
          contact?: string
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      counterparties: {
        Row: {
          id: string
          name: string
          type: string
          contact: string
          inn: string
          status: 'active' | 'inactive'
          contact_ids: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          contact: string
          inn: string
          status: 'active' | 'inactive'
          contact_ids?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          contact?: string
          inn?: string
          status?: 'active' | 'inactive'
          contact_ids?: any
          created_at?: string
          updated_at?: string
        }
      }
      counterparty_contacts: {
        Row: {
          id: string
          counterparty_id: string
          contact_id: string
          created_at: string
        }
        Insert: {
          id?: string
          counterparty_id: string
          contact_id: string
          created_at?: string
        }
        Update: {
          id?: string
          counterparty_id?: string
          contact_id?: string
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          name: string
          email: string
          password: string
          permissions: any
          tab_permissions: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          password: string
          permissions?: any
          tab_permissions?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          password?: string
          permissions?: any
          tab_permissions?: any
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
