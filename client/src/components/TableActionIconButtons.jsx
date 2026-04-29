import { usePuedeEscribir } from '../context/PuedeEscribirContext';

function joinClass(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function EditTableActionButton({ onClick, className = '', title = 'Editar', disabled: disabledProp, ...rest }) {
  const puedeEscribir = usePuedeEscribir();
  const disabled = disabledProp === true || !puedeEscribir;
  return (
    <button
      type="button"
      className={joinClass('btn-table-icon-action', 'btn-table-icon-action--edit', className)}
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      {...rest}
    >
      <i className="bi bi-pencil-square" aria-hidden="true" />
    </button>
  );
}

export function DeleteTableActionButton({ onClick, className = '', title = 'Eliminar', disabled: disabledProp, ...rest }) {
  const puedeEscribir = usePuedeEscribir();
  const disabled = disabledProp === true || !puedeEscribir;
  return (
    <button
      type="button"
      className={joinClass('btn-table-icon-action', 'btn-table-icon-action--delete', className)}
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      {...rest}
    >
      <i className="bi bi-trash3" aria-hidden="true" />
    </button>
  );
}

export function RenewTableActionButton({ onClick, className = '', title = 'Renovar contrato', disabled: disabledProp, ...rest }) {
  const puedeEscribir = usePuedeEscribir();
  const disabled = disabledProp === true || !puedeEscribir;
  return (
    <button
      type="button"
      className={joinClass('btn-table-icon-action', 'btn-table-icon-action--renew', className)}
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      {...rest}
    >
      <i className="bi bi-arrow-repeat" aria-hidden="true" />
    </button>
  );
}
