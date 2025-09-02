import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente para uso en el servidor
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente para uso en el navegador
export const createSupabaseBrowserClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Tipos de la base de datos
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          nombre: string
          apellido: string
          matricula: string
          carrera?: string
          telefono?: string
          rfid?: string
          role: 'normal' | 'becario' | 'admin'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nombre: string
          apellido: string
          matricula: string
          carrera?: string
          telefono?: string
          rfid?: string
          role?: 'normal' | 'becario' | 'admin'
          is_active?: boolean
        }
        Update: {
          id?: string
          email?: string
          nombre?: string
          apellido?: string
          matricula?: string
          carrera?: string
          telefono?: string
          rfid?: string
          role?: 'normal' | 'becario' | 'admin'
          is_active?: boolean
        }
      }
      equipos: {
        Row: {
          id: string
          nombre: string
          descripcion?: string
          numero_serie: string
          marca?: string
          modelo?: string
          ubicacion?: string
          cantidad_total: number
          cantidad_disponible: number
          estado: 'disponible' | 'mantenimiento' | 'fuera_servicio'
          imagen_url?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          nombre: string
          descripcion?: string
          numero_serie: string
          marca?: string
          modelo?: string
          ubicacion?: string
          cantidad_total: number
          cantidad_disponible?: number
          estado?: 'disponible' | 'mantenimiento' | 'fuera_servicio'
          imagen_url?: string
        }
        Update: {
          nombre?: string
          descripcion?: string
          numero_serie?: string
          marca?: string
          modelo?: string
          ubicacion?: string
          cantidad_total?: number
          cantidad_disponible?: number
          estado?: 'disponible' | 'mantenimiento' | 'fuera_servicio'
          imagen_url?: string
        }
      }
      prestamos: {
        Row: {
          id: string
          usuario_id: string
          equipo_id: string
          cantidad_prestada: number
          cantidad_devuelta: number
          cantidad_pendiente: number
          fecha_prestamo: string
          fecha_devolucion_esperada: string
          fecha_devolucion?: string
          estado: 'activo' | 'devuelto' | 'devuelto_parcial' | 'vencido'
          notas?: string
          prestado_por: string
          created_at: string
          updated_at: string
        }
        Insert: {
          usuario_id: string
          equipo_id: string
          cantidad_prestada: number
          fecha_devolucion_esperada: string
          notas?: string
          prestado_por: string
        }
        Update: {
          cantidad_devuelta?: number
          fecha_devolucion?: string
          estado?: 'activo' | 'devuelto' | 'devuelto_parcial' | 'vencido'
          notas?: string
        }
      }
      movimientos_inventario: {
        Row: {
          id: string
          equipo_id: string
          tipo_movimiento: 'prestamo' | 'devolucion' | 'ajuste' | 'mantenimiento'
          cantidad: number
          cantidad_anterior: number
          cantidad_nueva: number
          prestamo_id?: string
          realizado_por: string
          notas?: string
          created_at: string
        }
      }
      notificaciones: {
        Row: {
          id: string
          tipo: 'prestamo_vencido' | 'devolucion_pendiente' | 'stock_bajo' | 'general'
          destinatario_id: string
          asunto: string
          contenido: string
          enviado_por?: string
          fecha_envio: string
          estado: 'pendiente' | 'enviado' | 'leido'
        }
        Insert: {
          tipo: 'prestamo_vencido' | 'devolucion_pendiente' | 'stock_bajo' | 'general'
          destinatario_id: string
          asunto: string
          contenido: string
          enviado_por?: string
          estado?: 'pendiente' | 'enviado' | 'leido'
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']