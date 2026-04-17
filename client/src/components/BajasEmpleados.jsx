import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { FormModal } from './FormModal';
import { fmtFechaTabla } from '../utils/formatDates';

const esActivo = (e) => e.activo == null || e.activo === 1 || e.activo === '1';

const BajasEmpleados = () => {
  const [empleados, setEmpleados] = useState([]);
  const [filtro, setFiltro] = useState('activos');
  const [carnetBaja, setCarnetBaja] = useState('');
  const [fechaBaja, setFechaBaja] = useState(() => new Date().toISOString().slice(0, 10));
  const [motivoBaja, setMotivoBaja] = useState('');
  const [showBajaModal, setShowBajaModal] = useState(false);

  const cargar = () => {
    Axios.get('http://localhost:3001/empleados')
      .then((res) => {
        const ordenados = [...res.data].sort((a, b) =>
          `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es')
        );
        setEmpleados(ordenados);
      })
      .catch((err) => {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      });
  };

  useEffect(() => {
    cargar();
  }, []);

  const listaFiltrada = empleados.filter((e) => {
    if (filtro === 'activos') return esActivo(e);
    if (filtro === 'inactivos') return !esActivo(e);
    return true;
  });

  const registrarBaja = (e) => {
    e.preventDefault();
    if (!carnetBaja) {
      Swal.fire('Atención', 'Seleccione un empleado.', 'warning');
      return;
    }
    Swal.fire({
      title: '¿Registrar baja?',
      text: 'El empleado quedará marcado como inactivo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, dar de baja',
    }).then((r) => {
      if (!r.isConfirmed) return;
      Axios.post('http://localhost:3001/empleado-baja', {
        carnet_identidad: carnetBaja,
        fecha_baja: fechaBaja,
        motivo_baja: motivoBaja.trim() || null,
      })
        .then(() => {
          Swal.fire('Listo', 'Baja registrada', 'success');
          setCarnetBaja('');
          setMotivoBaja('');
          setFechaBaja(new Date().toISOString().slice(0, 10));
          setShowBajaModal(false);
          cargar();
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    });
  };

  const reactivar = (emp) => {
    Swal.fire({
      title: '¿Reactivar empleado?',
      text: `${emp.nombre} ${emp.apellidos} volverá a estado activo.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reactivar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      Axios.post('http://localhost:3001/empleado-reactivar', { carnet_identidad: emp.carnet_identidad })
        .then(() => {
          Swal.fire('Listo', 'Empleado reactivado', 'success');
          cargar();
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    });
  };

  const empleadosParaBaja = empleados.filter(esActivo);

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <div className="mb-4">
        <h4>Bajas de empleado</h4>
      </div>

      <div className="d-flex justify-content-end mb-3">
        <button type="button" className="btn btn-primary btn-form-nowrap" onClick={() => setShowBajaModal(true)}>
          <i className="bi bi-person-dash me-2" aria-hidden="true" />
          Registrar baja
        </button>
      </div>

      <FormModal
        show={showBajaModal}
        onHide={() => setShowBajaModal(false)}
        title="+ Baja"
        subtitle=""
        onPrimary={() => registrarBaja({ preventDefault: () => {} })}
        primaryLabel="Guardar"
      >
        <div className="minimal-form-stack">
          <div className="minimal-field">
            <label className="minimal-label">Empleado (solo activos):</label>
            <select className={`minimal-select ${carnetBaja ? 'is-selected' : ''}`} value={carnetBaja} onChange={(e) => setCarnetBaja(e.target.value)}>
              <option value="" disabled hidden>--- Seleccione ---</option>
              {empleadosParaBaja.map((emp) => (
                <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                  {emp.carnet_identidad} — {emp.nombre} {emp.apellidos}
                </option>
              ))}
            </select>
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Fecha de baja:</label>
            <input type="date" className="minimal-input" value={fechaBaja} onChange={(e) => setFechaBaja(e.target.value)} />
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Motivo:</label>
            <input
              type="text"
              className="minimal-input"
              placeholder="------------------------"
              value={motivoBaja}
              onChange={(e) => setMotivoBaja(e.target.value)}
            />
          </div>
        </div>
      </FormModal>

      <div className="card shadow-sm border-0 p-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <h6 className="mb-0">Listado</h6>
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className={`btn ${filtro === 'activos' ? 'btn-info' : 'btn-outline-info'}`}
              onClick={() => setFiltro('activos')}
            >
              Activos
            </button>
            <button
              type="button"
              className={`btn ${filtro === 'inactivos' ? 'btn-info' : 'btn-outline-info'}`}
              onClick={() => setFiltro('inactivos')}
            >
              Inactivos
            </button>
            <button
              type="button"
              className={`btn ${filtro === 'todos' ? 'btn-info' : 'btn-outline-info'}`}
              onClick={() => setFiltro('todos')}
            >
              Todos
            </button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Carnet</th>
                <th>Nombre</th>
                <th>Puesto</th>
                <th>Departamento</th>
                <th>Estado</th>
                <th>Fecha baja</th>
                <th>Motivo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
                    No hay empleados en este filtro.
                  </td>
                </tr>
              ) : (
                listaFiltrada.map((emp) => (
                  <tr key={emp.carnet_identidad} className={!esActivo(emp) ? 'table-secondary' : ''}>
                    <td>{emp.carnet_identidad}</td>
                    <td>
                      {emp.nombre} {emp.apellidos}
                    </td>
                    <td>{emp.puesto || '—'}</td>
                    <td>{emp.departamento || '—'}</td>
                    <td>{esActivo(emp) ? <span className="text-success">Activo</span> : <span className="text-danger">Inactivo</span>}</td>
                    <td className="text-nowrap">{fmtFechaTabla(emp.fecha_baja)}</td>
                    <td style={{ maxWidth: 220, whiteSpace: 'pre-wrap' }}>{emp.motivo_baja || '—'}</td>
                    <td>
                      {!esActivo(emp) && (
                        <button type="button" className="btn btn-sm btn-outline-success" onClick={() => reactivar(emp)}>
                          Reactivar
                        </button>
                      )}
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

export default BajasEmpleados;
