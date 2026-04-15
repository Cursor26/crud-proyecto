import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';

const Reconocimientos = () => {
  const [registros, setRegistros] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [carnet, setCarnet] = useState('');
  const [tipo, setTipo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaOtorgamiento, setFechaOtorgamiento] = useState(() => new Date().toISOString().slice(0, 10));
  const [valorEstimulo, setValorEstimulo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [activo, setActivo] = useState(true);
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');

  const getRegistros = () => {
    Axios.get('http://localhost:3001/reconocimientos-empleado')
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
    setTipo('');
    setDescripcion('');
    setFechaOtorgamiento(new Date().toISOString().slice(0, 10));
    setValorEstimulo('');
    setObservaciones('');
    setActivo(true);
    setEditando(false);
    setIdOriginal('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!carnet || !tipo.trim() || !descripcion.trim() || !fechaOtorgamiento) {
      Swal.fire('Atención', 'Complete empleado, tipo, descripción y fecha.', 'warning');
      return;
    }
    const data = {
      carnet_identidad: String(carnet).trim(),
      tipo_reconocimiento: tipo.trim(),
      descripcion: descripcion.trim(),
      fecha_otorgamiento: fechaOtorgamiento,
      valor_estimulo: valorEstimulo === '' ? null : valorEstimulo,
      observaciones: observaciones.trim() || null,
      activo: activo ? 1 : 0,
    };
    if (editando) {
      Axios.put(`http://localhost:3001/update-reconocimiento-empleado/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Listo', 'Reconocimiento actualizado', 'success');
          getRegistros();
          limpiarForm();
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('http://localhost:3001/create-reconocimiento-empleado', data)
        .then(() => {
          Swal.fire('Listo', 'Reconocimiento registrado', 'success');
          getRegistros();
          limpiarForm();
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    }
  };

  const editarRegistro = (r) => {
    setEditando(true);
    setIdOriginal(r.id_reconocimiento);
    setCarnet(String(r.carnet_identidad));
    setTipo(r.tipo_reconocimiento || '');
    setDescripcion(r.descripcion || '');
    setFechaOtorgamiento(r.fecha_otorgamiento || '');
    setValorEstimulo(r.valor_estimulo != null ? String(r.valor_estimulo) : '');
    setObservaciones(r.observaciones || '');
    setActivo(r.activo == 1);
  };

  const eliminarRegistro = (r) => {
    Swal.fire({
      title: '¿Eliminar reconocimiento?',
      text: 'Se borrará el registro de forma permanente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((res) => {
      if (res.isConfirmed) {
        Axios.delete(`http://localhost:3001/delete-reconocimiento-empleado/${r.id_reconocimiento}`)
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
        <h4>Reconocimientos</h4>
        <small className="text-muted">Premios y estímulos otorgados a empleados destacados</small>
      </div>

      <div className="card shadow-sm border-0 p-4 mb-4">
        <h6 className="mb-3">{editando ? 'Editar reconocimiento' : 'Registrar reconocimiento'}</h6>
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
              <label className="form-label">Tipo (premio / estímulo / mención…)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. Premio al mérito, Estímulo económico"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Fecha otorgamiento</label>
              <input
                type="date"
                className="form-control"
                value={fechaOtorgamiento}
                onChange={(e) => setFechaOtorgamiento(e.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Valor estímulo (opc.)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                className="form-control"
                placeholder="—"
                value={valorEstimulo}
                onChange={(e) => setValorEstimulo(e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label">Descripción / motivo del reconocimiento</label>
              <textarea className="form-control" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
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
                  id="activoRec"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="activoRec">
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
        <h6 className="mb-3">Reconocimientos registrados</h6>
        <div className="table-responsive">
          <table className="table table-bordered table-striped table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Fecha</th>
                <th>Empleado</th>
                <th>Carnet</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Valor</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
                    No hay reconocimientos registrados.
                  </td>
                </tr>
              ) : (
                registros.map((r) => (
                  <tr key={r.id_reconocimiento}>
                    <td>{r.fecha_otorgamiento}</td>
                    <td>
                      {r.nombre} {r.apellidos}
                    </td>
                    <td>{r.carnet_identidad}</td>
                    <td>{r.tipo_reconocimiento}</td>
                    <td style={{ maxWidth: 260, whiteSpace: 'pre-wrap' }}>{r.descripcion}</td>
                    <td>{r.valor_estimulo != null ? r.valor_estimulo : '—'}</td>
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

export default Reconocimientos;
