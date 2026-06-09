const MAIL_UNAVAILABLE_MESSAGE =
  'Los servicios de correo electrónico no están disponibles. Contacte con el administrador.';

const UNAVAILABLE_TTL_MS = Number(process.env.MAIL_UNAVAILABLE_TTL_MS || 120000);

let state = {
  available: null,
  lastCheckAt: 0,
  lastError: null,
};

const onAvailableListeners = [];

function onSmtpAvailable(listener) {
  if (typeof listener === 'function') onAvailableListeners.push(listener);
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const err = new Error(`${label} agotó el tiempo de espera (${ms}ms)`);
        err.code = 'ETIMEDOUT';
        reject(err);
      }, ms);
    }),
  ]);
}

function markAvailable() {
  const wasDown = state.available === false;
  state.available = true;
  state.lastCheckAt = Date.now();
  state.lastError = null;
  if (wasDown && onAvailableListeners.length) {
    for (const fn of onAvailableListeners) {
      Promise.resolve()
        .then(() => fn())
        .catch((err) => console.warn('[mailHealth] onSmtpAvailable:', err?.message || err));
    }
  }
}

function markUnavailable(error) {
  state.available = false;
  state.lastCheckAt = Date.now();
  state.lastError = String(error?.message || error || 'SMTP no responde').slice(0, 300);
}

function isAvailable() {
  if (state.available === false) {
    if (Date.now() - state.lastCheckAt >= UNAVAILABLE_TTL_MS) {
      return true;
    }
    return false;
  }
  return true;
}

function getStatus() {
  const disponible = state.available !== false;
  return {
    smtp_disponible: disponible,
    mensaje: disponible ? null : MAIL_UNAVAILABLE_MESSAGE,
    verificado_en: state.lastCheckAt ? new Date(state.lastCheckAt).toISOString() : null,
    detalle: state.lastError,
  };
}

function createUnavailableError() {
  const err = new Error(MAIL_UNAVAILABLE_MESSAGE);
  err.code = 'MAIL_UNAVAILABLE';
  return err;
}

module.exports = {
  MAIL_UNAVAILABLE_MESSAGE,
  withTimeout,
  markAvailable,
  markUnavailable,
  isAvailable,
  getStatus,
  createUnavailableError,
  onSmtpAvailable,
};
