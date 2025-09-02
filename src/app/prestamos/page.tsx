'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLoans, useEquipment, useUsers } from '@/hooks/useSupabase'
import Layout from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { formatDate, getStatusColor, getStatusText, isOverdue } from '@/lib/utils'
import toast from 'react-hot-toast'

interface LoanWithDetails {
  id: string
  usuario_id: string
  equipo_id: string
  fecha_prestamo: string
  fecha_devolucion_esperada: string
  fecha_devolucion_real?: string
  estado: 'activo' | 'devuelto' | 'vencido'
  observaciones?: string
  equipos: {
    id: string
    nombre: string
    modelo: string
    numero_serie: string
  }
  profiles: {
    id: string
    nombre: string
    apellido: string
    numero_estudiante: string
  }
}

export default function PrestamosPage() {
  const { profile } = useAuth()
  const { loans, loading: loansLoading, createLoan, updateLoan } = useLoans()
  const { equipment, loading: equipmentLoading } = useEquipment()
  const { users, loading: usersLoading } = useUsers()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'activo' | 'devuelto' | 'vencido'>('all')
  const [showNewLoanModal, setShowNewLoanModal] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<LoanWithDetails | null>(null)
  
  // New loan form state
  const [newLoan, setNewLoan] = useState({
    usuario_id: '',
    equipo_id: '',
    fecha_devolucion_esperada: '',
    observaciones: ''
  })

  const loading = loansLoading || equipmentLoading || (profile?.role === 'admin' && usersLoading)

  // Filter loans based on search and status
  const filteredLoans = (loans as LoanWithDetails[] || []).filter(loan => {
    const matchesSearch = 
      loan.equipos?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.profiles?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.profiles?.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.profiles?.numero_estudiante.includes(searchTerm)
    
    const matchesStatus = statusFilter === 'all' || loan.estado === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Available equipment for new loans
  const availableEquipment = equipment?.filter(eq => eq.estado === 'disponible') || []
  
  // Available users for new loans (admin only)
  const availableUsers = users?.filter(user => user.activo) || []

  const handleCreateLoan = async () => {
    if (!newLoan.usuario_id || !newLoan.equipo_id || !newLoan.fecha_devolucion_esperada) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    try {
      await createLoan({
        usuario_id: newLoan.usuario_id,
        equipo_id: newLoan.equipo_id,
        fecha_devolucion_esperada: newLoan.fecha_devolucion_esperada,
        observaciones: newLoan.observaciones || null
      })
      
      setShowNewLoanModal(false)
      setNewLoan({
        usuario_id: '',
        equipo_id: '',
        fecha_devolucion_esperada: '',
        observaciones: ''
      })
      toast.success('Préstamo creado exitosamente')
    } catch (error) {
      console.error('Error creating loan:', error)
      toast.error('Error al crear el préstamo')
    }
  }

  const handleReturnLoan = async (loanId: string) => {
    try {
      await updateLoan(loanId, {
        estado: 'devuelto',
        fecha_devolucion_real: new Date().toISOString()
      })
      toast.success('Equipo devuelto exitosamente')
    } catch (error) {
      console.error('Error returning loan:', error)
      toast.error('Error al devolver el equipo')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Préstamos</h1>
            <p className="text-gray-600">Administra los préstamos de equipos</p>
          </div>
          
          {(profile?.role === 'admin' || profile?.role === 'becario') && (
            <Button onClick={() => setShowNewLoanModal(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Nuevo Préstamo
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar por equipo, usuario o número de estudiante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="devuelto">Devueltos</option>
                <option value="vencido">Vencidos</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Loans List */}
        <div className="space-y-4">
          {filteredLoans.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No se encontraron préstamos</p>
              </CardContent>
            </Card>
          ) : (
            filteredLoans.map((loan) => {
              const overdue = loan.estado === 'activo' && isOverdue(loan.fecha_devolucion_esperada)
              
              return (
                <Card key={loan.id} className={overdue ? 'border-red-200 bg-red-50' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">{loan.equipos?.nombre}</h3>
                            <p className="text-gray-600">
                              {loan.equipos?.modelo} - S/N: {loan.equipos?.numero_serie}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge variant={getStatusColor(loan.estado) as any}>
                              {getStatusText(loan.estado)}
                            </Badge>
                            {overdue && (
                              <Badge variant="destructive">
                                <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                Vencido
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <p><strong>Usuario:</strong> {loan.profiles?.nombre} {loan.profiles?.apellido}</p>
                            <p><strong>No. Estudiante:</strong> {loan.profiles?.numero_estudiante}</p>
                          </div>
                          
                          <div>
                            <p><strong>Fecha préstamo:</strong> {formatDate(loan.fecha_prestamo)}</p>
                            <p><strong>Fecha esperada:</strong> {formatDate(loan.fecha_devolucion_esperada)}</p>
                            {loan.fecha_devolucion_real && (
                              <p><strong>Fecha devolución:</strong> {formatDate(loan.fecha_devolucion_real)}</p>
                            )}
                          </div>
                        </div>
                        
                        {loan.observaciones && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              <strong>Observaciones:</strong> {loan.observaciones}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {loan.estado === 'activo' && (profile?.role === 'admin' || profile?.role === 'becario') && (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => handleReturnLoan(loan.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <ArrowPathIcon className="h-4 w-4 mr-2" />
                            Devolver
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* New Loan Modal */}
        {showNewLoanModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Nuevo Préstamo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* User Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usuario *
                  </label>
                  <select
                    value={newLoan.usuario_id}
                    onChange={(e) => setNewLoan({ ...newLoan, usuario_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar usuario</option>
                    {profile?.role === 'normal' ? (
                      <option value={profile.id}>
                        {profile.nombre} {profile.apellido} - {profile.numero_estudiante}
                      </option>
                    ) : (
                      availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.nombre} {user.apellido} - {user.numero_estudiante}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Equipment Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Equipo *
                  </label>
                  <select
                    value={newLoan.equipo_id}
                    onChange={(e) => setNewLoan({ ...newLoan, equipo_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar equipo</option>
                    {availableEquipment.map((equipo) => (
                      <option key={equipo.id} value={equipo.id}>
                        {equipo.nombre} - {equipo.modelo} (S/N: {equipo.numero_serie})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Return Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de devolución esperada *
                  </label>
                  <Input
                    type="date"
                    value={newLoan.fecha_devolucion_esperada}
                    onChange={(e) => setNewLoan({ ...newLoan, fecha_devolucion_esperada: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                {/* Observations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    value={newLoan.observaciones}
                    onChange={(e) => setNewLoan({ ...newLoan, observaciones: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Observaciones adicionales..."
                  />
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewLoanModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateLoan}
                    className="flex-1"
                  >
                    Crear Préstamo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}