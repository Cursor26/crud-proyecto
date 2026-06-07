export const CONTRATOS_LIST_COLUMNS = [
  { id: 'numero', label: 'N° Contrato', default: true },
  { id: 'tipo', label: 'Tipo', default: true },
  { id: 'empresa', label: 'Empresa', default: true },
  { id: 'vigencia', label: 'Vigencia', default: true },
  { id: 'suplemento', label: 'Suplemento', default: true },
  { id: 'fechaInicio', label: 'Fecha Inicio', default: true },
  { id: 'fechaFin', label: 'Fecha Fin', default: true },
  { id: 'estado', label: 'Estado', default: true },
  { id: 'dias', label: 'Días', default: true },
  { id: 'documento', label: 'Documento', default: true },
  { id: 'acciones', label: 'Acciones', default: true, locked: true },
];

export function defaultVisibleColumnIds(definitions) {
  return definitions.filter((c) => c.default !== false).map((c) => c.id);
}

export function normalizeVisibleColumns(stored, definitions) {
  const allowed = new Set(definitions.map((c) => c.id));
  const locked = definitions.filter((c) => c.locked).map((c) => c.id);
  const defaults = defaultVisibleColumnIds(definitions);
  let list = Array.isArray(stored) ? stored.filter((id) => allowed.has(id)) : [...defaults];
  if (!list.length) list = [...defaults];
  defaults.forEach((id) => {
    if (!list.includes(id)) list.push(id);
  });
  locked.forEach((id) => {
    if (!list.includes(id)) list.push(id);
  });
  return list;
}
