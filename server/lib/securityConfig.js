const rateLimit = require('express-rate-limit');

const MIN_JWT_SECRET_LENGTH = 32;
const WEAK_SECRET_MARKERS = ['pon_aqui', 'change-me', 'dev-only-insecure'];

function resolveJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

  const isWeak = (value) =>
    !value ||
    value.length < MIN_JWT_SECRET_LENGTH ||
    WEAK_SECRET_MARKERS.some((marker) => value.toLowerCase().includes(marker));

  if (isWeak(secret)) {
    if (isProd) {
      throw new Error(
        `JWT_SECRET obligatorio en producción (mínimo ${MIN_JWT_SECRET_LENGTH} caracteres aleatorios en server/.env).`
      );
    }
    console.warn(
      '[security] JWT_SECRET ausente o débil; usando clave solo para desarrollo. Configure JWT_SECRET en server/.env antes de desplegar.'
    );
    return 'dev-only-insecure-jwt-secret-do-not-use-in-production';
  }

  return secret;
}

function buildCorsOptions(appBaseUrl) {
  const raw = process.env.CORS_ORIGINS || appBaseUrl || 'http://localhost:3000';
  const origins = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  };
}

function createAuthRateLimiters() {
  const login = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_LOGIN_MAX || 30),
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Demasiados intentos de acceso. Espere unos minutos e inténtelo de nuevo.' },
  });

  const passwordReset = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_RESET_WINDOW_MS || 60 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_RESET_MAX || 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Demasiadas solicitudes de recuperación. Inténtelo más tarde.' },
  });

  const api = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_API_WINDOW_MS || 60 * 1000),
    max: Number(process.env.RATE_LIMIT_API_MAX || 400),
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Demasiadas peticiones. Reduzca la frecuencia.' },
  });

  return { login, passwordReset, api };
}

module.exports = {
  MIN_JWT_SECRET_LENGTH,
  resolveJwtSecret,
  buildCorsOptions,
  createAuthRateLimiters,
};
