import { usePermissions } from '../context/PermissionsContext';

function joinClass(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function EditTableActionButton({
  module = 'contratos',
  action = 'edit',
  onClick,
  className = '',
  title = 'Editar',
  disabled: disabledProp,
  ...rest
}) {
  const { can } = usePermissions();
  if (!can(module, action)) return null;
  return (
    <button
      type="button"
      className={joinClass('btn-table-icon-action', 'btn-table-icon-action--edit', className)}
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabledProp === true}
      {...rest}
    >
      <i className="bi bi-pencil-square" aria-hidden="true" />
    </button>
  );
}

export function DeleteTableActionButton({
  module = 'contratos',
  action = 'delete',
  onClick,
  className = '',
  title = 'Eliminar',
  disabled: disabledProp,
  ...rest
}) {
  const { can } = usePermissions();
  if (!can(module, action)) return null;
  return (
    <button
      type="button"
      className={joinClass('btn-table-icon-action', 'btn-table-icon-action--delete', className)}
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabledProp === true}
      {...rest}
    >
      <i className="bi bi-trash3" aria-hidden="true" />
    </button>
  );
}

export function CancelTableActionButton({
  module = 'contratos',
  action = 'edit',
  onClick,
  className = '',
  title = 'Cancelar contrato',
  disabled: disabledProp,
  ...rest
}) {
  const { can } = usePermissions();
  if (!can(module, action)) return null;
  return (
    <button
      type="button"
      className={joinClass('btn-table-icon-action', 'btn-table-icon-action--cancel', className)}
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabledProp === true}
      {...rest}
    >
      <i className="bi bi-x-circle" aria-hidden="true" />
    </button>
  );
}

export function InfoTableActionButton({
  module = 'contratos',
  action = 'view',
  onClick,
  className = '',
  title = 'Ver información del contrato',
  disabled: disabledProp,
  ...rest
}) {
  const { can } = usePermissions();
  if (!can(module, action)) return null;
  return (
    <button
      type="button"
      className={joinClass('btn-table-icon-action', 'btn-table-icon-action--info', className)}
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabledProp === true}
      {...rest}
    >
      <i className="bi bi-info-circle" aria-hidden="true" />
    </button>
  );
}

export function RenewTableActionButton({
  module = 'contratos',
  action = 'edit',
  onClick,
  className = '',
  title = 'Renovar contrato',
  disabled: disabledProp,
  ...rest
}) {
  const { can } = usePermissions();
  if (!can(module, action)) return null;
  return (
    <button
      type="button"
      className={joinClass('btn-table-icon-action', 'btn-table-icon-action--renew', className)}
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabledProp === true}
      {...rest}
    >
      <i className="bi bi-arrow-repeat" aria-hidden="true" />
    </button>
  );
}
