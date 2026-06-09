const mailHealth = require('./mailHealth');

const MAX_INTENTOS = Number(process.env.MAIL_OUTBOX_MAX_RETRIES || 5);
const BATCH_SIZE = Number(process.env.MAIL_OUTBOX_BATCH_SIZE || 25);

function createMailOutboxService(dbQuery) {
  async function ensureTable() {
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, '..', 'sql', 'mail_outbox.sql');
    const raw = fs.readFileSync(sqlPath, 'utf8');
    await dbQuery(raw.trim());
  }

  async function countPending() {
    const rows = await dbQuery(
      `SELECT COUNT(*) AS n FROM mail_outbox WHERE estado = 'pendiente'`
    );
    return Number(rows?.[0]?.n || 0);
  }

  async function enqueue({ tipo, refKey, destino, asunto, cuerpoTexto, cuerpoHtml, payload }) {
    const t = String(tipo || 'raw').trim();
    const ref = String(refKey || '').trim().slice(0, 255);
    const to = String(destino || '').trim().toLowerCase();
    if (!to || !asunto) return { ok: false, reason: 'datos_incompletos' };

    const dup = await dbQuery(
      `SELECT id FROM mail_outbox
        WHERE estado = 'pendiente' AND tipo = ? AND ref_key = ? AND destino = ?
        LIMIT 1`,
      [t, ref, to]
    );
    if (dup?.length) return { ok: true, id: dup[0].id, duplicate: true };

    const ins = await dbQuery(
      `INSERT INTO mail_outbox
        (tipo, ref_key, destino, asunto, cuerpo_texto, cuerpo_html, payload_json)
       VALUES (?,?,?,?,?,?,?)`,
      [
        t,
        ref || null,
        to,
        String(asunto).slice(0, 500),
        cuerpoTexto || null,
        cuerpoHtml || null,
        JSON.stringify(payload || {}),
      ]
    );
    return { ok: true, id: ins.insertId, duplicate: false };
  }

  async function processPending(sendMailFn, { onSent } = {}, limit = BATCH_SIZE) {
    if (!mailHealth.isAvailable()) {
      return { sent: 0, failed: 0, skipped: true, pending: await countPending() };
    }

    const rows = await dbQuery(
      `SELECT id, tipo, ref_key, destino, asunto, cuerpo_texto, cuerpo_html, payload_json, intentos
         FROM mail_outbox
        WHERE estado = 'pendiente'
        ORDER BY creado_en ASC
        LIMIT ?`,
      [Math.min(100, Math.max(1, limit))]
    );

    let sent = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        await sendMailFn({
          to: row.destino,
          subject: row.asunto,
          text: row.cuerpo_texto || '',
          html: row.cuerpo_html || '',
        });
        await dbQuery(
          `UPDATE mail_outbox SET estado = 'enviado', enviado_en = NOW(), ultimo_error = NULL WHERE id = ?`,
          [row.id]
        );
        if (typeof onSent === 'function') {
          try {
            await onSent(row);
          } catch (hookErr) {
            console.warn('[MAIL-OUTBOX] onSent:', hookErr?.message || hookErr);
          }
        }
        sent += 1;
      } catch (error) {
        const intentos = Number(row.intentos || 0) + 1;
        const agotado = intentos >= MAX_INTENTOS;
        await dbQuery(
          `UPDATE mail_outbox
              SET intentos = ?, ultimo_error = ?, estado = ?
            WHERE id = ?`,
          [
            intentos,
            String(error?.message || error).slice(0, 500),
            agotado ? 'fallido' : 'pendiente',
            row.id,
          ]
        );
        failed += 1;
        if (!agotado) {
          mailHealth.markUnavailable(error);
        }
        break;
      }
    }

    return { sent, failed, pending: await countPending() };
  }

  return {
    ensureTable,
    enqueue,
    countPending,
    processPending,
    MAX_INTENTOS,
  };
}

module.exports = { createMailOutboxService };
