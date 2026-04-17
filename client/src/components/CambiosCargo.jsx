import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';

const esActivo = (e) => e.activo == null || e.activo === 1 || e.activo === '1';

const CambiosCargo = () => {
  const [empleados, setEmpleados] = useState([]);
  const [carnet, setCarnet] = useState('');
  const [puestoNuevo, setPuestoNuevo] = useState('');
  const [ajustarSalario, setAjustarSalario] = useState(false);
  const [salarioNuevo, setSalarioNuevo] = useState('');

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

  const seleccionado = empleados.find((e) => String(e.carnet_identidad) === String(carnet));

  const registrar = (e) => {
    e.preventDefault();
    if (!carnet) {
      Swal.fire('Atención', 'Seleccione un empleado.', 'warning');
      return;
    }
    if (!puestoNuevo.trim()) {
      Swal.fire('Atención', 'Indique el nuevo puesto o cargo.', 'warning');
      return;
    }
    Swal.fire({
      title: '¿Registrar cambio de cargo?',
      html: seleccionado
        ? `<p>De <strong>${seleccionado.puesto || '—'}</strong> a <strong>${puestoNuevo.trim()}</strong>.</p>`
        : '',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      Axios.post('http://localhost:3001/empleado-cambio-cargo', {
        carnet_identidad: carnet,
        puesto_nuevo: puestoNuevo.trim(),
        salario_nuevo: ajustarSalario && salarioNuevo !== '' ? salarioNuevo : undefined,
      })
        .then(() => {
          Swal.fire('Listo', 'Cambio de cargo registrado (queda en el historial laboral).', 'success');
          setPuestoNuevo('');
          setAjustarSalario(false);
          setSalarioNuevo('');
          setCarnet('');
          cargar();
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    });
  };

  const activos = empleados.filter(esActivo);

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <div className="mb-4">
        <h4>Cambios de cargo</h4>
      </div>

      <div className="card shadow-sm border-0 p-4 mb-4">
        <h6 className="mb-3">Registrar cambio</h6>
        <form onSubmit={registrar}>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Empleado (activos)</label>
              <select className="form-select" value={carnet} onChange={(e) => setCarnet(e.target.value)} required>
                <option value="" disabled hidden>— Seleccione —</option>
                {activos.map((emp) => (
                  <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                    {emp.carnet_identidad} — {emp.nombre} {emp.apellidos} ({emp.puesto || 'sin puesto'})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Nuevo puesto / cargo</label>
              <input
                type="text"
                className="form-control"
                value={puestoNuevo}
                onChange={(e) => setPuestoNuevo(e.target.value)}
                required
              />
            </div>
            <div className="col-md-4 d-grid d-md-flex align-items-end">
              <button type="submit" className="btn btn-success btn-form-nowrap w-100">
                Guardar cambio
              </button>
            </div>
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="ajSal"
                  checked={ajustarSalario}
                  onChange={(e) => {
                    setAjustarSalario(e.target.checked);
                    if (!e.target.checked) setSalarioNuevo('');
                  }}
                />
                <label className="form-check-label" htmlFor="ajSal">
                  Ajustar salario con el cambio (opcional)
                </label>
              </div>
            </div>
            {ajustarSalario && (
              <div className="col-md-3">
                <label className="form-label">Nuevo salario</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={salarioNuevo}
                  onChange={(e) => setSalarioNuevo(e.target.value)}
                />
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="card shadow-sm border-0 p-3">
        <h6 className="mb-0">Vista rápida del personal activo</h6>
      </div>
    </div>
  );
};

export default CambiosCargo;
