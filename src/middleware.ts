import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Verificar autenticación
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rutas protegidas
  const protectedRoutes = ['/dashboard', '/equipos', '/prestamos', '/usuarios', '/perfil']
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // Rutas de autenticación
  const authRoutes = ['/login', '/register']
  const isAuthRoute = authRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // Si no está autenticado y trata de acceder a ruta protegida
  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si está autenticado y trata de acceder a rutas de auth
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Verificar roles para rutas específicas
  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    // Verificar si el usuario está activo
    if (!profile?.is_active) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    // Rutas solo para administradores
    const adminRoutes = ['/usuarios']
    const isAdminRoute = adminRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )

    if (isAdminRoute && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    // Rutas para becarios y administradores
    const becarioRoutes = ['/equipos/crear', '/equipos/editar']
    const isBecarioRoute = becarioRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )

    if (isBecarioRoute && !['becario', 'admin'].includes(profile?.role || '')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}