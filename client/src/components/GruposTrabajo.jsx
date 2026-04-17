import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { Modal, Button } from 'react-bootstrap';
import { FormModal } from './FormModal';
import { fmtFechaTabla } from '../utils/formatDates';

const GruposTrabajo = () => {
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

  const getGrupos = () => {
    Axios.get('http://localhost:3001/grupos-trabajo')
      .then((res) => setGrupos(res.data))
      .catch((err) => {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      });
  };

  const getEmpleados = () => {
    Axios.get('http://localhost:3001/empleados?solo_activos=1')
      .then((res) => {
        const ordenados = [...res.data].sort((a, b) =>
          `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es')
        );
        setEmpleados(ordenados);
      })
      .catch((err) => console.error(err));
  };

  const getAsistencias = () => {
    Axios.get('http://localhost:3001/asistencia-grupal')
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
      Axios.put(`http://localhost:3001/update-grupo-trabajo/${idGrupoEdit}`, data)
        .then(() => {
          Swal.fire('Listo', 'Grupo actualizado', 'success');
          getGrupos();
          limpiarGrupo();
          setShowGrupoModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('http://localhost:3001/create-grupo-trabajo', data)
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
        Axios.delete(`http://localhost:3001/delete-grupo-trabajo/${g.id_grupo}`)
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
    Axios.get(`http://localhost:3001/grupo-trabajo/${id_grupo}/miembros`)
      .then((res) => setListaMiembros(res.data))
      .catch((err) => {
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
        setListaMiembros([]);
      });
  };

  const agregarMiembro = () => {
    if (!carnetAgregar) return;
    Axios.post(`http://localhost:3001/grupo-trabajo/${grupoMiembrosId}/miembros`, {
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
    Axios.delete(`http://localhost:3001/grupo-trabajo/${grupoMiembrosId}/miembros/${carnet}`)
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

  const submitAsistencia = (e) => {
    e.preventDefault();
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
      Axios.put(`http://localhost:3001/update-asistencia-grupal/${idAsistenciaEdit}`, data)
        .then(() => {
          Swal.fire('Listo', 'Asistencia actualizada', 'success');
          getAsistencias();
          limpiarAsistencia();
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('http://localhost:3001/create-asistencia-grupal', data)
        .then(() => {
          Swal.fire('Listo', 'Asistencia registrada', 'success');
          getAsistencias();
          limpiarAsistencia();
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
  };

  const eliminarAsistencia = (row) => {
    Swal.fire({
      title: '¿Eliminar registro?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
    }).then((r) => {
      if (r.isConfirmed) {
        Axios.delete(`http://localhost:3001/delete-asistencia-grupal/${row.id_asistencia}`)
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

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <div className="mb-4">
        <h4>Grupos de trabajo</h4>
      </div>

      <div className="d-flex justify-content-end mb-3">
        <button type="button" className="btn btn-primary btn-form-nowrap" onClick={() => { limpiarGrupo(); setShowGrupoModal(true); }}>
          <i className="bi bi-people me-2" aria-hidden="true" />
          Nuevo grupo
        </button>
      </div>

      <FormModal
        show={showGrupoModal}
        onHide={() => setShowGrupoModal(false)}
        title={editGrupo ? 'Editar grupo' : '+ Grupo'}
        subtitle=""
        onPrimary={() => submitGrupo({ preventDefault: () => {} })}
        primaryLabel={editGrupo ? 'Actualizar' : 'Guardar'}
      >
        <div className="minimal-form-stack">
          <div className="minimal-field">
            <label className="minimal-label">Nombre:</label>
            <input className="minimal-input" placeholder="------------------------" value={gNombre} onChange={(e) => setGNombre(e.target.value)} />
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Descripción:</label>
            <input className="minimal-input" placeholder="------------------------" value={gDescripcion} onChange={(e) => setGDescripcion(e.target.value)} />
          </div>
          <label className="minimal-radio"><input type="checkbox" checked={gActivo} onChange={(e) => setGActivo(e.target.checked)} /> Activo</label>
        </div>
      </FormModal>

      <div className="card shadow-sm border-0 p-3 mb-4">
        <h6 className="mb-3">Grupos registrados</h6>
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
              {grupos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-3">
                    No hay grupos. Cree uno arriba.
                  </td>
                </tr>
              ) : (
                grupos.map((g) => (
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
                      <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={() => editarGrupoRow(g)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminarGrupo(g)}>
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

      <div className="card shadow-sm border-0 p-4 mb-4">
        <h6 className="mb-3">{editAsistencia ? 'Editar asistencia grupal' : 'Registrar asistencia del grupo'}</h6>
        <form onSubmit={submitAsistencia}>
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-6 col-xl-4">
              <label className="form-label">Grupo</label>
              <select className="form-select" value={asGrupo} onChange={(e) => setAsGrupo(e.target.value)} required>
                <option value="" disabled hidden>— Seleccione —</option>
                {grupos.map((g) => (
                  <option key={g.id_grupo} value={g.id_grupo}>
                    {g.nombre} ({g.num_miembros ?? 0} integrantes)
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-3 col-xl-2">
              <label className="form-label">Fecha</label>
              <input type="date" className="form-control" value={asFecha} onChange={(e) => setAsFecha(e.target.value)} required />
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
            <div className="col-12 col-lg-3">
              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-success btn-form-nowrap">
                  {editAsistencia ? 'Actualizar' : 'Registrar'}
                </button>
                {editAsistencia && (
                  <button type="button" className="btn btn-secondary btn-form-nowrap" onClick={limpiarAsistencia}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="card shadow-sm border-0 p-3">
        <h6 className="mb-3">Historial de asistencia grupal</h6>
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
              {asistencias.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-3">
                    Sin registros.
                  </td>
                </tr>
              ) : (
                asistencias.map((a) => (
                  <tr key={a.id_asistencia}>
                    <td className="text-nowrap">{fmtFechaTabla(a.fecha)}</td>
                    <td>{a.nombre_grupo}</td>
                    <td>{a.miembros_presentes}</td>
                    <td>{a.miembros_total}</td>
                    <td>{a.observaciones || '—'}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline-warning me-1" onClick={() => editarAsistenciaRow(a)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminarAsistencia(a)}>
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
          <div className="d-flex gap-2 mb-3">
            <select
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
            </select>
            <Button variant="primary" onClick={agregarMiembro} disabled={!carnetAgregar}>
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
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => quitarMiembro(m.carnet_identidad)}>
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
