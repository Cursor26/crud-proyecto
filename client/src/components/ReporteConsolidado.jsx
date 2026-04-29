import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import ModuleTitleBar from './ModuleTitleBar';

const ReporteConsolidado = () => {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);

  const cargar = () => {
    setCargando(true);
    Axios.get('/reporte-consolidado-departamentos')
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

  const headers = ['Departamento', 'Empleados activos', 'Empleados inactivos', 'Total empleados', 'Masa salarial activos'];
  const dataRows = filas.length
    ? [
        ...filas.map((r) => [
          r.departamento,
          r.empleados_activos,
          r.empleados_inactivos,
          r.total_empleados,
          r.masa_salarial_activos,
        ]),
        ['TOTAL EMPRESA', totales.activos, totales.inactivos, totales.total, totales.masa],
      ]
    : [];

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <ModuleTitleBar
        title="Reporte consolidado"
        actions={
          <>
            <button type="button" className="btn btn-info btn-sm" onClick={cargar} disabled={cargando}>
              {cargando ? 'Actualizando…' : 'Actualizar'}
            </button>
            <ExportacionAepgGrupo
              subtitulo="Reporte: consolidado por departamento (activos, inactivos, masa salarial). Vista Reporte consolidado AEPG."
              descripcion="Una fila por departamento más fila de totales empresa (suma de columnas numéricas)."
              nombreBaseArchivo={`AEPG_reporte_consolidado_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Consolidado RRHH"
              headers={headers}
              dataRows={dataRows}
              disabled={filas.length === 0}
            />
          </>
        }
      />

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
