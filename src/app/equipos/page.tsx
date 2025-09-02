'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useEquipment } from '@/hooks/useSupabase'
import Layout from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

import toast from 'react-hot-toast'

interface Equipment {
  id: string
  nombre: string
  descripcion?: string
  modelo: string
  marca: string
  serie: string
  ubicacion: string
  cantidad_total: number
  cantidad_disponible: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface FormData {
  nombre: string
  descripcion: string
  modelo: string
  marca: string
  numero_serie: string
  ubicacion: string
  cantidad_total: number
}

export default function EquiposPage() {
  const { profile } = useAuth()
  const { equipment, loading, createEquipment, updateEquipment, deleteEquipment } = useEquipment()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'disponible' | 'prestado'>('all')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    descripcion: '',
    modelo: '',
    marca: '',
    numero_serie: '',
    ubicacion: '',
    cantidad_total: 1
  })

  // Filter equipment based on search and status
  const filteredEquipment = (equipment || []).filter(equipo => {
    const matchesSearch = 
      equipo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (equipo.modelo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (equipo.marca?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      equipo.serie.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (equipo.ubicacion?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'disponible' && equipo.cantidad_disponible > 0) ||
      (statusFilter === 'prestado' && equipo.cantidad_disponible < equipo.cantidad_total)
    
    return matchesSearch && matchesStatus
  })

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      modelo: '',
      marca: '',
      numero_serie: '',
      ubicacion: '',
      cantidad_total: 1
    })
  }

  const openModal = (mode: 'create' | 'edit' | 'view', equipo?: Equipment) => {
    setModalMode(mode)
    setSelectedEquipment(equipo || null)
    
    if (equipo && (mode === 'edit' || mode === 'view')) {
      setFormData({
          nombre: equipo.nombre,
          descripcion: equipo.descripcion || '',
          modelo: equipo.modelo || '',
          marca: equipo.marca || '',
          numero_serie: equipo.serie,
          ubicacion: equipo.ubicacion || '',
          cantidad_total: equipo.cantidad_total
        })
    } else {
      resetForm()
    }
    
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedEquipment(null)
    resetForm()
  }

  const handleSubmit = async () => {
    if (!formData.nombre || !formData.modelo || !formData.marca || !formData.numero_serie || !formData.ubicacion) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    try {
      if (modalMode === 'create') {
        await createEquipment({
          nombre: formData.nombre,
          descripcion: formData.descripcion || undefined,
          modelo: formData.modelo,
          marca: formData.marca,
          serie: formData.numero_serie,
          ubicacion: formData.ubicacion,
          cantidad_total: formData.cantidad_total,
          cantidad_disponible: formData.cantidad_total
        })
      } else if (modalMode === 'edit' && selectedEquipment) {
          await updateEquipment(selectedEquipment.id, {
             nombre: formData.nombre,
             descripcion: formData.descripcion || undefined,
             modelo: formData.modelo,
             marca: formData.marca,
             serie: formData.numero_serie,
             ubicacion: formData.ubicacion,
             cantidad_total: formData.cantidad_total
           })
        toast.success('Equipo actualizado exitosamente')
      }
      
      closeModal()
    } catch (error) {
      console.error('Error saving equipment:', error)
      toast.error('Error al guardar el equipo')
    }
  }

  const handleDelete = async (equipoId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este equipo?')) {
      return
    }

    try {
      await deleteEquipment(equipoId)
      toast.success('Equipo eliminado exitosamente')
    } catch (error) {
      console.error('Error deleting equipment:', error)
      toast.error('Error al eliminar el equipo')
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

  const canEdit = profile?.role === 'admin' || profile?.role === 'becario'

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Equipos</h1>
            <p className="text-gray-600">Administra el inventario de equipos electrónicos</p>
          </div>
          
          {canEdit && (
            <Button onClick={() => openModal('create')}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Nuevo Equipo
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
                    placeholder="Buscar por nombre, modelo, marca, serie o ubicación..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="all">Todos los estados</option>
                <option value="disponible">Disponible</option>
                <option value="prestado">En préstamo</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipment.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No se encontraron equipos</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredEquipment.map((equipo) => (
              <Card key={equipo.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{equipo.nombre}</CardTitle>
                    <Badge variant={equipo.cantidad_disponible > 0 ? 'default' : 'secondary'}>
                          {equipo.cantidad_disponible > 0 ? 'Disponible' : 'En préstamo'}
                        </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Modelo:</strong> {equipo.modelo || '-'}</p>
                    <p><strong>Marca:</strong> {equipo.marca || '-'}</p>
                    <p><strong>Serie:</strong> {equipo.serie}</p>
                    <p><strong>Ubicación:</strong> {equipo.ubicacion || '-'}</p>
                    <p><strong>Disponible:</strong> {equipo.cantidad_disponible}/{equipo.cantidad_total}</p>
                  </div>
                  
                  {equipo.descripcion && (
                    <p className="text-sm text-gray-600">
                      <strong>Descripción:</strong> {equipo.descripcion}
                    </p>
                  )}
                  
                  <div className="flex space-x-2 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openModal('view', equipo)}
                      className="flex-1"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    
                    {canEdit && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openModal('edit', equipo)}
                          className="flex-1"
                        >
                          <PencilIcon className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(equipo.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Equipment Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>
                  {modalMode === 'create' && 'Nuevo Equipo'}
                  {modalMode === 'edit' && 'Editar Equipo'}
                  {modalMode === 'view' && 'Detalles del Equipo'}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  {/* Modelo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modelo *
                    </label>
                    <Input
                      value={formData.modelo}
                      onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                      disabled={modalMode === 'view'}
                      required
                    />
                  </div>

                  {/* Marca */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marca *
                    </label>
                    <Input
                      value={formData.marca}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                      disabled={modalMode === 'view'}
                      required
                    />
                  </div>

                  {/* Número de Serie */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de Serie *
                    </label>
                    <Input
                      value={formData.numero_serie}
                      onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                      disabled={modalMode === 'view'}
                      required
                    />
                  </div>

                  {/* Ubicación */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ubicación *
                    </label>
                    <Input
                      value={formData.ubicacion}
                      onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                      disabled={modalMode === 'view'}
                      required
                    />
                  </div>

                  {/* Cantidad Total */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cantidad Total *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.cantidad_total}
                      onChange={(e) => setFormData({ ...formData, cantidad_total: parseInt(e.target.value) || 1 })}
                      disabled={modalMode === 'view'}
                      required
                    />
                  </div>


                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 bg-white text-gray-900 placeholder-gray-500"
                    rows={3}
                    placeholder="Descripción del equipo..."
                  />
                </div>



                {/* Actions */}
                <div className="flex space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={closeModal}
                    className="flex-1"
                  >
                    {modalMode === 'view' ? 'Cerrar' : 'Cancelar'}
                  </Button>
                  
                  {modalMode !== 'view' && (
                    <Button
                      onClick={handleSubmit}
                      className="flex-1"
                    >
                      {modalMode === 'create' ? 'Crear Equipo' : 'Guardar Cambios'}
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