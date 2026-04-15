import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';

const Sanciones = () => {
  const [registros, setRegistros] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [carnet, setCarnet] = useState('');
  const [tipoSancion, setTipoSancion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fechaAplicacion, setFechaAplicacion] = useState(() => new Date().toISOString().slice(0, 10));
  const [diasSuspension, setDiasSuspension] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [activo, setActivo] = useState(true);
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');

  const getRegistros = () => {
    Axios.get('http://localhost:3001/sanciones-empleado')
      .then((res) => setRegistros(res.data))
      .catch((err) => {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      });
  };

  const getEmpleados = () => {
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
    getRegistros();
    getEmpleados();
  }, []);

  const limpiarForm = () => {
    setCarnet('');
    setTipoSancion('');
    setMotivo('');
    setFechaAplicacion(new Date().toISOString().slice(0, 10));
    setDiasSuspension('');
    setObservaciones('');
    setActivo(true);
    setEditando(false);
    setIdOriginal('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!carnet || !tipoSancion.trim() || !motivo.trim() || !fechaAplicacion) {
      Swal.fire('Atención', 'Complete empleado, tipo, motivo y fecha.', 'warning');
      return;
    }
    const data = {
      carnet_identidad: String(carnet).trim(),
      tipo_sancion: tipoSancion.trim(),
      motivo: motivo.trim(),
      fecha_aplicacion: fechaAplicacion,
      dias_suspension: diasSuspension === '' ? null : diasSuspension,
      observaciones: observaciones.trim() || null,
      activo: activo ? 1 : 0,
    };
    if (editando) {
      Axios.put(`http://localhost:3001/update-sancion-empleado/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Listo', 'Sanción actualizada', 'success');
          getRegistros();
          limpiarForm();
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('http://localhost:3001/create-sancion-empleado', data)
        .then(() => {
          Swal.fire('Listo', 'Sanción registrada', 'success');
          getRegistros();
          limpiarForm();
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    }
  };

  const editarRegistro = (r) => {
    setEditando(true);
    setIdOriginal(r.id_sancion);
    setCarnet(String(r.carnet_identidad));
    setTipoSancion(r.tipo_sancion || '');
    setMotivo(r.motivo || '');
    setFechaAplicacion(r.fecha_aplicacion || '');
    setDiasSuspension(r.dias_suspension != null ? String(r.dias_suspension) : '');
    setObservaciones(r.observaciones || '');
    setActivo(r.activo == 1);
  };

  const eliminarRegistro = (r) => {
    Swal.fire({
      title: '¿Eliminar sanción?',
      text: 'Se borrará el registro de forma permanente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((res) => {
      if (res.isConfirmed) {
        Axios.delete(`http://localhost:3001/delete-sancion-empleado/${r.id_sancion}`)
          .then(() => {
            Swal.fire('Eliminado', '', 'success');
            getRegistros();
          })
          .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
      }
    });
  };

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <div className="mb-4">
        <h4>Sanciones</h4>
        <small className="text-muted">Registro de sanciones aplicadas a empleados</small>
      </div>

      <div className="card shadow-sm border-0 p-4 mb-4">
        <h6 className="mb-3">{editando ? 'Editar sanción' : 'Registrar sanción'}</h6>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Empleado</label>
              <select className="form-select" value={carnet} onChange={(e) => setCarnet(e.target.value)} required>
                <option value="">— Seleccione —</option>
                {empleados.map((emp) => (
                  <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                    {emp.carnet_identidad} — {emp.nombre} {emp.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Tipo de sanción</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. Apercibimiento, Amonestación escrita, Suspensión"
                value={tipoSancion}
                onChange={(e) => setTipoSancion(e.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Fecha aplicación</label>
              <input
                type="date"
                className="form-control"
                value={fechaAplicacion}
                onChange={(e) => setFechaAplicacion(e.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Días suspensión (opc.)</label>
              <input
                type="number"
                min={0}
                className="form-control"
                placeholder="—"
                value={diasSuspension}
                onChange={(e) => setDiasSuspension(e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label">Motivo</label>
              <textarea className="form-control" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
            </div>
            <div className="col-md-8">
              <label className="form-label">Observaciones</label>
              <input className="form-control" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="activoSan"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="activoSan">
                  Activo
                </label>
              </div>
            </div>
            <div className="col-md-2 d-flex align-items-end gap-1 flex-wrap">
              <button type="submit" className="btn btn-primary">
                {editando ? 'Guardar' : 'Registrar'}
              </button>
              {editando && (
                <button type="button" className="btn btn-secondary" onClick={limpiarForm}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="card shadow-sm border-0 p-3">
        <h6 className="mb-3">Sanciones registradas</h6>
        <div className="table-responsive">
          <table className="table table-bordered table-striped table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Fecha</th>
                <th>Empleado</th>
                <th>Carnet</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th>Días susp.</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
                    No hay sanciones registradas.
                  </td>
                </tr>
              ) : (
                registros.map((r) => (
                  <tr key={r.id_sancion}>
                    <td>{r.fecha_aplicacion}</td>
                    <td>
                      {r.nombre} {r.apellidos}
                    </td>
                    <td>{r.carnet_identidad}</td>
                    <td>{r.tipo_sancion}</td>
                    <td style={{ maxWidth: 240, whiteSpace: 'pre-wrap' }}>{r.motivo}</td>
                    <td>{r.dias_suspension != null ? r.dias_suspension : '—'}</td>
                    <td>{r.activo == 1 ? 'Sí' : 'No'}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => editarRegistro(r)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminarRegistro(r)}>
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
    </div>
  );
};

export default Sanciones;
