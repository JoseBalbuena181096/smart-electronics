'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import Layout from '@/components/layout/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { MagnifyingGlassIcon, PlusIcon, ArrowPathIcon, MinusIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Loan {
  id: string
  user_id: string
  equipo_id: string
  cantidad_prestada: number
  cantidad_devuelta: number
  cantidad_pendiente: number
  status: 'activo' | 'devuelto' | 'vencido'
  fecha_prestamo: string
  fecha_devolucion?: string
  notas?: string
  prestado_por: string
  devuelto_por?: string
  created_at: string
  updated_at: string
  profiles?: {
    id: string
    nombre: string
    apellido: string
    matricula: string
    email: string
  }
  equipos?: {
    id: string
    nombre: string
    modelo: string
    serie: string
    cantidad_disponible: number
  }
}

interface User {
  id: string
  nombre: string
  apellido: string
  matricula: string | null
  email: string
}

interface Equipment {
  id: string
  nombre: string
  modelo: string
  serie: string
  cantidad_disponible: number
  is_active: boolean
}

export default function PrestamosPage() {
  const { profile } = useAuth()
  const [loans, setLoans] = useState<Loan[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)

  const [showNewLoanModal, setShowNewLoanModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [observations, setObservations] = useState('')
  
  // New states for user search and dynamic view
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserView, setShowUserView] = useState(false)
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('')
  const [showEquipmentSearch, setShowEquipmentSearch] = useState(false)
  const [equipmentQuantities, setEquipmentQuantities] = useState<Record<string, {add: number, return: number}>>({})

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchLoans()
    fetchUsers()
    fetchEquipment()
  }, [])

  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from('prestamos')
        .select(`
          *,
          profiles!user_id (id, nombre, apellido, matricula, email),
          equipos!equipo_id (id, nombre, modelo, serie, cantidad_disponible)
        `)
        .order('fecha_prestamo', { ascending: false })

      if (error) throw error
      setLoans(data || [])
    } catch (error) {
      console.error('Error fetching loans:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nombre')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .gt('cantidad_disponible', 0)
        .eq('is_active', true)
        .order('nombre')

      if (error) throw error
      setEquipment(data || [])
    } catch (error) {
      console.error('Error fetching equipment:', error)
    }
  }

  // Filter functions
  const filteredUsers = users.filter(user => {
    if (!userSearchTerm) return false
    const searchLower = userSearchTerm.toLowerCase()
    return (
      user.nombre.toLowerCase().includes(searchLower) ||
      user.apellido.toLowerCase().includes(searchLower) ||
      (user.matricula || '').toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    )
  })

  const userLoans = selectedUser ? loans.filter(loan => loan.user_id === selectedUser.id) : []
  
  // Agrupar préstamos por equipo para el usuario seleccionado
  const groupedUserLoans = userLoans.reduce((acc, loan) => {
    const equipoId = loan.equipo_id
    if (!acc[equipoId]) {
      acc[equipoId] = {
        equipo: loan.equipos,
        prestamos: [],
        totalPrestado: 0,
        totalDevuelto: 0,
        totalPendiente: 0
      }
    }
    acc[equipoId].prestamos.push(loan)
    acc[equipoId].totalPrestado += loan.cantidad_prestada
    acc[equipoId].totalDevuelto += loan.cantidad_devuelta || 0
    acc[equipoId].totalPendiente += loan.cantidad_pendiente || (loan.cantidad_prestada - (loan.cantidad_devuelta || 0))
    return acc
  }, {} as Record<string, {
    equipo: any,
    prestamos: any[],
    totalPrestado: number,
    totalDevuelto: number,
    totalPendiente: number
  }>)

  const filteredEquipment = !equipmentSearchTerm 
    ? equipment.slice(0, 5) 
    : equipment.filter(equip => {
        const searchLower = equipmentSearchTerm.toLowerCase()
        return (
          equip.nombre.toLowerCase().includes(searchLower) ||
          equip.modelo.toLowerCase().includes(searchLower) ||
          equip.serie.toLowerCase().includes(searchLower)
        )
      })

  const filteredLoans = loans

  // Handler functions
  const handleSelectUser = (user: User) => {
    setSelectedUser(user)
    setShowUserView(true)
    setUserSearchTerm('')
  }

  const handleCreateLoanFromUser = async (equipmentId: string) => {
    if (!selectedUser) return
    
    const returnDate = new Date()
    returnDate.setDate(returnDate.getDate() + 7)
    
    try {
      const { error } = await supabase
      .from('prestamos')
      .insert({
        user_id: selectedUser.id,
        equipo_id: equipmentId,
        cantidad_prestada: 1,
        notas: 'Préstamo creado desde vista de usuario',
        prestado_por: profile?.id
      })

      if (error) throw error
      
      await supabase
        .from('equipos')
        .update({ estado: 'prestado' })
        .eq('id', equipmentId)

      fetchLoans()
      fetchEquipment()
      setShowEquipmentSearch(false)
      setEquipmentSearchTerm('')
    } catch (error) {
      console.error('Error creating loan:', error)
    }
  }

  const handleReturnLoan = async (loanId: string) => {
    await returnLoan(loanId)
  }

  const handleAddMoreEquipment = async (equipoId: string, cantidad: number) => {
    if (!selectedUser) return
    
    try {
      const { error } = await supabase
        .from('prestamos')
        .insert({
          user_id: selectedUser.id,
          equipo_id: equipoId,
          cantidad_prestada: cantidad,
          notas: 'Préstamo adicional',
          prestado_por: profile?.id
        })

      if (error) throw error
      
      await supabase
        .from('equipos')
        .update({ cantidad_disponible: equipment.find(e => e.id === equipoId)?.cantidad_disponible - cantidad })
        .eq('id', equipoId)

      fetchLoans()
      fetchEquipment()
    } catch (error) {
      console.error('Error adding more equipment:', error)
    }
  }

  const handlePartialReturn = async (equipoId: string, cantidadDevolver: number) => {
    if (!selectedUser) return
    
    try {
      // Buscar préstamos activos del equipo para este usuario
      const prestamosActivos = userLoans.filter(loan => 
        loan.equipo_id === equipoId && 
        loan.status === 'activo' && 
        (loan.cantidad_pendiente || (loan.cantidad_prestada - (loan.cantidad_devuelta || 0))) > 0
      )
      
      let cantidadRestante = cantidadDevolver
      
      for (const prestamo of prestamosActivos) {
        if (cantidadRestante <= 0) break
        
        const pendiente = prestamo.cantidad_pendiente || (prestamo.cantidad_prestada - (prestamo.cantidad_devuelta || 0))
        const aDevolver = Math.min(cantidadRestante, pendiente)
        
        const { error } = await supabase
          .from('prestamos')
          .update({
            cantidad_devuelta: (prestamo.cantidad_devuelta || 0) + aDevolver,
            devuelto_por: profile?.id
          })
          .eq('id', prestamo.id)
        
        if (error) throw error
        
        cantidadRestante -= aDevolver
      }
      
      await supabase
        .from('equipos')
        .update({ cantidad_disponible: equipment.find(e => e.id === equipoId)?.cantidad_disponible + cantidadDevolver })
        .eq('id', equipoId)

      fetchLoans()
      fetchEquipment()
    } catch (error) {
      console.error('Error returning equipment:', error)
    }
  }

  const returnLoan = async (loanId: string) => {
    try {
      const loan = loans.find(l => l.id === loanId)
      if (!loan) return

      const { error } = await supabase
        .from('prestamos')
        .update({
          fecha_devolucion_real: new Date().toISOString(),
          status: 'devuelto'
        })
        .eq('id', loanId)

      if (error) throw error

      await supabase
        .from('equipos')
        .update({ estado: 'disponible' })
        .eq('id', loan.equipo_id)

      fetchLoans()
      fetchEquipment()
    } catch (error) {
      console.error('Error returning loan:', error)
    }
  }

  const handleCreateLoan = async () => {
    try {
      const { error } = await supabase
      .from('prestamos')
      .insert({
        user_id: selectedUserId,
        equipo_id: selectedEquipmentId,
        cantidad_prestada: 1,
        notas: observations,
        prestado_por: profile?.id
      })

      if (error) throw error

      await supabase
        .from('equipos')
        .update({ estado: 'prestado' })
        .eq('id', selectedEquipmentId)

      fetchLoans()
      fetchEquipment()
      setShowNewLoanModal(false)
      setSelectedUserId('')
      setSelectedEquipmentId('')
      setExpectedReturnDate('')
      setObservations('')
    } catch (error) {
      console.error('Error creating loan:', error)
    }
  }

  const isOverdue = (expectedDate: string) => {
    return new Date(expectedDate) < new Date()
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Cargando préstamos...</div>
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
            <p className="text-gray-600">
              {showUserView && selectedUser 
                ? `Vista de usuario: ${selectedUser.nombre} ${selectedUser.apellido}`
                : 'Administra los préstamos de equipos'
              }
            </p>
          </div>
          
          {(profile?.role === 'admin' || profile?.role === 'becario') && (
            <div className="flex gap-2">
              <Button onClick={() => setShowNewLoanModal(true)} variant="outline">
                <PlusIcon className="h-4 w-4 mr-2" />
                Nuevo Préstamo
              </Button>
              {showUserView && (
                <Button onClick={() => { setShowUserView(false); setSelectedUser(null) }} variant="outline">
                  Ver Todos
                </Button>
              )}
            </div>
          )}
        </div>

        {/* User Search */}
        {!showUserView && (
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar usuario por nombre, matrícula o correo..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-10"
                />
                
                {/* User Search Results */}
                {userSearchTerm && filteredUsers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto mt-1">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center space-x-3">
                          <UserIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.nombre} {user.apellido}
                            </p>
                            <p className="text-sm text-gray-500">
                              {user.matricula} • {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}



        {/* User Dynamic View */}
        {showUserView && selectedUser && (
          <div className="space-y-6">
            {/* User Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Información del Usuario</span>
                  <Button
                    onClick={() => setShowEquipmentSearch(!showEquipmentSearch)}
                    variant="outline"
                    size="sm"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Agregar Equipo
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-medium">{selectedUser.nombre} {selectedUser.apellido}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Número de Estudiante</p>
                    <p className="font-medium">{selectedUser.matricula}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Préstamos Activos</p>
                    <p className="font-medium">{userLoans.filter(l => l.status === 'activo').length}</p>
                  </div>
                </div>
                
                {/* Equipment Search for New Loans */}
                {showEquipmentSearch && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="relative">
                      <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Buscar equipo por nombre, modelo o serie..."
                        value={equipmentSearchTerm}
                        onChange={(e) => setEquipmentSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                      
                      {/* Equipment Search Results */}
                      {equipmentSearchTerm && filteredEquipment.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto mt-1">
                          {filteredEquipment.map((equip) => (
                            <div
                              key={equip.id}
                              onClick={() => handleCreateLoanFromUser(equip.id)}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 text-sm font-medium">{equip.nombre.charAt(0)}</span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{equip.nombre}</p>
                                    <p className="text-sm text-gray-500">{equip.modelo} • {equip.serie}</p>
                                    <p className="text-xs text-green-600">Disponible: {equip.cantidad_disponible}</p>
                                  </div>
                                </div>
                                <div className="text-blue-600 hover:text-blue-800">
                                  <PlusIcon className="h-5 w-5" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {equipmentSearchTerm && filteredEquipment.length === 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 mt-1 p-3">
                          <p className="text-gray-500 text-center">No se encontraron equipos</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* User's Loans */}
            <Card>
              <CardHeader>
                <CardTitle>Préstamos del Usuario</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(groupedUserLoans).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No tiene préstamos registrados</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedUserLoans).map(([equipoId, grupo]) => {
                      const quantities = equipmentQuantities[equipoId] || { add: 1, return: 1 }
                      const hasActiveLoan = grupo.totalPendiente > 0
                      
                      const updateQuantity = (type: 'add' | 'return', value: number) => {
                        setEquipmentQuantities(prev => ({
                          ...prev,
                          [equipoId]: {
                            ...prev[equipoId],
                            [type]: value
                          }
                        }))
                      }
                      
                      return (
                        <div key={equipoId} className="p-4 border rounded-lg border-gray-200 bg-white">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-lg">{grupo.equipo?.nombre}</h4>
                              <p className="text-sm text-gray-500">{grupo.equipo?.modelo} - {grupo.equipo?.serie}</p>
                              <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">Total Prestado:</p>
                                  <p className="font-medium text-blue-600">{grupo.totalPrestado}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Devuelto:</p>
                                  <p className="font-medium text-green-600">{grupo.totalDevuelto}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Pendiente:</p>
                                  <p className="font-medium text-orange-600">{grupo.totalPendiente}</p>
                                </div>
                              </div>
                            </div>
                            <Badge variant={hasActiveLoan ? 'default' : 'secondary'}>
                              {hasActiveLoan ? 'Activo' : 'Devuelto'}
                            </Badge>
                          </div>
                          
                          {/* Controles de gestión */}
                          {(profile?.role === 'admin' || profile?.role === 'becario') && (
                            <div className="border-t pt-3 mt-3">
                              <div className="flex flex-wrap gap-3">
                                {/* Agregar más equipos */}
                                <div className="flex items-center space-x-2">
                                  <Input
                                     type="number"
                                     min="1"
                                     max={grupo.equipo?.cantidad_disponible || 0}
                                     value={quantities.add}
                                     onChange={(e) => updateQuantity('add', parseInt(e.target.value) || 1)}
                                     className="w-16 h-8"
                                   />
                                   <Button
                                     onClick={() => handleAddMoreEquipment(equipoId, quantities.add)}
                                     variant="outline"
                                     size="sm"
                                     className="text-blue-600 hover:text-blue-700"
                                     disabled={!grupo.equipo?.cantidad_disponible || grupo.equipo.cantidad_disponible < quantities.add}
                                   >
                                    <PlusIcon className="h-4 w-4 mr-1" />
                                    Prestar Más
                                  </Button>
                                </div>
                                
                                {/* Devolver parcialmente */}
                                {hasActiveLoan && (
                                  <div className="flex items-center space-x-2">
                                    <Input
                                       type="number"
                                       min="1"
                                       max={grupo.totalPendiente}
                                       value={quantities.return}
                                       onChange={(e) => updateQuantity('return', parseInt(e.target.value) || 1)}
                                       className="w-16 h-8"
                                     />
                                     <Button
                                       onClick={() => handlePartialReturn(equipoId, quantities.return)}
                                       variant="outline"
                                       size="sm"
                                       className="text-green-600 hover:text-green-700"
                                       disabled={quantities.return > grupo.totalPendiente}
                                     >
                                      <MinusIcon className="h-4 w-4 mr-1" />
                                      Devolver
                                    </Button>
                                  </div>
                                )}
                                
                                {/* Devolver todo */}
                                {hasActiveLoan && (
                                  <Button
                                    onClick={() => handlePartialReturn(equipoId, grupo.totalPendiente)}
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <ArrowPathIcon className="h-4 w-4 mr-1" />
                                    Devolver Todo
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Detalles de préstamos individuales */}
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                              Ver detalles de préstamos ({grupo.prestamos.length})
                            </summary>
                            <div className="mt-2 space-y-2">
                              {grupo.prestamos.map((loan) => (
                                <div key={loan.id} className="text-xs bg-gray-50 p-2 rounded">
                                  <p>Prestado: {new Date(loan.fecha_prestamo).toLocaleDateString()} - Cantidad: {loan.cantidad_prestada}</p>
                                  {loan.cantidad_devuelta > 0 && (
                                    <p>Devuelto: {loan.cantidad_devuelta} el {loan.fecha_devolucion ? new Date(loan.fecha_devolucion).toLocaleDateString() : 'N/A'}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loans List */}
        {!showUserView && (
          <div className="space-y-4">
            {filteredLoans.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No se encontraron préstamos</p>
                </CardContent>
              </Card>
            ) : (
              filteredLoans.map((loan) => {
                const overdue = false // Removed overdue logic as fecha_devolucion_esperada doesn't exist
                
                return (
                  <Card key={loan.id} className={overdue ? 'border-red-200 bg-red-50' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{loan.equipos?.nombre}</h3>
                              <p className="text-gray-600">
                                {loan.equipos?.modelo} - S/N: {loan.equipos?.serie}
                              </p>
                            </div>
                            <Badge variant={loan.status === 'activo' ? (overdue ? 'destructive' : 'default') : 'secondary'}>
                              {loan.status === 'activo' ? (overdue ? 'Vencido' : 'Activo') : 'Devuelto'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Usuario:</p>
                              <p className="font-medium">
                                {loan.profiles?.nombre} {loan.profiles?.apellido}
                              </p>
                              <p className="text-gray-500">{loan.profiles?.matricula}</p>
                            </div>
                            
                            <div>
                              <p className="text-gray-500">Fechas:</p>
                              <p>Prestado: {new Date(loan.fecha_prestamo).toLocaleDateString()}</p>
                             <p>Cantidad prestada: {loan.cantidad_prestada}</p>
                              {loan.fecha_devolucion && (
                                 <p>Devuelto: {new Date(loan.fecha_devolucion).toLocaleDateString()}</p>
                               )}
                            </div>
                          </div>
                          
                          {loan.notas && (
                               <div>
                                 <p className="text-gray-500 text-sm">Notas:</p>
                                 <p className="text-sm">{loan.notas}</p>
                               </div>
                             )}
                        </div>
                        
                        {loan.status === 'activo' && (profile?.role === 'admin' || profile?.role === 'becario') && (
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
        )}

        {/* New Loan Modal */}
        {showNewLoanModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Nuevo Préstamo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* User Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usuario
                  </label>
                  {profile?.role === 'normal' ? (
                    <p className="text-sm text-gray-600">
                      {profile.nombre} {profile.apellido}
                    </p>
                  ) : (
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Seleccionar usuario</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.nombre} {user.apellido} - {user.numero_estudiante}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Equipment Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Equipo
                  </label>
                  <select
                    value={selectedEquipmentId}
                    onChange={(e) => setSelectedEquipmentId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar equipo</option>
                    {equipment.map((equip) => (
                      <option key={equip.id} value={equip.id}>
                        {equip.nombre} - {equip.modelo} ({equip.serie})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expected Return Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de devolución esperada
                  </label>
                  <Input
                    type="date"
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                    required
                  />
                </div>

                {/* Observations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Observaciones adicionales..."
                  />
                </div>

                {/* Modal Actions */}
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