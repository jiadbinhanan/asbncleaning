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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

  // This will refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protected routes (exclude login pages)
  const adminRoutes = pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')
  const supervisorRoutes = pathname.startsWith('/supervisor') && !pathname.startsWith('/supervisor/login')
  const agentRoutes = pathname.startsWith('/agent') && !pathname.startsWith('/agent/login')

  if (adminRoutes || supervisorRoutes || agentRoutes) {
    if (!user) {
      // Redirect to appropriate login page
      let loginPath = '/login'
      if (adminRoutes) loginPath = '/admin/login'
      else if (supervisorRoutes) loginPath = '/supervisor/login'
      else if (agentRoutes) loginPath = '/agent/login'

      const url = request.nextUrl.clone()
      url.pathname = loginPath
      return NextResponse.redirect(url)
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // No profile found, redirect to login
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    const userRole = profile.role

    // Check role permissions
    if (adminRoutes && userRole !== 'admin') {
      // Not admin, redirect to their login
      const url = request.nextUrl.clone()
      if (userRole === 'supervisor') url.pathname = '/supervisor/login'
      else if (userRole === 'agent') url.pathname = '/agent/login'
      else url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (supervisorRoutes && userRole !== 'supervisor') {
      const url = request.nextUrl.clone()
      if (userRole === 'admin') url.pathname = '/admin/login'
      else if (userRole === 'agent') url.pathname = '/agent/login'
      else url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (agentRoutes && userRole !== 'agent') {
      const url = request.nextUrl.clone()
      if (userRole === 'admin') url.pathname = '/admin/login'
      else if (userRole === 'supervisor') url.pathname = '/supervisor/login'
      else url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Allow access
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}