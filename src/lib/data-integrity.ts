import { supabase } from './supabase';

export interface IntegrityCheckResult {
  equipo_id: string;
  nombre: string;
  cantidad_total: number;
  cantidad_disponible: number;
  cantidad_prestada_calculada: number;
  inconsistencia: boolean;
  mensaje: string;
}

export interface CorrectionResult {
  equipo_id: string;
  nombre: string;
  cantidad_anterior: number;
  cantidad_nueva: number;
  corregido: boolean;
}

/**
 * Valida la integridad de los datos de equipos
 * Verifica que cantidad_disponible + cantidad_prestada = cantidad_total
 */
export async function validateDataIntegrity(): Promise<IntegrityCheckResult[]> {
  try {
    // Obtener todos los equipos con sus préstamos activos
    const { data: equipos, error: equiposError } = await supabase
      .from('equipos')
      .select('*');
    
    if (equiposError) throw equiposError;
    
    const results: IntegrityCheckResult[] = [];
    
    for (const equipo of equipos || []) {
      // Calcular cantidad prestada actual
      const { data: prestamos, error: prestamosError } = await supabase
        .from('prestamos')
        .select('cantidad_prestada, cantidad_devuelta')
        .eq('equipo_id', equipo.id)
        .in('estado', ['activo', 'vencido']);
      
      if (prestamosError) {
        console.error(`Error obteniendo préstamos para equipo ${equipo.id}:`, prestamosError);
        continue;
      }
      
      const cantidadPrestadaCalculada = prestamos?.reduce(
        (total, prestamo) => total + (prestamo.cantidad_prestada - prestamo.cantidad_devuelta),
        0
      ) || 0;
      
      const inconsistencia = equipo.cantidad_disponible + cantidadPrestadaCalculada !== equipo.cantidad_total;
      
      results.push({
        equipo_id: equipo.id,
        nombre: equipo.nombre,
        cantidad_total: equipo.cantidad_total,
        cantidad_disponible: equipo.cantidad_disponible,
        cantidad_prestada_calculada: cantidadPrestadaCalculada,
        inconsistencia,
        mensaje: inconsistencia 
          ? `Inconsistencia: Disponible (${equipo.cantidad_disponible}) + Prestada (${cantidadPrestadaCalculada}) ≠ Total (${equipo.cantidad_total})`
          : 'OK'
      });
    }
    
    return results.sort((a, b) => {
      if (a.inconsistencia && !b.inconsistencia) return -1;
      if (!a.inconsistencia && b.inconsistencia) return 1;
      return a.nombre.localeCompare(b.nombre);
    });
    
  } catch (error) {
    console.error('Error validando integridad de datos:', error);
    throw error;
  }
}

/**
 * Corrige automáticamente las inconsistencias encontradas
 */
export async function correctDataInconsistencies(): Promise<CorrectionResult[]> {
  try {
    const integrityResults = await validateDataIntegrity();
    const inconsistencies = integrityResults.filter(result => result.inconsistencia);
    
    if (inconsistencies.length === 0) {
      console.log('No se encontraron inconsistencias para corregir');
      return [];
    }
    
    const corrections: CorrectionResult[] = [];
    
    for (const inconsistency of inconsistencies) {
      const cantidadNueva = inconsistency.cantidad_total - inconsistency.cantidad_prestada_calculada;
      
      // Actualizar la cantidad disponible
      const { error: updateError } = await supabase
        .from('equipos')
        .update({ cantidad_disponible: cantidadNueva })
        .eq('id', inconsistency.equipo_id);
      
      if (updateError) {
        console.error(`Error corrigiendo equipo ${inconsistency.equipo_id}:`, updateError);
        continue;
      }
      
      // Registrar el movimiento de corrección
      const { error: movimientoError } = await supabase
        .from('movimientos_inventario')
        .insert({
          equipo_id: inconsistency.equipo_id,
          tipo_movimiento: 'correccion',
          cantidad: cantidadNueva - inconsistency.cantidad_disponible,
          cantidad_anterior: inconsistency.cantidad_disponible,
          cantidad_nueva: cantidadNueva,
          realizado_por: 'system',
          notas: 'Corrección automática de inconsistencia desde frontend'
        });
      
      if (movimientoError) {
        console.error(`Error registrando movimiento para equipo ${inconsistency.equipo_id}:`, movimientoError);
      }
      
      corrections.push({
        equipo_id: inconsistency.equipo_id,
        nombre: inconsistency.nombre,
        cantidad_anterior: inconsistency.cantidad_disponible,
        cantidad_nueva: cantidadNueva,
        corregido: true
      });
    }
    
    return corrections;
    
  } catch (error) {
    console.error('Error corrigiendo inconsistencias:', error);
    throw error;
  }
}

/**
 * Valida que una operación de préstamo sea válida antes de ejecutarla
 */
export async function validateLoanOperation(
  equipoId: string, 
  cantidadSolicitada: number
): Promise<{ isValid: boolean; message: string; cantidadDisponible?: number }> {
  try {
    console.log('Validating loan operation for equipoId:', equipoId, 'type:', typeof equipoId);
    
    const { data: equipo, error } = await supabase
      .from('equipos')
      .select('*')
      .eq('id', equipoId)
      .single();
    
    console.log('Supabase query result:', { equipo, error });
    
    if (error || !equipo) {
      console.log('Equipment not found or error occurred:', error);
      return {
        isValid: false,
        message: `Equipo no encontrado (ID: ${equipoId}). Error: ${error?.message || 'No error message'}`
      };
    }
    
    if (cantidadSolicitada <= 0) {
      return {
        isValid: false,
        message: 'La cantidad solicitada debe ser mayor a 0'
      };
    }
    
    if (cantidadSolicitada > equipo.cantidad_disponible) {
      return {
        isValid: false,
        message: `No hay suficiente cantidad disponible. Disponible: ${equipo.cantidad_disponible}, Solicitado: ${cantidadSolicitada}`,
        cantidadDisponible: equipo.cantidad_disponible
      };
    }
    
    return {
      isValid: true,
      message: 'Operación válida',
      cantidadDisponible: equipo.cantidad_disponible
    };
    
  } catch (error) {
    console.error('Error validando operación de préstamo:', error);
    return {
      isValid: false,
      message: 'Error interno al validar la operación'
    };
  }
}

/**
 * Valida que una operación de devolución sea válida antes de ejecutarla
 */
export async function validateReturnOperation(
  prestamoId: string,
  cantidadADevolver: number
): Promise<{ isValid: boolean; message: string; cantidadPendiente?: number }> {
  try {
    const { data: prestamo, error } = await supabase
      .from('prestamos')
      .select('*')
      .eq('id', prestamoId)
      .single();
    
    if (error || !prestamo) {
      return {
        isValid: false,
        message: 'Préstamo no encontrado'
      };
    }
    
    const cantidadPendiente = prestamo.cantidad_prestada - prestamo.cantidad_devuelta;
    
    if (cantidadADevolver <= 0) {
      return {
        isValid: false,
        message: 'La cantidad a devolver debe ser mayor a 0'
      };
    }
    
    if (cantidadADevolver > cantidadPendiente) {
      return {
        isValid: false,
        message: `No se puede devolver más de lo prestado. Pendiente: ${cantidadPendiente}, Intentando devolver: ${cantidadADevolver}`,
        cantidadPendiente
      };
    }
    
    return {
      isValid: true,
      message: 'Operación válida',
      cantidadPendiente
    };
    
  } catch (error) {
    console.error('Error validando operación de devolución:', error);
    return {
      isValid: false,
      message: 'Error interno al validar la operación'
    };
  }
}

/**
 * Ejecuta una verificación completa del sistema y retorna un reporte
 */
export async function generateIntegrityReport(): Promise<{
  timestamp: string;
  totalEquipos: number;
  equiposConInconsistencias: number;
  inconsistencias: IntegrityCheckResult[];
  correcciones?: CorrectionResult[];
}> {
  try {
    const integrityResults = await validateDataIntegrity();
    const inconsistencias = integrityResults.filter(result => result.inconsistencia);
    
    const report = {
      timestamp: new Date().toISOString(),
      totalEquipos: integrityResults.length,
      equiposConInconsistencias: inconsistencias.length,
      inconsistencias
    };
    
    // Si hay inconsistencias, ofrecer corregirlas
    if (inconsistencias.length > 0) {
      console.warn(`Se encontraron ${inconsistencias.length} inconsistencias en los datos`);
      const correcciones = await correctDataInconsistencies();
      return { ...report, correcciones };
    }
    
    return report;
    
  } catch (error) {
    console.error('Error generando reporte de integridad:', error);
    throw error;
  }
}