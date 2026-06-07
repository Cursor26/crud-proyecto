/**
 * IP del cliente: headers de proxy + normalización IPv6 → IPv4 legible.
 */

function stripPort(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  // IPv6 con puerto [::1]:1234
  if (s.startsWith('[') && s.includes(']')) {
    return s.slice(1, s.indexOf(']'));
  }
  // IPv4 con puerto 192.168.0.1:8080
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(s)) {
    return s.replace(/:\d+$/, '');
  }
  return s;
}

function normalizeClientIp(raw) {
  if (raw == null || raw === '') return null;
  let s = stripPort(String(raw).trim());
  if (!s) return null;

  if (s.includes(',')) {
    s = s.split(',')[0].trim();
    s = stripPort(s);
  }

  if (s.includes('%')) {
    s = s.split('%')[0];
  }

  if (s.startsWith('::ffff:')) {
    s = s.slice(7);
  }

  if (s === '::1') {
    return '127.0.0.1';
  }

  return s || null;
}

function extractClientIp(req) {
  if (!req) return null;

  const headerNames = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'true-client-ip',
    'x-client-ip',
  ];

  for (const name of headerNames) {
    const raw = req.headers?.[name];
    if (!raw) continue;
    const ip = normalizeClientIp(String(raw).split(',')[0]);
    if (ip) return ip;
  }

  const candidates = [req.ip, req.connection?.remoteAddress, req.socket?.remoteAddress];
  for (const c of candidates) {
    const ip = normalizeClientIp(c);
    if (ip) return ip;
  }

  return null;
}

function formatIpDisplay(ip) {
  const normalized = normalizeClientIp(ip);
  if (!normalized) return '—';
  if (normalized === '127.0.0.1') return '127.0.0.1 (local)';
  return normalized;
}

module.exports = {
  normalizeClientIp,
  extractClientIp,
  formatIpDisplay,
};
