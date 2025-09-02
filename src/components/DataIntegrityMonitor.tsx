'use client';

import { useState, useEffect } from 'react';
import { 
  validateDataIntegrity, 
  correctDataInconsistencies, 
  generateIntegrityReport,
  type IntegrityCheckResult,
  type CorrectionResult
} from '@/lib/data-integrity';
import { AlertTriangle, CheckCircle, RefreshCw, Settings, AlertCircle } from 'lucide-react';

interface DataIntegrityMonitorProps {
  autoCheck?: boolean;
  showOnlyInconsistencies?: boolean;
}

export default function DataIntegrityMonitor({ 
  autoCheck = false, 
  showOnlyInconsistencies = false 
}: DataIntegrityMonitorProps) {
  const [integrityResults, setIntegrityResults] = useState<IntegrityCheckResult[]>([]);
  const [corrections, setCorrections] = useState<CorrectionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkIntegrity = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await validateDataIntegrity();
      setIntegrityResults(results);
      setLastCheck(new Date().toLocaleString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const correctInconsistencies = async () => {
    setCorrecting(true);
    setError(null);
    try {
      const correctionResults = await correctDataInconsistencies();
      setCorrections(correctionResults);
      // Volver a verificar después de las correcciones
      await checkIntegrity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCorrecting(false);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const report = await generateIntegrityReport();
      setIntegrityResults(report.inconsistencias);
      if (report.correcciones) {
        setCorrections(report.correcciones);
      }
      setLastCheck(new Date().toLocaleString());
      
      // Mostrar resumen en consola
      console.log('Reporte de Integridad:', {
        timestamp: report.timestamp,
        totalEquipos: report.totalEquipos,
        equiposConInconsistencias: report.equiposConInconsistencias,
        inconsistenciasCorregidas: report.correcciones?.length || 0
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoCheck) {
      checkIntegrity();
    }
  }, [autoCheck]);

  const inconsistencies = integrityResults.filter(result => result.inconsistencia);
  const displayResults = showOnlyInconsistencies ? inconsistencies : integrityResults;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Monitor de Integridad de Datos
          </h2>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={checkIntegrity}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Verificar
          </button>
          
          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            Reporte Completo
          </button>
          
          {inconsistencies.length > 0 && (
            <button
              onClick={correctInconsistencies}
              disabled={correcting}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              <AlertTriangle className={`h-4 w-4 ${correcting ? 'animate-pulse' : ''}`} />
              Corregir Inconsistencias
            </button>
          )}
        </div>
      </div>

      {/* Estado y estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{integrityResults.length}</div>
          <div className="text-sm text-blue-800">Total Equipos</div>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{inconsistencies.length}</div>
          <div className="text-sm text-red-800">Con Inconsistencias</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{corrections.length}</div>
          <div className="text-sm text-green-800">Correcciones Aplicadas</div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-600">Última Verificación</div>
          <div className="text-xs text-gray-500">{lastCheck || 'Nunca'}</div>
        </div>
      </div>

      {/* Errores */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 font-medium">Error:</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Correcciones aplicadas */}
      {corrections.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-medium text-green-800 mb-3">Correcciones Aplicadas</h3>
          <div className="space-y-2">
            {corrections.map((correction) => (
              <div key={correction.equipo_id} className="flex items-center justify-between text-sm">
                <span className="text-green-700">
                  <strong>{correction.nombre}</strong> - Cantidad corregida
                </span>
                <span className="text-green-600">
                  {correction.cantidad_anterior} → {correction.cantidad_nueva}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resultados de integridad */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Equipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Disponible
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prestada
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mensaje
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayResults.map((result) => (
              <tr key={result.equipo_id} className={result.inconsistencia ? 'bg-red-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {result.inconsistencia ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {result.nombre}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {result.cantidad_total}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {result.cantidad_disponible}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {result.cantidad_prestada_calculada}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={result.inconsistencia ? 'text-red-600' : 'text-green-600'}>
                    {result.mensaje}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {displayResults.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          {showOnlyInconsistencies 
            ? 'No se encontraron inconsistencias' 
            : 'No hay datos para mostrar. Haz clic en "Verificar" para comenzar.'}
        </div>
      )}
    </div>
  );
}