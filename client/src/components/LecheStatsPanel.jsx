import { useState, useEffect, useMemo } from 'react';
import { Accordion, Card, Form } from 'react-bootstrap';
import * as XLSX from 'xlsx';
import {
  agregadoPorDiaSemana,
  compararConPeriodoAnterior,
  detectarDiasAtipicos,
  distribucionHembraMacho,
  evaluarMetaMensual,
  filtrarPorRango,
  formateaNum,
  formateaPct,
  proyeccionFinMes,
  rangoDefaultUltimosDias,
  resumenPeriodo,
  serieConMediaMovil,
  topDias,
} from '../utils/lecheStats';
import LecheInteractivo from './LecheInteractivo';

function exportarMultihoja(
  { res, comp, serie, atip, topK, topC, sem, dist, proj, sim },
  fileName,
) {
  const wb = XLSX.utils.book_new();
  const h1 = [
    { concepto: 'Días con registro (período filtrado)', valor: res.dias },
    { concepto: 'Suma producción (estim.)', valor: res.sumKg },
    { concepto: 'Suma cabezas', valor: res.sumCab },
    { concepto: 'Promedio Kg / día', valor: res.promDiaKg },
    { concepto: 'Promedio cab / día', valor: res.promDiaCab },
    { concepto: 'Kg por cabeza (promedio)', valor: res.kgPorCabeza ?? '' },
  ];
  if (comp.aplica) {
    h1.push(
      { concepto: 'Var vs bloque previo (Kg %)', valor: comp.varKg ?? '' },
      { concepto: 'Var cabezas (%)', valor: comp.varCab ?? '' },
    );
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(h1), 'Resumen');

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(serie),
    'Serie y MA7',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(topK),
    'Top kg',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(topC),
    'Top cab',
  );
  let atipHoja = (atip.filas || []).map((a) => ({
    fecha: a.fecha,
    kg: a.kg,
    desviaciones_sigma: a.desviaciones,
    tipo: a.tipo,
  }));
  if (!atipHoja.length) {
    atipHoja = [{ nota: atip.motivo || 'Sin filas atípicas en el período' }];
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(atipHoja), 'Atipicos');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sem), 'Dia semana');
  const distHoja = dist.aplica
    ? [
        { parte: 'Plantas (Z+R+N)', kg: dist.kgH, porciento: dist.hembrasPct },
        { parte: 'Resto (totales)', kg: dist.kgM, porciento: dist.machosPct },
      ]
    : [{ nota: 'Sin kg para desglosar' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(distHoja), 'Plantas vs resto');
  const pH = proj.aplica
    ? [
        { clave: 'Año', valor: proj.anio },
        { clave: 'Mes', valor: proj.mes },
        { clave: 'Días en calendario', valor: proj.diasEnMes },
        { clave: 'Días con registro (rango)', valor: proj.diasConRegistro },
        { clave: 'Suma Kg (rango)', valor: proj.sumaKgRango },
        { clave: 'Ritmo diario (Kg)', valor: proj.ritmoDiario },
        { clave: 'Proy. Kg al cierre (mes calendario)', valor: proj.kgProyectadosMes },
      ]
    : [{ nota: proj.motivo || 'N/A' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pH), 'Proyeccion');
  const sH = sim.aplica
    ? [
        { clave: 'Meta Kg (mes)', valor: sim.metaKg },
        { clave: 'Proyectado Kg', valor: sim.proyectadoKg },
        { clave: 'Brecha (proy - meta)', valor: sim.brechaKg },
        { clave: '% vs meta', valor: sim.cumplimientoProyectadoPct },
      ]
    : [{ nota: sim.motivo || 'N/A' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sH), 'Meta');
  XLSX.writeFile(
    wb,
    fileName && String(fileName).toLowerCase().endsWith('.xlsx')
      ? fileName
      : `${fileName || 'informe'}.xlsx`,
  );
}

const MesSemáforo = ({ ok, children }) => (
  <span
    className="badge me-1"
    style={{ background: ok ? 'var(--bs-success)' : 'var(--bs-warning)', fontSize: '0.75rem' }}
  >
    {children}
  </span>
);

/**
 * @param {object} props
 * @param {object[]} props.registros Listado completo (sin filtro de búsqueda de la grilla)
 */
function LecheStatsPanel({ registros }) {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [rangoInicial, setRangoInicial] = useState(false);
  const [mesMeta, setMesMeta] = useState('');
  const [metaKgStr, setMetaKgStr] = useState('');

  useEffect(() => {
    if (registros.length && !rangoInicial) {
      const { desde: d, hasta: h } = rangoDefaultUltimosDias(registros, 30);
      setDesde(d);
      setHasta(h);
      setRangoInicial(true);
    }
  }, [registros, rangoInicial]);

  const enRango = useMemo(
    () => filtrarPorRango(registros, desde, hasta),
    [registros, desde, hasta],
  );

  const res = useMemo(() => resumenPeriodo(enRango), [enRango]);
  const comp = useMemo(
    () => compararConPeriodoAnterior(registros, enRango),
    [registros, enRango],
  );
  const serie = useMemo(() => serieConMediaMovil(enRango, 7), [enRango]);
  const topK = useMemo(() => topDias(enRango, 10, 'kg'), [enRango]);
  const topC = useMemo(() => topDias(enRango, 10, 'cab'), [enRango]);
  const atip = useMemo(() => detectarDiasAtipicos(enRango, 1.75), [enRango]);
  const dist = useMemo(() => distribucionHembraMacho(enRango), [enRango]);
  const sem = useMemo(() => agregadoPorDiaSemana(enRango), [enRango]);

  const proyRef = hasta || (enRango.length ? enRango[enRango.length - 1]._fk : '');
  /** Para la proyección mensual, se priorizan los días del mismo calendario que "Hasta". */
  const enRangoMismoMes = useMemo(() => {
    if (!proyRef || proyRef.length < 7) return enRango;
    const p = proyRef.split('-').map(Number);
    const y = p[0];
    const m = p[1];
    const f = enRango.filter((r) => {
      const q = r._fk.split('-').map(Number);
      return q[0] === y && q[1] === m;
    });
    return f.length ? f : enRango;
  }, [enRango, proyRef]);
  const proj = useMemo(
    () => proyeccionFinMes(enRangoMismoMes, proyRef),
    [enRangoMismoMes, proyRef],
  );

  useEffect(() => {
    if (hasta) {
      const p = String(hasta).split('T')[0].split('-');
      if (p[0] && p[1]) {
        setMesMeta(`${p[0]}-${p[1]}`);
      }
    }
  }, [hasta, rangoInicial]);

  const { y, m } = useMemo(() => {
    if (!mesMeta) return { y: null, m: null };
    const p = mesMeta.split('-');
    return { y: Number(p[0]) || null, m: Number(p[1]) || null };
  }, [mesMeta]);

  const metaVal = useMemo(
    () => (metaKgStr === '' ? null : parseFloat(String(metaKgStr).replace(',', '.'))),
    [metaKgStr],
  );
  const sim = useMemo(() => {
    if (y == null || m == null || metaVal == null || Number.isNaN(metaVal)) {
      return { aplica: false, motivo: 'Elegí mes y un número de meta (kg).' };
    }
    return evaluarMetaMensual(registros, y, m, metaVal);
  }, [registros, y, m, metaVal]);

  const maxBarKg = useMemo(
    () => (serie.length ? Math.max(...serie.map((s) => s.kg), 1) : 1),
    [serie],
  );

  const setUltimos30 = () => {
    const { desde: d, hasta: h } = rangoDefaultUltimosDias(registros, 30);
    setDesde(d);
    setHasta(h);
  };

  const setTodoHistorial = () => {
    if (!registros.length) return;
    const sorted = [...registros]
      .map((r) => ({ ...r, _fk: (r.fecha && String(r.fecha).split('T')[0]) || '' }))
      .filter((r) => r._fk)
      .sort((a, b) => a._fk.localeCompare(b._fk));
    if (!sorted.length) return;
    setDesde(sorted[0]._fk);
    setHasta(sorted[sorted.length - 1]._fk);
  };

  const setMesEnCurso = () => {
    if (!registros.length) return;
    const now = new Date();
    const y0 = now.getFullYear();
    const m0 = now.getMonth() + 1;
    const from = `${y0}-${String(m0).padStart(2, '0')}-01`;
    const last = new Date(y0, m0, 0);
    const to = last.toISOString().slice(0, 10);
    setDesde(from);
    setHasta(to);
    setMesMeta(`${y0}-${String(m0).padStart(2, '0')}`);
  };

  const handleExportInforme = () => {
    const s = sim.aplica
      ? {
          aplica: true,
          metaKg: sim.metaKg,
          proyectadoKg: sim.proyectadoKg,
          brechaKg: sim.brechaKg,
          cumplimientoProyectadoPct: sim.cumplimientoProyectadoPct,
        }
      : { aplica: false, motivo: sim.motivo || 'Indicar mes y meta en kg para llenar la hoja' };
    const nombre = `informe_stats_leche_${new Date().toISOString().slice(0, 10)}.xlsx`;
    exportarMultihoja(
      {
        res,
        comp,
        serie,
        atip,
        topK,
        topC,
        sem,
        dist,
        proj,
        sim: s,
      },
      nombre,
    );
  };

  return (
    <>
    <Card className="mb-3 border-0 shadow-sm">
      <Card.Header as="h2" className="h5 mb-0 py-3 d-flex flex-wrap align-items-center gap-2">
        <i className="bi bi-graph-up-arrow" aria-hidden="true" />
        Estadísticas y análisis
        <span className="text-muted small ms-auto" style={{ fontWeight: 400 }}>
          (producción, plantas y totales — leche)
        </span>
      </Card.Header>
      <Card.Body className="pt-0">
        <div className="row g-2 align-items-end mb-3">
          <div className="col-sm-auto">
            <Form.Label className="small text-muted mb-0">Desde</Form.Label>
            <Form.Control
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="form-control-sm"
            />
          </div>
          <div className="col-sm-auto">
            <Form.Label className="small text-muted mb-0">Hasta</Form.Label>
            <Form.Control
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="form-control-sm"
            />
          </div>
          <div className="col-sm-auto d-flex flex-wrap gap-1">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={setUltimos30}>
              Últimos 30 días
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={setMesEnCurso}>
              Mes en curso
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={setTodoHistorial}>
              Todo el historial
            </button>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleExportInforme}>
              <i className="bi bi-file-earmark-spreadsheet me-1" aria-hidden="true" />
              Exportar informe (Excel, varias hojas)
            </button>
          </div>
        </div>

        <div className="row g-2 mb-3">
          <div className="col-md-3 col-6">
            <div className="p-2 rounded bg-light border h-100">
              <div className="small text-muted">Días con dato (período)</div>
              <div className="h4 mb-0">{res.dias}</div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="p-2 rounded bg-light border h-100">
              <div className="small text-muted">Suma Kg (estim.)</div>
              <div className="h4 mb-0">{formateaNum(res.sumKg, 0)}</div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="p-2 rounded bg-light border h-100">
              <div className="small text-muted">Suma cabezas</div>
              <div className="h4 mb-0">{formateaNum(res.sumCab, 0)}</div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="p-2 rounded bg-light border h-100">
              <div className="small text-muted">Kg / cabeza (período)</div>
              <div className="h4 mb-0">
                {res.kgPorCabeza != null ? formateaNum(res.kgPorCabeza, 1) : '—'}
              </div>
            </div>
          </div>
        </div>

        <Accordion defaultActiveKey="0" flush>
          <Accordion.Item eventKey="0">
            <Accordion.Header>
              1) Comparar con el bloque previo (mismo N de registros)
            </Accordion.Header>
            <Accordion.Body>
              {!comp.aplica && <p className="text-warning mb-0 small">{comp.motivo}</p>}
              {comp.aplica && (
                <div className="small">
                  <p>
                    <strong>Período actual:</strong> {comp.refInicio} → {comp.refFin} ({comp.actual.dias} días con registro)
                    <br />
                    <strong>Bloque anterior inmediato:</strong> {comp.prevInicio} → {comp.prevFin} ({comp.anterior.dias} días)
                  </p>
                  <ul className="list-unstyled mb-0">
                    <li>Variación total Kg: <strong>{formateaPct(comp.varKg)}</strong> (actual {formateaNum(comp.actual.sumKg, 0)} vs {formateaNum(comp.anterior.sumKg, 0)})</li>
                    <li>Variación cabezas: <strong>{formateaPct(comp.varCab)}</strong></li>
                    <li>Variación Kg/cabeza: <strong>{formateaPct(comp.varKgCabeza)}</strong></li>
                  </ul>
                </div>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="1">
            <Accordion.Header>2) Tendencia diaria y media móvil 7 días</Accordion.Header>
            <Accordion.Body>
              {serie.length === 0 ? (
                <p className="text-muted mb-0">Sin filas en el rango.</p>
              ) : (
                <div className="table-responsive" style={{ maxHeight: 280 }}>
                  <table className="table table-sm table-bordered mb-0">
                    <thead className="table-light position-sticky top-0">
                      <tr>
                        <th>Fecha</th>
                        <th className="text-end">Kg</th>
                        <th className="text-end">Media móvil 7d (kg)</th>
                        <th className="d-none d-md-table-cell">Kg (barra relativa al máx. del rango)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serie.map((s) => (
                        <tr key={s.fecha}>
                          <td className="text-nowrap">{s.fecha}</td>
                          <td className="text-end">{formateaNum(s.kg, 0)}</td>
                          <td className="text-end text-muted">{formateaNum(s.maKg, 1)}</td>
                          <td className="d-none d-md-table-cell small">
                            <div
                              className="rounded"
                              style={{
                                height: 6,
                                width: `${(s.kg / maxBarKg) * 100}%`,
                                maxWidth: '100%',
                                minWidth: s.kg > 0 ? 4 : 0,
                                background: 'var(--bs-primary)',
                              }}
                              title={`${s.kg} kg`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="2">
            <Accordion.Header>3) Top días del período (ranking)</Accordion.Header>
            <Accordion.Body>
              <div className="row">
                <div className="col-md-6">
                  <h3 className="h6">Por Kg</h3>
                  <ol className="small">
                    {topK.map((t) => (
                      <li key={t.fecha}>
                        {t.fecha} — {formateaNum(t.kg, 0)} kg
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="col-md-6">
                  <h3 className="h6">Por cabezas</h3>
                  <ol className="small">
                    {topC.map((t) => (
                      <li key={`${t.fecha}-cab`}>
                        {t.fecha} — {formateaNum(t.cab, 0)} cab.
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="3">
            <Accordion.Header>4) Días atípicos (alto o bajo vs media del rango, Z ≥ 1,75)</Accordion.Header>
            <Accordion.Body>
              {atip.motivo && <p className="text-muted small">{atip.motivo}</p>}
              {!atip.filas?.length && atip.aplica && (
                <p className="mb-0 small">No se detectan días que superen el umbral en este período.</p>
              )}
              {atip.filas?.length > 0 && (
                <>
                  <p className="small text-muted mb-1">Media: {formateaNum(atip.media, 1)} kg · Desv. estándar: {formateaNum(atip.desv, 1)}</p>
                  <ul className="small mb-0">
                    {atip.filas.map((a) => (
                      <li key={a.fecha}>
                        {a.fecha} — {formateaNum(a.kg, 0)} kg
                        <span className={a.tipo === 'alto' ? ' text-danger' : ' text-primary'}>
                          {' '}
                          ({a.tipo}, {a.desviaciones.toFixed(2)} σ)
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="4">
            <Accordion.Header>5) Proyección al cierre del mes calendario (según “Hasta”)</Accordion.Header>
            <Accordion.Body>
              {!proj.aplica && <p className="text-warning small mb-0">{proj.motivo}</p>}
              {proj.aplica && (
                <ul className="small mb-0">
                  <li>
                    Calendario: <strong>{proj.mes}/{proj.anio}</strong> — {proj.diasEnMes} días
                  </li>
                  <li>Días con registro en el rango: {proj.diasConRegistro}</li>
                  <li>Suma Kg (rango): {formateaNum(proj.sumaKgRango, 0)}</li>
                  <li>Ritmo diario: {formateaNum(proj.ritmoDiario, 1)} Kg/día</li>
                  <li>
                    <strong>Proyección de Kg al cierre de mes: {formateaNum(proj.kgProyectadosMes, 0)}</strong> (extiende el ritmo actual a los {proj.diasEnMes} días del mes)
                  </li>
                </ul>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="5">
            <Accordion.Header>6) Simulador de meta mensual (kg) vs. proyección</Accordion.Header>
            <Accordion.Body>
              <div className="row g-2 align-items-end mb-2">
                <div className="col-sm-4 col-md-3">
                  <Form.Label className="small text-muted mb-0">Mes (calendario)</Form.Label>
                  <Form.Control
                    type="month"
                    value={mesMeta}
                    onChange={(e) => setMesMeta(e.target.value)}
                    className="form-control-sm"
                  />
                </div>
                <div className="col-sm-4 col-md-3">
                  <Form.Label className="small text-muted mb-0">Meta (kg en el mes)</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    step={1000}
                    placeholder="Ej. 500000"
                    value={metaKgStr}
                    onChange={(e) => setMetaKgStr(e.target.value)}
                    className="form-control-sm"
                  />
                </div>
              </div>
              {!sim.aplica && <p className="text-muted small mb-0">{sim.motivo}</p>}
              {sim.aplica && (
                <div>
                  {sim.cumplimientoProyectadoPct >= 100 ? (
                    <MesSemáforo ok>Proyección alcanza la meta</MesSemáforo>
                  ) : (
                    <MesSemáforo ok={false}>Riesgo de no alcanzar la meta (según ritmo en datos del mes)</MesSemáforo>
                  )}
                  <ul className="small mt-2 mb-0">
                    <li>Meta: {formateaNum(sim.metaKg, 0)} kg</li>
                    <li>Proyectado (mismo criterio que arriba): {formateaNum(sim.proyectadoKg, 0)} kg</li>
                    <li>
                      Brecha (proy − meta): {formateaNum(sim.brechaKg, 0)} kg
                      {sim.brechaKg < 0 && ' — por debajo de la meta con el ritmo actual'}
                    </li>
                    <li>Proyección / meta: {formateaNum(sim.cumplimientoProyectadoPct, 1)}%</li>
                  </ul>
                </div>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="6">
            <Accordion.Header>7) Plantas (Zenea+Rosafe+Nazareno) vs resto de producción — Kg (período)</Accordion.Header>
            <Accordion.Body>
              {!dist.aplica && <p className="text-muted small">Sin kg en el rango (revisar totales o detalle).</p>}
              {dist.aplica && (
                <div>
                  <div className="d-flex align-items-center gap-2 mb-2 small">
                    <span>Plantas: {formateaNum(dist.kgH, 0)} kg ({formateaNum(dist.hembrasPct, 1)}%)</span>
                  </div>
                  <div
                    className="d-flex rounded overflow-hidden"
                    style={{ height: 14, background: 'var(--bs-gray-200)' }}
                  >
                    <div
                      style={{
                        width: `${dist.hembrasPct}%`,
                        background: 'var(--bs-pink, #d63384)',
                        minWidth: dist.kgH > 0 ? 2 : 0,
                      }}
                        title="Plantas"
                    />
                    <div
                      style={{
                        width: `${dist.machosPct}%`,
                        background: 'var(--bs-info, #0dcaf0)',
                        minWidth: dist.kgM > 0 ? 2 : 0,
                      }}
                        title="Resto"
                    />
                  </div>
                  <p className="mt-1 mb-0 small">Resto: {formateaNum(dist.kgM, 0)} kg ({formateaNum(dist.machosPct, 1)}%)</p>
                </div>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="7">
            <Accordion.Header>8) Patrón por día de la semana (acumulado en el período)</Accordion.Header>
            <Accordion.Body>
              <div className="table-responsive">
                <table className="table table-sm table-bordered mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Día</th>
                      <th className="text-end">N° registros</th>
                      <th className="text-end">Kg acumulados</th>
                      <th className="text-end">Prom. Kg por registro en ese weekday</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sem.map((s) => (
                      <tr key={s.dia}>
                        <td>{s.label}</td>
                        <td className="text-end">{s.n}</td>
                        <td className="text-end">{formateaNum(s.kg, 0)}</td>
                        <td className="text-end text-muted">{formateaNum(s.promKg, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Card.Body>
    </Card>
    <LecheInteractivo registros={registros} />
    </>
  );
}

export default LecheStatsPanel;
