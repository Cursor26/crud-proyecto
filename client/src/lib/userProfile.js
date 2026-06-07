import Axios, { API_BASE } from '../axiosConfig';

export function normalizeTelefonoInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  return digits;
}

export function telefonoValidoOpcional(value) {
  const digits = normalizeTelefonoInput(value);
  if (!digits) return { ok: true, value: '' };
  if (digits.length !== 8) {
    return { ok: false, message: 'El teléfono debe tener 8 dígitos (opcional).' };
  }
  return { ok: true, value: digits };
}

export async function fetchUserProfile() {
  const res = await Axios.get(`${API_BASE}/user/profile`);
  return res.data;
}

export async function saveUserProfile(payload) {
  const res = await Axios.put(`${API_BASE}/user/profile`, payload);
  return res.data;
}

export async function changeUserPassword({ currentPassword, newPassword }) {
  const res = await Axios.put(`${API_BASE}/user/change-password`, { currentPassword, newPassword });
  return res.data;
}
