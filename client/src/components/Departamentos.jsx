import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';

const Departamentos = () => {
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

  const cargarDepartamentos = () => {
    Axios.get('http://localhost:3001/departamentos')
      .then((res) => setDepartamentos(res.data))
      .catch((err) => {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      });
  };

  const cargarEmpleados = () => {
    Axios.get('http://localhost:3001/empleados')
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

  const handleSubmitDepto = (e) => {
    e.preventDefault();
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
      Axios.put(`http://localhost:3001/update-departamento/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Listo', 'Departamento actualizado', 'success');
          cargarDepartamentos();
          cargarEmpleados();
          limpiarFormDepto();
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('http://localhost:3001/create-departamento', data)
        .then(() => {
          Swal.fire('Listo', 'Departamento creado', 'success');
          cargarDepartamentos();
          limpiarFormDepto();
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
        Axios.delete(`http://localhost:3001/delete-departamento/${d.id_departamento}`)
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

  const idDeptoSeleccionado = deptoAsignar === '' ? null : Number(deptoAsignar);
  const empleadosEnDepto =
    idDeptoSeleccionado == null || Number.isNaN(idDeptoSeleccionado)
      ? []
      : empleados.filter((e) => Number(e.id_departamento) === idDeptoSeleccionado);

  const asignarEmpleado = () => {
    if (!deptoAsignar) {
      Swal.fire('Atención', 'Seleccione primero un departamento destino.', 'warning');
      return;
    }
    if (!carnetAsignar) {
      Swal.fire('Atención', 'Seleccione un empleado.', 'warning');
      return;
    }
    Axios.post('http://localhost:3001/asignar-empleado-departamento', {
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
        Axios.post('http://localhost:3001/asignar-empleado-departamento', {
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

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <div className="mb-4">
        <h4>Departamentos y personal</h4>
      </div>

      <div className="card shadow-sm border-0 p-4 mb-4">
        <h6 className="mb-3">{editando ? 'Editar departamento' : 'Nuevo departamento'}</h6>
        <form onSubmit={handleSubmitDepto}>
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
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Departamento superior (opcional)</label>
              <select className="form-select" value={idPadre} onChange={(e) => setIdPadre(e.target.value)}>
                <option value="">— Ninguno (raíz) —</option>
                {opcionesPadre.map((d) => (
                  <option key={d.id_departamento} value={d.id_departamento}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="activoDepto"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="activoDepto">
                  Activo
                </label>
              </div>
            </div>
            <div className="col-md-2 d-flex align-items-end gap-1 flex-wrap">
              <button type="submit" className="btn btn-success btn-form-nowrap">
                {editando ? 'Guardar' : 'Crear'}
              </button>
              {editando && (
                <button type="button" className="btn btn-secondary btn-form-nowrap" onClick={limpiarFormDepto}>
                  Cancelar
                </button>
              )}
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
        </form>
      </div>

      <div className="card shadow-sm border-0 p-3 mb-4">
        <h6 className="mb-3">Catálogo de departamentos</h6>
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
              {departamentos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No hay departamentos. Cree el primero con el formulario superior.
                  </td>
                </tr>
              ) : (
                departamentos.map((d) => (
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
                      <button type="button" className="btn btn-sm btn-outline-warning me-1" onClick={() => editarDepto(d)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminarDepto(d)}>
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
            <select className="form-select" value={deptoAsignar} onChange={(e) => setDeptoAsignar(e.target.value)}>
              <option value="" disabled hidden>— Seleccione departamento —</option>
              {departamentos.map((d) => (
                <option key={d.id_departamento} value={d.id_departamento}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Empleado a asignar</label>
            <select className="form-select" value={carnetAsignar} onChange={(e) => setCarnetAsignar(e.target.value)}>
              <option value="" disabled hidden>— Seleccione empleado —</option>
              {empleados.map((emp) => (
                <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                  {emp.carnet_identidad} — {emp.nombre} {emp.apellidos} ({etiquetaDeptoActual(emp)})
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-3 d-grid d-md-flex justify-content-md-end">
            <button type="button" className="btn btn-success btn-form-nowrap" onClick={asignarEmpleado}>
              Asignar
            </button>
          </div>
        </div>

        <h6 className="mb-2">Empleados en el departamento seleccionado</h6>
        {!deptoAsignar ? null : (
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
                {empleadosEnDepto.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-3">
                      Ningún empleado asignado a este departamento.
                    </td>
                  </tr>
                ) : (
                  empleadosEnDepto.map((emp) => (
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
        )}
      </div>
    </div>
  );
};

export default Departamentos;
