const CONFIG_KEY = 'contratos_correo_plantillas';

const PLACEHOLDER_HELP =
  '{{numero_contrato}}, {{empresa}}, {{tipo_contrato}}, {{fecha_inicio}}, {{fecha_fin}}, {{prioridad}}, {{dias_antes}}, {{dias_restantes}}, {{estado_tiempo}}, {{motivo}}';

const DEFAULT_PLANTILLAS = {
  por_vencer: {
    asunto: 'Recordatorio de renovación - Contrato {{numero_contrato}}',
    cuerpo:
      'Hola,\n\n' +
      'Te enviamos un recordatorio de renovación del contrato {{numero_contrato}}.\n\n' +
      'Este contrato vence en aproximadamente {{dias_antes}} día(s).\n\n' +
      'Prioridad: {{prioridad}}\n' +
      'Empresa: {{empresa}}\n' +
      'Tipo: {{tipo_contrato}}\n' +
      'Fecha inicio: {{fecha_inicio}}\n' +
      'Fecha fin: {{fecha_fin}}\n' +
      'Estado de tiempo: {{estado_tiempo}}\n\n' +
      'Por favor, realiza el seguimiento correspondiente.',
  },
  vencido: {
    asunto: 'Contrato vencido — {{numero_contrato}}',
    cuerpo:
      'Hola,\n\n' +
      'El contrato {{numero_contrato}} ya venció. Realice el seguimiento correspondiente.\n\n' +
      'Prioridad: {{prioridad}}\n' +
      'Empresa: {{empresa}}\n' +
      'Tipo: {{tipo_contrato}}\n' +
      'Fecha inicio: {{fecha_inicio}}\n' +
      'Fecha fin: {{fecha_fin}}\n' +
      'Estado de tiempo: {{estado_tiempo}}',
  },
  cancelado: {
    asunto: 'Contrato cancelado — {{numero_contrato}}',
    cuerpo:
      'Hola,\n\n' +
      'El contrato {{numero_contrato}} fue cancelado.\n\n' +
      'Empresa: {{empresa}}\n' +
      'Tipo: {{tipo_contrato}}\n' +
      'Fecha fin: {{fecha_fin}}\n' +
      '{{motivo}}',
  },
};

function safeDateToIso(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toISOString().slice(0, 10);
}

function normalizarPrioridad(val) {
  const p = String(val || 'media').trim().toLowerCase();
  if (p === 'alta' || p === 'baja') return p.charAt(0).toUpperCase() + p.slice(1);
  return 'Media';
}

function calcDiasRestantes(fechaFin) {
  if (!fechaFin) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(fechaFin);
  fin.setHours(0, 0, 0, 0);
  return Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function parsePlantillasJson(raw) {
  if (!raw) return { ...DEFAULT_PLANTILLAS };
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || typeof data !== 'object') return { ...DEFAULT_PLANTILLAS };
    const out = { ...DEFAULT_PLANTILLAS };
    for (const key of Object.keys(DEFAULT_PLANTILLAS)) {
      const p = data[key];
      if (p && typeof p === 'object') {
        out[key] = {
          asunto: String(p.asunto ?? out[key].asunto).trim() || out[key].asunto,
          cuerpo: String(p.cuerpo ?? out[key].cuerpo).trim() || out[key].cuerpo,
        };
      }
    }
    return out;
  } catch {
    return { ...DEFAULT_PLANTILLAS };
  }
}

function aplicarPlaceholders(texto, vars) {
  return String(texto || '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = vars[key];
    return v == null ? '' : String(v);
  });
}

function textoAHtml(cuerpo) {
  const escaped = String(cuerpo || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 0.75rem;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function varsDesdeContrato(contrato, extra = {}) {
  const diasRestantes =
    extra.diasRestantes != null ? Number(extra.diasRestantes) : calcDiasRestantes(contrato?.fecha_fin);
  const diasAntes = extra.diasAntes != null ? Number(extra.diasAntes) : diasRestantes;
  const estadoTiempo =
    diasRestantes == null
      ? 'Sin fecha de fin'
      : diasRestantes < 0
        ? `Vencido hace ${Math.abs(diasRestantes)} día(s)`
        : `${diasRestantes} día(s) restantes`;
  const motivoRaw = String(extra.motivo || '').trim();
  return {
    numero_contrato: String(contrato?.numero_contrato || extra.numero_contrato || '-').trim() || '-',
    empresa: String(contrato?.empresa || extra.empresa || '-').trim() || '-',
    tipo_contrato: String(contrato?.tipo_contrato || '-').trim() || '-',
    fecha_inicio: safeDateToIso(contrato?.fecha_inicio),
    fecha_fin: safeDateToIso(contrato?.fecha_fin),
    prioridad: normalizarPrioridad(contrato?.prioridad),
    dias_antes: diasAntes != null && Number.isFinite(diasAntes) ? String(diasAntes) : '',
    dias_restantes: diasRestantes != null && Number.isFinite(diasRestantes) ? String(diasRestantes) : '',
    estado_tiempo: estadoTiempo,
    motivo: motivoRaw ? `Motivo: ${motivoRaw}` : '',
  };
}

function createContratosCorreoPlantillasService(dbQuery) {
  async function loadPlantillas() {
    const rows = await dbQuery('SELECT valor FROM config_sistema WHERE clave = ? LIMIT 1', [CONFIG_KEY]);
    return parsePlantillasJson(rows[0]?.valor);
  }

  async function resetPlantillas(updatedBy) {
    const defaults = { ...DEFAULT_PLANTILLAS };
    const json = JSON.stringify(defaults);
    await dbQuery(
      `INSERT INTO config_sistema (clave, valor, updated_by) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_by = VALUES(updated_by)`,
      [CONFIG_KEY, json, updatedBy || null]
    );
    return defaults;
  }

  async function savePlantillas(body, updatedBy) {
    const existing = await loadPlantillas();
    const incoming = body && typeof body === 'object' ? body : {};
    const merged = { ...existing };
    for (const key of Object.keys(DEFAULT_PLANTILLAS)) {
      if (incoming[key] && typeof incoming[key] === 'object') {
        merged[key] = {
          asunto: String(incoming[key].asunto ?? merged[key].asunto).trim() || merged[key].asunto,
          cuerpo: String(incoming[key].cuerpo ?? merged[key].cuerpo).trim() || merged[key].cuerpo,
        };
      }
    }
    const json = JSON.stringify(merged);
    await dbQuery(
      `INSERT INTO config_sistema (clave, valor, updated_by) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_by = VALUES(updated_by)`,
      [CONFIG_KEY, json, updatedBy || null]
    );
    return merged;
  }

  function renderMail(tipo, contrato, extra = {}, plantillas = DEFAULT_PLANTILLAS) {
    const plantilla = plantillas[tipo] || DEFAULT_PLANTILLAS[tipo] || DEFAULT_PLANTILLAS.por_vencer;
    const vars = varsDesdeContrato(contrato, extra);
    const subject = aplicarPlaceholders(plantilla.asunto, vars).trim();
    const cuerpo = aplicarPlaceholders(plantilla.cuerpo, vars).trim();
    const text = `${cuerpo}\n\nAviso del módulo de contratos.\n`;
    const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#111827;">
      ${textoAHtml(cuerpo)}
      <p style="color:#6b7280;font-size:0.9rem;margin:0;">Aviso del módulo de contratos.</p>
    </div>
  `;
    return { subject, text, html, vars };
  }

  function contratoEjemploPrueba(tipo) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date(hoy);
    const inicio = new Date(hoy);
    inicio.setMonth(inicio.getMonth() - 6);
    if (tipo === 'vencido') {
      fin.setDate(fin.getDate() - 12);
    } else {
      fin.setDate(fin.getDate() + 15);
    }
    return {
      numero_contrato: 'EJEMPLO-001',
      empresa: 'Empresa demostración S.A.',
      tipo_contrato: 'Servicios',
      prioridad: 'media',
      fecha_inicio: inicio.toISOString().slice(0, 10),
      fecha_fin: fin.toISOString().slice(0, 10),
    };
  }

  function extraEjemploPrueba(tipo) {
    if (tipo === 'vencido') {
      return { diasRestantes: -12, diasAntes: null, motivo: 'Ejemplo de motivo (correo de prueba)' };
    }
    if (tipo === 'cancelado') {
      return { diasRestantes: 15, diasAntes: 15, motivo: 'Ejemplo de motivo (correo de prueba)' };
    }
    return { diasRestantes: 15, diasAntes: 15, motivo: '' };
  }

  async function buildMailPrueba({ tipo, plantilla }) {
    const tipoKey = String(tipo || 'por_vencer').trim();
    if (!DEFAULT_PLANTILLAS[tipoKey]) {
      throw new Error('Tipo de plantilla no válido.');
    }
    const all = await loadPlantillas();
    if (plantilla && typeof plantilla === 'object') {
      all[tipoKey] = {
        asunto: String(plantilla.asunto ?? all[tipoKey].asunto).trim() || all[tipoKey].asunto,
        cuerpo: String(plantilla.cuerpo ?? all[tipoKey].cuerpo).trim() || all[tipoKey].cuerpo,
      };
    }
    const contrato = contratoEjemploPrueba(tipoKey);
    const extra = extraEjemploPrueba(tipoKey);
    const mail = renderMail(tipoKey, contrato, extra, all);
    return {
      ...mail,
      subject: `[PRUEBA] ${mail.subject}`,
      text: `${mail.text}\n(Este correo usa datos de ejemplo para previsualizar la plantilla.)\n`,
      html: `${mail.html.replace(
        '</div>',
        '<p style="color:#6b7280;font-size:0.85rem;margin-top:1rem;">Este correo usa datos de ejemplo para previsualizar la plantilla.</p></div>'
      )}`,
    };
  }

  return {
    CONFIG_KEY,
    PLACEHOLDER_HELP,
    DEFAULT_PLANTILLAS,
    loadPlantillas,
    savePlantillas,
    resetPlantillas,
    renderMail,
    buildMailPrueba,
    varsDesdeContrato,
    calcDiasRestantes,
  };
}

module.exports = {
  createContratosCorreoPlantillasService,
  DEFAULT_PLANTILLAS,
  PLACEHOLDER_HELP,
};
