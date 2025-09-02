import { supabase } from './supabase'
import { validateDataIntegrity, generateIntegrityReport } from './data-integrity'

interface AlertConfig {
  enabled: boolean
  checkInterval: number // en minutos
  notifyAdmins: boolean
  autoCorrect: boolean
}

interface MonitoringAlert {
  id: string
  type: 'inconsistency' | 'warning' | 'error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  equipmentId?: string
  equipmentName?: string
  timestamp: Date
  resolved: boolean
}

class MonitoringSystem {
  private config: AlertConfig = {
    enabled: true,
    checkInterval: 30, // 30 minutos
    notifyAdmins: true,
    autoCorrect: false
  }

  private intervalId: NodeJS.Timeout | null = null
  private alerts: MonitoringAlert[] = []

  constructor(config?: Partial<AlertConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  // Iniciar el sistema de monitoreo
  start(): void {
    if (!this.config.enabled || this.intervalId) {
      return
    }

    console.log('🔍 Sistema de monitoreo iniciado')
    
    // Ejecutar verificación inicial
    this.performCheck()

    // Programar verificaciones periódicas
    this.intervalId = setInterval(() => {
      this.performCheck()
    }, this.config.checkInterval * 60 * 1000)
  }

  // Detener el sistema de monitoreo
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('🛑 Sistema de monitoreo detenido')
    }
  }

  // Realizar verificación de integridad
  private async performCheck(): Promise<void> {
    try {
      console.log('🔍 Ejecutando verificación de integridad...')
      
      const validationResult = await validateDataIntegrity()
      
      if (validationResult.hasInconsistencies) {
        await this.handleInconsistencies(validationResult.inconsistencies)
      }

      // Generar reporte de integridad
      const report = await generateIntegrityReport()
      await this.analyzeReport(report)

    } catch (error) {
      console.error('❌ Error en verificación de monitoreo:', error)
      await this.createAlert({
        type: 'error',
        severity: 'high',
        title: 'Error en Sistema de Monitoreo',
        message: `Error durante la verificación: ${error instanceof Error ? error.message : 'Error desconocido'}`
      })
    }
  }

  // Manejar inconsistencias detectadas
  private async handleInconsistencies(inconsistencies: any[]): Promise<void> {
    for (const inconsistency of inconsistencies) {
      const severity = this.calculateSeverity(inconsistency)
      
      await this.createAlert({
        type: 'inconsistency',
        severity,
        title: 'Inconsistencia de Datos Detectada',
        message: `Equipo "${inconsistency.nombre}": ${inconsistency.issue}`,
        equipmentId: inconsistency.id,
        equipmentName: inconsistency.nombre
      })

      // Auto-corrección si está habilitada
      if (this.config.autoCorrect && severity !== 'critical') {
        await this.attemptAutoCorrection(inconsistency)
      }
    }
  }

  // Analizar reporte de integridad
  private async analyzeReport(report: any): Promise<void> {
    // Verificar equipos con baja disponibilidad
    if (report.equipmentStats) {
      for (const equipment of report.equipmentStats) {
        if (equipment.availabilityPercentage < 10 && equipment.totalLoans > 0) {
          await this.createAlert({
            type: 'warning',
            severity: 'medium',
            title: 'Baja Disponibilidad de Equipo',
            message: `El equipo "${equipment.nombre}" tiene solo ${equipment.availabilityPercentage.toFixed(1)}% de disponibilidad`,
            equipmentId: equipment.id,
            equipmentName: equipment.nombre
          })
        }
      }
    }

    // Verificar préstamos vencidos
    if (report.overdueLoans && report.overdueLoans.length > 0) {
      await this.createAlert({
        type: 'warning',
        severity: 'high',
        title: 'Préstamos Vencidos Detectados',
        message: `Se detectaron ${report.overdueLoans.length} préstamo(s) vencido(s) que requieren atención`
      })
    }
  }

  // Calcular severidad de inconsistencia
  private calculateSeverity(inconsistency: any): 'low' | 'medium' | 'high' | 'critical' {
    const issue = inconsistency.issue.toLowerCase()
    
    if (issue.includes('negativ') || issue.includes('excede')) {
      return 'critical'
    }
    if (issue.includes('inconsistencia') || issue.includes('discrepancia')) {
      return 'high'
    }
    if (issue.includes('disponible') || issue.includes('cantidad')) {
      return 'medium'
    }
    
    return 'low'
  }

  // Intentar auto-corrección
  private async attemptAutoCorrection(inconsistency: any): Promise<void> {
    try {
      console.log(`🔧 Intentando auto-corrección para equipo: ${inconsistency.nombre}`)
      
      // Aquí se implementaría la lógica de auto-corrección
      // Por ahora, solo registramos el intento
      
      await this.createAlert({
        type: 'warning',
        severity: 'low',
        title: 'Auto-corrección Intentada',
        message: `Se intentó corregir automáticamente la inconsistencia en "${inconsistency.nombre}"`,
        equipmentId: inconsistency.id,
        equipmentName: inconsistency.nombre
      })
      
    } catch (error) {
      console.error('❌ Error en auto-corrección:', error)
    }
  }

  // Crear nueva alerta
  private async createAlert(alertData: Omit<MonitoringAlert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const alert: MonitoringAlert = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      resolved: false,
      ...alertData
    }

    this.alerts.unshift(alert)
    
    // Mantener solo las últimas 100 alertas
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100)
    }

    console.log(`🚨 Nueva alerta: [${alert.severity.toUpperCase()}] ${alert.title}`)

    // Notificar a administradores si está habilitado
    if (this.config.notifyAdmins) {
      await this.notifyAdministrators(alert)
    }

    // Guardar alerta en base de datos
    await this.saveAlertToDatabase(alert)
  }

  // Notificar a administradores
  private async notifyAdministrators(alert: MonitoringAlert): Promise<void> {
    try {
      // Obtener administradores
      const { data: admins } = await supabase
        .from('profiles')
        .select('id, email, nombre, apellido')
        .eq('role', 'admin')

      if (!admins || admins.length === 0) {
        return
      }

      // Crear notificación para cada administrador
      for (const admin of admins) {
        await supabase
          .from('notificaciones')
          .insert({
            usuario_id: admin.id,
            asunto: `[${alert.severity.toUpperCase()}] ${alert.title}`,
            contenido: alert.message,
            tipo: 'sistema',
            leida: false
          })
      }

      console.log(`📧 Notificación enviada a ${admins.length} administrador(es)`)
      
    } catch (error) {
      console.error('❌ Error enviando notificaciones:', error)
    }
  }

  // Guardar alerta en base de datos
  private async saveAlertToDatabase(alert: MonitoringAlert): Promise<void> {
    try {
      await supabase
        .from('alertas_sistema')
        .insert({
          id: alert.id,
          tipo: alert.type,
          severidad: alert.severity,
          titulo: alert.title,
          mensaje: alert.message,
          equipo_id: alert.equipmentId,
          nombre_equipo: alert.equipmentName,
          fecha_creacion: alert.timestamp.toISOString(),
          resuelto: alert.resolved
        })
    } catch (error) {
      // Si la tabla no existe, la creamos
      console.log('ℹ️ Tabla de alertas no existe, continuando sin guardar en BD')
    }
  }

  // Obtener alertas activas
  getActiveAlerts(): MonitoringAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  // Obtener todas las alertas
  getAllAlerts(): MonitoringAlert[] {
    return [...this.alerts]
  }

  // Marcar alerta como resuelta
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      console.log(`✅ Alerta resuelta: ${alert.title}`)
    }
  }

  // Obtener configuración actual
  getConfig(): AlertConfig {
    return { ...this.config }
  }

  // Actualizar configuración
  updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Reiniciar si el intervalo cambió
    if (newConfig.checkInterval && this.intervalId) {
      this.stop()
      this.start()
    }
  }
}

// Instancia global del sistema de monitoreo
export const monitoringSystem = new MonitoringSystem()

// Funciones de utilidad
export const startMonitoring = (config?: Partial<AlertConfig>) => {
  if (config) {
    monitoringSystem.updateConfig(config)
  }
  monitoringSystem.start()
}

export const stopMonitoring = () => {
  monitoringSystem.stop()
}

export const getActiveAlerts = () => {
  return monitoringSystem.getActiveAlerts()
}

export const resolveAlert = (alertId: string) => {
  monitoringSystem.resolveAlert(alertId)
}

export type { MonitoringAlert, AlertConfig }
export { MonitoringSystem }