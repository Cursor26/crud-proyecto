import { useMemo } from 'react';
import { Modal, Accordion, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useRrhhModuloData } from '../hooks/useRrhhModuloData';
import { renderBloque6 } from './rrhhHerramientas6Bloques';
import RrhhHerramientas6InfoPanel from './rrhhHerramientas6InfoPanel';
import { getHerramienta6Meta } from './rrhhHerramientas6Metadatos';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

/**
 * Seis herramientas de análisis distintas por módulo de RR.HH. (144 paneles únicos en total).
 */
function RrhhModuloHerramientas6Modal({ show, onHide, moduleKey, moduleLabel }) {
  const { user } = useAuth();
  const pack = useRrhhModuloData(moduleKey, show);

  const packTablaAnalitica = useMemo(() => {
    const skip = new Set(['loading', 'err', 'reload']);
    const headers = ['Dataset', 'Registros', 'Datos (JSON; puede truncarse si es muy extenso)'];
    const dataRows = [];
    for (const k of Object.keys(pack)) {
      if (skip.has(k)) continue;
      const v = pack[k];
      if (!Array.isArray(v)) continue;
      const json = JSON.stringify(v);
      const max = 14000;
      const cell = json.length > max ? `${json.slice(0, max)}… [truncado; use exportación JSON del menú para volúmenes mayores si su herramienta lo permite]` : json;
      dataRows.push([k, String(v.length), cell]);
    }
    return { headers, dataRows };
  }, [pack]);

  return (
    <Modal show={show} onHide={onHide} size="xl" scrollable centered className="rrhh-analitica-modal">
      <Modal.Header closeButton>
        <Modal.Title>Análisis del módulo — 6 herramientas</Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-0">
        <Alert variant="light" className="mb-2 py-2 border small">
          <strong>{moduleLabel || moduleKey}</strong>
          <span className="d-block text-muted small mt-1">
            Cada bloque es específico de este apartado (no se reutiliza en otras pantallas). Usuario:{' '}
            <strong>{user?.nombre || '—'}</strong> ({user?.rol || '—'})
          </span>
        </Alert>
        <div className="d-flex flex-wrap gap-2 mb-2 align-items-center">
          <Button size="sm" variant="outline-primary" onClick={() => pack.reload()} disabled={pack.loading}>
            {pack.loading ? <Spinner animation="border" size="sm" className="me-1" /> : null}
            Refrescar
          </Button>
          <ExportacionAepgGrupo
            tituloSistema={AEPG_TITULO_RRHH}
            subtitulo={`Paquete de datos del análisis — ${moduleLabel || moduleKey || ''}`}
            descripcion="Una fila por cada conjunto cargado para las 6 herramientas (empleados, historial, etc.). La columna JSON alimenta gráficos y tablas; puede ser grande. Módulo y usuario en cabecera del export."
            nombreBaseArchivo={`AEPG_analitica6_${String(moduleKey || 'mod').replace(/[^a-z0-9_-]/gi, '_')}_${new Date().toISOString().slice(0, 10)}`}
            sheetName="Datos_modulo"
            headers={packTablaAnalitica.headers}
            dataRows={packTablaAnalitica.dataRows}
            disabled={pack.loading || !packTablaAnalitica.dataRows.length}
            className="rrhh-analitica-export"
          />
        </div>
        {pack.err ? <Alert variant="danger py-2">{pack.err}</Alert> : null}
        <Accordion alwaysOpen defaultActiveKey="0" className="rrhh-analitica-accordion">
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const meta = getHerramienta6Meta(moduleKey, i);
            return (
            <Accordion.Item eventKey={String(i)} key={i}>
              <Accordion.Header className="d-flex flex-column align-items-stretch text-start py-2 gap-0">
                <span className="small text-uppercase text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>
                  Herramienta {i + 1}
                </span>
                <span className="text-break fw-medium">
                  {meta.titulo || moduleLabel || moduleKey}
                </span>
              </Accordion.Header>
              <Accordion.Body className="pt-2">
                <RrhhHerramientas6InfoPanel queHace={meta.queHace} datosYValores={meta.datosYValores} />
                {pack.loading && !pack.empleados?.length && !pack.historial?.length ? (
                  <div className="text-muted small">Cargando datos del módulo…</div>
                ) : (
                  renderBloque6(moduleKey, i, pack)
                )}
              </Accordion.Body>
            </Accordion.Item>
            );
          })}
        </Accordion>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default RrhhModuloHerramientas6Modal;
