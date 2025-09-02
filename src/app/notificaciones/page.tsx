'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/hooks/useSupabase'
import Layout from '@/components/layout/Layout'
import { Bell, Check, X, AlertCircle, Info } from 'lucide-react'

export default function NotificationsPage() {
  const { profile } = useAuth()
  const { notifications, loading, markAsRead, deleteNotification } = useNotifications(profile?.id)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') {
      return notification.estado !== 'leido'
    }
    return true
  })

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'prestamo_vencido':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'devolucion_pendiente':
        return <Bell className="w-5 h-5 text-yellow-500" />
      case 'equipo_disponible':
        return <Check className="w-5 h-5 text-green-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getNotificationColor = (tipo: string) => {
    switch (tipo) {
      case 'prestamo_vencido':
        return 'border-l-red-500 bg-red-50'
      case 'devolucion_pendiente':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'equipo_disponible':
        return 'border-l-green-500 bg-green-50'
      default:
        return 'border-l-blue-500 bg-blue-50'
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              No leídas
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {filter === 'unread' ? 'No tienes notificaciones sin leer' : 'No tienes notificaciones'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-l-4 p-4 rounded-lg shadow-sm ${
                  getNotificationColor(notification.tipo)
                } ${
                   notification.estado !== 'leido' ? 'ring-2 ring-blue-200' : ''
                 }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.tipo)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {notification.asunto}
                      </h3>
                      <p className="text-gray-700 mt-1">
                        {notification.contenido}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        {new Date(notification.fecha_envio).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {notification.estado !== 'leido' && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        title="Marcar como leída"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-1 text-red-600 hover:text-red-800 transition-colors"
                      title="Eliminar notificación"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}