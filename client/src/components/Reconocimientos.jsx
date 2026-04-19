import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { FormModal } from './FormModal';
import ModuleTitleBar from './ModuleTitleBar';
import { fmtFechaTabla } from '../utils/formatDates';

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
  const [showReconocimientoModal, setShowReconocimientoModal] = useState(false);

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
          setShowReconocimientoModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('http://localhost:3001/create-reconocimiento-empleado', data)
        .then(() => {
          Swal.fire('Listo', 'Reconocimiento registrado', 'success');
          getRegistros();
          limpiarForm();
          setShowReconocimientoModal(false);
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
    setShowReconocimientoModal(true);
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
      <ModuleTitleBar
        title="Reconocimientos"
        actions={
          <button type="button" className="btn btn-primary btn-form-nowrap" onClick={() => { limpiarForm(); setShowReconocimientoModal(true); }}>
            <i className="bi bi-award me-2" aria-hidden="true" />
            Registrar reconocimiento
          </button>
        }
      />

      <FormModal
        show={showReconocimientoModal}
        onHide={() => setShowReconocimientoModal(false)}
        title={editando ? 'Editar reconocimiento' : '+ Reconocimiento'}
        subtitle=""
        onPrimary={() => handleSubmit({ preventDefault: () => {} })}
        primaryLabel={editando ? 'Actualizar' : 'Guardar'}
      >
        <div className="minimal-form-stack">
          <div className="minimal-field">
            <label className="minimal-label">Empleado:</label>
            <select className={`minimal-select ${carnet ? 'is-selected' : ''}`} value={carnet} onChange={(e) => setCarnet(e.target.value)}>
              <option value="" disabled hidden>--- Seleccione ---</option>
              {empleados.map((emp) => (
                <option key={emp.carnet_identidad} value={emp.carnet_identidad}>{emp.carnet_identidad} — {emp.nombre} {emp.apellidos}</option>
              ))}
            </select>
          </div>
          <div className="minimal-field"><label className="minimal-label">Tipo:</label><input type="text" className="minimal-input" placeholder="------------------------" value={tipo} onChange={(e) => setTipo(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Fecha otorgamiento:</label><input type="date" className="minimal-input" value={fechaOtorgamiento} onChange={(e) => setFechaOtorgamiento(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Valor estímulo:</label><input type="number" step="0.01" min={0} className="minimal-input" placeholder="------------------------" value={valorEstimulo} onChange={(e) => setValorEstimulo(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Descripción:</label><input type="text" className="minimal-input" placeholder="------------------------" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Observaciones:</label><input type="text" className="minimal-input" placeholder="------------------------" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} /></div>
          <label className="minimal-radio"><input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Activo</label>
        </div>
      </FormModal>

      <div className="card shadow-sm border-0 p-3">
        <h6 className="mb-3">Reconocimientos registrados</h6>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-sm align-middle mb-0">
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
                    <td className="text-nowrap">{fmtFechaTabla(r.fecha_otorgamiento)}</td>
                    <td>
                      {r.nombre} {r.apellidos}
                    </td>
                    <td>{r.carnet_identidad}</td>
                    <td>{r.tipo_reconocimiento}</td>
                    <td style={{ maxWidth: 260, whiteSpace: 'pre-wrap' }}>{r.descripcion}</td>
                    <td>{r.valor_estimulo != null ? r.valor_estimulo : '—'}</td>
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

export default Reconocimientos;
