function joinClass(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function EditTableActionButton({ onClick, className = '', title = 'Editar', ...rest }) {
  return (
    <button
      type="button"
      className={joinClass('btn-table-icon-action', 'btn-table-icon-action--edit', className)}
      onClick={onClick}
      title={title}
      aria-label={title}
      {...rest}
    >
      <i className="bi bi-pencil-square" aria-hidden="true" />
    </button>
  );
}

export function DeleteTableActionButton({ onClick, className = '', title = 'Eliminar', ...rest }) {
  return (
    <button
      type="button"
      className={joinClass('btn-table-icon-action', 'btn-table-icon-action--delete', className)}
      onClick={onClick}
      title={title}
      aria-label={title}
      {...rest}
    >
      <i className="bi bi-trash3" aria-hidden="true" />
    </button>
  );
}
