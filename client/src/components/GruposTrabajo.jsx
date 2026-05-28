import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { Modal, Button } from 'react-bootstrap';
import { FormModal } from './FormModal';
import ModuleTitleBar from './ModuleTitleBar';
import { fmtFechaTabla } from '../utils/formatDates';
import AppSelect from './AppSelect';
import ListSearchToolbar from './ListSearchToolbar';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

const GruposTrabajo = () => {
  const puedeEscribir = usePuedeEscribir();
  const [grupos, setGrupos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [asistencias, setAsistencias] = useState([]);

  const [gNombre, setGNombre] = useState('');
  const [gDescripcion, setGDescripcion] = useState('');
  const [gActivo, setGActivo] = useState(true);
  const [editGrupo, setEditGrupo] = useState(false);
  const [idGrupoEdit, setIdGrupoEdit] = useState('');
  const [showGrupoModal, setShowGrupoModal] = useState(false);

  const [showMiembros, setShowMiembros] = useState(false);
  const [grupoMiembrosId, setGrupoMiembrosId] = useState(null);
  const [grupoMiembrosNombre, setGrupoMiembrosNombre] = useState('');
  const [listaMiembros, setListaMiembros] = useState([]);
  const [carnetAgregar, setCarnetAgregar] = useState('');

  const [asGrupo, setAsGrupo] = useState('');
  const [asFecha, setAsFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [asPresentes, setAsPresentes] = useState('');
  const [asObs, setAsObs] = useState('');
  const [editAsistencia, setEditAsistencia] = useState(false);
  const [idAsistenciaEdit, setIdAsistenciaEdit] = useState('');
  const [showAsistModal, setShowAsistModal] = useState(false);
  const [busqGrupos, setBusqGrupos] = useState('');
  const [busqAsist, setBusqAsist] = useState('');

  const getGrupos = () => {
    Axios.get('/grupos-trabajo')
      .then((res) => setGrupos(res.data))
      .catch((err) => {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      });
  };

  const getEmpleados = () => {
    Axios.get('/empleados?solo_activos=1')
      .then((res) => {
        const ordenados = [...res.data].sort((a, b) =>
          `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es')
        );
        setEmpleados(ordenados);
      })
      .catch((err) => console.error(err));
  };

  const getAsistencias = () => {
    Axios.get('/asistencia-grupal')
      .then((res) => setAsistencias(res.data))
      .catch((err) => {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      });
  };

  useEffect(() => {
    getGrupos();
    getEmpleados();
    getAsistencias();
  }, []);

  const limpiarGrupo = () => {
    setGNombre('');
    setGDescripcion('');
    setGActivo(true);
    setEditGrupo(false);
    setIdGrupoEdit('');
  };

  const submitGrupo = (e) => {
    e.preventDefault();
    if (!gNombre.trim()) {
      Swal.fire('Atención', 'Indique el nombre del grupo', 'warning');
      return;
    }
    const data = { nombre: gNombre.trim(), descripcion: gDescripcion.trim() || null, activo: gActivo ? 1 : 0 };
    if (editGrupo) {
      Axios.put(`/update-grupo-trabajo/${idGrupoEdit}`, data)
        .then(() => {
          Swal.fire('Listo', 'Grupo actualizado', 'success');
          getGrupos();
          limpiarGrupo();
          setShowGrupoModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('/create-grupo-trabajo', data)
        .then(() => {
          Swal.fire('Listo', 'Grupo creado', 'success');
          getGrupos();
          limpiarGrupo();
          setShowGrupoModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    }
  };

  const editarGrupoRow = (g) => {
    setEditGrupo(true);
    setIdGrupoEdit(g.id_grupo);
    setGNombre(g.nombre || '');
    setGDescripcion(g.descripcion || '');
    setGActivo(g.activo == 1);
    setShowGrupoModal(true);
  };

  const eliminarGrupo = (g) => {
    Swal.fire({
      title: '¿Eliminar grupo?',
      text: 'Se eliminarán miembros y registros de asistencia asociados.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((r) => {
      if (r.isConfirmed) {
        Axios.delete(`/delete-grupo-trabajo/${g.id_grupo}`)
          .then(() => {
            Swal.fire('Eliminado', '', 'success');
            getGrupos();
            getAsistencias();
          })
          .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
      }
    });
  };

  const abrirMiembros = (g) => {
    setGrupoMiembrosId(g.id_grupo);
    setGrupoMiembrosNombre(g.nombre);
    setCarnetAgregar('');
    setShowMiembros(true);
    cargarMiembros(g.id_grupo);
  };

  const cargarMiembros = (id_grupo) => {
    Axios.get(`/grupo-trabajo/${id_grupo}/miembros`)
      .then((res) => setListaMiembros(res.data))
      .catch((err) => {
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
        setListaMiembros([]);
      });
  };

  const agregarMiembro = () => {
    if (!carnetAgregar) return;
    Axios.post(`/grupo-trabajo/${grupoMiembrosId}/miembros`, {
      carnet_identidad: carnetAgregar,
    })
      .then(() => {
        cargarMiembros(grupoMiembrosId);
        getGrupos();
        setCarnetAgregar('');
      })
      .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
  };

  const quitarMiembro = (carnet) => {
    Axios.delete(`/grupo-trabajo/${grupoMiembrosId}/miembros/${carnet}`)
      .then(() => {
        cargarMiembros(grupoMiembrosId);
        getGrupos();
      })
      .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
  };

  const grupoSeleccionado = grupos.find((g) => String(g.id_grupo) === String(asGrupo));
  const maxPresentes = grupoSeleccionado ? Number(grupoSeleccionado.num_miembros) || 0 : 0;

  const marcarTodosPresentes = () => {
    if (maxPresentes > 0) setAsPresentes(String(maxPresentes));
  };

  const limpiarAsistencia = () => {
    setAsGrupo('');
    setAsFecha(new Date().toISOString().slice(0, 10));
    setAsPresentes('');
    setAsObs('');
    setEditAsistencia(false);
    setIdAsistenciaEdit('');
  };

  const guardarAsistencia = () => {
    if (!asGrupo || !asFecha) {
      Swal.fire('Atención', 'Seleccione grupo y fecha', 'warning');
      return;
    }
    const data = {
      id_grupo: asGrupo,
      fecha: asFecha,
      miembros_presentes: asPresentes === '' ? undefined : parseInt(asPresentes, 10),
      observaciones: asObs.trim() || null,
    };
    if (editAsistencia) {
      Axios.put(`/update-asistencia-grupal/${idAsistenciaEdit}`, data)
        .then(() => {
          Swal.fire('Listo', 'Asistencia actualizada', 'success');
          getAsistencias();
          limpiarAsistencia();
          setShowAsistModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('/create-asistencia-grupal', data)
        .then(() => {
          Swal.fire('Listo', 'Asistencia registrada', 'success');
          getAsistencias();
          limpiarAsistencia();
          setShowAsistModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    }
  };

  const editarAsistenciaRow = (row) => {
    setEditAsistencia(true);
    setIdAsistenciaEdit(row.id_asistencia);
    setAsGrupo(String(row.id_grupo));
    setAsFecha(row.fecha || '');
    setAsPresentes(String(row.miembros_presentes));
    setAsObs(row.observaciones || '');
    setShowAsistModal(true);
  };

  const eliminarAsistencia = (row) => {
    Swal.fire({
      title: '¿Eliminar registro?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
    }).then((r) => {
      if (r.isConfirmed) {
        Axios.delete(`/delete-asistencia-grupal/${row.id_asistencia}`)
          .then(() => {
            Swal.fire('Eliminado', '', 'success');
            getAsistencias();
          })
          .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
      }
    });
  };

  const miembrosIds = new Set(listaMiembros.map((m) => String(m.carnet_identidad)));
  const empleadosDisponibles = empleados.filter((e) => !miembrosIds.has(String(e.carnet_identidad)));

  const gruposFiltrados = useMemo(() => {
    const t = busqGrupos.trim().toLowerCase();
    if (!t) return grupos;
    return grupos.filter((g) => `${g.nombre} ${g.descripcion || ''} ${g.id_grupo}`.toLowerCase().includes(t));
  }, [grupos, busqGrupos]);

  const asistenciasFiltradas = useMemo(() => {
    const t = busqAsist.trim().toLowerCase();
    if (!t) return asistencias;
    return asistencias.filter((a) =>
      `${a.fecha} ${a.nombre_grupo} ${a.miembros_presentes} ${a.observaciones || ''}`.toLowerCase().includes(t)
    );
  }, [asistencias, busqAsist]);

  const gruposExportAepg = useMemo(() => {
    const headers = ['ID', 'Nombre', 'Descripción', 'N° miembros', 'Activo'];
    const dataRows = gruposFiltrados.map((g) => [
      g.id_grupo,
      g.nombre != null ? String(g.nombre) : '—',
      g.descripcion != null && g.descripcion !== '' ? String(g.descripcion) : '—',
      g.num_miembros != null && g.num_miembros !== '' ? String(g.num_miembros) : '0',
      g.activo == 1 ? 'Sí' : 'No',
    ]);
    return { headers, dataRows };
  }, [gruposFiltrados]);

  const asistGrupalExportAepg = useMemo(() => {
    const headers = ['Fecha', 'Grupo', 'Presentes', 'Total miembros', 'Observaciones'];
    const dataRows = asistenciasFiltradas.map((a) => [
      a.fecha != null ? String(a.fecha) : '—',
      a.nombre_grupo != null ? String(a.nombre_grupo) : '—',
      a.miembros_presentes != null && a.miembros_presentes !== '' ? String(a.miembros_presentes) : '—',
      a.miembros_total != null && a.miembros_total !== '' ? String(a.miembros_total) : '—',
      a.observaciones != null && a.observaciones !== '' ? String(a.observaciones) : '—',
    ]);
    return { headers, dataRows };
  }, [asistenciasFiltradas]);

  const miembrosModalExportAepg = useMemo(() => {
    const headers = ['Carnet', 'Nombre', 'Apellidos'];
    const dataRows = listaMiembros.map((m) => [
      m.carnet_identidad != null ? String(m.carnet_identidad) : '—',
      m.nombre != null ? String(m.nombre) : '—',
      m.apellidos != null ? String(m.apellidos) : '—',
    ]);
    return { headers, dataRows };
  }, [listaMiembros]);

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <ModuleTitleBar
        title="Grupos de trabajo"
        actions={
          <div className="d-flex flex-wrap gap-2 justify-content-end align-items-center">
            <ExportacionAepgGrupo
              tituloSistema={AEPG_TITULO_RRHH}
              subtitulo="Reporte: grupos de trabajo (catálogo)."
              descripcion="Listado filtrado de la tarjeta «Grupos registrados»."
              nombreBaseArchivo={`AEPG_grupos_trabajo_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Grupos"
              headers={gruposExportAepg.headers}
              dataRows={gruposExportAepg.dataRows}
              disabled={!grupos.length}
            />
            <ExportacionAepgGrupo
              tituloSistema={AEPG_TITULO_RRHH}
              subtitulo="Reporte: asistencia grupal (historial)."
              descripcion="Listado filtrado de la tarjeta «Historial de asistencia grupal»."
              nombreBaseArchivo={`AEPG_asistencia_grupal_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Asist_grupal"
              headers={asistGrupalExportAepg.headers}
              dataRows={asistGrupalExportAepg.dataRows}
              disabled={!asistencias.length}
            />
            <button
              type="button"
              className="btn btn-success btn-form-nowrap"
              onClick={() => { limpiarAsistencia(); setShowAsistModal(true); }}
              disabled={!puedeEscribir}
            >
              Registrar asistencia
            </button>
            <button
              type="button"
              className="btn btn-primary btn-form-nowrap"
              onClick={() => { limpiarGrupo(); setShowGrupoModal(true); }}
              disabled={!puedeEscribir}
            >
              <i className="bi bi-people me-2" aria-hidden="true" />
              Nuevo grupo
            </button>
          </div>
        }
      />

      <FormModal
        show={showGrupoModal}
        onHide={() => setShowGrupoModal(false)}
        title={editGrupo ? 'Editar grupo' : '+ Grupo'}
        subtitle=""
        onPrimary={() => submitGrupo({ preventDefault: () => {} })}
        primaryLabel={editGrupo ? 'Actualizar' : 'Guardar'}
        primaryDisabled={!puedeEscribir}
      >
        <div className="minimal-form-stack">
          <div className="minimal-field">
            <label className="minimal-label">Nombre:</label>
            <input className="minimal-input" placeholder="------------------------" value={gNombre} onChange={(e) => setGNombre(e.target.value)} disabled={editGrupo} />
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Descripción:</label>
            <input className="minimal-input" placeholder="------------------------" value={gDescripcion} onChange={(e) => setGDescripcion(e.target.value)} />
          </div>
          <label className="minimal-radio"><input type="checkbox" checked={gActivo} onChange={(e) => setGActivo(e.target.checked)} /> Activo</label>
        </div>
      </FormModal>

      <div className="card shadow-sm border-0 p-3 mb-4">
        <h6 className="mb-2">Grupos registrados</h6>
        <ListSearchToolbar value={busqGrupos} onChange={setBusqGrupos} placeholder="Nombre, descripción, ID de grupo…" />
        <p className="small text-muted mb-2">Mostrando {gruposFiltrados.length} de {grupos.length}</p>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Nombre</th>
                <th>Miembros</th>
                <th>Activo</th>
                <th style={{ width: 280 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gruposFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-3">
                    No hay grupos con el filtro indicado.
                  </td>
                </tr>
              ) : (
                gruposFiltrados.map((g) => (
                  <tr key={g.id_grupo}>
                    <td>
                      <div className="fw-medium">{g.nombre}</div>
                      {g.descripcion && <small className="text-muted">{g.descripcion}</small>}
                    </td>
                    <td>{g.num_miembros ?? 0}</td>
                    <td>{g.activo == 1 ? 'Sí' : 'No'}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => abrirMiembros(g)}>
                        Miembros
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={() => editarGrupoRow(g)} disabled={!puedeEscribir}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminarGrupo(g)} disabled={!puedeEscribir}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FormModal
        show={showAsistModal}
        onHide={() => { setShowAsistModal(false); limpiarAsistencia(); }}
        title={editAsistencia ? 'Editar asistencia grupal' : 'Registrar asistencia del grupo'}
        onPrimary={guardarAsistencia}
        primaryLabel={editAsistencia ? 'Actualizar' : 'Registrar'}
        primaryDisabled={!puedeEscribir}
        size="lg"
      >
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-6 col-xl-4">
            <label className="form-label">Grupo</label>
            <AppSelect className="form-select" value={asGrupo} onChange={(e) => setAsGrupo(e.target.value)} required disabled={editAsistencia}>
              <option value="" disabled hidden>— Seleccione —</option>
              {grupos.map((g) => (
                <option key={g.id_grupo} value={g.id_grupo}>
                  {g.nombre} ({g.num_miembros ?? 0} integrantes)
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="col-6 col-md-3 col-xl-2">
            <label className="form-label">Fecha</label>
            <input type="date" className="form-control" value={asFecha} onChange={(e) => setAsFecha(e.target.value)} required disabled={editAsistencia} />
          </div>
          <div className="col-6 col-md-3 col-xl-2">
            <label className="form-label">Presentes</label>
            <input
              type="number"
              min={0}
              max={maxPresentes || undefined}
              className="form-control"
              placeholder={maxPresentes ? `máx. ${maxPresentes}` : '—'}
              value={asPresentes}
              onChange={(e) => setAsPresentes(e.target.value)}
              disabled={!asGrupo || maxPresentes === 0}
            />
          </div>
          <div className="col-12 col-md-12 col-xl-4 d-grid d-xl-block">
            <button
              type="button"
              className="btn btn-outline-success btn-form-nowrap"
              disabled={!asGrupo || maxPresentes === 0}
              onClick={marcarTodosPresentes}
            >
              Todo el grupo
            </button>
          </div>
        </div>
        <div className="row g-3 align-items-end mt-1">
          <div className="col-12 col-lg-9">
            <label className="form-label">Observaciones</label>
            <input className="form-control" value={asObs} onChange={(e) => setAsObs(e.target.value)} />
          </div>
        </div>
      </FormModal>

      <div className="card shadow-sm border-0 p-3">
        <h6 className="mb-2">Historial de asistencia grupal</h6>
        <ListSearchToolbar value={busqAsist} onChange={setBusqAsist} placeholder="Fecha, grupo, presentes, observaciones…" />
        <p className="small text-muted mb-2">Mostrando {asistenciasFiltradas.length} de {asistencias.length}</p>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Fecha</th>
                <th>Grupo</th>
                <th>Presentes</th>
                <th>Total</th>
                <th>Observaciones</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {asistenciasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-3">
                    Sin registros.
                  </td>
                </tr>
              ) : (
                asistenciasFiltradas.map((a) => (
                  <tr key={a.id_asistencia}>
                    <td className="text-nowrap">{fmtFechaTabla(a.fecha)}</td>
                    <td>{a.nombre_grupo}</td>
                    <td>{a.miembros_presentes}</td>
                    <td>{a.miembros_total}</td>
                    <td>{a.observaciones || '—'}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline-warning me-1" onClick={() => editarAsistenciaRow(a)} disabled={!puedeEscribir}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminarAsistencia(a)} disabled={!puedeEscribir}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={showMiembros} onHide={() => setShowMiembros(false)} size="md" centered>
        <Modal.Header closeButton>
          <Modal.Title>Miembros: {grupoMiembrosNombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3 d-flex flex-wrap align-items-center gap-2">
            <ExportacionAepgGrupo
              tituloSistema={AEPG_TITULO_RRHH}
              subtitulo={grupoMiembrosNombre ? `Integrantes del grupo: ${grupoMiembrosNombre}` : 'Integrantes del grupo'}
              descripcion="Lista actual de miembros cargada en este diálogo (misma vista que la lista inferior)."
              nombreBaseArchivo={`AEPG_grupo_miembros_${(grupoMiembrosNombre || 'grupo').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Miembros"
              headers={miembrosModalExportAepg.headers}
              dataRows={miembrosModalExportAepg.dataRows}
              disabled={!listaMiembros.length}
            />
          </div>
          <div className="d-flex gap-2 mb-3">
            <AppSelect
              className="form-select"
              value={carnetAgregar}
              onChange={(e) => setCarnetAgregar(e.target.value)}
            >
              <option value="">— Añadir empleado —</option>
              {empleadosDisponibles.map((emp) => (
                <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                  {emp.carnet_identidad} — {emp.nombre} {emp.apellidos}
                </option>
              ))}
            </AppSelect>
            <Button variant="primary" onClick={agregarMiembro} disabled={!carnetAgregar || !puedeEscribir}>
              Añadir
            </Button>
          </div>
          {listaMiembros.length === 0 ? (
            <p className="text-muted mb-0">No hay integrantes. Agregue empleados para poder registrar asistencia grupal.</p>
          ) : (
            <ul className="list-group list-group-flush">
              {listaMiembros.map((m) => (
                <li key={m.carnet_identidad} className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span>
                    {m.carnet_identidad} — {m.nombre} {m.apellidos}
                  </span>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => quitarMiembro(m.carnet_identidad)} disabled={!puedeEscribir}>
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMiembros(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default GruposTrabajo;
