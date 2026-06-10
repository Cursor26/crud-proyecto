/**
 * Rutas API que no exigen JWT (RNF-SEG-03: resto protegido por middleware global).
 */

const PUBLIC_EXACT = new Set([
  '/login',
  '/auth/mail-estado',
  '/auth/login-avatar',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

function isPublicApiPath(path, method) {
  if (String(method || 'GET').toUpperCase() === 'OPTIONS') return true;
  const p = String(path || '').split('?')[0];
  if (PUBLIC_EXACT.has(p)) return true;
  return false;
}

module.exports = { isPublicApiPath, PUBLIC_EXACT };
