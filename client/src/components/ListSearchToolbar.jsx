/**
 * Barra de búsqueda general; opcionalmente hijos adicionales (filtros por campo).
 */
export function ListSearchToolbar({ value, onChange, placeholder = 'Buscar…', children = null }) {
  return (
    <div className="d-flex flex-wrap align-items-end gap-2 mb-3">
      <div className="flex-grow-1" style={{ minWidth: 200 }}>
        <label className="form-label small text-muted mb-0">Búsqueda general</label>
        <input
          type="search"
          className="form-control form-control-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>
      {children}
    </div>
  );
}

export default ListSearchToolbar;
