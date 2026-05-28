import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { Modal, Button } from 'react-bootstrap';
import { fmtFechaTabla, fmtFechaHoraTabla } from '../utils/formatDates';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';
import ListSearchToolbar from './ListSearchToolbar';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_PRODUCCION } from '../utils/exportAepgPlantilla';

const ProduccionHistorico = () => {
  const [items, setItems] = useState([]);
  const [busqTabla, setBusqTabla] = useState('');
  const [fuente, setFuente] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [cargando, setCargando] = useState(false);
  const [detalle, setDetalle] = useState(null);

  const cargar = () => {
    setCargando(true);
    const p = new URLSearchParams();
    if (fuente) p.set('fuente', fuente);
    if (desde) p.set('desde', desde);
    if (hasta) p.set('hasta', hasta);
    Axios.get(`/produccion-historico?${p.toString()}`)
      .then((res) => setItems(res.data))
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

  const itemsFiltrados = useMemo(() => {
    const t = busqTabla.trim().toLowerCase();
    if (!t) return items;
    return items.filter((r) => {
      const blob = `${r.id} ${r.fuente} ${r.fecha_dato} ${r.accion} ${r.usuario_email || ''} ${r.creado_en || ''}`.toLowerCase();
      if (blob.includes(t)) return true;
      const raw = r.datos_json != null ? String(r.datos_json) : r.datos != null ? JSON.stringify(r.datos) : '';
      return raw.toLowerCase().includes(t);
    });
  }, [items, busqTabla]);

  const historicoExportAepg = useMemo(() => {
    const headers = [
      'ID',
      'Fuente',
      'Fecha dato',
      'Acción',
      'Quién archivó',
      'Archivado en',
      'Snapshot (JSON)',
    ];
    const snapshotDe = (r) => {
      if (r.datos != null && r.datos !== undefined) return JSON.stringify(r.datos);
      if (r.datos_json != null && r.datos_json !== '') return String(r.datos_json);
      return '—';
    };
    const dataRows = itemsFiltrados.map((r) => [
      r.id,
      r.fuente,
      r.fecha_dato != null && r.fecha_dato !== '' ? String(r.fecha_dato) : '—',
      r.accion || '—',
      r.usuario_email || '—',
      r.creado_en != null && r.creado_en !== '' ? String(r.creado_en) : '—',
      snapshotDe(r),
    ]);
    return { headers, dataRows };
  }, [itemsFiltrados]);

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <ModuleTitleBar
        title="Histórico de producción"
        actions={
          <ExportacionAepgGrupo
            tituloSistema={AEPG_TITULO_PRODUCCION}
            subtitulo="Reporte: histórico de producción archivada (metadatos + JSON del snapshot por fila)."
            descripcion="Listado filtrado actual: ID, fuente, fechas, acción, quien archivó y el snapshot de datos. La columna de JSON puede ser larga; use PDF con orientación apaisada si aplica."
            nombreBaseArchivo={`AEPG_produccion_historial_${new Date().toISOString().slice(0, 10)}`}
            sheetName="Historial"
            headers={historicoExportAepg.headers}
            dataRows={historicoExportAepg.dataRows}
            disabled={!itemsFiltrados.length}
          />
        }
      />

      <div className="card shadow-sm border-0 p-4 mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-md-3">
            <label className="form-label">Fuente</label>
            <AppSelect className="form-select" value={fuente} onChange={(e) => setFuente(e.target.value)}>
              <option value="">Todas</option>
              <option value="sacrificio">Sacrificio vacuno</option>
              <option value="matadero">Matadero vivo</option>
              <option value="leche">Leche</option>
            </AppSelect>
          </div>
          <div className="col-md-2">
            <label className="form-label">Desde (fecha dato)</label>
            <input type="date" className="form-control" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="col-md-2">
            <label className="form-label">Hasta (fecha dato)</label>
            <input type="date" className="form-control" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="col-md-5 d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-info" onClick={cargar} disabled={cargando}>
              {cargando ? 'Consultando…' : 'Consultar'}
            </button>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 p-3">
        <ListSearchToolbar
          value={busqTabla}
          onChange={setBusqTabla}
          placeholder="Filtrar por ID, fuente, acción, usuario, fechas o texto en JSON…"
        />
        <h6 className="mb-3">Registros archivados ({itemsFiltrados.length} de {items.length})</h6>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Fuente</th>
                <th>Fecha dato</th>
                <th>Acción</th>
                <th>Quién archivó</th>
                <th>Archivado en</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {itemsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No hay entradas con los filtros indicados.
                  </td>
                </tr>
              ) : (
                itemsFiltrados.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.fuente}</td>
                    <td className="text-nowrap">{fmtFechaTabla(r.fecha_dato)}</td>
                    <td>{r.accion}</td>
                    <td className="small">{r.usuario_email || '—'}</td>
                    <td className="small text-nowrap">{fmtFechaHoraTabla(r.creado_en)}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setDetalle(r)}>
                        Ver snapshot
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={detalle != null} onHide={() => setDetalle(null)} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Snapshot archivado</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detalle && (
            <>
              <p className="small text-muted mb-2">
                Fuente: {detalle.fuente} · Fecha dato: {fmtFechaTabla(detalle.fecha_dato)} · Acción: {detalle.accion}
              </p>
              <pre className="bg-light p-3 rounded small mb-0" style={{ maxHeight: '60vh', overflow: 'auto' }}>
                {JSON.stringify(detalle.datos, null, 2)}
              </pre>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDetalle(null)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProduccionHistorico;
