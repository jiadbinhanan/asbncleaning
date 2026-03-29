import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  const { pathname } = request.nextUrl

  // ── Which panel is being accessed? ───────────────────────────
  const isAdminRoute      = pathname.startsWith('/admin')      && !pathname.startsWith('/admin/login')
  const isSupervisorRoute = pathname.startsWith('/supervisor') && !pathname.startsWith('/supervisor/login')
  const isAgentRoute      = pathname.startsWith('/agent')      && !pathname.startsWith('/agent/login')
  const isDriverRoute     = pathname.startsWith('/driver')

  const isProtectedRoute = isAdminRoute || isSupervisorRoute || isAgentRoute || isDriverRoute

  if (!isProtectedRoute) return supabaseResponse

  // ── Helper: get the correct login page for the current path ──
  const getLoginForCurrentPath = (): string => {
    if (isAdminRoute)      return '/admin/login'
    if (isSupervisorRoute) return '/supervisor/login'
    if (isAgentRoute)      return '/agent/login'
    if (isDriverRoute)     return '/agent/login' // drivers share agent login
    return '/agent/login'
  }

  // ── Helper: get the correct login page for a given role ──────
  const getLoginForRole = (role: string | null): string => {
    if (role === 'admin')      return '/admin/login'
    if (role === 'supervisor') return '/supervisor/login'
    if (role === 'agent')      return '/agent/login'
    if (role === 'driver')     return '/agent/login'
    return getLoginForCurrentPath() // unknown role → back to current panel login
  }

  const redirect = (path: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    return NextResponse.redirect(url)
  }

  // ── No session → redirect to current panel's login ───────────
  if (!user) return redirect(getLoginForCurrentPath())

  // ── Session exists → check role ──────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // No profile found → redirect to current panel's login
  if (!profile) return redirect(getLoginForCurrentPath())

  const role = profile.role

  // ── Role vs route mismatch → redirect to their own panel login
  if (isAdminRoute      && role !== 'admin')      return redirect(getLoginForRole(role))
  if (isSupervisorRoute && role !== 'supervisor') return redirect(getLoginForRole(role))
  if (isAgentRoute      && role !== 'agent')      return redirect(getLoginForRole(role))
  if (isDriverRoute     && role !== 'driver')     return redirect(getLoginForRole(role))

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}