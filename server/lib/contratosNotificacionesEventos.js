const { listCorreosPorEvento } = require('./contratosCorreosNiveles');

const ACCION_LABELS = {
  alta: 'creación de contrato',
  edicion: 'modificación de contrato',
  cancelacion: 'cancelación de contrato',
  cancelacion_archivo: 'cancelación y eliminación de contrato',
  archivo: 'eliminación de contrato',
};

const EVENTO_TITULOS = {
  por_vencer: 'Contrato por vencer',
  vencido: 'Contrato vencido',
  cancelado: 'Contrato cancelado',
  eliminado: 'Contrato eliminado',
  modificado: 'Contrato modificado',
  pendiente_aprobacion: 'Solicitud pendiente de aprobación',
  aprobacion_resuelta: 'Cambio de estado aprobado',
  pendiente_revision_juridica: 'Pendiente de revisión jurídica',
  revision_juridica_aprobada: 'Revisión jurídica aprobada',
  revision_juridica_devuelta: 'Contrato devuelto por revisión jurídica',
};

function safeDateToIso(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toISOString().slice(0, 10);
}

function buildMail(contrato, evento, extra = {}) {
  const numero = String(contrato?.numero_contrato || extra.numero_contrato || '').trim() || '-';
  const empresa = String(contrato?.empresa || extra.empresa || '').trim() || '-';
  const eventoKey = String(evento || '').trim();
  const titulo = EVENTO_TITULOS[eventoKey] || 'Aviso de contrato';
  const accion = String(extra.accion || '').toLowerCase();
  const accionLabel = ACCION_LABELS[accion] || null;
  const solicitadoPor = String(extra.solicitadoPor || contrato?.aprobacion_solicitado_por || '').trim();
  const resueltoPor = String(extra.resueltoPor || '').trim();

  let detalle = '';
  if (eventoKey === 'pendiente_aprobacion' && accionLabel) {
    detalle = `Se solicitó: ${accionLabel}. Revise la sección Pendientes para aprobar o rechazar.`;
  } else if (eventoKey === 'aprobacion_resuelta' && accionLabel) {
    detalle = `Se aprobó: ${accionLabel}.`;
  } else if (eventoKey === 'pendiente_revision_juridica' && accionLabel) {
    detalle = `Se solicitó revisión jurídica: ${accionLabel}.`;
  } else if (eventoKey === 'revision_juridica_aprobada' && accionLabel) {
    detalle = `Revisión jurídica favorable. Pendiente aprobación operativa: ${accionLabel}.`;
  } else if (eventoKey === 'revision_juridica_devuelta') {
    const tipo = String(extra.tipo || '').replace(/_/g, ' ');
    detalle = tipo
      ? `Devuelto por revisión jurídica (${tipo}).`
      : 'Devuelto por revisión jurídica con observaciones.';
  } else if (eventoKey === 'por_vencer') {
    const dias = extra.diasRestantes;
    detalle =
      dias != null && Number.isFinite(Number(dias))
        ? `El contrato vence en aproximadamente ${dias} día(s).`
        : 'El contrato está próximo a vencer.';
  } else if (eventoKey === 'vencido') {
    detalle = 'El contrato ya venció. Realice el seguimiento correspondiente.';
  } else if (eventoKey === 'cancelado') {
    detalle = 'El contrato fue cancelado.';
  } else if (eventoKey === 'eliminado') {
    detalle = 'El contrato fue eliminado o archivado.';
  } else if (eventoKey === 'modificado') {
    detalle = 'El contrato fue modificado.';
  }

  const subject = `${titulo} — ${numero}`;
  const lineas = [detalle, `Contrato: ${numero}`, `Empresa: ${empresa}`];
  if (contrato?.fecha_fin) lineas.push(`Fecha fin: ${safeDateToIso(contrato.fecha_fin)}`);
  if (solicitadoPor) lineas.push(`Solicitado por: ${solicitadoPor}`);
  if (resueltoPor) lineas.push(`Resuelto por: ${resueltoPor}`);
  if (extra.motivo) lineas.push(`Motivo: ${extra.motivo}`);

  const text = `Hola,\n\n${lineas.filter(Boolean).join('\n')}\n\nAviso del módulo de contratos.\n`;
  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#111827;">
      <p>Hola,</p>
      <p><strong>${titulo}</strong></p>
      ${detalle ? `<p>${detalle}</p>` : ''}
      <ul style="padding-left:1rem;margin:0.5rem 0 1rem;">
        <li><strong>Contrato:</strong> ${numero}</li>
        <li><strong>Empresa:</strong> ${empresa}</li>
        ${contrato?.fecha_fin ? `<li><strong>Fecha fin:</strong> ${safeDateToIso(contrato.fecha_fin)}</li>` : ''}
        ${solicitadoPor ? `<li><strong>Solicitado por:</strong> ${solicitadoPor}</li>` : ''}
        ${resueltoPor ? `<li><strong>Resuelto por:</strong> ${resueltoPor}</li>` : ''}
        ${extra.motivo ? `<li><strong>Motivo:</strong> ${extra.motivo}</li>` : ''}
      </ul>
      <p style="color:#6b7280;font-size:0.9rem;">Aviso del módulo de contratos.</p>
    </div>
  `;

  return { subject, text, html };
}

function createContratosNotificacionesEventosService(dbQuery, deps) {
  const {
    SQL_CONTRATO_SELECT,
    normalizeEmail,
    isValidEmail,
    sendMailWithFallback,
    mailer,
    correoPlantillas,
    mailOutbox,
    isMailQueueableError,
    mailHealth,
  } = deps;

  async function resolveMail(contrato, evento, extra = {}) {
    const eventoKey = String(evento || '').trim();
    if (
      correoPlantillas &&
      (eventoKey === 'por_vencer' || eventoKey === 'vencido' || eventoKey === 'cancelado')
    ) {
      const plantillas = await correoPlantillas.loadPlantillas();
      const diasRestantes =
        extra.diasRestantes != null
          ? Number(extra.diasRestantes)
          : correoPlantillas.calcDiasRestantes(contrato?.fecha_fin);
      return correoPlantillas.renderMail(
        eventoKey,
        contrato,
        {
          ...extra,
          diasRestantes,
          diasAntes: extra.diasRestantes != null ? Number(extra.diasRestantes) : diasRestantes,
        },
        plantillas
      );
    }
    return buildMail(contrato, evento, extra);
  }

  async function fetchContrato(numero) {
    const num = String(numero || '').trim();
    if (!num) return null;
    const rows = await dbQuery(`${SQL_CONTRATO_SELECT} WHERE c.numero_contrato = ? LIMIT 1`, [num]);
    return rows[0] || null;
  }

  async function sendEvento(numeroContrato, evento, extra = {}) {
    const contrato = extra.contrato || (await fetchContrato(numeroContrato));
    if (!contrato) return { ok: false, skipped: true, reason: 'sin_contrato' };

    const destinosRaw = listCorreosPorEvento(contrato, evento);
    const destinos = [
      ...new Set(
        destinosRaw.map((d) => normalizeEmail(d)).filter((d) => d && isValidEmail(d))
      ),
    ];
    if (!destinos.length) return { ok: false, skipped: true, reason: 'sin_destinos', evento };

    const mail = await resolveMail(contrato, evento, extra);
    const numero = String(contrato.numero_contrato || numeroContrato || '').trim();
    let enviados = 0;
    let encolados = 0;
    const smtpDown = mailer.mode === 'smtp' && mailHealth && !mailHealth.isAvailable();

    async function enqueueNotificacion(destino) {
      if (!mailOutbox?.enqueue) return false;
      const r = await mailOutbox.enqueue({
        tipo: 'notificacion_contrato',
        refKey: `${numero}:${evento}`,
        destino,
        asunto: mail.subject,
        cuerpoTexto: mail.text,
        cuerpoHtml: mail.html,
        payload: { kind: 'notificacion', numero_contrato: numero, evento },
      });
      return Boolean(r?.ok);
    }

    for (const destino of destinos) {
      if (smtpDown) {
        if (await enqueueNotificacion(destino)) encolados += 1;
        continue;
      }
      try {
        await sendMailWithFallback({
          from: mailer.from,
          to: destino,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        });
        enviados += 1;
      } catch (err) {
        const queueable = typeof isMailQueueableError === 'function' && isMailQueueableError(err);
        if (queueable && (await enqueueNotificacion(destino))) {
          encolados += 1;
          continue;
        }
        console.warn(
          `[NOTIF-CONTRATO:${evento}] No se pudo enviar a ${destino}:`,
          err?.message || err
        );
      }
    }
    return { ok: enviados > 0 || encolados > 0, enviados, encolados, destinos, evento };
  }

  async function disparar(numeroContrato, evento, extra = {}) {
    try {
      return await sendEvento(numeroContrato, evento, extra);
    } catch (err) {
      console.warn(`[NOTIF-CONTRATO:${evento}]`, err?.message || err);
      return { ok: false, error: err?.message || String(err) };
    }
  }

  return {
    buildMail,
    sendEvento,
    disparar,
    fetchContrato,
  };
}

module.exports = {
  createContratosNotificacionesEventosService,
  ACCION_LABELS,
  EVENTO_TITULOS,
};
