import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { fmtFechaTabla } from '../utils/formatDates';
import ModuleTitleBar from './ModuleTitleBar';

const Jubilaciones = () => {
  const [registros, setRegistros] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [carnet, setCarnet] = useState('');
  const [tipoSalida, setTipoSalida] = useState('');
  const [fechaEfectiva, setFechaEfectiva] = useState(() => new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [activo, setActivo] = useState(true);
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');

  const getRegistros = () => {
    Axios.get('http://localhost:3001/jubilaciones-empleado')
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
    setTipoSalida('');
    setFechaEfectiva(new Date().toISOString().slice(0, 10));
    setMotivo('');
    setObservaciones('');
    setActivo(true);
    setEditando(false);
    setIdOriginal('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!carnet || !tipoSalida.trim() || !fechaEfectiva || !motivo.trim()) {
      Swal.fire('Atención', 'Complete empleado, tipo de salida, fecha efectiva y motivo.', 'warning');
      return;
    }
    const data = {
      carnet_identidad: String(carnet).trim(),
      tipo_salida: tipoSalida.trim(),
      fecha_efectiva: fechaEfectiva,
      motivo: motivo.trim(),
      observaciones: observaciones.trim() || null,
      activo: activo ? 1 : 0,
    };
    if (editando) {
      Axios.put(`http://localhost:3001/update-jubilacion-empleado/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Listo', 'Registro de jubilación / retiro actualizado', 'success');
          getRegistros();
          limpiarForm();
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('http://localhost:3001/create-jubilacion-empleado', data)
        .then(() => {
          Swal.fire('Listo', 'Jubilación o retiro registrado', 'success');
          getRegistros();
          limpiarForm();
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    }
  };

  const editarRegistro = (r) => {
    setEditando(true);
    setIdOriginal(r.id_jubilacion);
    setCarnet(String(r.carnet_identidad));
    setTipoSalida(r.tipo_salida || '');
    setFechaEfectiva(r.fecha_efectiva || '');
    setMotivo(r.motivo || '');
    setObservaciones(r.observaciones || '');
    setActivo(r.activo == 1);
  };

  const eliminarRegistro = (r) => {
    Swal.fire({
      title: '¿Eliminar registro?',
      text: 'Se borrará la jubilación o retiro de forma permanente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((resConfirm) => {
      if (resConfirm.isConfirmed) {
        Axios.delete(`http://localhost:3001/delete-jubilacion-empleado/${r.id_jubilacion}`)
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
      <ModuleTitleBar title="Jubilaciones y retiros" />

      <div className="card shadow-sm border-0 p-4 mb-4">
        <h6 className="mb-3">{editando ? 'Editar registro' : 'Registrar jubilación o retiro'}</h6>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Empleado</label>
              <select className="form-select" value={carnet} onChange={(e) => setCarnet(e.target.value)} required>
                <option value="" disabled hidden>— Seleccione —</option>
                {empleados.map((emp) => (
                  <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                    {emp.carnet_identidad} — {emp.nombre} {emp.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Tipo de salida</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. Jubilación ordinaria, Retiro voluntario, Renuncia"
                value={tipoSalida}
                onChange={(e) => setTipoSalida(e.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Fecha efectiva</label>
              <input
                type="date"
                className="form-control"
                value={fechaEfectiva}
                onChange={(e) => setFechaEfectiva(e.target.value)}
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label">Motivo / resumen</label>
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
                  id="activoJub"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="activoJub">
                  Activo
                </label>
              </div>
            </div>
            <div className="col-md-2 d-flex align-items-end gap-1 flex-wrap">
              <button type="submit" className="btn btn-success btn-form-nowrap">
                {editando ? 'Guardar' : 'Registrar'}
              </button>
              {editando && (
                <button type="button" className="btn btn-secondary btn-form-nowrap" onClick={limpiarForm}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="card shadow-sm border-0 p-3">
        <h6 className="mb-3">Registros</h6>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Fecha efectiva</th>
                <th>Empleado</th>
                <th>Carnet</th>
                <th>Tipo de salida</th>
                <th>Motivo</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No hay jubilaciones ni retiros registrados.
                  </td>
                </tr>
              ) : (
                registros.map((r) => (
                  <tr key={r.id_jubilacion}>
                    <td className="text-nowrap">{fmtFechaTabla(r.fecha_efectiva)}</td>
                    <td>
                      {r.nombre} {r.apellidos}
                    </td>
                    <td>{r.carnet_identidad}</td>
                    <td>{r.tipo_salida}</td>
                    <td style={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>{r.motivo}</td>
                    <td>{r.activo == 1 ? 'Sí' : 'No'}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline-warning me-1" onClick={() => editarRegistro(r)}>
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

export default Jubilaciones;
