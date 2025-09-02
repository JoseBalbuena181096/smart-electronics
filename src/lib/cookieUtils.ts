// Utilidades para manejo de cookies de Supabase

/**
 * Limpia todas las cookies relacionadas con Supabase
 */
export function clearSupabaseCookies() {
  if (typeof document === 'undefined') return
  
  // Lista de cookies de Supabase que pueden causar problemas
  const supabaseCookieNames = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
    'supabase.auth.token'
  ]
  
  // Obtener todas las cookies
  const cookies = document.cookie.split(';')
  
  cookies.forEach(cookie => {
    const [name] = cookie.trim().split('=')
    
    // Limpiar cookies de Supabase específicas
    if (supabaseCookieNames.some(sbName => name.includes(sbName))) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    }
    
    // Limpiar cookies que empiecen con 'sb-'
    if (name.startsWith('sb-')) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    }
  })
}

/**
 * Verifica si hay cookies corruptas de Supabase
 */
export function hasCorruptedSupabaseCookies(): boolean {
  if (typeof document === 'undefined') return false
  
  try {
    const cookies = document.cookie.split(';')
    
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      
      // Verificar cookies de Supabase
      if (name && (name.startsWith('sb-') || name.includes('supabase'))) {
        if (value && value.startsWith('base64-')) {
          try {
            // Intentar parsear el valor como JSON
            const decoded = atob(value.replace('base64-', ''))
            JSON.parse(decoded)
          } catch (error) {
            console.warn(`Cookie corrupta detectada: ${name}`, error)
            return true
          }
        }
      }
    }
    
    return false
  } catch (error) {
    console.error('Error verificando cookies:', error)
    return true
  }
}

/**
 * Limpia cookies corruptas automáticamente
 */
export function cleanupCorruptedCookies() {
  if (hasCorruptedSupabaseCookies()) {
    console.log('Cookies corruptas detectadas, limpiando...')
    clearSupabaseCookies()
    
    // Recargar la página después de limpiar las cookies
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }
}