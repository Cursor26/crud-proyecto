/**
 * Infiere módulo y acción RBAC desde método HTTP y ruta Express.
 * null = sin comprobación RBAC (solo token / rutas públicas).
 */

function actionFromMethod(method) {
  const m = String(method || 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD') return 'view';
  if (m === 'POST') return 'create';
  if (m === 'PUT' || m === 'PATCH') return 'edit';
  if (m === 'DELETE') return 'delete';
  return 'view';
}

function resolveRouteAction(method, rawPath) {
  const path = String(rawPath || '').split('?')[0];
  const m = String(method || 'GET').toUpperCase();

  if (
    path === '/login' ||
    path.startsWith('/auth/forgot') ||
    path.startsWith('/auth/reset') ||
    path === '/auth/login-avatar'
  ) {
    return null;
  }

  if (path.startsWith('/user/') || path === '/auth/logout') {
    return null;
  }

  if (path.startsWith('/rbac/')) {
    return { module: 'usuarios', action: m === 'GET' ? 'view' : 'edit' };
  }

  if (path.startsWith('/audit/')) {
    return { module: 'auditoria', action: 'view' };
  }

  if (path.includes('/recordatorios/ejecutar')) {
    return { module: 'contratos', action: 'approve' };
  }

  if (path.includes('/recordatorios-envios') || path.startsWith('/config/recordatorios-contratos')) {
    return { module: 'contratos', action: m === 'GET' ? 'view' : 'edit' };
  }

  if (path.startsWith('/config/')) {
    return { module: 'configuracion', action: actionFromMethod(m) };
  }

  if (
    path.startsWith('/usuarios') ||
    path.startsWith('/create-usuario') ||
    path.startsWith('/update-usuario') ||
    path.startsWith('/delete-usuario')
  ) {
    return { module: 'usuarios', action: actionFromMethod(m) };
  }

  if (path.startsWith('/catalogo/')) {
    return { module: 'contratos', action: actionFromMethod(m) };
  }

  if (
    path.startsWith('/contratos') ||
    path.includes('contrato') ||
    path === '/create-contrato' ||
    path === '/update-contrato' ||
    path === '/send-contrato-reminder'
  ) {
    if (m === 'POST' && path.includes('/archivar')) return { module: 'contratos', action: 'delete' };
    if (m === 'POST' && (path.includes('/aprobar') || path.includes('/rechazar'))) {
      return { module: 'contratos', action: 'approve' };
    }
    if (path === '/send-contrato-reminder') return { module: 'contratos', action: 'approve' };
    return { module: 'contratos', action: actionFromMethod(m) };
  }

  if (path.startsWith('/reporte') || path === '/reporte-personal' || path === '/reporte-consolidado-departamentos') {
    if (m === 'GET') return { module: 'reportes', action: 'view' };
    return { module: 'reportes', action: actionFromMethod(m) };
  }

  if (
    path.startsWith('/produccion') ||
    path.startsWith('/sacrificio') ||
    path.startsWith('/matadero') ||
    path.startsWith('/leche') ||
    path.includes('-sacrificio') ||
    path.includes('-matadero') ||
    path.includes('-leche')
  ) {
    return { module: 'produccion', action: actionFromMethod(m) };
  }

  const empleadosPrefixes = [
    '/empleado',
    '/empleados',
    '/licencias-empleado',
    '/historial-laboral',
    '/asistencias',
    '/certificaciones',
    '/cursos',
    '/evalcapacitacion',
    '/evaluaciones',
    '/objetivos',
    '/salarios',
    '/segseguridad',
    '/seguridad',
    '/cargos',
    '/departamentos',
    '/certificados-medicos',
    '/cert-medico',
    '/evaluaciones-medicas',
    '/eval-medica',
    '/vacaciones',
    '/turnos-trabajo',
    '/grupos-trabajo',
    '/sanciones',
    '/reconocimientos',
    '/jubilaciones',
    '/create-empleado',
    '/update-empleado',
    '/delete-empleado',
    '/create-asistencia',
    '/update-asistencia',
    '/delete-asistencia',
    '/create-certificacion',
    '/update-certificacion',
    '/delete-certificacion',
    '/create-curso',
    '/update-curso',
    '/delete-curso',
    '/create-evalcapacitacion',
    '/update-evalcapacitacion',
    '/delete-evalcapacitacion',
    '/create-evaluacion',
    '/update-evaluacion',
    '/delete-evaluacion',
    '/create-objetivo',
    '/update-objetivo',
    '/delete-objetivo',
    '/create-salario',
    '/update-salario',
    '/delete-salario',
    '/create-segseguridad',
    '/update-segseguridad',
    '/delete-segseguridad',
    '/create-seguridad',
    '/update-seguridad',
    '/delete-seguridad',
    '/create-cargo',
    '/update-cargo',
    '/delete-cargo',
    '/create-departamento',
    '/update-departamento',
    '/delete-departamento',
  ];

  if (empleadosPrefixes.some((pre) => path.startsWith(pre) || path.includes(pre.slice(1)))) {
    return { module: 'empleados', action: actionFromMethod(m) };
  }

  if (path === '/tabla1' || path === '/create' || path === '/update' || path.startsWith('/delete/')) {
    return { module: 'usuarios', action: actionFromMethod(m) };
  }

  return null;
}

module.exports = { resolveRouteAction, actionFromMethod };
