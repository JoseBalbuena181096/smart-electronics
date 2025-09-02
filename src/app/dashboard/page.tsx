'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useEquipment, useLoans, useUsers, useNotifications } from '@/hooks/useSupabase'
import Layout from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  CubeIcon,
  DocumentTextIcon,
  UsersIcon,
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { formatDate, getStatusColor, getStatusText } from '@/lib/utils'

interface DashboardStats {
  totalEquipos: number
  equiposDisponibles: number
  equiposEnPrestamo: number
  equiposMantenimiento: number
  prestamosActivos: number
  prestamosVencidos: number
  totalUsuarios?: number
  notificacionesPendientes: number
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const { equipment, loading: equipmentLoading } = useEquipment()
  const { loans, loading: loansLoading } = useLoans()
  const { users, loading: usersLoading } = useUsers()
  const { notifications, loading: notificationsLoading } = useNotifications()
  
  const [stats, setStats] = useState<DashboardStats>({
    totalEquipos: 0,
    equiposDisponibles: 0,
    equiposEnPrestamo: 0,
    equiposMantenimiento: 0,
    prestamosActivos: 0,
    prestamosVencidos: 0,
    totalUsuarios: 0,
    notificacionesPendientes: 0
  })

  useEffect(() => {
    if (equipment && loans && notifications) {
      const now = new Date()
      
      const equiposDisponibles = equipment.filter(e => e.cantidad_disponible > 0 && e.is_active).length
      const equiposEnPrestamo = equipment.filter(e => e.cantidad_disponible < e.cantidad_total && e.is_active).length
      const equiposMantenimiento = equipment.filter(e => !e.is_active).length
      
      const prestamosActivos = loans.filter(l => l.status === 'activo').length
      const prestamosVencidos = loans.filter(l => 
        l.status === 'activo' && l.fecha_devolucion && new Date(l.fecha_devolucion) < now
      ).length
      
      const notificacionesPendientes = notifications.filter(n => n.estado !== 'leido').length
      
      setStats({
        totalEquipos: equipment.length,
        equiposDisponibles,
        equiposEnPrestamo,
        equiposMantenimiento,
        prestamosActivos,
        prestamosVencidos,
        totalUsuarios: users?.length || 0,
        notificacionesPendientes
      })
    }
  }, [equipment, loans, users, notifications])

  const loading = equipmentLoading || loansLoading || notificationsLoading || (profile?.role === 'admin' && usersLoading)

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    )
  }

  const recentLoans = loans?.slice(0, 5) || []
  const recentNotifications = notifications?.filter(n => n.estado !== 'leido').slice(0, 5) || []

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Bienvenido, {profile?.nombre} {profile?.apellido}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Equipos Stats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Equipos
              </CardTitle>
              <CubeIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEquipos}</div>
              <div className="flex space-x-2 mt-2">
                <Badge variant="success">
                  {stats.equiposDisponibles} disponibles
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                En Préstamo
              </CardTitle>
              <DocumentTextIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.equiposEnPrestamo}</div>
              <div className="flex space-x-2 mt-2">
                <Badge variant="warning">
                  {stats.prestamosVencidos} vencidos
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Préstamos Activos
              </CardTitle>
              <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.prestamosActivos}</div>
              <p className="text-xs text-muted-foreground">
                Préstamos en curso
              </p>
            </CardContent>
          </Card>

          {profile?.role === 'admin' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Usuarios
                </CardTitle>
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsuarios}</div>
                <p className="text-xs text-muted-foreground">
                  Usuarios registrados
                </p>
              </CardContent>
            </Card>
          )}

          {profile?.role !== 'admin' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Notificaciones
                </CardTitle>
                <BellIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.notificacionesPendientes}</div>
                <p className="text-xs text-muted-foreground">
                  Sin leer
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Loans */}
          <Card>
            <CardHeader>
              <CardTitle>Préstamos Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentLoans.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay préstamos recientes
                </p>
              ) : (
                <div className="space-y-3">
                  {recentLoans.map((loan) => (
                    <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{loan.equipos?.nombre}</p>
                        <p className="text-sm text-gray-600">
                          {loan.profiles?.nombre} {loan.profiles?.apellido}
                        </p>
                        <p className="text-xs text-gray-500">
                          Vence: {loan.fecha_devolucion ? formatDate(loan.fecha_devolucion) : 'No definida'}
                        </p>
                      </div>
                      <Badge 
                        variant={getStatusColor(loan.status) as any}
                      >
                        {getStatusText(loan.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentNotifications.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay notificaciones pendientes
                </p>
              ) : (
                <div className="space-y-3">
                  {recentNotifications.map((notification) => (
                    <div key={notification.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <BellIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{notification.asunto}</p>
                        <p className="text-sm text-gray-600">{notification.contenido}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(notification.fecha_envio)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alerts for overdue loans */}
        {stats.prestamosVencidos > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                Préstamos Vencidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">
                Hay {stats.prestamosVencidos} préstamo(s) vencido(s) que requieren atención inmediata.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}