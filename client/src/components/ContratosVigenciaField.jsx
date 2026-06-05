import { sanitizarEnteroVigencia } from '../lib/contratosVigencia';

function ContratosVigenciaField({ partes, onChange, disabled, invalid, error }) {
  const actualizar = (campo, valor) => {
    onChange({
      ...partes,
      [campo]: sanitizarEnteroVigencia(valor),
    });
  };

  return (
    <div
      className={`minimal-field${invalid ? ' minimal-field--invalid' : ''}`}
      data-contrato-field="vigencia"
    >
      <label className="minimal-label">Vigencia:</label>
      <div className={`contratos-vigencia-partes${invalid ? ' is-invalid' : ''}`}>
        <div className="contratos-vigencia-partes__campo">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="minimal-input contratos-vigencia-partes__input"
            placeholder="0"
            value={partes.anios ?? ''}
            onChange={(e) => actualizar('anios', e.target.value)}
            disabled={disabled}
            aria-label="Años de vigencia"
          />
          <span className="contratos-vigencia-partes__label">Años</span>
        </div>
        <div className="contratos-vigencia-partes__campo">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="minimal-input contratos-vigencia-partes__input"
            placeholder="0"
            value={partes.meses ?? ''}
            onChange={(e) => actualizar('meses', e.target.value)}
            disabled={disabled}
            aria-label="Meses de vigencia"
          />
          <span className="contratos-vigencia-partes__label">Meses</span>
        </div>
        <div className="contratos-vigencia-partes__campo">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="minimal-input contratos-vigencia-partes__input"
            placeholder="0"
            value={partes.dias ?? ''}
            onChange={(e) => actualizar('dias', e.target.value)}
            disabled={disabled}
            aria-label="Días de vigencia"
          />
          <span className="contratos-vigencia-partes__label">Días</span>
        </div>
      </div>
      {error ? <small className="minimal-field__error">{error}</small> : null}
    </div>
  );
}

export default ContratosVigenciaField;
