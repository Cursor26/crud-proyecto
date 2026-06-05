import {
  NIVELES_CORREO,
  obtenerErroresContactosNiveles,
} from './contratosCorreosNiveles';
import { partesAVigenciaAlmacenada } from './contratosVigencia';

export function validarFormularioContrato({
  numero,
  empresa,
  tipo,
  fechaInicio,
  vigenciaPartes,
  contactosNiveles,
  esProveedor,
}) {
  const errors = {};

  if (!String(numero || '').trim()) {
    errors.numero_contrato = 'N° de contrato obligatorio.';
  }
  if (!String(empresa || '').trim()) {
    errors.empresa = 'Empresa obligatoria.';
  }
  if (!String(tipo || '').trim()) {
    errors.tipo_contrato = 'Seleccione el tipo de contrato.';
  }
  if (!String(fechaInicio || '').trim()) {
    errors.fecha_inicio = 'Fecha de inicio obligatoria.';
  }

  const vigencia = partesAVigenciaAlmacenada(vigenciaPartes);
  if (!vigencia) {
    errors.vigencia = 'Indique al menos años, meses o días de vigencia.';
  }

  const erroresCorreos = obtenerErroresContactosNiveles(contactosNiveles, { esProveedor });
  for (const nivel of NIVELES_CORREO) {
    if (erroresCorreos[nivel]) errors[nivel] = erroresCorreos[nivel];
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
