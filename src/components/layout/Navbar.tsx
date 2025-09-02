'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  CubeIcon,
  DocumentTextIcon,
  UsersIcon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { cn, getStatusText } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    roles: ['normal', 'becario', 'admin']
  },
  {
    name: 'Equipos',
    href: '/equipos',
    icon: CubeIcon,
    roles: ['normal', 'becario', 'admin']
  },
  {
    name: 'Préstamos',
    href: '/prestamos',
    icon: DocumentTextIcon,
    roles: ['normal', 'becario', 'admin']
  },
  {
    name: 'Usuarios',
    href: '/usuarios',
    icon: UsersIcon,
    roles: ['admin']
  },
  {
    name: 'Notificaciones',
    href: '/notificaciones',
    icon: BellIcon,
    roles: ['normal', 'becario', 'admin']
  }
]

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const filteredNavigation = navigation.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  )

  if (!user || !profile) {
    return null
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/dashboard" className="text-xl font-bold text-blue-600">
                Smart Electronics
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {filteredNavigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent transition-colors"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            <div className="flex items-center space-x-2">
              <UserCircleIcon className="h-5 w-5 text-gray-400" />
              <div className="text-sm">
                <div className="font-medium text-gray-900">
                  {profile.nombre} {profile.apellido}
                </div>
                <div className="text-gray-500">
                  {getStatusText(profile.role)}
                </div>
              </div>
            </div>
            
            <Link href="/perfil">
              <Button variant="ghost" size="sm">
                Perfil
              </Button>
            </Link>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-red-600 hover:text-red-700"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-1" />
              Salir
            </Button>
          </div>
          
          <div className="-mr-2 flex items-center sm:hidden">
            <Button
              variant="ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={cn(
        "sm:hidden",
        mobileMenuOpen ? "block" : "hidden"
      )}>
        <div className="space-y-1 pb-3 pt-2">
          {filteredNavigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            )
          })}
          
          <div className="border-t border-gray-200 pt-4 pb-3">
            <div className="flex items-center px-4">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">
                  {profile.nombre} {profile.apellido}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {getStatusText(profile.role)}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Link
                href="/perfil"
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Perfil
              </Link>
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-2 text-base font-medium text-red-600 hover:text-red-700 hover:bg-gray-50"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}