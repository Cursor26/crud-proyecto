export const MAIL_UNAVAILABLE_MESSAGE =
  'Los servicios de correo electrónico no están disponibles. Contacte con el administrador.';

export const MAIL_QUEUED_MESSAGE =
  'El correo quedó en cola y se enviará automáticamente cuando SMTP esté disponible.';

export function mailQueueBannerMessage({ smtp_disponible, mensaje, correos_pendientes }) {
  if (smtp_disponible === false) {
    const pending = Number(correos_pendientes) || 0;
    if (pending > 0) {
      return `${mensaje || MAIL_UNAVAILABLE_MESSAGE} Hay ${pending} correo(s) en cola pendiente(s) de envío.`;
    }
    return mensaje || MAIL_UNAVAILABLE_MESSAGE;
  }
  const pending = Number(correos_pendientes) || 0;
  if (pending > 0) {
    return `${pending} correo(s) pendiente(s) en cola; se enviarán automáticamente cuando SMTP esté disponible.`;
  }
  return null;
}

export function isMailUnavailableResponse(err) {
  const code = String(err?.response?.data?.code || '').toUpperCase();
  const status = Number(err?.response?.status);
  const msg = String(err?.response?.data?.message || '');
  return code === 'MAIL_UNAVAILABLE' || status === 503 || msg.includes('correo electrónico no están disponibles');
}

export function mailUnavailableMessage(err) {
  return err?.response?.data?.message || MAIL_UNAVAILABLE_MESSAGE;
}
