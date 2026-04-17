import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { exportRowsToExcel } from '../utils/exportExcel';

const ReporteConsolidado = () => {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);

  const cargar = () => {
    setCargando(true);
    Axios.get('http://localhost:3001/reporte-consolidado-departamentos')
      .then((res) => setFilas(res.data))
      .catch((err) => {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      })
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const totales = useMemo(() => {
    let activos = 0;
    let inactivos = 0;
    let total = 0;
    let masa = 0;
    filas.forEach((r) => {
      activos += Number(r.empleados_activos) || 0;
      inactivos += Number(r.empleados_inactivos) || 0;
      total += Number(r.total_empleados) || 0;
      masa += Number(r.masa_salarial_activos) || 0;
    });
    return { activos, inactivos, total, masa };
  }, [filas]);

  const exportarExcel = () => {
    if (!filas.length) return;
    const rows = filas.map((r) => ({
      departamento: r.departamento,
      empleados_activos: r.empleados_activos,
      empleados_inactivos: r.empleados_inactivos,
      total_empleados: r.total_empleados,
      masa_salarial_activos: r.masa_salarial_activos,
    }));
    rows.push({
      departamento: 'TOTAL EMPRESA',
      empleados_activos: totales.activos,
      empleados_inactivos: totales.inactivos,
      total_empleados: totales.total,
      masa_salarial_activos: totales.masa,
    });
    exportRowsToExcel(rows, 'Consolidado', `reporte_consolidado_dept_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <div className="mb-4 d-flex flex-wrap align-items-start justify-content-between gap-2">
        <div>
          <h4>Reporte consolidado</h4>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-info btn-sm" onClick={cargar} disabled={cargando}>
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
          <button type="button" className="btn btn-success btn-sm btn-form-nowrap" onClick={exportarExcel} disabled={filas.length === 0}>
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="card shadow-sm border-0 p-3">
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Departamento</th>
                <th className="text-end">Activos</th>
                <th className="text-end">Inactivos</th>
                <th className="text-end">Total</th>
                <th className="text-end">Masa salarial (activos)</th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No hay datos de empleados o aún no se ha cargado el listado.
                  </td>
                </tr>
              ) : (
                <>
                  {filas.map((r) => (
                    <tr key={r.departamento}>
                      <td>{r.departamento}</td>
                      <td className="text-end">{r.empleados_activos}</td>
                      <td className="text-end">{r.empleados_inactivos}</td>
                      <td className="text-end">{r.total_empleados}</td>
                      <td className="text-end">{Number(r.masa_salarial_activos || 0).toLocaleString('es')}</td>
                    </tr>
                  ))}
                  <tr className="table-secondary fw-semibold">
                    <td>Total empresa</td>
                    <td className="text-end">{totales.activos}</td>
                    <td className="text-end">{totales.inactivos}</td>
                    <td className="text-end">{totales.total}</td>
                    <td className="text-end">{totales.masa.toLocaleString('es')}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReporteConsolidado;
