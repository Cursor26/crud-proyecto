import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { exportRowsToExcel } from '../utils/exportExcel';
import { FormModal } from './FormModal';
import ModuleTitleBar from './ModuleTitleBar';

const esActivo = (e) => e.activo == null || e.activo === 1 || e.activo === '1';

const ReportePersonal = () => {
  const [empleados, setEmpleados] = useState([]);
  const [departamento, setDepartamento] = useState('');
  const [puesto, setPuesto] = useState('');
  const [soloActivos, setSoloActivos] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [showFiltrosModal, setShowFiltrosModal] = useState(false);

  const cargar = () => {
    setCargando(true);
    const params = new URLSearchParams();
    if (departamento.trim()) params.set('departamento', departamento.trim());
    if (puesto.trim()) params.set('puesto', puesto.trim());
    params.set('solo_activos', soloActivos ? '1' : '0');
    Axios.get(`http://localhost:3001/reporte-personal?${params.toString()}`)
      .then((res) => {
        const ordenados = [...res.data].sort((a, b) =>
          `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es')
        );
        setEmpleados(ordenados);
      })
      .catch((err) => {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      })
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deptOpciones = useMemo(() => {
    const s = new Set();
    empleados.forEach((e) => {
      if (e.departamento && String(e.departamento).trim()) s.add(String(e.departamento).trim());
    });
    return [...s].sort((a, b) => a.localeCompare(b, 'es'));
  }, [empleados]);

  const puestoOpciones = useMemo(() => {
    const s = new Set();
    empleados.forEach((e) => {
      if (e.puesto && String(e.puesto).trim()) s.add(String(e.puesto).trim());
    });
    return [...s].sort((a, b) => a.localeCompare(b, 'es'));
  }, [empleados]);

  const exportarCsv = () => {
    const cols = ['carnet_identidad', 'nombre', 'apellidos', 'puesto', 'departamento', 'telefono', 'salario_normal', 'activo'];
    const header = cols.join(';');
    const rows = empleados.map((e) =>
      cols
        .map((c) => {
          let v = e[c];
          if (c === 'activo') v = esActivo(e) ? 'activo' : 'inactivo';
          if (v == null) v = '';
          const s = String(v).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(';')
    );
    const blob = new Blob(['\uFEFF' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reporte_personal_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportarExcel = () => {
    if (!empleados.length) return;
    const rows = empleados.map((e) => ({
      carnet_identidad: e.carnet_identidad,
      nombre: e.nombre,
      apellidos: e.apellidos,
      puesto: e.puesto,
      departamento: e.departamento,
      telefono: e.telefono,
      salario_normal: e.salario_normal,
      estado: esActivo(e) ? 'activo' : 'inactivo',
    }));
    exportRowsToExcel(rows, 'Personal', `reporte_personal_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <ModuleTitleBar
        title="Reporte de personal"
        actions={
          <>
            <button type="button" className="btn btn-info" onClick={() => setShowFiltrosModal(true)}>
              <i className="bi bi-funnel me-2" aria-hidden="true" />
              Filtros
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={exportarCsv} disabled={empleados.length === 0}>
              Exportar CSV
            </button>
            <button type="button" className="btn btn-success btn-form-nowrap" onClick={exportarExcel} disabled={empleados.length === 0}>
              Exportar Excel
            </button>
          </>
        }
      />

      <FormModal
        show={showFiltrosModal}
        onHide={() => setShowFiltrosModal(false)}
        title="Filtros"
        subtitle=""
        onPrimary={() => {
          cargar();
          setShowFiltrosModal(false);
        }}
        primaryLabel={cargando ? 'Consultando…' : 'Aplicar'}
        primaryDisabled={cargando}
      >
        <div className="minimal-form-stack">
          <div className="minimal-field">
            <label className="minimal-label">Departamento:</label>
            <input
              type="text"
              className="minimal-input"
              list="reporte-dept-datalist"
              placeholder="------------------------"
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
            />
            <datalist id="reporte-dept-datalist">
              {deptOpciones.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Cargo / puesto:</label>
            <input
              type="text"
              className="minimal-input"
              list="reporte-puesto-datalist"
              placeholder="------------------------"
              value={puesto}
              onChange={(e) => setPuesto(e.target.value)}
            />
            <datalist id="reporte-puesto-datalist">
              {puestoOpciones.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <label className="minimal-radio">
            <input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} />
            Solo personal activo
          </label>
        </div>
      </FormModal>

      <div className="card shadow-sm border-0 p-3">
        <h6 className="mb-3">Resultados</h6>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Carnet</th>
                <th>Nombre</th>
                <th>Puesto</th>
                <th>Departamento</th>
                <th>Teléfono</th>
                <th>Salario</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {empleados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No hay registros con los filtros indicados.
                  </td>
                </tr>
              ) : (
                empleados.map((emp) => (
                  <tr key={emp.carnet_identidad}>
                    <td>{emp.carnet_identidad}</td>
                    <td>
                      {emp.nombre} {emp.apellidos}
                    </td>
                    <td>{emp.puesto || '—'}</td>
                    <td>{emp.departamento || '—'}</td>
                    <td>{emp.telefono || '—'}</td>
                    <td>{emp.salario_normal ?? '—'}</td>
                    <td>{esActivo(emp) ? <span className="text-success">Activo</span> : <span className="text-danger">Inactivo</span>}</td>
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

export default ReportePersonal;
