'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { startMonitoring } from '@/lib/monitoring-system'

const MonitoringInitializer: React.FC = () => {
  const { profile } = useAuth()

  useEffect(() => {
    // Solo inicializar el monitoreo si el usuario es administrador
    if (profile?.role === 'admin') {
      console.log('🔍 Inicializando sistema de monitoreo para administrador')
      
      // Configuración del sistema de monitoreo
      const monitoringConfig = {
        enabled: true,
        checkInterval: 30, // 30 minutos
        notifyAdmins: true,
        autoCorrect: false // Deshabilitado por seguridad
      }

      // Iniciar el sistema de monitoreo
      startMonitoring(monitoringConfig)

      // Cleanup al desmontar el componente
      return () => {
        console.log('🛑 Limpiando sistema de monitoreo')
        // El sistema se mantiene activo pero se limpia la referencia
      }
    }
  }, [profile?.role])

  // Este componente no renderiza nada visible
  return null
}

export default MonitoringInitializer