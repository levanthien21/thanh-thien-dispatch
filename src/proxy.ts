import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { canAccessPath, isPublicPath } from '@/lib/access';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = isPublicPath(path);
  const user = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (isPublic) {
    if (user && path === '/login') return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }
  if (user) {
    if (!canAccessPath(user.role, path, request.method)) {
      if (path.startsWith('/api/')) return NextResponse.json({ error: 'Không đủ quyền' }, { status: 403 });
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }
  if (path.startsWith('/api/')) return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', path);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
