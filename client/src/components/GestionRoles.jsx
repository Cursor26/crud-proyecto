import { useState, useEffect, useCallback } from 'react';
import Axios, { API_BASE } from '../axiosConfig';
import Swal from 'sweetalert2';
import ModuleTitleBar from './ModuleTitleBar';
import { RBAC_MODULES, RBAC_ACTIONS, emptyPermissions, normalizePermissions } from '../lib/rbacModules';
import { BTN_ANADIR, BTN_ELIMINAR, BTN_GUARDAR } from '../lib/actionButtonClasses';
import { TIP } from '../lib/actionTooltips';

function clonePerms(src) {
  return normalizePermissions(src);
}

function textoUsuariosAsignados(count) {
  const n = Number(count) || 0;
  return n <= 1 ? 'asignado con este rol' : 'asignados con este rol';
}

function GestionRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [codigo, setCodigo] = useState('');
  const [permisos, setPermisos] = useState(emptyPermissions());
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const loadRoles = useCallback(() => {
    setLoading(true);
    setLoadError('');
    Axios.get(`${API_BASE}/rbac/roles`)
      .then((res) => setRoles(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        setRoles([]);
        setLoadError(err.response?.data?.message || err.message || 'No se pudo cargar roles');
      })
      .finally(() => setLoading(false));
  }, []);

  const loadRoleDetail = useCallback((idRol) => {
    Axios.get(`${API_BASE}/rbac/roles/${idRol}`)
      .then((res) => {
        const r = res.data;
        setSelectedId(r.id_rol);
        setNombre(r.nombre || '');
        setDescripcion(r.descripcion || '');
        setCodigo(r.codigo || '');
        setPermisos(clonePerms(r.permisos));
        setIsNew(false);
      })
      .catch((err) => {
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      });
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    if (loading || loadError || isNew || selectedId || !roles.length) return;
    const preferred = roles.find((r) => r.codigo === 'admin') || roles[0];
    if (preferred?.id_rol) loadRoleDetail(preferred.id_rol);
  }, [loading, loadError, isNew, selectedId, roles, loadRoleDetail]);

  const nuevoRol = () => {
    setIsNew(true);
    setSelectedId(null);
    setNombre('');
    setDescripcion('');
    setCodigo('');
    setPermisos(emptyPermissions());
  };

  const togglePerm = (moduleCodigo, actionCodigo) => {
    setPermisos((prev) => {
      const row = { ...prev[moduleCodigo] };
      const nextVal = !row[actionCodigo];

      if (actionCodigo === 'view') {
        if (!nextVal) {
          for (const a of RBAC_ACTIONS) row[a.codigo] = false;
        } else {
          row.view = true;
        }
      } else if (!nextVal) {
        row[actionCodigo] = false;
      } else {
        row.view = true;
        row[actionCodigo] = true;
      }

      return {
        ...prev,
        [moduleCodigo]: normalizePermissions({ [moduleCodigo]: row })[moduleCodigo],
      };
    });
  };

  const setRowAll = (moduleCodigo, value) => {
    setPermisos((prev) => {
      const row = {};
      for (const a of RBAC_ACTIONS) row[a.codigo] = value;
      return {
        ...prev,
        [moduleCodigo]: normalizePermissions({ [moduleCodigo]: row })[moduleCodigo],
      };
    });
  };

  const guardar = async () => {
    const nom = nombre.trim();
    if (!nom) {
      await Swal.fire('Datos incompletos', 'Indique el nombre del rol.', 'warning');
      return;
    }
    if (!isNew && Number(selectedRole?.is_system) === 1) {
      await Swal.fire(
        'Rol del sistema',
        'Los permisos de administrador, contratación y director son fijos y no se pueden modificar.',
        'info'
      );
      return;
    }
    setSaving(true);
    try {
      const body = { nombre: nom, descripcion: descripcion.trim() || null, permisos: normalizePermissions(permisos) };
      if (isNew) {
        if (codigo.trim()) body.codigo = codigo.trim().toLowerCase();
        const res = await Axios.post(`${API_BASE}/rbac/roles`, body);
        await Swal.fire('Creado', `Rol "${res.data?.nombre}" creado.`, 'success');
        loadRoles();
        if (res.data?.id_rol) loadRoleDetail(res.data.id_rol);
      } else if (selectedId) {
        await Axios.put(`${API_BASE}/rbac/roles/${selectedId}`, body);
        await Swal.fire('Guardado', 'Permisos actualizados.', 'success');
        loadRoles();
        loadRoleDetail(selectedId);
      }
    } catch (err) {
      await Swal.fire('Error', err.response?.data?.message || err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const eliminarRol = async () => {
    if (!selectedId || isNew) return;
    const role = roles.find((r) => r.id_rol === selectedId);
    if (Number(role?.is_system) === 1) {
      await Swal.fire('No permitido', 'Los roles del sistema no se pueden eliminar.', 'info');
      return;
    }
    const ok = await Swal.fire({
      title: '¿Eliminar rol?',
      text: `Se eliminará "${role?.nombre}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
    });
    if (!ok.isConfirmed) return;
    try {
      await Axios.delete(`${API_BASE}/rbac/roles/${selectedId}`);
      await Swal.fire('Eliminado', 'Rol eliminado.', 'success');
      nuevoRol();
      loadRoles();
    } catch (err) {
      await Swal.fire('Error', err.response?.data?.message || err.message, 'error');
    }
  };

  const selectedRole = roles.find((r) => r.id_rol === selectedId);
  const esRolSistema = !isNew && Number(selectedRole?.is_system) === 1;

  return (
    <div className="contratos-module">
      <ModuleTitleBar
        title="Roles y permisos (RBAC)"
        subtitle="Cree roles personalizados y asigne permisos por módulo: ver, crear, editar, eliminar, exportar y aprobar."
      />

      {loadError && (
        <div className="alert alert-danger py-2" role="alert">
          {loadError}
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-3">
          <div className="contratos-card p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Roles</h6>
              <button type="button" className={BTN_ANADIR} onClick={nuevoRol} title={TIP.nuevoRol}>
                Nuevo
              </button>
            </div>
            {loading && <p className="small text-muted">Cargando…</p>}
            <ul className="list-group list-group-flush">
              {roles.map((r) => (
                <li key={r.id_rol} className="list-group-item px-0 py-2 border-0">
                  <button
                    type="button"
                    className={`btn btn-sm w-100 text-start ${selectedId === r.id_rol && !isNew ? 'contratos-btn-view' : 'btn-outline-secondary'}`}
                    onClick={() => loadRoleDetail(r.id_rol)}
                  >
                    <span className="fw-semibold">{r.nombre}</span>
                    {Number(r.is_system) === 1 && (
                      <span className="badge bg-secondary ms-1">Sistema</span>
                    )}
                    <br />
                    <span className="small opacity-75">{r.codigo}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-lg-9">
          <div className="contratos-card p-3">
            {(isNew || selectedId) ? (
              <>
                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small mb-0">Nombre del rol</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej. Supervisor de contratos"
                      disabled={esRolSistema}
                      readOnly={esRolSistema}
                    />
                  </div>
                  {isNew && (
                    <div className="col-md-6">
                      <label className="form-label small mb-0">Código (opcional)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        placeholder="supervisor_contratos"
                      />
                    </div>
                  )}
                  {!esRolSistema && (
                    <div className="col-12">
                      <label className="form-label small mb-0">Descripción</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {!isNew && selectedRole && (
                  <p className="small text-muted mb-0">
                    Usuarios: <strong>{Number(selectedRole.usuarios_count) || 0}</strong>{' '}
                    {textoUsuariosAsignados(selectedRole.usuarios_count)}
                  </p>
                )}

                {esRolSistema && (
                  <div className="alert alert-secondary py-2 small mb-3 rbac-sistema-aviso" role="status">
                    <i className="bi bi-lock-fill me-1" aria-hidden="true" />
                    Rol predeterminado del sistema: los permisos son de solo lectura y no se pueden cambiar.
                  </div>
                )}

                <div className={`table-responsive${esRolSistema ? ' rbac-permisos-readonly' : ''}`}>
                  <table className="table table-sm table-bordered align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Módulo</th>
                        {RBAC_ACTIONS.map((a) => (
                          <th key={a.codigo} className="text-center small">
                            {a.nombre}
                          </th>
                        ))}
                        {!esRolSistema ? <th className="text-center small">Todo</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {RBAC_MODULES.map((mod) => {
                        const row = permisos[mod.codigo] || {};
                        const allOn = RBAC_ACTIONS.every((a) => row[a.codigo]);
                        return (
                          <tr key={mod.codigo}>
                            <td className="fw-semibold">{mod.nombre}</td>
                            {RBAC_ACTIONS.map((a) => {
                              const asignado = Boolean(row[a.codigo]);
                              return (
                              <td
                                key={a.codigo}
                                className="text-center"
                              >
                                {esRolSistema ? (
                                  asignado ? (
                                    <span
                                      className="rbac-perm-indicador rbac-perm-indicador--on"
                                      title="Permiso asignado"
                                      aria-label={`${mod.nombre} ${a.nombre}: asignado`}
                                    >
                                      <i className="bi bi-check-lg" aria-hidden="true" />
                                    </span>
                                  ) : (
                                    <span className="rbac-perm-indicador rbac-perm-indicador--off" aria-hidden="true">
                                      —
                                    </span>
                                  )
                                ) : (
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={asignado}
                                    onChange={() => togglePerm(mod.codigo, a.codigo)}
                                    disabled={a.codigo !== 'view' && !row.view}
                                    aria-label={`${mod.nombre} ${a.nombre}`}
                                    title={
                                      a.codigo !== 'view' && !row.view
                                        ? 'Active «Ver» para habilitar esta acción'
                                        : undefined
                                    }
                                  />
                                )}
                              </td>
                            );})}
                            {!esRolSistema ? (
                              <td className="text-center">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={allOn}
                                  onChange={(e) => setRowAll(mod.codigo, e.target.checked)}
                                  aria-label={`Todos ${mod.nombre}`}
                                />
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="contratos-form-actions">
                  {!esRolSistema ? (
                    <button
                      type="button"
                      className={BTN_GUARDAR}
                      onClick={guardar}
                      disabled={saving}
                      title={TIP.guardarRol}
                    >
                      {saving ? 'Guardando…' : isNew ? 'Crear rol' : 'Guardar permisos'}
                    </button>
                  ) : null}
                  {!isNew && selectedId && !esRolSistema && (
                    <button type="button" className={BTN_ELIMINAR} onClick={eliminarRol} title={TIP.eliminarRol}>
                      Eliminar rol
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted mb-0">Seleccione un rol de la lista o pulse «Nuevo» para crear uno personalizado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GestionRoles;
