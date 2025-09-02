'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Tables, Inserts, Updates } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Equipment = Tables<'equipos'>
type Loan = Tables<'prestamos'>
type Profile = Tables<'profiles'>
type Movement = Tables<'movimientos_inventario'>
type Notification = Tables<'notificaciones'>

// Hook para equipos
export function useEquipment() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  const fetchEquipment = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .order('nombre')

      if (error) throw error
      setEquipment(data || [])
    } catch (error) {
      console.error('Error fetching equipment:', error)
      toast.error('Error al cargar equipos')
    } finally {
      setLoading(false)
    }
  }

  const createEquipment = async (data: Inserts<'equipos'>) => {
    try {
      const { error } = await supabase
        .from('equipos')
        .insert(data)

      if (error) throw error
      toast.success('Equipo creado exitosamente')
      await fetchEquipment()
      return true
    } catch (error) {
      console.error('Error creating equipment:', error)
      toast.error('Error al crear equipo')
      return false
    }
  }

  const updateEquipment = async (id: string, data: Updates<'equipos'>) => {
    try {
      const { error } = await supabase
        .from('equipos')
        .update(data)
        .eq('id', id)

      if (error) throw error
      toast.success('Equipo actualizado exitosamente')
      await fetchEquipment()
      return true
    } catch (error) {
      console.error('Error updating equipment:', error)
      toast.error('Error al actualizar equipo')
      return false
    }
  }

  const deleteEquipment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('equipos')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Equipo eliminado exitosamente')
      await fetchEquipment()
      return true
    } catch (error) {
      console.error('Error deleting equipment:', error)
      toast.error('Error al eliminar equipo')
      return false
    }
  }

  const searchEquipment = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .or(`nombre.ilike.%${query}%,descripcion.ilike.%${query}%,numero_serie.ilike.%${query}%,marca.ilike.%${query}%,modelo.ilike.%${query}%`)
        .order('nombre')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error searching equipment:', error)
      return []
    }
  }

  useEffect(() => {
    fetchEquipment()
  }, [])

  return {
    equipment,
    loading,
    fetchEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    searchEquipment
  }
}

// Hook para préstamos
export function useLoans() {
  const [loans, setLoans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  const fetchLoans = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('prestamos')
        .select(`
          *,
          usuario:profiles!user_id(nombre, apellido, matricula),
          equipo:equipos!equipo_id(nombre, serie),
          prestado_por_profile:profiles!prestado_por(nombre, apellido)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLoans(data || [])
    } catch (error) {
      console.error('Error fetching loans:', error)
      toast.error('Error al cargar préstamos')
    } finally {
      setLoading(false)
    }
  }

  const createLoan = async (data: Inserts<'prestamos'>) => {
    try {
      const { error } = await supabase
        .from('prestamos')
        .insert(data)

      if (error) throw error
      toast.success('Préstamo creado exitosamente')
      await fetchLoans()
      return true
    } catch (error) {
      console.error('Error creating loan:', error)
      toast.error('Error al crear préstamo')
      return false
    }
  }

  const updateLoan = async (id: string, data: Updates<'prestamos'>) => {
    try {
      const { error } = await supabase
        .from('prestamos')
        .update(data)
        .eq('id', id)

      if (error) throw error
      toast.success('Préstamo actualizado exitosamente')
      await fetchLoans()
      return true
    } catch (error) {
      console.error('Error updating loan:', error)
      toast.error('Error al actualizar préstamo')
      return false
    }
  }

  const returnLoan = async (id: string, cantidadDevuelta: number, notas?: string) => {
    try {
      const { error } = await supabase
        .from('prestamos')
        .update({
          cantidad_devuelta: cantidadDevuelta,
          fecha_devolucion: new Date().toISOString(),
          notas
        })
        .eq('id', id)

      if (error) throw error
      toast.success('Devolución registrada exitosamente')
      await fetchLoans()
      return true
    } catch (error) {
      console.error('Error returning loan:', error)
      toast.error('Error al registrar devolución')
      return false
    }
  }

  useEffect(() => {
    fetchLoans()
  }, [])

  return {
    loans,
    loading,
    fetchLoans,
    createLoan,
    updateLoan,
    returnLoan
  }
}

// Hook para usuarios
export function useUsers() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nombre')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%,matricula.ilike.%${query}%,email.ilike.%${query}%`)
        .order('nombre')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error searching users:', error)
      return []
    }
  }

  const updateUser = async (id: string, data: Updates<'profiles'>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', id)

      if (error) throw error
      toast.success('Usuario actualizado exitosamente')
      await fetchUsers()
      return true
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Error al actualizar usuario')
      return false
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return {
    users,
    loading,
    fetchUsers,
    searchUsers,
    updateUser
  }
}

// Hook para notificaciones
export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  const fetchNotifications = async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('destinatario_id', userId)
        .order('fecha_envio', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('Error al cargar notificaciones')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({ estado: 'leido' })
        .eq('id', id)

      if (error) throw error
      toast.success('Notificación marcada como leída')
      await fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Error al marcar notificación como leída')
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notificaciones')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Notificación eliminada')
      await fetchNotifications()
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Error al eliminar notificación')
    }
  }

  useEffect(() => {
    if (userId) {
      fetchNotifications()
    }
  }, [userId])

  return {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    deleteNotification
  }
}