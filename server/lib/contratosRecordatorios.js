/**
 * Recordatorios automáticos de vencimiento.
 * Reglas por tipo de contrato y por prioridad (UI). Frecuencia y ventana horaria: solo servidor (DEFAULT_CONFIG).
 */

const { listCorreosDestino } = require('./contratosContactosNotificacion');

const CONFIG_KEY = 'contratos_recordatorios_auto';

const REGLAS_PRIORIDAD_DEFAULT = {
  alta: [60, 30, 15, 7, 1],
  media: [30, 15, 7],
  baja: [15, 7],
};

const DEFAULT_CONFIG = {
  activo: true,
  frecuencia: 'diario',
  solo_dias_habiles: false,
  ventana_desde: '08:00',
  ventana_hasta: '18:00',
  hora: '08:00',
  dia_semana: 1,
  dias: [30, 15, 7],
  reglas_prioridad: { ...REGLAS_PRIORIDAD_DEFAULT },
  reglas_tipo: [],
};

const FRECUENCIA_MS = {
  hora1: 60 * 60 * 1000,
  hora6: 6 * 60 * 60 * 1000,
  diario: 24 * 60 * 60 * 1000,
  semanal: 7 * 24 * 60 * 60 * 1000,
};

const TICK_MS = 5 * 60 * 1000;

function parseHora(value) {
  const m = String(value || '08:00').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return { hora: 8, minuto: 0 };
  return {
    hora: Math.min(23, Math.max(0, Number(m[1]))),
    minuto: Math.min(59, Math.max(0, Number(m[2]))),
  };
}

function minutosDesdeMedianoche(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function normalizarDias(dias) {
  if (!Array.isArray(dias)) return [];
  const nums = dias
    .map((d) => Number(d))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 365);
  return [...new Set(nums)].sort((a, b) => b - a);
}

function normalizarPrioridad(value) {
  const s = String(value || 'media').trim().toLowerCase();
  if (s === 'alta' || s === 'media' || s === 'baja') return s;
  return 'media';
}

function normalizarReglasPrioridad(raw) {
  const base = { ...REGLAS_PRIORIDAD_DEFAULT };
  if (!raw || typeof raw !== 'object') return base;
  for (const key of ['alta', 'media', 'baja']) {
    if (raw[key]) base[key] = normalizarDias(raw[key]);
  }
  return base;
}

function normalizarReglasTipo(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => ({
      id_tipo_contrato: Number(r.id_tipo_contrato),
      dias: normalizarDias(r.dias),
      activo: r.activo !== false && r.activo !== 0 && r.activo !== '0',
    }))
    .filter((r) => r.id_tipo_contrato > 0 && r.dias.length > 0);
}

function parseConfigJson(raw) {
  if (!raw) {
    return {
      ...DEFAULT_CONFIG,
      dias: [...DEFAULT_CONFIG.dias],
      reglas_prioridad: { ...REGLAS_PRIORIDAD_DEFAULT },
      reglas_tipo: [],
    };
  }
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const frecuencias = ['hora1', 'hora6', 'diario', 'semanal'];
    const frecuencia = frecuencias.includes(o.frecuencia) ? o.frecuencia : 'diario';
    return {
      activo: o.activo !== false && o.activo !== 0 && o.activo !== '0',
      frecuencia,
      solo_dias_habiles: o.solo_dias_habiles === true || o.solo_dias_habiles === 1 || o.solo_dias_habiles === '1',
      ventana_desde: String(o.ventana_desde || DEFAULT_CONFIG.ventana_desde).trim() || '08:00',
      ventana_hasta: String(o.ventana_hasta || DEFAULT_CONFIG.ventana_hasta).trim() || '18:00',
      hora: String(o.hora || DEFAULT_CONFIG.hora).trim() || '08:00',
      dia_semana: Math.min(6, Math.max(0, Number(o.dia_semana ?? 1))),
      dias: normalizarDias(o.dias?.length ? o.dias : DEFAULT_CONFIG.dias),
      reglas_prioridad: normalizarReglasPrioridad(o.reglas_prioridad),
      reglas_tipo: normalizarReglasTipo(o.reglas_tipo),
    };
  } catch {
    return parseConfigJson(null);
  }
}

function isInTimeWindow(now, desde, hasta) {
  const cur = minutosDesdeMedianoche(now);
  const a = parseHora(desde);
  const b = parseHora(hasta);
  const start = a.hora * 60 + a.minuto;
  const end = b.hora * 60 + b.minuto;
  if (start <= end) return cur >= start && cur <= end;
  return cur >= start || cur <= end;
}

function isDiaHabil(now) {
  const d = now.getDay();
  return d >= 1 && d <= 5;
}

function resolveMilestones(contrato, config) {
  const idTipo = Number(contrato.id_tipo_contrato);
  if (idTipo && Array.isArray(config.reglas_tipo)) {
    const reglaTipo = config.reglas_tipo.find(
      (r) => Number(r.id_tipo_contrato) === idTipo && r.activo !== false
    );
    if (reglaTipo?.dias?.length) return reglaTipo.dias;
  }
  const pri = normalizarPrioridad(contrato.prioridad);
  const porPri = config.reglas_prioridad?.[pri];
  if (porPri?.length) return porPri;
  return config.dias?.length ? config.dias : [...DEFAULT_CONFIG.dias];
}

function describeReglaRecordatorio(contrato, config) {
  const hitos = resolveMilestones(contrato, config);
  const idTipo = Number(contrato.id_tipo_contrato);
  if (idTipo && Array.isArray(config.reglas_tipo)) {
    const reglaTipo = config.reglas_tipo.find(
      (r) => Number(r.id_tipo_contrato) === idTipo && r.activo !== false
    );
    if (reglaTipo?.dias?.length) {
      const nombre = String(contrato.tipo_contrato || '').trim() || `Tipo #${idTipo}`;
      return {
        origen: 'tipo',
        descripcion: `Regla por tipo de contrato «${nombre}»`,
        hitos,
      };
    }
  }
  const pri = normalizarPrioridad(contrato.prioridad);
  const labels = { alta: 'Alta', media: 'Media', baja: 'Baja' };
  return {
    origen: 'prioridad',
    descripcion: `Regla por prioridad ${labels[pri] || pri}`,
    hitos,
  };
}

function collectAllMilestoneDays(config) {
  const set = new Set(config.dias || []);
  Object.values(config.reglas_prioridad || {}).forEach((arr) => {
    (arr || []).forEach((d) => set.add(d));
  });
  (config.reglas_tipo || []).forEach((r) => {
    if (r.activo !== false) (r.dias || []).forEach((d) => set.add(d));
  });
  return [...set].sort((a, b) => b - a);
}

function safeDateToIso(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toISOString().slice(0, 10);
}

function calcDiasRestantes(fechaFin) {
  if (!fechaFin) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(fechaFin);
  fin.setHours(0, 0, 0, 0);
  return Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function buildReminderMail(contrato, diasAntes) {
  const diasRestantes = calcDiasRestantes(contrato.fecha_fin);
  const pri = normalizarPrioridad(contrato.prioridad);
  const estadoTiempo =
    diasRestantes == null
      ? 'Sin fecha de fin'
      : diasRestantes < 0
        ? `Vencido hace ${Math.abs(diasRestantes)} día(s)`
        : `${diasRestantes} día(s) restantes`;
  const alertaDias =
    diasAntes != null && diasAntes >= 0
      ? `Este contrato vence en aproximadamente ${diasAntes} día(s).`
      : '';

  const subject = `Recordatorio de renovación - Contrato ${contrato.numero_contrato}`;
  const text =
    `Hola,\n\n` +
    `Te enviamos un recordatorio de renovación del contrato ${contrato.numero_contrato}.\n` +
    (alertaDias ? `${alertaDias}\n` : '') +
    `Prioridad: ${pri}\n` +
    `Empresa: ${contrato.empresa || '-'}\n` +
    `Tipo: ${contrato.tipo_contrato || '-'}\n` +
    `Fecha inicio: ${safeDateToIso(contrato.fecha_inicio)}\n` +
    `Fecha fin: ${safeDateToIso(contrato.fecha_fin)}\n` +
    `Estado de tiempo: ${estadoTiempo}\n\n` +
    `Por favor, realiza el seguimiento correspondiente.\n`;

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#111827;">
      <p>Hola,</p>
      <p>Te enviamos un recordatorio de renovación del contrato <strong>${contrato.numero_contrato}</strong>.</p>
      ${alertaDias ? `<p><strong>${alertaDias}</strong></p>` : ''}
      <ul style="padding-left:1rem;margin:0.5rem 0 1rem;">
        <li><strong>Prioridad:</strong> ${pri}</li>
        <li><strong>Empresa:</strong> ${contrato.empresa || '-'}</li>
        <li><strong>Tipo:</strong> ${contrato.tipo_contrato || '-'}</li>
        <li><strong>Fecha inicio:</strong> ${safeDateToIso(contrato.fecha_inicio)}</li>
        <li><strong>Fecha fin:</strong> ${safeDateToIso(contrato.fecha_fin)}</li>
        <li><strong>Estado de tiempo:</strong> ${estadoTiempo}</li>
      </ul>
      <p>Por favor, realiza el seguimiento correspondiente.</p>
    </div>
  `;

  return { subject, text, html, estadoTiempo, diasRestantes };
}

function createContratosRecordatoriosService(dbQuery, deps) {
  const { SQL_CONTRATO_SELECT, normalizeEmail, isValidEmail, sendMailWithFallback, mailer, shouldUseGracefulMailFallback } =
    deps;

  const schedulerState = {
    lastRunAt: 0,
    lastDiarioDate: '',
    lastSemanalKey: '',
  };

  async function loadConfig() {
    const rows = await dbQuery('SELECT valor FROM config_sistema WHERE clave = ? LIMIT 1', [CONFIG_KEY]);
    return parseConfigJson(rows[0]?.valor);
  }

  async function saveConfig(body, updatedBy) {
    const existing = await loadConfig();
    const incoming = body && typeof body === 'object' ? body : {};
    const config = {
      ...existing,
      activo: incoming.activo !== false && incoming.activo !== 0 && incoming.activo !== '0',
      reglas_prioridad: normalizarReglasPrioridad(
        incoming.reglas_prioridad !== undefined ? incoming.reglas_prioridad : existing.reglas_prioridad
      ),
      reglas_tipo: normalizarReglasTipo(
        incoming.reglas_tipo !== undefined ? incoming.reglas_tipo : existing.reglas_tipo
      ),
    };
    parseHora(config.hora);
    parseHora(config.ventana_desde);
    parseHora(config.ventana_hasta);
    const json = JSON.stringify(config);
    await dbQuery(
      `INSERT INTO config_sistema (clave, valor, updated_by) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_by = VALUES(updated_by)`,
      [CONFIG_KEY, json, updatedBy || null]
    );
    return config;
  }

  async function wasSentToday(numeroContrato, diasAntes) {
    const rows = await dbQuery(
      `SELECT 1 AS ok FROM contratos_recordatorios_envios
        WHERE numero_contrato = ? AND dias_antes_vencimiento = ? AND DATE(enviado_en) = CURDATE()
        LIMIT 1`,
      [numeroContrato, diasAntes]
    );
    return rows.length > 0;
  }

  async function wasSentMilestoneAutomatico(numeroContrato, diasAntes) {
    const rows = await dbQuery(
      `SELECT 1 AS ok FROM contratos_recordatorios_envios
        WHERE numero_contrato = ? AND dias_antes_vencimiento = ? AND origen = 'automatico'
        LIMIT 1`,
      [numeroContrato, diasAntes]
    );
    return rows.length > 0;
  }

  async function logEnvio({ numeroContrato, diasAntes, correo, origen, resultado, mensaje }) {
    await dbQuery(
      `INSERT INTO contratos_recordatorios_envios
        (numero_contrato, dias_antes_vencimiento, correo_destino, origen, resultado, mensaje)
       VALUES (?,?,?,?,?,?)`,
      [numeroContrato, diasAntes, correo, origen, resultado, mensaje || null]
    );
  }

  async function listEnvios(limit = 50) {
    const lim = Math.min(200, Math.max(1, Number(limit) || 50));
    return dbQuery(
      `SELECT id_envio, numero_contrato, dias_antes_vencimiento, correo_destino, origen, resultado, mensaje, enviado_en
         FROM contratos_recordatorios_envios
        ORDER BY enviado_en DESC
        LIMIT ?`,
      [lim]
    );
  }

  async function listEnviosByContrato(numeroContrato, limit = 100) {
    const num = String(numeroContrato || '').trim();
    if (!num) return [];
    const lim = Math.min(200, Math.max(1, Number(limit) || 100));
    return dbQuery(
      `SELECT id_envio, numero_contrato, dias_antes_vencimiento, correo_destino, origen, resultado, mensaje, enviado_en
         FROM contratos_recordatorios_envios
        WHERE numero_contrato = ?
        ORDER BY enviado_en DESC
        LIMIT ?`,
      [num, lim]
    );
  }

  async function findContractsPorDias(dias) {
    return dbQuery(
      `${SQL_CONTRATO_SELECT}
        WHERE c.fecha_fin IS NOT NULL
          AND COALESCE(c.cancelado, 0) = 0
          AND DATEDIFF(c.fecha_fin, CURDATE()) = ?
          AND (
            (c.correo_notificacion IS NOT NULL AND TRIM(c.correo_notificacion) <> '')
            OR (c.contactos_notificacion IS NOT NULL AND JSON_LENGTH(c.contactos_notificacion) > 0)
          )`,
      [dias]
    );
  }

  async function sendReminderForContract(contrato, options = {}) {
    const origen = options.origen === 'manual' ? 'manual' : 'automatico';
    const diasAntes =
      options.diasAntes != null ? Number(options.diasAntes) : calcDiasRestantes(contrato.fecha_fin);

    const numero = String(contrato.numero_contrato || '').trim();
    if (!numero) return { ok: false, skipped: true, reason: 'sin_numero' };
    if (Number(contrato.cancelado) === 1) return { ok: false, skipped: true, reason: 'cancelado' };

    const destinosRaw = listCorreosDestino(contrato);
    const destinos = [
      ...new Set(
        destinosRaw.map((d) => normalizeEmail(d)).filter((d) => d && isValidEmail(d))
      ),
    ];
    if (!destinos.length) return { ok: false, skipped: true, reason: 'sin_correo' };

    const diasKey = diasAntes != null && Number.isFinite(diasAntes) ? diasAntes : -1;
    if (!options.skipDuplicateCheck) {
      if (origen === 'automatico' && diasKey >= 0 && (await wasSentMilestoneAutomatico(numero, diasKey))) {
        return { ok: false, skipped: true, reason: 'ya_enviado_milestone' };
      }
      if (origen === 'manual' && (await wasSentToday(numero, diasKey))) {
        return { ok: false, skipped: true, reason: 'ya_enviado_hoy' };
      }
    }

    const mail = buildReminderMail(contrato, diasKey >= 0 ? diasKey : null);
    let enviados = 0;
    let advertencias = 0;
    let errores = 0;
    let ultimoError = null;

    for (const destino of destinos) {
      try {
        await sendMailWithFallback({
          from: mailer.from,
          to: destino,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        });
        await logEnvio({
          numeroContrato: numero,
          diasAntes: diasKey,
          correo: destino,
          origen,
          resultado: 'ok',
          mensaje: `Enviado a ${destino}`,
        });
        enviados += 1;
      } catch (error) {
        const smtpCode = String(error?.code || '').toUpperCase();
        const graceful = shouldUseGracefulMailFallback(error);
        const resultado = graceful ? 'advertencia' : 'error';
        const mensaje = graceful
          ? `No se pudo enviar ahora (${smtpCode || 'SMTP'}); quedó registrado.`
          : error?.message || String(error);
        await logEnvio({
          numeroContrato: numero,
          diasAntes: diasKey,
          correo: destino,
          origen,
          resultado,
          mensaje: mensaje.slice(0, 500),
        });
        if (graceful) advertencias += 1;
        else {
          errores += 1;
          ultimoError = mensaje;
        }
      }
    }

    const destinoResumen = destinos.join(', ');
    if (enviados > 0 || advertencias > 0) {
      return {
        ok: true,
        destino: destinoResumen,
        destinos,
        warning: advertencias > 0 && enviados === 0,
        numero_contrato: numero,
      };
    }
    return { ok: false, error: ultimoError || 'No se pudo enviar el recordatorio.', numero_contrato: numero };
  }

  async function ejecutarAutomaticos(options = {}) {
    const config = await loadConfig();
    if (!config.activo && !options.forzar) {
      return { skipped: true, reason: 'desactivado', config };
    }

    const resumen = { enviados: 0, advertencias: 0, errores: 0, omitidos: 0, detalle: [] };
    const allDias = collectAllMilestoneDays(config);

    for (const dias of allDias) {
      const contratos = await findContractsPorDias(dias);
      for (const contrato of contratos) {
        const milestones = resolveMilestones(contrato, config);
        if (!milestones.includes(dias)) {
          resumen.omitidos += 1;
          continue;
        }
        const r = await sendReminderForContract(contrato, {
          origen: 'automatico',
          diasAntes: dias,
          skipDuplicateCheck: Boolean(options.forzar),
        });
        if (r.ok) {
          if (r.warning) resumen.advertencias += 1;
          else resumen.enviados += 1;
          resumen.detalle.push({
            numero_contrato: r.numero_contrato,
            dias,
            prioridad: contrato.prioridad,
            tipo: contrato.tipo_contrato,
            estado: r.warning ? 'advertencia' : 'ok',
          });
        } else if (r.skipped) {
          resumen.omitidos += 1;
        } else {
          resumen.errores += 1;
          resumen.detalle.push({ numero_contrato: r.numero_contrato, dias, estado: 'error', error: r.error });
        }
      }
    }

    return { ...resumen, config, ejecutado_en: new Date().toISOString() };
  }

  function canRunScheduledJob(config, now) {
    if (!config.activo) return false;
    if (config.solo_dias_habiles && !isDiaHabil(now)) return false;
    if (!isInTimeWindow(now, config.ventana_desde, config.ventana_hasta)) return false;

    const f = config.frecuencia || 'diario';
    const { hora, minuto } = parseHora(config.hora);
    const targetMin = hora * 60 + minuto;
    const curMin = minutosDesdeMedianoche(now);

    if (f === 'hora1') {
      return now.getTime() - schedulerState.lastRunAt >= FRECUENCIA_MS.hora1 - 2000;
    }
    if (f === 'hora6') {
      return now.getTime() - schedulerState.lastRunAt >= FRECUENCIA_MS.hora6 - 2000;
    }
    if (f === 'diario') {
      const today = now.toISOString().slice(0, 10);
      if (schedulerState.lastDiarioDate === today) return false;
      return curMin >= targetMin;
    }
    if (f === 'semanal') {
      if (now.getDay() !== Number(config.dia_semana)) return false;
      const weekKey = `${now.getFullYear()}-${Math.ceil((now.getDate() + 6 - now.getDay()) / 7)}`;
      if (schedulerState.lastSemanalKey === weekKey) return false;
      return curMin >= targetMin;
    }
    return false;
  }

  function markScheduledRun(config, now) {
    schedulerState.lastRunAt = now.getTime();
    if (config.frecuencia === 'diario') {
      schedulerState.lastDiarioDate = now.toISOString().slice(0, 10);
    }
    if (config.frecuencia === 'semanal') {
      schedulerState.lastSemanalKey = `${now.getFullYear()}-${Math.ceil((now.getDate() + 6 - now.getDay()) / 7)}`;
    }
  }

  function startScheduler() {
    const tick = async () => {
      try {
        const config = await loadConfig();
        const now = new Date();
        if (!canRunScheduledJob(config, now)) return;

        markScheduledRun(config, now);
        const result = await ejecutarAutomaticos();
        console.log(
          `[RECORDATORIOS-AUTO] ${config.frecuencia} enviados=${result.enviados} omitidos=${result.omitidos}`
        );
      } catch (err) {
        console.error('[RECORDATORIOS-AUTO] Error:', err?.message || err);
      }
    };

    setInterval(tick, TICK_MS);
    console.log(
      `[RECORDATORIOS-AUTO] Programador activo (revisa cada ${TICK_MS / 60000} min según frecuencia, ventana y días hábiles).`
    );
  }

  return {
    CONFIG_KEY,
    DEFAULT_CONFIG,
    REGLAS_PRIORIDAD_DEFAULT,
    loadConfig,
    saveConfig,
    listEnvios,
    listEnviosByContrato,
    describeReglaRecordatorio,
    sendReminderForContract,
    ejecutarAutomaticos,
    startScheduler,
    buildReminderMail,
    calcDiasRestantes,
    resolveMilestones,
    normalizarPrioridad,
    parseConfigJson,
  };
}

module.exports = {
  createContratosRecordatoriosService,
  CONFIG_KEY,
  DEFAULT_CONFIG,
  REGLAS_PRIORIDAD_DEFAULT,
  parseConfigJson,
  normalizarPrioridad,
};
