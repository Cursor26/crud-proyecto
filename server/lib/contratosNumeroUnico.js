async function numeroContratoYaExiste(dbQuery, numero, { excepto = null } = {}) {
  const n = String(numero || '').trim();
  if (!n) return { existe: false };

  const activos = await dbQuery(
    'SELECT numero_contrato FROM contratos_generales WHERE numero_contrato = ? LIMIT 1',
    [n]
  );
  if (activos?.length) {
    const ex = String(excepto || '').trim();
    if (!ex || String(activos[0].numero_contrato).trim() !== ex) {
      return { existe: true, donde: 'activo' };
    }
  }

  const archivo = await dbQuery(
    'SELECT numero_contrato FROM contratos_archivo WHERE numero_contrato = ? LIMIT 1',
    [n]
  );
  if (archivo?.length) {
    return { existe: true, donde: 'archivo' };
  }

  return { existe: false };
}

async function validarNumeroContratoUnico(dbQuery, numero, { excepto = null } = {}) {
  const n = String(numero || '').trim();
  if (!n) {
    const err = new Error('El número de contrato no puede estar vacío.');
    err.status = 400;
    throw err;
  }

  const { existe, donde } = await numeroContratoYaExiste(dbQuery, n, { excepto });
  if (existe) {
    const msg =
      donde === 'archivo'
        ? `El número de contrato «${n}» ya existe en el archivo histórico. Cada contrato debe tener un número único.`
        : `El número de contrato «${n}» ya está registrado. Cada contrato debe tener un número único.`;
    const err = new Error(msg);
    err.status = 409;
    throw err;
  }

  return n;
}

module.exports = {
  numeroContratoYaExiste,
  validarNumeroContratoUnico,
};
