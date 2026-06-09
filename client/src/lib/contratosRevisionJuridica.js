export const REVISION_JURIDICA_LABELS = {
  na: 'Sin revisión jurídica',
  pendiente: 'Pendiente de revisión jurídica',
  aprobado_juridico: 'Aprobado por abogado',
  observado: 'Observado por abogado',
  rechazado: 'Rechazado por abogado',
  correcciones_requeridas: 'Correcciones requeridas',
};

export const REVISION_JURIDICA_BADGE = {
  na: 'bg-secondary',
  pendiente: 'bg-info text-dark',
  aprobado_juridico: 'bg-success',
  observado: 'bg-warning text-dark',
  rechazado: 'bg-danger',
  correcciones_requeridas: 'bg-warning text-dark',
};

export function normalizarRevisionJuridicaEstado(val) {
  return String(val || 'na').trim().toLowerCase();
}

export function etiquetaRevisionJuridica(estado) {
  const key = normalizarRevisionJuridicaEstado(estado);
  return REVISION_JURIDICA_LABELS[key] || key;
}

export function claseBadgeRevisionJuridica(estado) {
  const key = normalizarRevisionJuridicaEstado(estado);
  return REVISION_JURIDICA_BADGE[key] || 'bg-secondary';
}

export function esContratoConSolicitudPendiente(con) {
  return String(con?.aprobacion_estado || '').trim().toLowerCase() === 'pendiente';
}

export function esColaJuridica(con) {
  if (!esContratoConSolicitudPendiente(con)) return false;
  return normalizarRevisionJuridicaEstado(con?.revision_juridica_estado) === 'pendiente';
}

export function esColaAprobacionOperativa(con) {
  if (!esContratoConSolicitudPendiente(con)) return false;
  const rev = normalizarRevisionJuridicaEstado(con?.revision_juridica_estado);
  return rev === 'aprobado_juridico' || rev === 'na';
}

export function esDevueltoPorAbogado(con) {
  const rev = normalizarRevisionJuridicaEstado(con?.revision_juridica_estado);
  return ['observado', 'rechazado', 'correcciones_requeridas'].includes(rev);
}

export const TIPOS_RECHAZO_JURIDICO_OPCIONES = [
  { value: 'observado', label: 'Observado (devolver con observaciones)' },
  { value: 'correcciones_requeridas', label: 'Correcciones requeridas' },
  { value: 'rechazado', label: 'Rechazado jurídicamente' },
];
