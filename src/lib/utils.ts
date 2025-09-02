import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Función para formatear fechas
export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

// Función para formatear fechas cortas
export function formatDateShort(date: string | Date) {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date))
}

// Función para obtener el color del estado
export function getStatusColor(status: string) {
  const colors = {
    'disponible': 'bg-green-100 text-green-800',
    'mantenimiento': 'bg-yellow-100 text-yellow-800',
    'fuera_servicio': 'bg-red-100 text-red-800',
    'activo': 'bg-blue-100 text-blue-800',
    'devuelto': 'bg-green-100 text-green-800',
    'devuelto_parcial': 'bg-yellow-100 text-yellow-800',
    'vencido': 'bg-red-100 text-red-800',
    'pendiente': 'bg-gray-100 text-gray-800',
    'enviado': 'bg-blue-100 text-blue-800',
    'leido': 'bg-green-100 text-green-800'
  }
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

// Función para obtener el texto del estado en español
export function getStatusText(status: string) {
  const texts = {
    'disponible': 'Disponible',
    'mantenimiento': 'En Mantenimiento',
    'fuera_servicio': 'Fuera de Servicio',
    'activo': 'Activo',
    'devuelto': 'Devuelto',
    'devuelto_parcial': 'Devuelto Parcial',
    'vencido': 'Vencido',
    'pendiente': 'Pendiente',
    'enviado': 'Enviado',
    'leido': 'Leído',
    'normal': 'Usuario Normal',
    'becario': 'Becario',
    'admin': 'Administrador'
  }
  return texts[status as keyof typeof texts] || status
}

// Función para validar email
export function isValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Función para generar ID único
export function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// Función para calcular días entre fechas
export function daysBetween(date1: string | Date, date2: string | Date) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// Función para verificar si una fecha está vencida
export function isOverdue(date: string | Date) {
  return new Date(date) < new Date()
}