import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware ÚNICO e consolidado para evitar duplicidades e comportamentos cruzados
export function middleware(request: NextRequest) {
  const ENV = process.env.NODE_ENV
  const { pathname } = request.nextUrl

  // Logs leves para diagnóstico quando não for produção
  if (ENV !== 'production') {
    console.log('[Middleware] Path:', pathname)
  }

  // Nunca aplicar middleware em rotas do admin (o layout do admin gerencia)
  if (pathname.startsWith('/admin')) {
    if (ENV !== 'production') console.log('[Middleware] Ignorando rota admin')
    return NextResponse.next()
  }

  // Em desenvolvimento, deixar o app fluir e os componentes gerenciarem
  if (ENV === 'development') {
    return NextResponse.next()
  }

  // Galeria de assinantes é gerenciada pelo próprio componente
  if (pathname.startsWith('/galeria-assinantes')) {
    return NextResponse.next()
  }

  // Proteção básica para rotas de perfil: requer apenas autenticação
  if (pathname.startsWith('/perfil')) {
    const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true'
    if (!isAuthenticated) {
      const redirectResponse = NextResponse.redirect(new URL('/auth/face', request.url))
      // Limpa cookies potencialmente inválidos
      redirectResponse.cookies.set('isAuthenticated', '', { expires: new Date(0), path: '/' })
      redirectResponse.cookies.set('hasSubscription', '', { expires: new Date(0), path: '/' })
      return redirectResponse
    }
    // Opcional: headers anti-cache quando logado
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  }

  // Proteção para dashboard: requer autenticação e assinatura
  if (pathname.startsWith('/dashboard')) {
    const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true'
    const hasSubscription = request.cookies.get('hasSubscription')?.value === 'true'

    if (!isAuthenticated) {
      const redirectResponse = NextResponse.redirect(new URL('/auth/face', request.url))
      redirectResponse.cookies.set('isAuthenticated', '', { expires: new Date(0), path: '/' })
      redirectResponse.cookies.set('hasSubscription', '', { expires: new Date(0), path: '/' })
      return redirectResponse
    }
    if (!hasSubscription) {
      const redirectResponse = NextResponse.redirect(new URL('/assinante', request.url))
      redirectResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private')
      redirectResponse.headers.set('Pragma', 'no-cache')
      redirectResponse.headers.set('Expires', '0')
      return redirectResponse
    }
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    return response
  }

  // Demais rotas: seguir normalmente
  return NextResponse.next()
}

// Apenas um matcher para este middleware consolidado
export const config = {
  matcher: [
    '/galeria-assinantes/:path*',
    '/perfil/:path*',
    '/dashboard/:path*'
  ],
}
