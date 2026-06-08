export function normalizarNumeroContrato(numero) {
  return String(numero || '').trim();
}

export function mensajeNumeroContratoDuplicado(numero) {
  return `El número de contrato «${normalizarNumeroContrato(numero)}» ya existe. Cada contrato debe tener un número único.`;
}

export function contratoNumeroDuplicado(
  numero,
  { contratos = [], contratosArchivo = [], excepto = null } = {}
) {
  const key = normalizarNumeroContrato(numero);
  if (!key) return null;

  const ex = normalizarNumeroContrato(excepto);
  if (ex && key === ex) return null;

  if (contratos.some((c) => normalizarNumeroContrato(c?.numero_contrato) === key)) {
    return mensajeNumeroContratoDuplicado(key);
  }

  if (contratosArchivo.some((a) => normalizarNumeroContrato(a?.numero_contrato) === key)) {
    return `El número de contrato «${key}» ya existe en el archivo histórico. Cada contrato debe tener un número único.`;
  }

  return null;
}
