export function normalizarNumeroContrato(numero) {
  return String(numero || '').trim();
}

/** Solo dígitos (entero positivo) mientras el usuario escribe. */
export function normalizarNumeroContratoInput(value) {
  return String(value || '').replace(/\D/g, '');
}

export function validarNumeroContratoEntero(numero) {
  const n = normalizarNumeroContratoInput(numero);
  if (!n) {
    return { ok: false, message: 'N° de contrato obligatorio.' };
  }
  if (!/^\d+$/.test(n)) {
    return { ok: false, message: 'El N° de contrato debe ser un número entero (solo dígitos).' };
  }
  return { ok: true, value: n };
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
