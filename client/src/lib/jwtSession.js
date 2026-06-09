export function parseJwtPayload(token) {
  try {
    const part = String(token || '').split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function getTokenExpiryMs(token) {
  const payload = parseJwtPayload(token);
  const exp = Number(payload?.exp);
  if (!Number.isFinite(exp)) return null;
  return exp * 1000;
}

export function isTokenExpired(token, skewMs = 0) {
  const expMs = getTokenExpiryMs(token);
  if (!expMs) return true;
  return Date.now() >= expMs - skewMs;
}

export function msUntilExpiry(token) {
  const expMs = getTokenExpiryMs(token);
  if (!expMs) return 0;
  return Math.max(0, expMs - Date.now());
}
