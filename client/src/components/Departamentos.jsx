import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';
import { FormModal } from './FormModal';
import ListSearchToolbar from './ListSearchToolbar';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

const Departamentos = () => {
  const puedeEscribir = usePuedeEscribir();
  const [departamentos, setDepartamentos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [idPadre, setIdPadre] = useState('');
  const [activo, setActivo] = useState(true);
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');

  const [deptoAsignar, setDeptoAsignar] = useState('');
  const [carnetAsignar, setCarnetAsignar] = useState('');
  const [showDeptoModal, setShowDeptoModal] = useState(false);
  const [busqDepto, setBusqDepto] = useState('');
  const [busqMiembros, setBusqMiembros] = useState('');

  const cargarDepartamentos = () => {
    Axios.get('/departamentos')
      .then((res) => setDepartamentos(res.data))
      .catch((err) => {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      });
  };

  const cargarEmpleados = () => {
    Axios.get('/empleados')
      .then((res) => {
        const ordenados = [...res.data].sort((a, b) =>
          `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es')
        );
        setEmpleados(ordenados);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    cargarDepartamentos();
    cargarEmpleados();
  }, []);

  const limpiarFormDepto = () => {
    setNombre('');
    setDescripcion('');
    setIdPadre('');
    setActivo(true);
    setEditando(false);
    setIdOriginal('');
  };

  const guardarDepto = () => {
    if (!nombre.trim()) {
      Swal.fire('Atención', 'Indique el nombre del departamento.', 'warning');
      return;
    }
    const data = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      id_padre: idPadre === '' ? null : idPadre,
      activo: activo ? 1 : 0,
    };
    if (editando) {
      Axios.put(`/update-departamento/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Listo', 'Departamento actualizado', 'success');
          cargarDepartamentos();
          cargarEmpleados();
          limpiarFormDepto();
          setShowDeptoModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('/create-departamento', data)
        .then(() => {
          Swal.fire('Listo', 'Departamento creado', 'success');
          cargarDepartamentos();
          limpiarFormDepto();
          setShowDeptoModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    }
  };

  const editarDepto = (d) => {
    setEditando(true);
    setIdOriginal(d.id_departamento);
    setNombre(d.nombre || '');
    setDescripcion(d.descripcion || '');
    setIdPadre(d.id_padre != null ? String(d.id_padre) : '');
    setActivo(d.activo == 1);
    setShowDeptoModal(true);
  };

  const eliminarDepto = (d) => {
    Swal.fire({
      title: '¿Eliminar departamento?',
      html: `Se quitará del catálogo y los empleados vinculados quedarán sin departamento.<br/><strong>${d.nombre}</strong>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((r) => {
      if (r.isConfirmed) {
        Axios.delete(`/delete-departamento/${d.id_departamento}`)
          .then(() => {
            Swal.fire('Eliminado', '', 'success');
            cargarDepartamentos();
            cargarEmpleados();
            if (String(deptoAsignar) === String(d.id_departamento)) {
              setDeptoAsignar('');
            }
          })
          .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
      }
    });
  };

  const opcionesPadre = departamentos.filter((d) => !editando || String(d.id_departamento) !== String(idOriginal));

  const idDeptoSeleccionado = useMemo(
    () => (deptoAsignar === '' ? null : Number(deptoAsignar)),
    [deptoAsignar]
  );

  const empleadosEnDepto = useMemo(() => {
    if (idDeptoSeleccionado == null || Number.isNaN(idDeptoSeleccionado)) return [];
    return empleados.filter((e) => Number(e.id_departamento) === idDeptoSeleccionado);
  }, [empleados, idDeptoSeleccionado]);

  const asignarEmpleado = () => {
    if (!deptoAsignar) {
      Swal.fire('Atención', 'Seleccione primero un departamento destino.', 'warning');
      return;
    }
    if (!carnetAsignar) {
      Swal.fire('Atención', 'Seleccione un empleado.', 'warning');
      return;
    }
    Axios.post('/asignar-empleado-departamento', {
      carnet_identidad: carnetAsignar,
      id_departamento: idDeptoSeleccionado,
    })
      .then(() => {
        Swal.fire('Listo', 'Empleado asignado al departamento', 'success');
        setCarnetAsignar('');
        cargarEmpleados();
        cargarDepartamentos();
      })
      .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
  };

  const quitarEmpleadoDepto = (emp) => {
    Swal.fire({
      title: '¿Quitar del departamento?',
      text: `${emp.nombre} ${emp.apellidos} quedará sin departamento en el catálogo.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí',
    }).then((r) => {
      if (r.isConfirmed) {
        Axios.post('/asignar-empleado-departamento', {
          carnet_identidad: emp.carnet_identidad,
          id_departamento: null,
        })
          .then(() => {
            Swal.fire('Listo', '', 'success');
            cargarEmpleados();
            cargarDepartamentos();
          })
          .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
      }
    });
  };

  const etiquetaDeptoActual = (emp) => {
    if (emp.id_departamento != null && emp.id_departamento !== '') {
      const d = departamentos.find((x) => String(x.id_departamento) === String(emp.id_departamento));
      if (d) return d.nombre;
    }
    return emp.departamento && String(emp.departamento).trim() ? emp.departamento : '—';
  };

  const departamentosFiltrados = useMemo(() => {
    const t = busqDepto.trim().toLowerCase();
    if (!t) return departamentos;
    return departamentos.filter((d) => {
      const s = `${d.nombre} ${d.descripcion || ''} ${d.nombre_padre || ''} ${d.id_departamento}`.toLowerCase();
      return s.includes(t);
    });
  }, [departamentos, busqDepto]);

  const empleadosEnDeptoFiltrados = useMemo(() => {
    const t = busqMiembros.trim().toLowerCase();
    if (!t) return empleadosEnDepto;
    return empleadosEnDepto.filter((e) => {
      const s = `${e.carnet_identidad} ${e.nombre} ${e.apellidos} ${e.puesto}`.toLowerCase();
      return s.includes(t);
    });
  }, [empleadosEnDepto, busqMiembros]);

  const departamentosExportAepg = useMemo(() => {
    const headers = ['ID', 'Nombre', 'Descripción', 'Departamento superior', 'N° empleados', 'Activo'];
    const dataRows = departamentosFiltrados.map((d) => [
      d.id_departamento,
      d.nombre != null ? String(d.nombre) : '—',
      d.descripcion != null && d.descripcion !== '' ? String(d.descripcion) : '—',
      d.nombre_padre != null && d.nombre_padre !== '' ? String(d.nombre_padre) : '—',
      d.num_empleados != null && d.num_empleados !== '' ? String(d.num_empleados) : '0',
      d.activo == 1 ? 'Sí' : 'No',
    ]);
    return { headers, dataRows };
  }, [departamentosFiltrados]);

  const deptoSeleccionadoLabel = useMemo(
    () => (deptoAsignar === '' ? '' : (departamentos.find((d) => String(d.id_departamento) === String(deptoAsignar))?.nombre || '')),
    [deptoAsignar, departamentos]
  );

  const miembrosDeptoExportAepg = useMemo(() => {
    const headers = ['Carnet', 'Nombre y apellidos', 'Puesto'];
    const dataRows = empleadosEnDeptoFiltrados.map((e) => [
      e.carnet_identidad,
      `${e.nombre || ''} ${e.apellidos || ''}`.trim() || '—',
      e.puesto != null && e.puesto !== '' ? String(e.puesto) : '—',
    ]);
    return { headers, dataRows };
  }, [empleadosEnDeptoFiltrados]);

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <ModuleTitleBar
        title="Departamentos y personal"
        actions={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <ExportacionAepgGrupo
              tituloSistema={AEPG_TITULO_RRHH}
              subtitulo="Reporte: catálogo de departamentos (árbol y conteo de empleados)."
              descripcion="Listado filtrado de la tarjeta «Catálogo de departamentos»; coincide con búsqueda y columnas de la tabla (sin acciones)."
              nombreBaseArchivo={`AEPG_departamentos_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Departamentos"
              headers={departamentosExportAepg.headers}
              dataRows={departamentosExportAepg.dataRows}
              disabled={!departamentos.length}
            />
            <ExportacionAepgGrupo
              tituloSistema={AEPG_TITULO_RRHH}
              subtitulo={deptoSeleccionadoLabel ? `Empleados del departamento: ${deptoSeleccionadoLabel}` : 'Empleados del departamento seleccionado'}
              descripcion="Registros de la lista inferior «Empleados en el departamento seleccionado», con el filtro de miembros aplicado. Elija un departamento arriba para habilitar."
              nombreBaseArchivo={`AEPG_depto_${(deptoSeleccionadoLabel || 'miembros').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Miembros"
              headers={miembrosDeptoExportAepg.headers}
              dataRows={miembrosDeptoExportAepg.dataRows}
              disabled={!deptoAsignar || !empleadosEnDeptoFiltrados.length}
            />
          <button
            type="button"
            className="btn btn-primary btn-form-nowrap"
            onClick={() => { limpiarFormDepto(); setShowDeptoModal(true); }}
            disabled={!puedeEscribir}
          >
            + Departamento
          </button>
          </div>
        }
      />
      <FormModal
        show={showDeptoModal}
        onHide={() => { setShowDeptoModal(false); limpiarFormDepto(); }}
        title={editando ? 'Editar departamento' : 'Nuevo departamento'}
        onPrimary={guardarDepto}
        primaryLabel={editando ? 'Guardar' : 'Crear'}
        primaryDisabled={!puedeEscribir}
      >
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="form-control"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej. Recursos Humanos"
              disabled={editando}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Departamento superior (opcional)</label>
            <AppSelect className="form-select" value={idPadre} onChange={(e) => setIdPadre(e.target.value)}>
              <option value="">— Ninguno (raíz) —</option>
              {opcionesPadre.map((d) => (
                <option key={d.id_departamento} value={d.id_departamento}>
                  {d.nombre}
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="col-md-4 d-flex align-items-end">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="activoDepto"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="activoDepto">Activo</label>
            </div>
          </div>
          <div className="col-12">
            <label className="form-label">Descripción</label>
            <textarea
              className="form-control"
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Funciones o alcance del departamento"
            />
          </div>
        </div>
      </FormModal>

      <div className="card shadow-sm border-0 p-3 mb-4">
        <h6 className="mb-2">Catálogo de departamentos</h6>
        <ListSearchToolbar value={busqDepto} onChange={setBusqDepto} placeholder="Nombre, descripción, superior, ID…" />
        <p className="small text-muted mb-2">Mostrando {departamentosFiltrados.length} de {departamentos.length}</p>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Nombre</th>
                <th>Superior</th>
                <th>Empleados</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {departamentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No hay departamentos con los criterios indicados.
                  </td>
                </tr>
              ) : (
                departamentosFiltrados.map((d) => (
                  <tr key={d.id_departamento}>
                    <td>
                      <strong>{d.nombre}</strong>
                      {d.descripcion ? (
                        <div className="small text-muted text-truncate" style={{ maxWidth: 320 }}>
                          {d.descripcion}
                        </div>
                      ) : null}
                    </td>
                    <td>{d.nombre_padre || '—'}</td>
                    <td>{d.num_empleados != null ? d.num_empleados : 0}</td>
                    <td>{d.activo == 1 ? 'Sí' : 'No'}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline-warning me-1" onClick={() => editarDepto(d)} disabled={!puedeEscribir}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminarDepto(d)} disabled={!puedeEscribir}>
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

      <div className="card shadow-sm border-0 p-4">
        <h6 className="mb-3">Asignar empleados a un departamento</h6>
        <div className="row g-3 mb-4 align-items-end">
          <div className="col-12 col-md-5">
            <label className="form-label">Departamento destino</label>
            <AppSelect className="form-select" value={deptoAsignar} onChange={(e) => setDeptoAsignar(e.target.value)}>
              <option value="" disabled hidden>— Seleccione departamento —</option>
              {departamentos.map((d) => (
                <option key={d.id_departamento} value={d.id_departamento}>
                  {d.nombre}
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Empleado a asignar</label>
            <AppSelect className="form-select" value={carnetAsignar} onChange={(e) => setCarnetAsignar(e.target.value)}>
              <option value="" disabled hidden>— Seleccione empleado —</option>
              {empleados.map((emp) => (
                <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                  {emp.carnet_identidad} — {emp.nombre} {emp.apellidos} ({etiquetaDeptoActual(emp)})
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="col-12 col-md-3 d-grid d-md-flex justify-content-md-end">
            <button type="button" className="btn btn-success btn-form-nowrap" onClick={asignarEmpleado} disabled={!puedeEscribir}>
              Asignar
            </button>
          </div>
        </div>

        <h6 className="mb-2">Empleados en el departamento seleccionado</h6>
        {!deptoAsignar ? null : (
          <>
            <ListSearchToolbar
              value={busqMiembros}
              onChange={setBusqMiembros}
              placeholder="Filtrar por carnet, nombre o puesto en esta lista…"
            />
            <p className="small text-muted mb-2">Mostrando {empleadosEnDeptoFiltrados.length} de {empleadosEnDepto.length}</p>
            <div className="table-responsive">
              <table className="table table-data-compact table-bordered table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Carnet</th>
                    <th>Nombre</th>
                    <th>Puesto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {empleadosEnDeptoFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-3">
                        Ningún empleado con el filtro indicado.
                      </td>
                    </tr>
                  ) : (
                    empleadosEnDeptoFiltrados.map((emp) => (
                      <tr key={emp.carnet_identidad}>
                        <td>{emp.carnet_identidad}</td>
                        <td>
                          {emp.nombre} {emp.apellidos}
                        </td>
                        <td>{emp.puesto || '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => quitarEmpleadoDepto(emp)}
                            disabled={!puedeEscribir}
                          >
                            Quitar del departamento
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Departamentos;
