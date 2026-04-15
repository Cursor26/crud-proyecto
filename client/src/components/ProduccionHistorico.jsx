import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { Modal, Button } from 'react-bootstrap';
import { exportRowsToExcel } from '../utils/exportExcel';

const ProduccionHistorico = () => {
  const [items, setItems] = useState([]);
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
    Axios.get(`http://localhost:3001/produccion-historico?${p.toString()}`)
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

  const exportarExcel = () => {
    if (!items.length) return;
    const rows = items.map((r) => ({
      id: r.id,
      fuente: r.fuente,
      fecha_dato: r.fecha_dato,
      accion: r.accion,
      usuario_que_archivo: r.usuario_email || '',
      archivado_en: r.creado_en,
    }));
    exportRowsToExcel(rows, 'Historico_prod', `historico_produccion_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <div className="mb-4">
        <h4>Histórico de producción</h4>
        <small className="text-muted">
          RF21 — Versiones archivadas al modificar o eliminar registros de sacrificio, matadero o leche. RF22 — columna
          &quot;Quién archivó&quot; corresponde al usuario autenticado en esa operación.
        </small>
      </div>

      <div className="card shadow-sm border-0 p-4 mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-md-3">
            <label className="form-label">Fuente</label>
            <select className="form-select" value={fuente} onChange={(e) => setFuente(e.target.value)}>
              <option value="">Todas</option>
              <option value="sacrificio">Sacrificio vacuno</option>
              <option value="matadero">Matadero vivo</option>
              <option value="leche">Leche</option>
            </select>
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
            <button type="button" className="btn btn-primary" onClick={cargar} disabled={cargando}>
              {cargando ? 'Consultando…' : 'Consultar'}
            </button>
            <button type="button" className="btn btn-success" onClick={exportarExcel} disabled={items.length === 0}>
              Exportar Excel (RF20)
            </button>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 p-3">
        <h6 className="mb-3">
          Registros archivados <span className="text-muted fw-normal">({items.length}, máx. 500)</span>
        </h6>
        <div className="table-responsive">
          <table className="table table-bordered table-striped table-sm align-middle mb-0">
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
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No hay entradas con los filtros indicados.
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.fuente}</td>
                    <td>{r.fecha_dato}</td>
                    <td>{r.accion}</td>
                    <td className="small">{r.usuario_email || '—'}</td>
                    <td className="small">{r.creado_en}</td>
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
                Fuente: {detalle.fuente} · Fecha dato: {detalle.fecha_dato} · Acción: {detalle.accion}
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
