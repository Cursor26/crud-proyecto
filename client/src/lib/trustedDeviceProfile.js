const STORAGE_KEY = 'app:trustedDeviceProfile';
const TTL_MS = Number(process.env.REACT_APP_TRUSTED_DEVICE_TTL_DAYS || 90) * 24 * 60 * 60 * 1000;

function normalizeId(value) {
  return String(value || '').trim().toLowerCase();
}

function parseStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    const savedAt = Number(data.savedAt) || 0;
    if (savedAt && Date.now() - savedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveTrustedDeviceProfile({ email, nombre, fotoPerfil }) {
  const em = String(email || '').trim();
  if (!em) return;
  const payload = {
    email: em,
    nombre: String(nombre || '').trim() || null,
    fotoPerfil: fotoPerfil && typeof fotoPerfil === 'string' ? fotoPerfil : null,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, fotoPerfil: null }));
    } catch {
      /* localStorage lleno o bloqueado */
    }
  }
}

export function clearTrustedDeviceProfile() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getTrustedDeviceProfile() {
  return parseStored();
}

export function hasTrustedDeviceProfile() {
  return Boolean(parseStored());
}

export function identifierMatchesTrustedProfile(identifier, profile = parseStored()) {
  if (!profile) return false;
  const id = normalizeId(identifier);
  if (!id) return false;
  if (normalizeId(profile.email) === id) return true;
  if (profile.nombre && normalizeId(profile.nombre) === id) return true;
  return false;
}

export function getTrustedPhotoForIdentifier(identifier) {
  const profile = parseStored();
  if (!identifierMatchesTrustedProfile(identifier, profile)) return null;
  const foto = profile?.fotoPerfil;
  return foto && typeof foto === 'string' ? foto : null;
}
