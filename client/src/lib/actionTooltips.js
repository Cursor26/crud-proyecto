/** Textos breves para tooltips nativos (atributo title) en botones y controles. */
export const TIP = {
  guardar: 'Guardar los cambios en el servidor',
  guardarConfig: 'Guardar la configuración de recordatorios',
  cancelar: 'Cerrar sin guardar los cambios',
  cerrar: 'Cerrar esta ventana',
  anadir: 'Añadir un nuevo elemento',
  anadirReglaTipo: 'Añadir una regla de aviso para un tipo de contrato concreto',
  eliminar: 'Eliminar este elemento',
  eliminarReglaTipo: 'Quitar esta regla por tipo de contrato',
  consultar: 'Consultar o actualizar la información',
  ejecutarRecordatorios: 'Enviar recordatorios ahora (prueba manual, no espera al horario automático)',
  activarRecordatorios: 'Activar o desactivar el envío automático de recordatorios por correo',
  tipoContratoRegla: 'Tipo de contrato al que aplica esta regla (sustituye la regla por prioridad)',
  diasReglaTipo: 'Días antes del vencimiento en los que enviar aviso, separados por comas (ej. 30, 15, 7)',
  reglaTipoActiva: 'Activar o desactivar esta regla sin eliminarla',
  diaPrioridad: 'Días antes del vencimiento en los que enviar el aviso para esta prioridad',
  nuevoRol: 'Crear un nuevo rol personalizado',
  guardarRol: 'Guardar permisos y descripción del rol seleccionado',
  eliminarRol: 'Eliminar el rol personalizado seleccionado (no aplica a roles de sistema)',
  nuevoTipoContrato: 'Registrar un nuevo tipo de contrato en el catálogo',
  editarTipoContrato: 'Modificar el nombre y el estado de este tipo de contrato',
  desactivarTipoContrato:
    'Ocultar este tipo al crear contratos nuevos; no se borra aunque ya esté en contratos existentes',
  activarTipoContrato: 'Volver a mostrar este tipo al registrar contratos nuevos',
  tipoContratoActivo: 'Si está activo, aparece al crear contratos nuevos',
  saludCartera: 'Indicador 0-100: vencimientos, documentación y solicitudes pendientes de aprobación',
  pendientesAprobacion:
    'Contratos o cambios que esperan la acción de un usuario con permiso de aprobar',
  totalCartera: 'Contratos operativos más solicitudes pendientes de aprobación',
};

/**
 * Mapa por texto visible del botón → tooltip descriptivo.
 * Cubre botones sin title en todo el proyecto.
 */
export const LABEL_TIPS = {
  Desactivar: TIP.desactivarTipoContrato,
  Activar: TIP.activarTipoContrato,
  Editar: 'Abrir formulario para modificar los datos de este registro',
  Eliminar: 'Borrar este registro de forma permanente',
  Cancelar: TIP.cancelar,
  Guardar: TIP.guardar,
  'Guardar configuración': TIP.guardarConfig,
  Actualizar: 'Guardar los cambios o recargar la información mostrada',
  Crear: 'Registrar el nuevo elemento',
  'Crear rol': 'Crear el rol personalizado con los permisos indicados',
  Consultar: 'Actualizar la lista con los filtros actuales',
  'Nuevo tipo': TIP.nuevoTipoContrato,
  Nuevo: 'Crear un registro nuevo',
  'Agregar contrato': 'Abrir formulario para registrar un contrato nuevo',
  'Exportar Excel': 'Descargar la tabla actual en formato Excel',
  PDF: 'Descargar la tabla actual en formato PDF',
  CSV: 'Descargar la tabla en CSV (UTF-8, separador ;)',
  'Elegir archivo': 'Seleccionar imagen para el icono de la empresa',
  'Quitar icono': 'Eliminar el icono de empresa seleccionado',
  'Agregar PDF(s)': 'Adjuntar uno o más archivos PDF al contrato (máx. 5 MB c/u)',
  Ver: 'Abrir el documento en una nueva pestaña',
  Quitar: 'Eliminar este elemento de la lista',
  Renovar: 'Iniciar la renovación de este contrato',
  'Renovar vencidos': 'Renovar en lote todos los contratos vencidos de la cola',
  Rechazar: 'Rechazar la solicitud pendiente de aprobación',
  Aprobar: 'Aprobar y aplicar la solicitud pendiente',
  'Ver renovaciones': 'Ir a la sección de renovaciones de contratos',
  'Ejecutar ahora (prueba)': TIP.ejecutarRecordatorios,
  'Probar conexión': 'Enviar un correo de prueba con la configuración SMTP actual',
  Recargar: 'Volver a cargar la configuración desde el servidor',
  'Nuevo usuario': 'Abrir formulario para registrar un usuario nuevo',
  'Eliminar rol': TIP.eliminarRol,
  Descargar: 'Descargar el documento generado',
  'Ver historial': 'Consultar el historial de cambios',
  Sincronizar: 'Sincronizar ahora con la fuente de datos',
  Reintentar: 'Volver a cargar la configuración tras el error',
  'Agregar usuario': 'Abrir formulario para registrar un usuario nuevo',
  'Cargando…': 'Recargar los datos con los filtros actuales',
  'Enviar correo de prueba': 'Enviar un correo de prueba al destinatario indicado',
  'Enviando…': 'Enviar un correo de prueba al destinatario indicado',
};

function visibleButtonText(el) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll('i, svg, [aria-hidden="true"]').forEach((node) => node.remove());
  return clone.textContent?.replace(/\s+/g, ' ').trim() || '';
}

/** Resuelve tooltip para un botón u otro control interactivo. */
export function tipForInteractiveElement(el) {
  if (!el || el.title?.trim()) return null;

  const aria = el.getAttribute('aria-label')?.trim();
  if (aria) return aria;

  const dataTip = el.getAttribute('data-tip')?.trim();
  if (dataTip) return dataTip;

  const tag = el.tagName;
  const role = el.getAttribute('role');

  if (tag === 'BUTTON' || role === 'button' || el.classList?.contains('btn')) {
    const text = visibleButtonText(el);
    if (!text) return null;
    if (LABEL_TIPS[text]) return LABEL_TIPS[text];
    if (text.startsWith('Guardando')) return TIP.guardar;
    if (text.startsWith('Ejecutando')) return TIP.ejecutarRecordatorios;
    if (text.startsWith('Exportar')) return 'Descargar los datos visibles en formato Excel';
  }

  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    const placeholder = el.getAttribute('placeholder')?.trim();
    if (placeholder) return placeholder;
  }

  if (tag === 'SELECT') {
    const label = el.closest('.mb-3, .minimal-field, .form-group')?.querySelector('label');
    if (label?.textContent?.trim()) return label.textContent.trim();
  }

  return null;
}
