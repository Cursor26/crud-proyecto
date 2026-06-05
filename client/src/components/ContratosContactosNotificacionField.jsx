import {
  contactosFromContrato,
  isValidEmailNotificacion,
  normalizarContactoNotificacion,
} from '../lib/contratosContactosNotificacion';

const MAX_CONTACTOS = 12;

function ContratosContactosNotificacionField({ contactos, onChange, disabled }) {
  const lista = Array.isArray(contactos) ? contactos : [];

  const actualizar = (index, campo, valor) => {
    onChange(
      lista.map((c, i) => (i === index ? { ...c, [campo]: valor } : c))
    );
  };

  const quitar = (index) => {
    onChange(lista.filter((_, i) => i !== index));
  };

  const agregar = () => {
    if (lista.length >= MAX_CONTACTOS) return;
    onChange([...lista, { nombre: '', correo: '' }]);
  };

  const ayudaCorreoNotificacion =
    lista.length > 0
      ? `A estos correos se enviarán los recordatorios de vencimiento del contrato. (${lista.length} contacto${lista.length === 1 ? '' : 's'})`
      : 'A estos correos se enviarán los recordatorios de vencimiento del contrato.';

  return (
    <div className="minimal-field contrato-contactos-notif">
      <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
        <label
          className="minimal-label mb-0 contrato-anexos-label-tip"
          title={ayudaCorreoNotificacion}
        >
          Correo de notificación:
        </label>
        {!disabled && (
          <button
            type="button"
            className="contrato-contactos-notif-add"
            onClick={agregar}
            disabled={lista.length >= MAX_CONTACTOS}
            title="Agregar contacto de notificación"
            aria-label="Agregar contacto de notificación"
          >
            +
          </button>
        )}
      </div>

      {lista.length === 0 ? (
        <p className="text-muted small mb-2">
          Pulse <strong>+</strong> para añadir personas a notificar (nombre o cargo y correo).
        </p>
      ) : (
        <div className="contrato-contactos-notif-list mb-2">
          {lista.map((c, idx) => (
            <div key={`contacto-${idx}`} className="contrato-contactos-notif-row">
              <input
                type="text"
                className="minimal-input contrato-contactos-notif-nombre"
                placeholder="Nombre o cargo"
                value={c.nombre || ''}
                onChange={(e) => actualizar(idx, 'nombre', e.target.value)}
                disabled={disabled}
                aria-label={`Nombre o cargo, contacto ${idx + 1}`}
              />
              <input
                type="email"
                className={`minimal-input contrato-contactos-notif-correo ${
                  c.correo && !isValidEmailNotificacion(c.correo) ? 'is-invalid' : ''
                }`}
                placeholder="correo@dominio.com"
                value={c.correo || ''}
                onChange={(e) => actualizar(idx, 'correo', e.target.value)}
                disabled={disabled}
                aria-label={`Correo, contacto ${idx + 1}`}
              />
              {!disabled && (
                <button
                  type="button"
                  className="contrato-contactos-notif-remove"
                  onClick={() => quitar(idx)}
                  title="Quitar contacto"
                  aria-label={`Quitar contacto ${idx + 1}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export function contactosStateFromContrato(contrato) {
  return contactosFromContrato(contrato).map((c) => ({
    nombre: c.nombre || '',
    correo: c.correo || '',
  }));
}

export default ContratosContactosNotificacionField;
