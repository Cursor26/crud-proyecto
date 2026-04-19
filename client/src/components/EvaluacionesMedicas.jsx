import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { fmtFechaTabla } from '../utils/formatDates';
import ModuleTitleBar from './ModuleTitleBar';

const EvaluacionesMedicas = () => {
  const [registros, setRegistros] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [carnet, setCarnet] = useState('');
  const [fechaEvaluacion, setFechaEvaluacion] = useState(() => new Date().toISOString().slice(0, 10));
  const [tipoChequeo, setTipoChequeo] = useState('Periódico');
  const [resultado, setResultado] = useState('');
  const [medicoNombre, setMedicoNombre] = useState('');
  const [proximoChequeo, setProximoChequeo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [activo, setActivo] = useState(true);
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');

  const getRegistros = () => {
    Axios.get('http://localhost:3001/evaluaciones-medicas')
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
    setFechaEvaluacion(new Date().toISOString().slice(0, 10));
    setTipoChequeo('Periódico');
    setResultado('');
    setMedicoNombre('');
    setProximoChequeo('');
    setObservaciones('');
    setActivo(true);
    setEditando(false);
    setIdOriginal('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!carnet || !fechaEvaluacion || !resultado.trim() || !medicoNombre.trim()) {
      Swal.fire('Atención', 'Complete empleado, fecha, resultado y médico responsable.', 'warning');
      return;
    }
    const data = {
      carnet_identidad: String(carnet).trim(),
      fecha_evaluacion: fechaEvaluacion,
      tipo_chequeo: tipoChequeo.trim() || 'Periódico',
      resultado: resultado.trim(),
      medico_nombre: medicoNombre.trim(),
      proximo_chequeo: proximoChequeo.trim() || null,
      observaciones: observaciones.trim() || null,
      activo: activo ? 1 : 0,
    };
    if (editando) {
      Axios.put(`http://localhost:3001/update-evaluacion-medica/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Listo', 'Evaluación actualizada', 'success');
          getRegistros();
          limpiarForm();
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('http://localhost:3001/create-evaluacion-medica', data)
        .then(() => {
          Swal.fire('Listo', 'Chequeo médico registrado', 'success');
          getRegistros();
          limpiarForm();
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    }
  };

  const editarRegistro = (r) => {
    setEditando(true);
    setIdOriginal(r.id_eval_medica);
    setCarnet(String(r.carnet_identidad));
    setFechaEvaluacion(r.fecha_evaluacion || '');
    setTipoChequeo(r.tipo_chequeo || 'Periódico');
    setResultado(r.resultado || '');
    setMedicoNombre(r.medico_nombre || '');
    setProximoChequeo(r.proximo_chequeo || '');
    setObservaciones(r.observaciones || '');
    setActivo(r.activo == 1);
  };

  const eliminarRegistro = (r) => {
    Swal.fire({
      title: '¿Eliminar registro?',
      text: 'Se borrará esta evaluación médica.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((res) => {
      if (res.isConfirmed) {
        Axios.delete(`http://localhost:3001/delete-evaluacion-medica/${r.id_eval_medica}`)
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
      <ModuleTitleBar title="Evaluaciones médicas" />

      <div className="card shadow-sm border-0 p-4 mb-4">
        <h6 className="mb-3">{editando ? 'Editar evaluación' : 'Registrar chequeo médico'}</h6>
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
            <div className="col-md-2">
              <label className="form-label">Fecha del chequeo</label>
              <input
                type="date"
                className="form-control"
                value={fechaEvaluacion}
                onChange={(e) => setFechaEvaluacion(e.target.value)}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Tipo de chequeo</label>
              <input
                type="text"
                className="form-control"
                placeholder="Periódico, ingreso, post-incidente…"
                value={tipoChequeo}
                onChange={(e) => setTipoChequeo(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Próximo control (opc.)</label>
              <input
                type="date"
                className="form-control"
                value={proximoChequeo}
                onChange={(e) => setProximoChequeo(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Resultado</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. Apto, Apto con restricciones"
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Médico / responsable</label>
              <input
                type="text"
                className="form-control"
                value={medicoNombre}
                onChange={(e) => setMedicoNombre(e.target.value)}
                required
              />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="activoEvalMed"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="activoEvalMed">
                  Activo
                </label>
              </div>
            </div>
            <div className="col-12">
              <label className="form-label">Observaciones</label>
              <textarea className="form-control" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-success btn-form-nowrap me-2">
                {editando ? 'Guardar cambios' : 'Registrar'}
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
        <h6 className="mb-3">Historial de evaluaciones</h6>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Fecha</th>
                <th>Empleado</th>
                <th>Carnet</th>
                <th>Tipo</th>
                <th>Resultado</th>
                <th>Médico</th>
                <th>Próximo</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-4">
                    No hay evaluaciones registradas.
                  </td>
                </tr>
              ) : (
                registros.map((r) => (
                  <tr key={r.id_eval_medica}>
                    <td className="text-nowrap">{fmtFechaTabla(r.fecha_evaluacion)}</td>
                    <td>
                      {r.nombre} {r.apellidos}
                    </td>
                    <td>{r.carnet_identidad}</td>
                    <td>{r.tipo_chequeo}</td>
                    <td>{r.resultado}</td>
                    <td>{r.medico_nombre}</td>
                    <td className="text-nowrap">{r.proximo_chequeo ? fmtFechaTabla(r.proximo_chequeo) : '—'}</td>
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

export default EvaluacionesMedicas;
