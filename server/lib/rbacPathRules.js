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

  if (path.startsWith('/config/contratos-correo-plantillas')) {
    if (path.includes('/probar')) {
      return { module: 'contratos', action: 'edit' };
    }
    return { module: 'contratos', action: m === 'GET' ? 'view' : 'edit' };
  }

  if (path.startsWith('/config/correo')) {
    return { module: 'usuarios', action: actionFromMethod(m) };
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
    if (m === 'POST' && (path.includes('/verificar-aprobar') || path.includes('/verificar-rechazar'))) {
      return { module: 'contratos', action: 'verify' };
    }
    if (path.includes('/juridico-comentarios')) {
      return { module: 'contratos', action: m === 'GET' ? 'view' : 'verify' };
    }
    if (path.includes('/juridico-adjuntos')) {
      return { module: 'contratos', action: 'view' };
    }
    if (m === 'POST' && path.includes('/retirar-solicitud')) {
      return { module: 'contratos', action: 'edit' };
    }
    if (m === 'POST' && (path.includes('/aprobar') || path.includes('/rechazar'))) {
      return { module: 'contratos', action: 'approve' };
    }
    if (path === '/send-contrato-reminder') return { module: 'contratos', action: 'approve' };
    return { module: 'contratos', action: actionFromMethod(m) };
  }

  if (path === '/tabla1' || path === '/create' || path === '/update' || path.startsWith('/delete/')) {
    return { module: 'usuarios', action: actionFromMethod(m) };
  }

  return null;
}

module.exports = { resolveRouteAction, actionFromMethod };
