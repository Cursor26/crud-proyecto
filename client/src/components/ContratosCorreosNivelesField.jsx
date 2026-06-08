import {
  isValidEmailNotificacion,
  normalizarContactoNotificacion,
} from '../lib/contratosContactosNotificacion';
import {
  MAX_CONTACTOS_POR_NIVEL,
  contactosNivelesStateFromContrato as nivelesStateFromContrato,
} from '../lib/contratosCorreosNiveles';

const CONFIG_NIVELES = {
  proveedor_cliente: {
    labelProveedor: 'Proveedor:',
    labelCliente: 'Cliente:',
    tooltipProveedor:
      'Obligatorio: al menos un correo. Correos del proveedor de este contrato. Recibirán avisos automáticos o manuales cuando este contrato esté por vencer, se cancele o se modifique.',
    tooltipCliente:
      'Obligatorio: al menos un correo. Correos del cliente de este contrato. Recibirán avisos automáticos o manuales cuando este contrato esté por vencer, se cancele o se modifique.',
  },
  notificaciones: {
    label: 'Notificaciones:',
    tooltip:
      'Obligatorio: al menos un correo. Recibirán avisos automáticos o manuales cuando este contrato esté por vencer, venza, se cancele, se elimine o se modifique.',
  },
  autorizado_manipular: {
    label: 'Autorizado a manipular:',
    tooltip:
      'Obligatorio: al menos un correo. Recibirán avisos de vencimiento de este contrato y cuando se apruebe un cambio de estado (crear, modificar, cancelar o eliminar).',
  },
  autorizado_aprobar: {
    label: 'Autorizado a aprobar:',
    tooltip:
      'Obligatorio: al menos un correo. Recibirán avisos cuando se solicite un cambio de estado en este contrato para revisarlo en la sección Pendientes.',
  },
};

function filasVisibles(lista) {
  return Array.isArray(lista) && lista.length > 0 ? lista : [{ nombre: '', correo: '' }];
}

function CorreoNivelLista({ nivelKey, lista, onChange, disabled, label, tooltip, error }) {
  const filas = filasVisibles(lista);

  const actualizarCorreo = (index, valor) => {
    const base = lista.length > 0 ? lista.map((c) => ({ ...c })) : [{ nombre: '', correo: '' }];
    base[index] = { ...normalizarContactoNotificacion(base[index]), correo: valor };
    onChange(base);
  };

  const quitar = (index) => {
    if (lista.length <= 1) {
      onChange([]);
      return;
    }
    onChange(lista.filter((_, i) => i !== index));
  };

  const agregar = () => {
    const base = lista.length > 0 ? lista : [{ nombre: '', correo: '' }];
    if (base.length >= MAX_CONTACTOS_POR_NIVEL) return;
    onChange([...base, { nombre: '', correo: '' }]);
  };

  const totalGuardados = lista.filter((c) => String(c?.correo || '').trim()).length;
  const ayuda =
    totalGuardados > 0
      ? `${tooltip} (${totalGuardados} correo${totalGuardados === 1 ? '' : 's'})`
      : tooltip;

  return (
    <div
      className={`contrato-contactos-notif contrato-correo-nivel-block${error ? ' minimal-field--invalid' : ''}`}
      data-contrato-field={nivelKey}
    >
      <label className="minimal-label contrato-correo-nivel-block__label contrato-anexos-label-tip" title={ayuda}>
        {label}
      </label>

      <div className="contrato-correo-nivel-lines">
        {filas.map((c, idx) => (
          <div key={`${nivelKey}-${idx}`} className="contrato-correo-nivel-line">
            <input
              type="email"
              className={`minimal-input contrato-correo-nivel-line__input contrato-contactos-notif-correo ${
                c.correo && !isValidEmailNotificacion(c.correo) ? 'is-invalid' : ''
              }`}
              placeholder="correo@dominio.com"
              value={c.correo || ''}
              onChange={(e) => actualizarCorreo(idx, e.target.value)}
              disabled={disabled}
              aria-label={`${label.replace(':', '')} ${idx + 1}`}
            />

            {!disabled ? (
              idx === 0 ? (
                <button
                  type="button"
                  className="contrato-contactos-notif-add contrato-correo-nivel-line__action"
                  onClick={agregar}
                  disabled={Math.max(lista.length, 1) >= MAX_CONTACTOS_POR_NIVEL}
                  title={`Agregar otro correo — ${label}`}
                  aria-label={`Agregar otro correo — ${label}`}
                >
                  +
                </button>
              ) : (
                <button
                  type="button"
                  className="contrato-contactos-notif-remove contrato-correo-nivel-line__action"
                  onClick={() => quitar(idx)}
                  title="Quitar correo"
                  aria-label={`Quitar ${label.replace(':', '')} ${idx + 1}`}
                >
                  ×
                </button>
              )
            ) : (
              <span className="contrato-correo-nivel-line__action-spacer" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      {error ? <small className="minimal-field__error">{error}</small> : null}
    </div>
  );
}

function ContratosCorreosNivelesField({ niveles, onChange, disabled, esProveedor, errores = {} }) {
  const data = niveles && typeof niveles === 'object' ? niveles : {};

  const setNivel = (nivelKey, lista) => {
    onChange({
      ...data,
      [nivelKey]: Array.isArray(lista) ? lista : [],
    });
  };

  const cfgPc = CONFIG_NIVELES.proveedor_cliente;

  return (
    <div className="minimal-field contrato-correos-niveles">
      <p className="minimal-label mb-2">
        Correos de notificación <span className="text-danger">*</span>
      </p>

      <CorreoNivelLista
        nivelKey="proveedor_cliente"
        lista={Array.isArray(data.proveedor_cliente) ? data.proveedor_cliente : []}
        onChange={(lista) => setNivel('proveedor_cliente', lista)}
        disabled={disabled}
        label={esProveedor ? cfgPc.labelProveedor : cfgPc.labelCliente}
        tooltip={esProveedor ? cfgPc.tooltipProveedor : cfgPc.tooltipCliente}
        error={errores.proveedor_cliente}
      />

      <CorreoNivelLista
        nivelKey="notificaciones"
        lista={Array.isArray(data.notificaciones) ? data.notificaciones : []}
        onChange={(lista) => setNivel('notificaciones', lista)}
        disabled={disabled}
        label={CONFIG_NIVELES.notificaciones.label}
        tooltip={CONFIG_NIVELES.notificaciones.tooltip}
        error={errores.notificaciones}
      />

      <CorreoNivelLista
        nivelKey="autorizado_manipular"
        lista={Array.isArray(data.autorizado_manipular) ? data.autorizado_manipular : []}
        onChange={(lista) => setNivel('autorizado_manipular', lista)}
        disabled={disabled}
        label={CONFIG_NIVELES.autorizado_manipular.label}
        tooltip={CONFIG_NIVELES.autorizado_manipular.tooltip}
        error={errores.autorizado_manipular}
      />

      <CorreoNivelLista
        nivelKey="autorizado_aprobar"
        lista={Array.isArray(data.autorizado_aprobar) ? data.autorizado_aprobar : []}
        onChange={(lista) => setNivel('autorizado_aprobar', lista)}
        disabled={disabled}
        label={CONFIG_NIVELES.autorizado_aprobar.label}
        tooltip={CONFIG_NIVELES.autorizado_aprobar.tooltip}
        error={errores.autorizado_aprobar}
      />
    </div>
  );
}

export { nivelesStateFromContrato as contactosNivelesStateFromContrato };

export default ContratosCorreosNivelesField;
