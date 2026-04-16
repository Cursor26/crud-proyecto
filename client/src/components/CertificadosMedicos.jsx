import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';

const CertificadosMedicos = () => {
  const [registros, setRegistros] = useState([]);
  const [carnet, setCarnet] = useState('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [diasLicencia, setDiasLicencia] = useState('');
  const [medicoNombre, setMedicoNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');
  const { empleados, nombrePorCarnet } = useEmpleadosOptions();

  const getRegistros = () => {
    Axios.get('http://localhost:3001/certificados-medicos')
      .then(res => setRegistros(res.data))
      .catch(err => console.error('Error al cargar cert. médicos:', err));
  };

  useEffect(() => {
    getRegistros();
  }, []);

  const limpiarForm = () => {
    setCarnet('');
    setFechaEmision('');
    setFechaVencimiento('');
    setDiasLicencia('');
    setMedicoNombre('');
    setDescripcion('');
    setActivo(true);
    setEditando(false);
    setIdOriginal('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!carnet) {
      Swal.fire('Error', 'Carnet de identidad requerido', 'warning');
      return;
    }
    const data = {
      carnet_identidad: carnet,
      fecha_emision: fechaEmision,
      fecha_vencimiento: fechaVencimiento,
      dias_licencia: parseInt(diasLicencia) || 0,
      medico_nombre: medicoNombre,
      descripcion,
      activo: activo ? 1 : 0
    };

    if (editando) {
      Axios.put(`http://localhost:3001/update-cert-medico/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Actualizado', 'Certificado médico actualizado', 'success');
          getRegistros();
          limpiarForm();
        })
        .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('http://localhost:3001/create-cert-medico', data)
        .then(() => {
          Swal.fire('Creado', 'Certificado médico registrado', 'success');
          getRegistros();
          limpiarForm();
        })
        .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    }
  };

  const editarRegistro = (reg) => {
    setEditando(true);
    setIdOriginal(reg.id_cert_medico);
    setCarnet(String(reg.carnet_identidad ?? ''));
    setFechaEmision(reg.fecha_emision || '');
    setFechaVencimiento(reg.fecha_vencimiento || '');
    setDiasLicencia(reg.dias_licencia || '');
    setMedicoNombre(reg.medico_nombre || '');
    setDescripcion(reg.descripcion || '');
    setActivo(reg.activo == 1);
  };

  const eliminarRegistro = (id) => {
    Swal.fire({
      title: '¿Eliminar certificado?',
      text: `Se eliminará el certificado médico ID ${id}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar'
    }).then(result => {
      if (result.isConfirmed) {
        Axios.delete(`http://localhost:3001/delete-cert-medico/${id}`)
          .then(() => {
            Swal.fire('Eliminado', 'Certificado eliminado', 'success');
            getRegistros();
          })
          .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
      }
    });
  };

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center mt-0">
        <div>
          <h4>Certificados Médicos</h4>
          <small className="text-muted">
            Registro de certificaciones médicas que justifican ausencias
          </small>
        </div>
      </div>
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label className="form-label mb-1 fw-bold">Empleado *</label>
              <select
                className="form-select form-select-lg"
                value={carnet}
                onChange={(e) => setCarnet(e.target.value)}
                required
              >
                <option value="" disabled hidden>— Seleccione empleado —</option>
                {empleados.map((emp) => (
                  <option key={emp.carnet_identidad} value={String(emp.carnet_identidad)}>
                    {emp.carnet_identidad} — {emp.nombre} {emp.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label mb-1">Fecha emisión</label>
              <input
                type="date"
                className="form-control form-control-lg"
                value={fechaEmision}
                onChange={e => setFechaEmision(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label mb-1">Fecha venc.</label>
              <input
                type="date"
                className="form-control form-control-lg"
                value={fechaVencimiento}
                onChange={e => setFechaVencimiento(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label mb-1">Días licencia</label>
              <input
                type="number"
                className="form-control form-control-lg"
                value={diasLicencia}
                onChange={e => setDiasLicencia(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label mb-1">Médico</label>
              <input
                placeholder="Nombre del médico"
                type="text"
                className="form-control form-control-lg"
                value={medicoNombre}
                onChange={e => setMedicoNombre(e.target.value)}
              />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button
                type="button"
                className={`btn w-100 ${editando ? 'btn-warning' : 'btn-success'} btn-lg`}
                onClick={handleSubmit}
              >
                {editando ? 'Actualizar' : 'Registrar'}
              </button>
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label mb-1">Descripción / Diagnóstico</label>
            <textarea
              placeholder="Detalles del certificado médico..."
              className="form-control form-control-lg"
              rows="2"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
            />
          </div>
          <div className="form-check mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="activoMed"
              checked={activo}
              onChange={e => setActivo(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="activoMed">
              Certificado vigente
            </label>
          </div>
          {editando && (
            <button className="btn btn-secondary mb-3" onClick={limpiarForm}>
              Cancelar edición
            </button>
          )}
          <hr />
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6>Certificados médicos registrados</h6>
            <small className="text-muted">Total: {registros.length}</small>
          </div>
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Empleado</th>
                  <th>Fecha Emisión</th>
                  <th>Vencimiento</th>
                  <th>Días</th>
                  <th>Médico</th>
                  <th>Vigente</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registros.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      No hay certificados médicos registrados
                    </td>
                  </tr>
                ) : (
                  registros.map(reg => (
                    <tr key={reg.id_cert_medico}>
                      <td><strong>{reg.id_cert_medico}</strong></td>
                      <td>
                        <div>{nombrePorCarnet(reg.carnet_identidad) || '—'}</div>
                        <small className="text-muted">{reg.carnet_identidad}</small>
                      </td>
                      <td>{reg.fecha_emision}</td>
                      <td>{reg.fecha_vencimiento || '-'}</td>
                      <td>{reg.dias_licencia}</td>
                      <td>{reg.medico_nombre}</td>
                      <td>
                        <span className={`badge fs-6 ${reg.activo ? 'bg-success' : 'bg-secondary'}`}>
                          {reg.activo ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td>
                        <EditTableActionButton onClick={() => editarRegistro(reg)} className="me-1" />
                        <DeleteTableActionButton onClick={() => eliminarRegistro(reg.id_cert_medico)} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificadosMedicos;

