'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers } from '@/hooks/useSupabase'
import Layout from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  MagnifyingGlassIcon,
  PencilIcon,
  EyeIcon,
  UserCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { formatDate, getStatusText } from '@/lib/utils'
import toast from 'react-hot-toast'

interface User {
  id: string
  nombre: string
  apellido: string
  email: string
  matricula: string
  role: 'normal' | 'becario' | 'admin'
  is_active: boolean
  created_at: string
}

interface UserFormData {
  nombre: string
  apellido: string
  matricula: string
  role: 'normal' | 'becario' | 'admin'
  is_active: boolean
}

export default function UsuariosPage() {
  const { profile } = useAuth()
  const { users, loading, updateUser } = useUsers()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'normal' | 'becario' | 'admin'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'edit' | 'view'>('view')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  const [formData, setFormData] = useState<UserFormData>({
    nombre: '',
    apellido: '',
    matricula: '',
    role: 'normal',
    is_active: true
  })

  // Redirect if not admin
  if (profile?.role !== 'admin') {
    return (
      <Layout>
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
          <p className="text-gray-600 mt-2">No tienes permisos para acceder a esta página.</p>
        </div>
      </Layout>
    )
  }

  // Filter users based on search, role, and status
  const filteredUsers = (users || []).filter(user => {
    const matchesSearch = 
      user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.matricula.includes(searchTerm)
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const openModal = (mode: 'edit' | 'view', user: User) => {
    setModalMode(mode)
    setSelectedUser(user)
    setFormData({
      nombre: user.nombre,
      apellido: user.apellido,
      matricula: user.matricula,
      role: user.role,
      is_active: user.is_active
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedUser(null)
  }

  const handleSubmit = async () => {
    if (!selectedUser) return

    if (!formData.nombre || !formData.apellido || !formData.matricula) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    try {
      await updateUser(selectedUser.id, {
        nombre: formData.nombre,
        apellido: formData.apellido,
        matricula: formData.matricula,
        role: formData.role,
        is_active: formData.is_active
      })
      
      toast.success('Usuario actualizado exitosamente')
      closeModal()
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Error al actualizar el usuario')
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUser(userId, { is_active: !currentStatus })
      toast.success(`Usuario ${!currentStatus ? 'activado' : 'desactivado'} exitosamente`)
    } catch (error) {
      console.error('Error toggling user status:', error)
      toast.error('Error al cambiar el estado del usuario')
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600">Administra los usuarios del sistema</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre, email o matrícula..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los roles</option>
                <option value="normal">Usuario Normal</option>
                <option value="becario">Becario</option>
                <option value="admin">Administrador</option>
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No se encontraron usuarios</p>
              </CardContent>
            </Card>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id} className={!user.activo ? 'bg-gray-50 border-gray-200' : ''}>
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start space-x-4">
                      <UserCircleIcon className="h-12 w-12 text-gray-400 mt-1" />
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {user.nombre} {user.apellido}
                          </h3>
                          
                          <Badge 
                            variant={user.role === 'admin' ? 'destructive' : user.role === 'becario' ? 'warning' : 'secondary'}
                          >
                            {getStatusText(user.role)}
                          </Badge>
                          
                          <Badge variant={user.is_active ? 'success' : 'outline'}>
                            {user.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <p><strong>Email:</strong> {user.email}</p>
                          <p><strong>Matrícula:</strong> {user.matricula}</p>
                          <p><strong>Registrado:</strong> {formatDate(user.created_at)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openModal('view', user)}
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openModal('edit', user)}
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserStatus(user.id, user.activo)}
                        className={user.activo ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                      >
                        {user.activo ? (
                          <>
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Activar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* User Modal */}
        {showModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>
                  {modalMode === 'edit' ? 'Editar Usuario' : 'Detalles del Usuario'}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    disabled={modalMode === 'view'}
                    required
                  />
                </div>

                {/* Apellido */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido *
                  </label>
                  <Input
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    disabled={modalMode === 'view'}
                    required
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    value={selectedUser.email}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                {/* Número de Estudiante */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Estudiante *
                  </label>
                  <Input
                    value={formData.matricula}
                    onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                    disabled={modalMode === 'view'}
                    required
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="normal">Usuario Normal</option>
                    <option value="becario">Becario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    disabled={modalMode === 'view'}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Usuario activo
                  </label>
                </div>

                {/* Created Date (view only) */}
                {modalMode === 'view' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de registro
                    </label>
                    <Input
                      value={formatDate(selectedUser.created_at)}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={closeModal}
                    className="flex-1"
                  >
                    {modalMode === 'view' ? 'Cerrar' : 'Cancelar'}
                  </Button>
                  
                  {modalMode === 'edit' && (
                    <Button
                      onClick={handleSubmit}
                      className="flex-1"
                    >
                      Guardar Cambios
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}