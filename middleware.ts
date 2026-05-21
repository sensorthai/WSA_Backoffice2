import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const userRole = (req.auth?.user as any)?.role
  const isActive = (req.auth?.user as any)?.is_active

  const isAuthRoute = nextUrl.pathname.startsWith('/login') || 
                      nextUrl.pathname.startsWith('/pending-approval')

  const isDashboardRoute = nextUrl.pathname.startsWith('/dashboard') || 
                           nextUrl.pathname.startsWith('/admin') || 
                           nextUrl.pathname.startsWith('/leaves') ||
                           nextUrl.pathname.startsWith('/purchases') ||
                           nextUrl.pathname.startsWith('/cars') ||
                           nextUrl.pathname.startsWith('/checkin') ||
                           nextUrl.pathname.startsWith('/teaching') ||
                           nextUrl.pathname.startsWith('/ceo')

  const isAdminRoute = nextUrl.pathname.startsWith('/admin')
  const isCeoRoute = nextUrl.pathname.startsWith('/ceo')

  // 1. Redirect to login if accessing dashboard while logged out
  if (isDashboardRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // 2. Redirect inactive users to pending-approval (except for auth routes)
  if (isLoggedIn && !isActive && !isAuthRoute) {
    return NextResponse.redirect(new URL('/pending-approval', nextUrl))
  }

  // 3. Prevent approved users from seeing pending-approval
  if (isLoggedIn && isActive && nextUrl.pathname === '/pending-approval') {
    const dest = userRole === 'outsource' ? '/teaching' : '/dashboard'
    return NextResponse.redirect(new URL(dest, nextUrl))
  }

  // 4. Role checks
  if (isAdminRoute && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  if (isCeoRoute && userRole !== 'ceo') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  // 5. Outsource users: restrict to teaching only
  if (userRole === 'outsource') {
    // Block dashboard — redirect to teaching
    if (nextUrl.pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/teaching', nextUrl))
    }
    const allowedPaths = ['/teaching']
    const isAllowed = allowedPaths.some(p => nextUrl.pathname.startsWith(p))
    if (isDashboardRoute && !isAllowed) {
      return NextResponse.redirect(new URL('/teaching', nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
