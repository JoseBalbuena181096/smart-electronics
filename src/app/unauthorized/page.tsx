'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ShieldExclamationIcon } from '@heroicons/react/24/outline'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <ShieldExclamationIcon className="mx-auto h-24 w-24 text-red-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Acceso No Autorizado
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            No tienes permisos para acceder a esta página o tu cuenta está inactiva.
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Si crees que esto es un error, contacta al administrador del sistema.
          </p>
          
          <div className="flex flex-col space-y-2">
            <Link href="/dashboard">
              <Button className="w-full">
                Ir al Dashboard
              </Button>
            </Link>
            
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Cerrar Sesión
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}