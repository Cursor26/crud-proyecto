/**
 * Entrada de medida numérica para módulos de producción: feedback is-invalid y mensaje bajo el campo.
 */
function ProduccionFormCampoNumero({
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
}) {
  return (
    <div className="col-md-4 mb-2">
      <label className="small d-block mb-0" htmlFor={`produccion-field-${name}`}>
        {label}
      </label>
      <input
        id={`produccion-field-${name}`}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={`form-control form-control-sm ${error ? 'is-invalid' : ''}`}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `produccion-err-${name}` : undefined}
      />
      {error ? (
        <div id={`produccion-err-${name}`} className="invalid-feedback d-block small">
          {error}
        </div>
      ) : null}
    </div>
  );
}

export default ProduccionFormCampoNumero;
