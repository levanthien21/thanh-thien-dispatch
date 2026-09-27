export const ROLES = ['AGENT', 'DISPATCHER', 'ADMIN'] as const;
export type UserRole = (typeof ROLES)[number];

export const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/setup'] as const;

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((publicPath) => path === publicPath || path.startsWith(`${publicPath}/`));
}

export function isProtectedPath(path: string): boolean {
  return !isPublicPath(path);
}

export const canManageFleet = (role?: string | null) => role === 'DISPATCHER' || role === 'ADMIN';
export const canManageSystem = (role?: string | null) => role === 'ADMIN';

export function canAccessPath(role: string, path: string, method = 'GET') {
  const systemPath = path === '/settings' || path.startsWith('/settings/') || path.startsWith('/api/settings/')
    || path.startsWith('/api/users') || path.startsWith('/api/audit-logs');
  if (systemPath) return canManageSystem(role);
  const fleetPage = path === '/drivers' || path.startsWith('/drivers/') || path === '/vehicles' || path.startsWith('/vehicles/');
  const fleetApi = path.startsWith('/api/drivers') || path.startsWith('/api/vehicles');
  if (fleetPage) return canManageFleet(role);
  if (fleetApi && method !== 'GET') return canManageFleet(role);
  return true;
}
