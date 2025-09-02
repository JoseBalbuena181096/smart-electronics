'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  CheckCircleIcon,
  BellIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { monitoringSystem, startMonitoring, stopMonitoring, getActiveAlerts, resolveAlert, type MonitoringAlert, type AlertConfig } from '@/lib/monitoring-system'
import { formatDate } from '@/lib/utils'

interface AlertsPanelProps {
  showOnlyActive?: boolean
  maxAlerts?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  showOnlyActive = true,
  maxAlerts = 10,
  autoRefresh = true,
  refreshInterval = 30000 // 30 segundos
}) => {
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([])
  const [isMonitoringActive, setIsMonitoringActive] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState<AlertConfig>({
    enabled: true,
    checkInterval: 30,
    notifyAdmins: true,
    autoCorrect: false
  })

  // Actualizar alertas
  const updateAlerts = () => {
    const currentAlerts = showOnlyActive ? getActiveAlerts() : monitoringSystem.getAllAlerts()
    setAlerts(currentAlerts.slice(0, maxAlerts))
  }

  // Efecto para auto-refresh
  useEffect(() => {
    updateAlerts()
    
    if (autoRefresh) {
      const interval = setInterval(updateAlerts, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [showOnlyActive, maxAlerts, autoRefresh, refreshInterval])

  // Inicializar configuración
  useEffect(() => {
    const currentConfig = monitoringSystem.getConfig()
    setConfig(currentConfig)
    setIsMonitoringActive(currentConfig.enabled)
  }, [])

  // Obtener icono según tipo de alerta
  const getAlertIcon = (type: string, severity: string) => {
    const iconClass = `h-5 w-5 ${getAlertColor(severity)}`
    
    switch (type) {
      case 'error':
        return <XCircleIcon className={iconClass} />
      case 'inconsistency':
        return <ExclamationTriangleIcon className={iconClass} />
      case 'warning':
        return <InformationCircleIcon className={iconClass} />
      default:
        return <BellIcon className={iconClass} />
    }
  }

  // Obtener color según severidad
  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600'
      case 'high':
        return 'text-red-500'
      case 'medium':
        return 'text-yellow-500'
      case 'low':
        return 'text-blue-500'
      default:
        return 'text-gray-500'
    }
  }

  // Obtener variante de badge según severidad
  const getBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'destructive'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'outline'
      default:
        return 'outline'
    }
  }

  // Manejar resolución de alerta
  const handleResolveAlert = (alertId: string) => {
    resolveAlert(alertId)
    updateAlerts()
  }

  // Iniciar/detener monitoreo
  const toggleMonitoring = () => {
    if (isMonitoringActive) {
      stopMonitoring()
      setIsMonitoringActive(false)
    } else {
      startMonitoring(config)
      setIsMonitoringActive(true)
    }
  }

  // Actualizar configuración
  const updateConfig = (newConfig: Partial<AlertConfig>) => {
    const updatedConfig = { ...config, ...newConfig }
    setConfig(updatedConfig)
    monitoringSystem.updateConfig(updatedConfig)
    
    if (updatedConfig.enabled !== isMonitoringActive) {
      setIsMonitoringActive(updatedConfig.enabled)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header con controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <BellIcon className="h-5 w-5" />
              <span>Sistema de Alertas</span>
              <Badge variant={isMonitoringActive ? 'default' : 'secondary'}>
                {isMonitoringActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfig(!showConfig)}
              >
                <Cog6ToothIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={isMonitoringActive ? 'destructive' : 'default'}
                size="sm"
                onClick={toggleMonitoring}
              >
                {isMonitoringActive ? 'Detener' : 'Iniciar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={updateAlerts}
              >
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Panel de configuración */}
        {showConfig && (
          <CardContent className="border-t">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Intervalo de verificación (minutos)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={config.checkInterval}
                  onChange={(e) => updateConfig({ checkInterval: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.notifyAdmins}
                    onChange={(e) => updateConfig({ notifyAdmins: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Notificar administradores</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.autoCorrect}
                    onChange={(e) => updateConfig({ autoCorrect: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Auto-corrección</span>
                </label>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Lista de alertas */}
      <Card>
        <CardHeader>
          <CardTitle>
            {showOnlyActive ? 'Alertas Activas' : 'Todas las Alertas'} ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircleIcon className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No hay alertas {showOnlyActive ? 'activas' : ''}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 border rounded-lg ${
                    alert.resolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getAlertIcon(alert.type, alert.severity)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-sm">{alert.title}</h4>
                          <Badge variant={getBadgeVariant(alert.severity) as any}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          {alert.resolved && (
                            <Badge variant="outline" className="text-green-600">
                              Resuelta
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                        {alert.equipmentName && (
                          <p className="text-xs text-gray-500">
                            Equipo: {alert.equipmentName}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          {formatDate(alert.timestamp.toISOString())}
                        </p>
                      </div>
                    </div>
                    {!alert.resolved && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolveAlert(alert.id)}
                        className="ml-2"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-4 gap-4">
        {['critical', 'high', 'medium', 'low'].map((severity) => {
          const count = alerts.filter(a => a.severity === severity && !a.resolved).length
          return (
            <Card key={severity}>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${getAlertColor(severity)}`}>
                  {count}
                </div>
                <div className="text-sm text-gray-600 capitalize">
                  {severity}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default AlertsPanel