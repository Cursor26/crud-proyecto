import { INSTRUCCIONES_BULLETS } from '../utils/produccionFormValidation';

/**
 * Instrucciones fijas (reglas de negocio) para carga de datos de producción.
 * @param {{ titulo: string, nombreModulo: string }} props
 */
function ProduccionFormInstrucciones({ titulo, nombreModulo }) {
  return (
    <div
      className="alert alert-info small mb-3"
      role="region"
      aria-label={`Instrucciones para ${nombreModulo}`}
    >
      <strong className="d-block mb-1">{titulo}</strong>
      <p className="mb-2 text-body-secondary small">
        Completá las medidas por categoría. Los campos <strong>vacíos</strong> se guardan como{' '}
        <strong>0</strong>, y el <strong>0</strong> explícito está permitido. Antes de enviar, si
        detecta ceros o vacíos, el sistema te avisa y pide confirmación para no guardar de
        sorpresa con muchas celdas en cero. Solo se rechazan <strong>valores negativos</strong> o
        texto que no sea número; en ese caso el borde queda en rojo y se explica abajo al escribir
        o al intentar guardar con errores todavía presentes.
      </p>
      <ul className="mb-0 ps-3 small">
        {INSTRUCCIONES_BULLETS.map((t, i) => (
          <li key={i} className="mb-1">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ProduccionFormInstrucciones;
