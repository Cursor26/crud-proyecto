import { useState, useEffect, useMemo, useCallback } from 'react';
import { Accordion, Card, Form, Button, ButtonGroup, InputGroup, Badge } from 'react-bootstrap';
import {
  ResponsiveContainer,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Brush,
  CartesianGrid,
  ComposedChart,
  Cell,
} from 'recharts';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import {
  exportarProduccionEstadisticaCSV,
  exportarProduccionEstadisticaXLS,
  exportarProduccionEstadisticaXLSX,
  hojasDesdeInteractivo,
} from '../utils/exportProduccionEstadistica';
import ExportacionProduccionInteractivaMenu from './ExportacionProduccionInteractivaMenu';
import {
  TODAS_CATEGORIAS,
  agregarPorSemana,
  compararMesDosAnios,
  compararRangosLibres,
  detectarDiasAtipicosCustom,
  distribucionHembraMacho,
  filtrarLunesAViernes,
  filtrarMinValor,
  filtrarPorRango,
  formateaNum,
  formateaPct,
  grillaCalendarioMes,
  listaCronologica,
  metricasDia,
  metricasPorCategorias,
  percentilesDeValores,
  proyeccionFinMes,
  regresionLinealSerie,
  resumenConGetter,
  rangoDefaultUltimosDias,
  serieAcumuladaValores,
  serieConMediaMovilCustom,
  valorDiaSufijo,
  whatIfAjusteProyeccion,
} from '../utils/sacrificioVacunoStats';

const SUFIJOS_METRICA = [
  'Kg_m', 'Cbz_m', 'Kg_sal', 'Cbz_sal', 'Kg_tur', 'Cbz_tur', 'Kg_in', 'Cbz_in',
  'Kg_p', 'Cbz_p', 'Kg_t', 'Cbz_t', 'Kg_se', 'Cab_se', 'Kg_sc', 'Cbz_sc', 'Cbz_st', 'Tm_st',
];

const COLORS = ['#0d6efd', '#6f42c1', '#d63384', '#fd7e14', '#20c997'];
const NOMBRE_MODULO = 'Sacrificio vacuno';

function useMetricGetter(modoMetrica, sufijo, catIncluidas) {
  return useCallback(
    (r) => {
      if (modoMetrica === 'sufijo') return valorDiaSufijo(r, sufijo);
      if (modoMetrica === 'categorias') return metricasPorCategorias(r, catIncluidas).kg;
      return metricasDia(r).kg;
    },
    [modoMetrica, sufijo, catIncluidas],
  );
}

/**
 * 16 herramientas con controles, gráficos (Recharts) y acciones.
 */
function SacrificioVacunoInteractivo({ registros }) {
  const { user } = useAuth();
  const [ivDesde, setIvDesde] = useState('');
  const [ivHasta, setIvHasta] = useState('');
  const [rangoInicial, setRangoInicial] = useState(false);

  const [modoMetrica, setModoMetrica] = useState('clásico');
  const [sufijo, setSufijo] = useState('Kg_m');
  const [catChecks, setCatChecks] = useState(() => Object.fromEntries(TODAS_CATEGORIAS.map((c) => [c, true])));

  const [soloHabiles, setSoloHabiles] = useState(false);
  const [barModo, setBarModo] = useState('dia');
  const [maVentana, setMaVentana] = useState(7);
  const [zAtip, setZAtip] = useState(1.75);
  const [zAplicar, setZAplicar] = useState(1.75);
  const [minKgStr, setMinKgStr] = useState('');
  const [minAplicar, setMinAplicar] = useState(null);

  const [aDesde, setADesde] = useState('');
  const [aHasta, setAHasta] = useState('');
  const [bDesde, setBDesde] = useState('');
  const [bHasta, setBHasta] = useState('');

  const [ytdAnio, setYtdAnio] = useState(new Date().getFullYear());
  const [mesCompara, setMesCompara] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [anio1, setAnio1] = useState(new Date().getFullYear() - 1);
  const [anio2, setAnio2] = useState(new Date().getFullYear());

  const [whatifPct, setWhatifPct] = useState(0);

  const [calAnio, setCalAnio] = useState(new Date().getFullYear());
  const [calMes, setCalMes] = useState(new Date().getMonth() + 1);

  const [mostrarTendencia, setMostrarTendencia] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [selFechaGraf, setSelFechaGraf] = useState('');
  const [ajusteFino, setAjusteFino] = useState(100);
  const [mostrarMA, setMostrarMA] = useState(true);

  useEffect(() => {
    if (registros.length && !rangoInicial) {
      const { desde, hasta } = rangoDefaultUltimosDias(registros, 45);
      setIvDesde(desde);
      setIvHasta(hasta);
      setADesde(desde);
      setAHasta(hasta);
      const l = listaCronologica(registros);
      if (l.length >= 2) {
        setBDesde(l[0]._fk);
        setBHasta(l[Math.max(0, l.length - 2)]._fk);
      }
      setRangoInicial(true);
    }
  }, [registros, rangoInicial]);

  const catIncluidas = useMemo(
    () => TODAS_CATEGORIAS.filter((c) => catChecks[c]),
    [catChecks],
  );

  const getVal = useMetricGetter(modoMetrica, sufijo, catIncluidas);

  const vEff = useCallback(
    (r) => getVal(r) * (ajusteFino / 100),
    [getVal, ajusteFino],
  );

  const baseRango = useMemo(() => {
    let en = filtrarPorRango(registros, ivDesde, ivHasta);
    if (soloHabiles) en = filtrarLunesAViernes(en);
    return en;
  }, [registros, ivDesde, ivHasta, soloHabiles]);

  const dataFiltradaMin = useMemo(() => {
    if (minAplicar == null || minAplicar === '') return baseRango;
    return filtrarMinValor(baseRango, Number(minAplicar), vEff);
  }, [baseRango, minAplicar, vEff]);

  const lineaSerie = useMemo(
    () => serieConMediaMovilCustom(dataFiltradaMin, vEff, maVentana),
    [dataFiltradaMin, vEff, maVentana],
  );

  const serieV = useMemo(() => dataFiltradaMin.map((r) => vEff(r)), [dataFiltradaMin, vEff]);
  const reg = useMemo(() => regresionLinealSerie(serieV), [serieV]);

  const lineaConTend = useMemo(() => {
    if (!reg.aplica) return lineaSerie.map((row, i) => ({ ...row, tend: null }));
    return lineaSerie.map((row, i) => ({
      ...row,
      tend: mostrarTendencia ? reg.a + reg.b * i : null,
    }));
  }, [lineaSerie, reg, mostrarTendencia]);

  const atip = useMemo(
    () => detectarDiasAtipicosCustom(dataFiltradaMin, vEff, zAplicar),
    [dataFiltradaMin, vEff, zAplicar],
  );

  const barrasData = useMemo(() => {
    if (barModo === 'semana') {
      return agregarPorSemana(dataFiltradaMin, vEff).map((s) => ({
        label: s.semana.slice(5),
        v: s.suma,
      }));
    }
    return dataFiltradaMin.map((r) => ({ label: r._fk.slice(5), fecha: r._fk, v: vEff(r) }));
  }, [dataFiltradaMin, vEff, barModo]);

  const hmUnBar = useMemo(() => {
    const d = distribucionHembraMacho(dataFiltradaMin);
    if (!d.aplica) return [{ nombre: '—', h: 0, m: 0 }];
    return [{ nombre: 'Período', h: d.kgH, m: d.kgM }];
  }, [dataFiltradaMin]);

  const ytdRango = useMemo(() => {
    const d0 = `${ytdAnio}-01-01`;
    const d1 = `${ytdAnio}-12-31`;
    return filtrarPorRango(registros, d0, d1);
  }, [registros, ytdAnio]);

  const ytdAcum = useMemo(
    () => serieAcumuladaValores(ytdRango, (r) => metricasDia(r).kg),
    [ytdRango],
  );

  const byFecha = useMemo(() => {
    const m = new Map();
    for (const r of registros) {
      const fk = (r.fecha && String(r.fecha).split('T')[0]) || '';
      if (fk) m.set(fk, r);
    }
    return m;
  }, [registros]);

  const celdasCalor = useMemo(
    () => grillaCalendarioMes(calAnio, calMes, (fk) => {
      const r = byFecha.get(fk);
      return r ? vEff(r) : 0;
    }),
    [calAnio, calMes, byFecha, vEff],
  );

  const maxCalV = useMemo(
    () => (celdasCalor.length ? Math.max(1, ...celdasCalor.filter((c) => c.tipo === 'day').map((c) => c.v)) : 1),
    [celdasCalor],
  );

  const cmpAb = useMemo(
    () => compararRangosLibres(registros, aDesde, aHasta, bDesde, bHasta, vEff),
    [registros, aDesde, aHasta, bDesde, bHasta, vEff],
  );

  const cmpMesAños = useMemo(
    () => compararMesDosAnios(registros, Number(mesCompara), anio1, anio2, vEff),
    [registros, mesCompara, anio1, anio2, vEff],
  );

  const barMesCmpData = useMemo(
    () => (cmpMesAños.aplica
      ? [
        { name: `A ${anio1}`, v: cmpMesAños.sumA, fill: COLORS[0] },
        { name: `B ${anio2}`, v: cmpMesAños.sumB, fill: COLORS[1] },
      ]
      : []),
    [cmpMesAños, anio1, anio2],
  );

  const proyMes = useMemo(() => {
    if (!ivHasta || dataFiltradaMin.length === 0) return { aplica: false };
    const p = proyeccionFinMes(dataFiltradaMin, ivHasta);
    return p;
  }, [dataFiltradaMin, ivHasta]);

  const whatifKg = useMemo(() => {
    if (!proyMes.aplica) return null;
    return whatIfAjusteProyeccion(proyMes.ritmoDiario, proyMes.diasEnMes, whatifPct);
  }, [proyMes, whatifPct]);

  const percs = useMemo(() => {
    if (!serieV.length) return { aplica: false };
    return percentilesDeValores(serieV, [0.1, 0.25, 0.5, 0.75, 0.9]);
  }, [serieV]);

  const applyMin = () => {
    const n = parseFloat(String(minKgStr).replace(',', '.'));
    if (minKgStr === '' || Number.isNaN(n)) {
      setMinAplicar(null);
      Swal.fire('Aviso', 'Dejá vacío para quitar el filtro, o ingresá un número.', 'info');
      return;
    }
    setMinAplicar(n);
  };

  const copyRes = async () => {
    const rsum = resumenConGetter(dataFiltradaMin, vEff);
    const t = [
      'Sacrificio vacuno — resumen (herramienta interactiva)',
      `Rango: ${ivDesde} a ${ivHasta}${soloHabiles ? ' (solo lun–vie)' : ''} · ajuste visual ${ajusteFino}%`,
      `Días: ${dataFiltradaMin.length} · Suma: ${formateaNum(rsum.sum, 0)} · Prom: ${formateaNum(rsum.prom, 1)}`,
      reg.aplica
        ? `Tendencia (lineal, índice día): a=${formateaNum(reg.a, 0)}, b=${formateaNum(reg.b, 2)} kg/día index`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(t);
      Swal.fire('Copiado', 'Resumen en el portapapeles', 'success');
    } catch {
      Swal.fire('Error', 'No se pudo copiar (permiso del navegador)', 'error');
    }
  };

  const stepData = useMemo(
    () => (dataFiltradaMin[stepIdx] ? { fecha: dataFiltradaMin[stepIdx]._fk, v: vEff(dataFiltradaMin[stepIdx]) } : null),
    [dataFiltradaMin, stepIdx, vEff],
  );

  useEffect(() => {
    setStepIdx(0);
  }, [ivDesde, ivHasta, soloHabiles, modoMetrica, sufijo]);

  const exportarSerieCsv = () => {
    if (!lineaSerie.length) {
      Swal.fire('Aviso', 'No hay datos en el rango', 'info');
      return;
    }
    const lines = [`fecha;valor;ma${maVentana}`];
    lineaSerie.forEach((r) => {
      lines.push(`${r.fecha};${String(r.v).replace('.', ',')};${String(r.ma).replace('.', ',')}`);
    });
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `serie_sacrificio_${ivDesde || 'x'}_${ivHasta || 'x'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const syncRangosConInteractivo = () => {
    setADesde(ivDesde);
    setAHasta(ivHasta);
    const l = listaCronologica(registros);
    const idx = l.findIndex((x) => x._fk === ivDesde);
    if (idx > 0) {
      setBDesde(l[0]._fk);
      setBHasta(l[idx - 1]._fk);
      Swal.fire('Listo', 'A = rango arriba · B = todo lo anterior a Desde (mismo criterio que la comparación automática, aproximado al histórico).', 'success');
    } else {
      Swal.fire('Aviso', 'No hay datos antes de “Desde” para armar B automáticamente. Ajustá fechas a mano.', 'warning');
    }
  };

  const hojasParaExport = () => hojasDesdeInteractivo({
    nombreModulo: NOMBRE_MODULO,
    lineaSerie,
    ivDesde,
    ivHasta,
    ajusteFino,
    maVentana,
    extraKvs: [
      ['Solo días laborables', soloHabiles ? 'Sí' : 'No'],
      ['Métrica', modoMetrica],
      ['Sufijo (si aplica)', sufijo],
    ],
  });

  const exportarSerieXlsx = async () => {
    try {
      await exportarProduccionEstadisticaXLSX({ nombreModulo: NOMBRE_MODULO, user, hojas: hojasParaExport() });
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo generar el .xlsx', 'error');
    }
  };

  const exportarSerieXls = () => {
    try {
      exportarProduccionEstadisticaXLS({ nombreModulo: NOMBRE_MODULO, user, hojas: hojasParaExport() });
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo generar el .xls', 'error');
    }
  };

  const exportarSerieCsvCompleto = () => {
    exportarProduccionEstadisticaCSV({
      nombreModulo: NOMBRE_MODULO,
      user,
      hojas: hojasParaExport(),
      nombreBase: 'AEPG_serie_sacrificio',
    });
  };

  const listarDiasP90 = () => {
    if (!percs.aplica || percs.out == null) {
      Swal.fire('Aviso', 'Necesitás datos y percentiles (rango con variedad).', 'info');
      return;
    }
    const um = percs.out.p90;
    const días = dataFiltradaMin.filter((r) => vEff(r) >= um);
    const body = días
      .map((r) => `${r._fk} — <strong>${formateaNum(vEff(r), 0)}</strong>`)
      .join('<br/>') || 'Ninguno';
    Swal.fire({
      title: `Días ≥ P90 (${formateaNum(um, 0)}) — ${días.length} `,
      html: body,
      width: 600,
    });
  };

  return (
    <Card className="mb-3 border-0 shadow-sm">
      <Card.Header as="h2" className="h5 mb-0 py-3 d-flex flex-wrap align-items-center gap-2">
        <i className="bi bi-sliders" aria-hidden="true" />
        Herramientas interactivas (16)
        <span className="text-muted small ms-auto" style={{ fontWeight: 400 }}>
          Gráficos con zoom (pincel), botones, filtros y simulaciones; dependen del rango y la métrica.
        </span>
      </Card.Header>
      <Card.Body>
        <div className="row g-2 mb-3 align-items-end p-2 rounded bg-body-secondary">
          <div className="col-sm-auto">
            <Form.Label className="small mb-0">Rango interactivo — Desde</Form.Label>
            <Form.Control type="date" size="sm" value={ivDesde} onChange={(e) => setIvDesde(e.target.value)} />
          </div>
          <div className="col-sm-auto">
            <Form.Label className="small mb-0">Hasta</Form.Label>
            <Form.Control type="date" size="sm" value={ivHasta} onChange={(e) => setIvHasta(e.target.value)} />
          </div>
          <div className="col-sm-auto form-check mt-2">
            <Form.Check
              type="switch"
              id="habiles"
              label="Solo días laborables (lun–vie)"
              checked={soloHabiles}
              onChange={(e) => setSoloHabiles(e.target.checked)}
            />
          </div>
        </div>

        <div className="row g-2 mb-3">
          <div className="col-md-4">
            <Form.Label className="small">Métrica base</Form.Label>
            <Form.Select
              size="sm"
              value={modoMetrica}
              onChange={(e) => setModoMetrica(e.target.value)}
            >
              <option value="clásico">Total kg (lógica clásica total1+2 o detalle)</option>
              <option value="sufijo">Columna fija (sufijo total1+2)</option>
              <option value="categorias">Suma categorías seleccionadas (Kg_m / Cbz_m cat.)</option>
            </Form.Select>
          </div>
          {modoMetrica === 'sufijo' && (
            <div className="col-md-4">
              <Form.Label className="small">Sufijo</Form.Label>
              <Form.Select size="sm" value={sufijo} onChange={(e) => setSufijo(e.target.value)}>
                {SUFIJOS_METRICA.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Form.Select>
            </div>
          )}
        </div>

        {modoMetrica === 'categorias' && (
          <div className="d-flex flex-wrap gap-2 mb-3 p-2 border rounded">
            <span className="small text-muted w-100">Categorías (8) — tildá/destildá y recalcula todo abajo</span>
            {TODAS_CATEGORIAS.map((c) => (
              <Form.Check
                key={c}
                type="checkbox"
                id={`cat-${c}`}
                label={c}
                checked={catChecks[c]}
                onChange={() => setCatChecks((p) => ({ ...p, [c]: !p[c] }))}
              />
            ))}
            <Button
              size="sm"
              variant="outline-primary"
              className="ms-2"
              onClick={() => setCatChecks(Object.fromEntries(TODAS_CATEGORIAS.map((c) => [c, true])))}
            >
              Todas
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => setCatChecks(Object.fromEntries(TODAS_CATEGORIAS.map((c) => [c, false])))}
            >
              Ninguna
            </Button>
          </div>
        )}

        <Accordion alwaysOpen>
          <Accordion.Item eventKey="I1">
            <Accordion.Header>1) Comparar dos rangos a mano (A vs B) + gráfico de barras</Accordion.Header>
            <Accordion.Body>
              <div className="row g-2 small mb-2">
                <div className="col-6 col-md-3">Rango A — desde <Form.Control type="date" size="sm" value={aDesde} onChange={(e) => setADesde(e.target.value)} /></div>
                <div className="col-6 col-md-3">A — hasta <Form.Control type="date" size="sm" value={aHasta} onChange={(e) => setAHasta(e.target.value)} /></div>
                <div className="col-6 col-md-3">Rango B — desde <Form.Control type="date" size="sm" value={bDesde} onChange={(e) => setBDesde(e.target.value)} /></div>
                <div className="col-6 col-md-3">B — hasta <Form.Control type="date" size="sm" value={bHasta} onChange={(e) => setBHasta(e.target.value)} /></div>
              </div>
              {!cmpAb.aplica && <p className="text-warning small mb-0">{cmpAb.motivo}</p>}
              {cmpAb.aplica && (
                <div>
                  <p className="small mb-1">
                    Suma: A={formateaNum(cmpAb.sumA, 0)} · B={formateaNum(cmpAb.sumB, 0)} ·
                    Dif. % suma: <strong>{formateaPct(cmpAb.varSumaPct)}</strong> ·
                    Dif. % promedio: {formateaPct(cmpAb.varPromPct)} (A n={cmpAb.nA}, B n={cmpAb.nB})
                  </p>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer>
                      <BarChart
                        data={[
                          { nombre: 'A', v: cmpAb.sumA, fill: COLORS[0] },
                          { nombre: 'B', v: cmpAb.sumB, fill: COLORS[1] },
                        ]}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="nombre" />
                        <YAxis tickFormatter={(n) => formateaNum(n, 0)} />
                        <Tooltip formatter={(v) => [formateaNum(v, 0), 'Suma']} />
                        <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                          {[0, 1].map((i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="I2">
            <Accordion.Header>2) Gráfico de línea + pincel (zoom) + clic en punto + reproductor Prev / Siguiente</Accordion.Header>
            <Accordion.Body>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <Form.Check
                  type="checkbox"
                  id="tend"
                  label="Dibujar recta de tendencia (mín. cuadr.)"
                  checked={mostrarTendencia}
                  onChange={(e) => setMostrarTendencia(e.target.checked)}
                />
                {reg.aplica && (
                  <Badge bg="info" className="text-wrap">
                    Pendiente ~ {formateaNum(reg.pendientePorDia ?? reg.b, 2)} (unid./paso) ·
                    a={formateaNum(reg.a, 0)}, b={formateaNum(reg.b, 4)}
                  </Badge>
                )}
                <ButtonGroup size="sm">
                  <Button
                    variant="outline-dark"
                    disabled={stepIdx <= 0}
                    onClick={() => { setStepIdx((i) => i - 1); }}
                  >
                    <i className="bi bi-skip-backward" aria-hidden="true" /> Ant.
                  </Button>
                  <Button
                    variant="outline-dark"
                    disabled={!dataFiltradaMin.length || stepIdx >= dataFiltradaMin.length - 1}
                    onClick={() => { setStepIdx((i) => i + 1); }}
                  >
                    Sig. <i className="bi bi-skip-forward" aria-hidden="true" />
                  </Button>
                </ButtonGroup>
                {stepData && (
                  <span className="small">
                    Paso: <strong>{stepData.fecha}</strong> — v={formateaNum(stepData.v, 0)} (índice {stepIdx + 1}/{dataFiltradaMin.length})
                  </span>
                )}
                {selFechaGraf && (
                  <span className="small text-primary">Clic: {selFechaGraf}</span>
                )}
              </div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer>
                  <ComposedChart
                    data={lineaConTend}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    onClick={(e) => {
                      if (e && e.activePayload && e.activePayload[0]) {
                        setSelFechaGraf(e.activePayload[0].payload.fecha);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis tickFormatter={(n) => formateaNum(n, 0)} />
                    <Tooltip
                      labelFormatter={(l) => `Fecha: ${l}`}
                      formatter={(v, n) => [formateaNum(v, 1), n]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="v" name="Valor" stroke={COLORS[0]} dot={{ r: 3 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                    {mostrarMA && (
                      <Line name={`MA ${maVentana}`} type="monotone" dataKey="ma" stroke={COLORS[2]} dot={false} strokeWidth={1} isAnimationActive={false} />
                    )}
                    {mostrarTendencia && <Line name="Tendencia" type="monotone" dataKey="tend" stroke={COLORS[3]} dot={false} strokeDasharray="4 2" isAnimationActive={false} />}
                    <Brush dataKey="fecha" height={22} stroke={COLORS[1]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="I3">
            <Accordion.Header>3) Ventana de media móvil (3 / 7 / 14 / 30)</Accordion.Header>
            <Accordion.Body>
              <ButtonGroup className="mb-2" size="sm">
                {[3, 7, 14, 30].map((v) => (
                  <Button
                    key={v}
                    variant={maVentana === v ? 'primary' : 'outline-primary'}
                    onClick={() => setMaVentana(v)}
                  >
                    {v} d
                  </Button>
                ))}
              </ButtonGroup>
              <p className="small text-muted mb-0">Afecta la curva punteada naranja en el gráfico de la sección 2 (misma fórmula, distinta ventana).</p>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="I4">
            <Accordion.Header>4) Barras: por día o por semana (lunes) — toggle + clic en barra</Accordion.Header>
            <Accordion.Body>
              <ButtonGroup className="mb-2" size="sm">
                <Button variant={barModo === 'dia' ? 'success' : 'outline-success'} onClick={() => setBarModo('dia')}>Día</Button>
                <Button variant={barModo === 'semana' ? 'success' : 'outline-success'} onClick={() => setBarModo('semana')}>Semana (suma)</Button>
              </ButtonGroup>
              <div style={{ height: 280 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={barrasData}
                    margin={{ top: 8, right: 8, left: 0, bottom: barModo === 'dia' ? 32 : 8 }}
                    onClick={(e) => {
                      if (e && e.activePayload && e.activePayload[0] && e.activePayload[0].payload) {
                        const p = e.activePayload[0].payload;
                        if (p.fecha) Swal.fire({ title: p.fecha, text: `Valor: ${formateaNum(p.v, 0)}`, icon: 'info' });
                        else Swal.fire({ title: p.label, text: `Suma: ${formateaNum(p.v, 0)}`, icon: 'info' });
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={barModo === 'dia' ? -45 : 0} textAnchor="end" height={barModo === 'dia' ? 50 : 24} />
                    <YAxis tickFormatter={(n) => formateaNum(n, 0)} />
                    <Tooltip formatter={(v) => [formateaNum(v, 0), '']} />
                    <Bar dataKey="v" name="Suma" fill={COLORS[4]}>
                      {barrasData.map((e, i) => (
                        <Cell key={e.fecha || e.label || i} fill={COLORS[i % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="I5">
            <Accordion.Header>5) Barras apiladas Hembra / Macho (período filtrado)</Accordion.Header>
            <Accordion.Body>
              {distribucionHembraMacho(dataFiltradaMin).aplica ? (
                <div style={{ height: 200 }}>
                  <ResponsiveContainer>
                    <BarChart data={hmUnBar} layout="vertical" margin={{ top: 8, right: 16, left: 40, bottom: 0 }} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(n) => formateaNum(n, 0)} />
                      <YAxis dataKey="nombre" type="category" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip
                        content={({ payload }) => {
                          if (!payload || !payload.length) return null;
                          const p = payload[0].payload;
                          return (
                            <div className="bg-white p-2 border shadow-sm small">
                              <div>H: {formateaNum(p.h, 0)}</div>
                              <div>M: {formateaNum(p.m, 0)}</div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="h" name="Hembra" stackId="a" fill="#d63384" />
                      <Bar dataKey="m" name="Macho" stackId="a" fill="#0dcaf0" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-muted small">Sin totales h/m en el rango.</p>}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="I6">
            <Accordion.Header>6) Umbral de anomalías (σ) — deslizador y botón Aplicar</Accordion.Header>
            <Accordion.Body>
              <div className="d-flex flex-wrap align-items-center gap-3">
                <Form.Label className="mb-0">Z = {zAtip.toFixed(2)}</Form.Label>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  className="form-range w-auto flex-grow-1"
                  style={{ maxWidth: 220 }}
                  value={zAtip}
                  onChange={(e) => setZAtip(parseFloat(e.target.value, 10))}
                />
                <Button size="sm" onClick={() => { setZAplicar(zAtip); }}>Aplicar umbral</Button>
                <span className="small text-muted">Re-evalúa la lista; umbral en uso: {zAplicar.toFixed(2)}</span>
              </div>
              {atip.motivo && <p className="text-muted small mt-1">{atip.motivo}</p>}
              <p className="small mb-1">Media: {formateaNum(atip.media, 1)} · σ: {formateaNum(atip.desv, 1)}</p>
              <ul className="small mb-0" style={{ maxHeight: 120, overflow: 'auto' }}>
                {(atip.filas || []).map((a) => (
                  <li key={a.fecha}>
                    {a.fecha} — {formateaNum(a.v, 0)} · {a.tipo} ({a.desviaciones.toFixed(2)}σ)
                  </li>
                ))}
                {(!atip.filas || atip.filas.length === 0) && atip.aplica && <li className="text-muted">Ningún día supera el umbral</li>}
              </ul>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="I7">
            <Accordion.Header>7) Filtrar días bajo mínimo (valor de la métrica)</Accordion.Header>
            <Accordion.Body>
              <InputGroup size="sm" className="mb-1" style={{ maxWidth: 320 }}>
                <Form.Control
                  type="number"
                  placeholder="Mínimo (inclusive)"
                  value={minKgStr}
                  onChange={(e) => setMinKgStr(e.target.value)}
                />
                <Button onClick={applyMin}>Aplicar</Button>
                <Button variant="outline-secondary" onClick={() => { setMinKgStr(''); setMinAplicar(null); }}>Quitar</Button>
              </InputGroup>
              <p className="small text-muted mb-0">
                Días usados: {dataFiltradaMin.length} {minAplicar != null ? `(mín. ${formateaNum(minAplicar, 0)} aplicado)` : ''} — afecta gráficos y listas.
              </p>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="I8">
            <Accordion.Header>8) Acumulado anual (YTD) — año fijo, área</Accordion.Header>
            <Accordion.Body>
              <div className="d-flex flex-wrap align-items-end gap-2 mb-2">
                <div>
                  <Form.Label className="small">Año</Form.Label>
                  <Form.Control
                    type="number"
                    min={2010}
                    max={2100}
                    size="sm"
                    style={{ width: 100 }}
                    value={ytdAnio}
                    onChange={(e) => setYtdAnio(Number(e.target.value))}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline-info"
                  onClick={() => setYtdAnio(new Date().getFullYear())}
                >
                  Año hoy
                </Button>
              </div>
              {ytdAcum.length === 0 && <p className="text-muted small">No hay filas en ese año.</p>}
              {ytdAcum.length > 0 && (
                <div style={{ height: 240 }}>
                  <ResponsiveContainer>
                    <AreaChart data={ytdAcum} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 9 }} minTickGap={20} />
                      <YAxis tickFormatter={(n) => formateaNum(n, 0)} />
                      <Tooltip formatter={(v) => [formateaNum(v, 0), '']} labelFormatter={(l) => l} />
                      <Area type="monotone" dataKey="acc" name="Acum. kg" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.15} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="I9">
            <Accordion.Header>9) Mismo mes, dos años distintos — selector + gráfico agrupado</Accordion.Header>
            <Accordion.Body>
              <div className="d-flex flex-wrap gap-2 mb-2">
                <div>
                  <Form.Label className="small">Mes (1-12)</Form.Label>
                  <Form.Select size="sm" value={mesCompara} onChange={(e) => setMesCompara(e.target.value)}>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </Form.Select>
                </div>
                <div>
                  <Form.Label className="small">Año 1</Form.Label>
                  <Form.Control type="number" size="sm" className="w-auto" value={anio1} onChange={(e) => setAnio1(+e.target.value)} />
                </div>
                <div>
                  <Form.Label className="small">Año 2</Form.Label>
                  <Form.Control type="number" size="sm" className="w-auto" value={anio2} onChange={(e) => setAnio2(+e.target.value)} />
                </div>
                <Button size="sm" className="align-self-end" onClick={() => { setAnio1(new Date().getFullYear() - 1); setAnio2(new Date().getFullYear()); }}>
                  Años sugeridos
                </Button>
              </div>
              {!cmpMesAños.aplica && <p className="text-warning small mb-0">{cmpMesAños.motivo}</p>}
              {cmpMesAños.aplica && (
                <>
                  <p className="small">
                    Suma A: {formateaNum(cmpMesAños.sumA, 0)} &nbsp;|&nbsp; Suma B: {formateaNum(cmpMesAños.sumB, 0)} &nbsp;|&nbsp;
                    Var. %: <strong>{formateaPct(cmpMesAños.varSumaPct)}</strong>
                  </p>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer>
                      <BarChart
                        data={barMesCmpData}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(n) => formateaNum(n, 0)} />
                        <Tooltip formatter={(v) => [formateaNum(v, 0), 'Suma mes']} />
                        <Bar dataKey="v" name="Suma" radius={[4, 4, 0, 0]}>
                          {barMesCmpData.map((e) => (
                            <Cell key={e.name} fill={e.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="I10">
            <Accordion.Header>10) Simulación “qué pasa si” — % sobre ritmo y proy. cierre (mes de “Hasta”)</Accordion.Header>
            <Accordion.Body>
              {!proyMes.aplica && <p className="text-warning small mb-0">{proyMes.motivo || 'Ajustar rango'}</p>}
              {proyMes.aplica && (
                <>
                  <p className="small mb-1">
                    Base: {formateaNum(proyMes.kgProyectadosMes, 0)} kg (ritmo {formateaNum(proyMes.ritmoDiario, 1)} × {proyMes.diasEnMes} d)
                  </p>
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                    <Form.Label className="mb-0">Ajuste {whatifPct.toFixed(0)}%</Form.Label>
                    <input
                      type="range"
                      className="form-range"
                      style={{ maxWidth: 220 }}
                      min={-30}
                      max={30}
                      step={1}
                      value={whatifPct}
                      onChange={(e) => setWhatifPct(parseInt(e.target.value, 10))}
                    />
                    <span className="small">
                      Proyección ajustada: <strong>{whatifKg != null ? formateaNum(whatifKg, 0) : '—'}</strong> kg
                    </span>
                  </div>
                </>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="I11">
            <Accordion.Header>11) Calendario de calor (mes) — tocar un día (detalle en alerta)</Accordion.Header>
            <Accordion.Body>
              <div className="d-flex flex-wrap gap-2 mb-2">
                <div>
                  <Form.Label className="small">Año</Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="w-auto"
                    value={calAnio}
                    onChange={(e) => setCalAnio(+e.target.value)}
                  />
                </div>
                <div>
                  <Form.Label className="small">Mes</Form.Label>
                  <Form.Select
                    value={String(calMes).padStart(2, '0')}
                    onChange={(e) => setCalMes(parseInt(e.target.value, 10))}
                    size="sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </Form.Select>
                </div>
              </div>
              <p className="small text-muted">Cada celda: intensidad = valor (método actual) / máximo del mes.</p>
              <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, maxWidth: 480 }}>
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
                  <div key={d} className="text-center text-muted x-small fw-bold" style={{ fontSize: 10 }}>{d}</div>
                ))}
                {celdasCalor.map((c, i) => (
                  c.tipo === 'empty' ? (
                    <div key={`e-${i}`} />
                  ) : (
                    <button
                      key={c.fecha}
                      type="button"
                      className="btn btn-sm p-0 border-0"
                      style={{
                        minHeight: 32,
                        background: `rgba(13, 110, 253, ${0.15 + 0.85 * (c.v / maxCalV)})`,
                        color: c.v > maxCalV * 0.4 ? '#fff' : '#333',
                        fontSize: 11,
                        borderRadius: 4,
                      }}
                      onClick={() => {
                        Swal.fire({
                          title: c.fecha,
                          text: `Valor (métrica): ${formateaNum(c.v, 0)} — máx. mes: ${formateaNum(maxCalV, 0)}`,
                          icon: 'info',
                        });
                      }}
                    >
                      {c.fecha.slice(8, 10)}
                    </button>
                  )
                ))}
              </div>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="I12">
            <Accordion.Header>12) Cuartiles y rango (percentiles) — caja con SVG mínima</Accordion.Header>
            <Accordion.Body>
              {!percs.aplica && <p className="text-muted small">Sin datos en el rango filtrado.</p>}
              {percs.aplica && (
                <div className="d-flex flex-wrap align-items-end gap-3">
                  <ul className="small mb-0">
                    <li>Mín: {formateaNum(percs.min, 0)} · Máx: {formateaNum(percs.max, 0)}</li>
                    <li>P10: {formateaNum(percs.out.p10, 0)} · P25: {formateaNum(percs.out.p25, 0)} ·
                      Med: {formateaNum(percs.out.p50, 0)} · P75: {formateaNum(percs.out.p75, 0)} · P90: {formateaNum(percs.out.p90, 0)}
                    </li>
                  </ul>
                  <svg width="180" height="48" className="border rounded bg-body-secondary" aria-label="Caja aprox.">
                    <line x1="4" y1="24" x2="176" y2="24" stroke="var(--bs-secondary)" strokeWidth="1" />
                    {(() => {
                      const s = 176 / (percs.max - percs.min + 0.0001);
                      const x = (p) => 4 + (p - percs.min) * s;
                      return (
                        <rect
                          x={x(percs.out.p25)}
                          y="10"
                          width={Math.max(2, x(percs.out.p75) - x(percs.out.p25))}
                          height="28"
                          fill="rgba(13,110,253,0.25)"
                          stroke="#0d6efd"
                        />
                      );
                    })()}
                    <line x1="4" y1="24" x2="4" y2="8" stroke="#333" />
                    <line x1="176" y1="24" x2="176" y2="40" stroke="#333" />
                  </svg>
                </div>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="I13">
            <Accordion.Header>13) Copiar resumen al portapapeles (botón)</Accordion.Header>
            <Accordion.Body>
              <Button variant="primary" size="sm" onClick={copyRes}>
                <i className="bi bi-clipboard" aria-hidden="true" /> Copiar texto
              </Button>
              <p className="small text-muted mt-2 mb-0">Incluye rango, suma, promedio y coeficientes de la recta (si aplica).</p>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="I14">
            <Accordion.Header>14) Ajuste fino % y mostrar u ocultar la media móvil</Accordion.Header>
            <Accordion.Body>
              <div className="d-flex flex-wrap align-items-center gap-3 mb-2">
                <Form.Label className="mb-0 small">Escala de la serie: {ajusteFino}%</Form.Label>
                <input
                  type="range"
                  className="form-range"
                  style={{ maxWidth: 240 }}
                  min={80}
                  max={120}
                  step={1}
                  value={ajusteFino}
                  onChange={(e) => setAjusteFino(+e.target.value)}
                />
                <Button size="sm" variant="outline-secondary" onClick={() => setAjusteFino(100)}>100%</Button>
              </div>
              <Form.Check
                type="checkbox"
                id="mostrar-ma"
                label="Dibujar curva de media móvil (mismo gráfico que en 2)"
                checked={mostrarMA}
                onChange={(e) => setMostrarMA(e.target.checked)}
              />
              <p className="small text-muted mb-0 mt-1">No cambia datos guardados; solo escala lo que ves en gráficos y listas de esta sección.</p>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="I15">
            <Accordion.Header>15) Exportar informe (CSV, Excel .xlsx, Excel .xls) + sincronizar A/B</Accordion.Header>
            <Accordion.Body>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <Button variant="outline-success" size="sm" onClick={exportarSerieCsv}>
                  <i className="bi bi-filetype-csv" aria-hidden="true" /> CSV (serie; tabla)
                </Button>
                <Button variant="outline-primary" size="sm" onClick={exportarSerieCsvCompleto}>
                  <i className="bi bi-filetype-csv" aria-hidden="true" /> CSV (informe completo)
                </Button>
                <Button variant="primary" size="sm" onClick={() => { void exportarSerieXlsx(); }}>
                  <i className="bi bi-file-earmark-excel" aria-hidden="true" /> Excel .xlsx
                </Button>
                <Button variant="primary" size="sm" onClick={exportarSerieXls}>
                  <i className="bi bi-file-earmark-spreadsheet" aria-hidden="true" /> Excel .xls
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={syncRangosConInteractivo}>
                  <i className="bi bi-link-45deg" aria-hidden="true" /> A/B ← panel
                </Button>
                <ExportacionProduccionInteractivaMenu
                  nombreModulo={NOMBRE_MODULO}
                  buildHojas={hojasParaExport}
                  disabled={!lineaSerie.length}
                />
              </div>
              <p className="small text-muted mt-2 mb-0">El informe con formato (xlsx) replica el estilo de reportes de contratación. CSV compacto: solo serie; &quot;informe completo&quot; incluye cabecera y resumen. Excel 97-2003 usa una sola hoja con bloques. <strong>Más formatos</strong> (PDF, Word, JSON, etc.) exporta el mismo bloque informativo con leyenda de lo incluido.</p>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="I16">
            <Accordion.Header>16) Listar días ≥ P90 (botón, modal con tabla HTML)</Accordion.Header>
            <Accordion.Body>
              <Button variant="warning" size="sm" onClick={listarDiasP90} disabled={!percs.aplica || dataFiltradaMin.length < 3}>
                Mostrar días arriba del P90
              </Button>
              <p className="small text-muted mt-2 mb-0">Requiere variación en el rango. Usa el percentil 90 de los valores bajo la métrica (y ajuste %) actual.</p>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Card.Body>
    </Card>
  );
}

export default SacrificioVacunoInteractivo;
