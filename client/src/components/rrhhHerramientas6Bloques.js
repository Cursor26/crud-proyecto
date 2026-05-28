/**
 * Seis análisis distintos por módulo (vista de datos = pack).
 * Cada módulo tiene su propia lógica; no se reutilizan títulos entre módulos.
 */
import { Alert, Table } from 'react-bootstrap';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  agregadoPorCategoria,
  bajasPorMes,
  contarCampoTexto,
  empleadoEsActivo,
  ultimasBajas,
  histogramaSalario,
  parseSalarioNum,
} from '../utils/rrhhAnalitica';

const C = ['#0d6efd', '#198754', '#dc3545', '#fd7e14', '#6f42c1', '#0dcaf0'];

const fmtN = (n) => (n == null || Number.isNaN(n) ? '—' : n.toLocaleString('es-ES', { maximumFractionDigits: 1 }));

const BarP = ({ title, data, xk, yk, h = 200 }) => (
  <div>
    {title ? <h6 className="small text-muted mb-1">{title}</h6> : null}
    {!data || data.length === 0 ? (
      <Alert variant="light" className="py-2 small mb-0 border">Nada que graficar: sin datos, vacío tras los filtros o faltan claves (p. ej. empleado/carnet) en el listado.</Alert>
    ) : (
      <div style={{ width: '100%', height: h }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: 4, right: 4 }}>
            <XAxis dataKey={xk} tick={{ fontSize: 9 }} height={46} />
            <YAxis allowDecimals={false} width={30} />
            <Tooltip />
            <Bar dataKey={yk} fill="#0d6efd" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

const LineP = ({ title, data, xk, yk, h = 200 }) => (
  <div>
    {title ? <h6 className="small text-muted mb-1">{title}</h6> : null}
    {!data || data.length === 0 ? (
      <Alert variant="light" className="py-2 small mb-0 border">Sin puntos con importe o valor numérico en la lista; revise el dataset.</Alert>
    ) : (
      <div style={{ width: '100%', height: h }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <XAxis dataKey={xk} tick={{ fontSize: 9 }} />
            <YAxis allowDecimals={false} width={32} />
            <Tooltip />
            <Line type="monotone" dataKey={yk} stroke="#198754" dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

const PieP = ({ title, data, nameK, valueK, h = 200 }) => (
  <div>
    {title ? <h6 className="small text-muted mb-1">{title}</h6> : null}
    <div style={{ width: '100%', height: h }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie dataKey={valueK} nameKey={nameK} data={data} cx="50%" cy="50%" outerRadius={70} label>
            {data.map((_, i) => (
              <Cell key={i} fill={C[i % C.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const Kpi = ({ t, v, s }) => (
  <div className="p-2 border rounded bg-light">
    <div className="small text-muted">{t}</div>
    <div className="h5 mb-0">{v}</div>
    {s ? <div className="small text-secondary mt-1">{s}</div> : null}
  </div>
);

const head = (em, fn) => agregadoPorCategoria((em || []).filter(empleadoEsActivo), fn, 8);

const porCampo = (arr, f, n) => agregadoPorCategoria(arr || [], f, n);

const mesDesdeFecha = (o, campo) => {
  const m = new Map();
  (o || []).forEach((r) => {
    const s = (r[campo] || '').toString();
    const mes = s.slice(0, 7) || '—';
    m.set(mes, (m.get(mes) || 0) + 1);
  });
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
};

/** Carnet: prioridad carnet_identidad, luego carnet, luego id_tabla (p. ej. vacaciones y salarios usan id_tabla = documento). */
const identificadorEmpleado = (r) => {
  for (const v of [r.carnet_identidad, r.carnet, r.id_tabla]) {
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
};

const topCarnetCount = (arr) => {
  const m = new Map();
  (arr || []).forEach((r) => {
    const c = identificadorEmpleado(r);
    if (c) m.set(c, (m.get(c) || 0) + 1);
  });
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

/** Suma o lista de nómina: acepta salario_neto (tabla `salarios`), monto, salario, importe, valor. */
const importeSalarioFila = (r) => {
  for (const k of ['salario_neto', 'monto', 'salario', 'importe', 'valor']) {
    const v = r[k];
    if (v === null || v === undefined || v === '') continue;
    const n = parseSalarioNum(v);
    if (n != null) return n;
  }
  return 0;
};

/* ------------ empleados ------------ */
function empleados(i, p) {
  const em = p.empleados || [];
  const act = em.filter(empleadoEsActivo);
  if (i === 0) return <BarP title="1 · Planta viva: dotación activa por departamento" data={head(em, (e) => e.departamento || '(sin dato)')} xk="name" yk="value" />;
  if (i === 1) {
    const { filas } = histogramaSalario(act, 6);
    return <BarP title="2 · Histograma de sueldos (solo activos con monto legible)" data={(filas || []).map((x) => ({ r: x.label, n: x.n }))} xk="r" yk="n" h={220} />;
  }
  if (i === 2) return <PieP title="3 · Formación: nivel escolar" data={contarCampoTexto(act, (e) => e.nivel_escolar).slice(0, 5)} nameK="name" valueK="value" />;
  if (i === 3) {
    const t = em.filter(empleadoEsActivo).filter((e) => String(e.telefono || '').replace(/\D/g, '').length >= 6).length;
    return <Kpi t="4 · Densidad de teléfono (≥6 dígitos)" v={t} s={`Frente a ${act.length} activos`} />;
  }
  if (i === 4) {
    return <Kpi t="5 · Diversidad de puestos (categorías distintas)" v={new Set(act.map((e) => (e.puesto || '').trim()).filter(Boolean)).size} s="Valores de texto distintos" />;
  }
  if (i === 5) {
    return <Kpi t="6 · Carga de seguimiento de seguridad" v={act.filter((e) => String(e.seguimiento_seguridad || '').trim()).length} s="Activos con campo no vacío" />;
  }
  return null;
}

/* ------------ bajas-empleados ------------ */
function bajasEmpleado(i, p) {
  const em = p.empleados || [];
  if (i === 0) return <BarP title="1 · Baja formalizada por mes (campo fecha baja)" data={bajasPorMes(em)} xk="mes" yk="n" />;
  if (i === 1) {
    const n = em.filter((e) => !empleadoEsActivo(e) && !e.fecha_baja).length;
    return <Kpi t="2 · Fichas inactivas sin sellado de fecha" v={n} s="A limpiar en nómina" />;
  }
  if (i === 3) {
    const a = bajasPorMes(em);
    const acc = [];
    let s = 0;
    a.forEach((b) => {
      s += b.n;
      acc.push({ mes: b.mes, ac: s });
    });
    return <LineP title="4 · Tendencia acumulada de bajas en el calendario" data={acc} xk="mes" yk="ac" h={200} />;
  }
  if (i === 2) {
    const m = new Map();
    em.filter((e) => !empleadoEsActivo(e)).forEach((e) => {
      const t = (e.motivo_baja || '∅').trim() || '∅';
      m.set(t.slice(0, 50), (m.get(t.slice(0, 50)) || 0) + 1);
    });
    const d = [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    return <BarP title="3 · Frecuencia de descripción del motivo" data={d} xk="name" yk="value" h={220} />;
  }
  if (i === 4) {
    const a = em.filter(empleadoEsActivo).length;
    const b = em.length - a;
    return <PieP title="5 · Situación operativa: altas vs bajas en plantilla" data={[{ name: 'Alta (activo)', value: a }, { name: 'Baja (inactivo)', value: b }]} nameK="name" valueK="value" />;
  }
  if (i === 5) {
    return <BarP title="6 · Stock de inactividad por unidad" data={agregadoPorCategoria(em.filter((e) => !empleadoEsActivo(e)), (e) => e.departamento || '—', 10)} xk="name" yk="value" />;
  }
  return null;
}

/* ------------ reporte-personal ------------ */
function reportePersonal(i, p) {
  const r = p.reportePersonal || [];
  if (i === 0) return <BarP title="1 · Muster por departamento (vista de reporte)" data={porCampo(r, (e) => e.departamento || '—', 9)} xk="name" yk="value" />;
  if (i === 1) return <BarP title="2 · Muster por puesto" data={porCampo(r, (e) => e.puesto || '—', 8)} xk="name" yk="value" />;
  if (i === 2) {
    return <Kpi t="3 · Cuenta de hojas en el reporte" v={r.length} s="Registros devueltos" />;
  }
  if (i === 3) {
    return <Kpi t="4 · Fichas en alta operativa" v={r.filter(empleadoEsActivo).length} s="Criterio activo=1" />;
  }
  if (i === 4) {
    return <PieP title="5 · Cobertura de e-mail" data={contarCampoTexto(r, (e) => (String(e.nombre || '').length > 0 ? 'Con nombre' : 'Sin dato'))} nameK="name" valueK="value" />;
  }
  if (i === 5) {
    return <Table size="sm" striped bordered className="mb-0 small"><tbody>{ultimasBajas(p.empleados || [], 6).map((e) => <tr key={e.carnet_identidad}><td>{e.carnet_identidad}</td><td>Última baja: {(e.fecha_baja || '').toString().slice(0, 10)}</td></tr>)}</tbody></Table>;
  }
  return null;
}

/* ------------ cambios-cargo ------------ */
function cambiosCargo(i, p) {
  const h = p.historial || [];
  if (i === 0) return <PieP title="1 · Clasificación de anotación (puesto, salario, depto.)" data={porCampo(h, (r) => r.tipo_cambio || '—', 4)} nameK="name" valueK="value" />;
  if (i === 1) {
    const m = new Map();
    h.filter((r) => r.tipo_cambio === 'puesto').forEach((r) => {
      const t = (r.valor_nuevo || '—').toString().slice(0, 24);
      m.set(t, (m.get(t) || 0) + 1);
    });
    return <BarP title="2 · Cargos de destino frecuentes" data={[...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)} xk="name" yk="value" />;
  }
  if (i === 2) {
    return <LineP title="3 · Densidad de anotación (cada renglón = un movimiento, índice)" data={h.slice(0, 50).map((r, j) => ({ n: j + 1, v: 1 }))} xk="n" yk="v" h={120} />;
  }
  if (i === 3) {
    const c = new Map();
    h.forEach((r) => c.set(r.carnet_identidad, (c.get(r.carnet_identidad) || 0) + 1));
    return <Kpi t="4 · Personas con carrera documentada" v={[...c.values()].filter((n) => n > 1).length} s="Al menos 2 movimientos" />;
  }
  if (i === 4) {
    return <Kpi t="5 · Ajuste retributivo (registros salario)" v={h.filter((r) => r.tipo_cambio === 'salario').length} s="En el historial mostrado" />;
  }
  if (i === 5) {
    return <Kpi t="6 · Reubicación departamental" v={h.filter((r) => r.tipo_cambio === 'departamento').length} s="Anotaciones de cambio de área" />;
  }
  return null;
}

/* ------------ reporte consolidado ------------ */
function repConsol(i, p) {
  const f = p.reporteConsolidado || [];
  if (i === 0) return <BarP title="1 · Masa salarial de activos (vista resumen depto.)" data={f.map((r) => ({ n: (r.departamento || '—').slice(0, 20), m: Number(r.masa_salarial_activos) || 0 }))} xk="n" yk="m" h={250} />;
  if (i === 1) {
    return <BarP title="2 · Fracción inactiva por unidad" data={f.map((r) => ({ n: (r.departamento || '—').slice(0, 16), t: Number(r.total_empleados) ? (Number(r.empleados_inactivos) / Number(r.total_empleados)) * 100 : 0 }))} xk="n" yk="t" />;
  }
  if (i === 2) {
    const x = f.reduce((a, b) => ((Number(b.masa_salarial_activos) > a.m) ? { m: Number(b.masa_salarial_activos), d: b.departamento } : a), { m: 0, d: '—' });
    return <Kpi t="3 · Unidad con más masa" v={x.d} s={`${fmtN(x.m)} (referencia $)`} />;
  }
  if (i === 3) {
    return <Kpi t="4 · Suma de activos (todas las filas)" v={f.reduce((s, r) => s + (Number(r.empleados_activos) || 0), 0)} s="" />;
  }
  if (i === 4) {
    return <LineP title="5 · Dientes de inactivos al ordenar alfabéticamente" data={f.map((r, j) => ({ o: j, d: Number(r.empleados_inactivos) || 0 }))} xk="o" yk="d" />;
  }
  if (i === 5) {
    return <PieP title="6 · Peso de activos: top 5 depto." data={f.map((r) => ({ name: (r.departamento || '—').slice(0, 10), value: Number(r.empleados_activos) || 0 })).filter((x) => x.value).sort((a, b) => b.value - a.value).slice(0, 5)} nameK="name" valueK="value" />;
  }
  return null;
}

/* ------------ vacaciones ------------ */
function vacaciones(i, p) {
  const v = p.vacaciones || [];
  if (i === 0) return <BarP title="1 · Carga de trámites de ausencia (por mes inicio)" data={mesDesdeFecha(v, 'fecha_inicio')} xk="name" yk="value" />;
  if (i === 1) {
    const d = v.map((r) => {
      if (!r.fecha_inicio || !r.fecha_fin) return 0;
      return Math.max(0, (new Date(r.fecha_fin) - new Date(r.fecha_inicio)) / 864e5);
    });
    return <Kpi t="2 · Duración promedio (d corridos)" v={d.length ? fmtN(d.reduce((a, b) => a + b, 0) / d.length) : '0'} s={`${v.length} rangos`} />;
  }
  if (i === 2) {
    const t = topCarnetCount(v);
    return <Kpi t="3 · Récord de solicitudes" v={t[0] ? t[0].name : '—'} s={t[0] ? `N: ${t[0].value}` : ''} />;
  }
  if (i === 3) {
    return <BarP title="4 · Quedan por empleado (6 primeros con más renglones)" data={topCarnetCount(v).slice(0, 6)} xk="name" yk="value" />;
  }
  if (i === 4) {
    return <LineP title="5 · Tamaño de ventana: días según renglón" data={v.slice(0, 20).map((r, j) => ({ r: j + 1, d: (r.fecha_inicio && r.fecha_fin) ? (new Date(r.fecha_fin) - new Date(r.fecha_inicio)) / 864e5 : 0 }))} xk="r" yk="d" />;
  }
  if (i === 5) {
    const by = mesDesdeFecha(v, 'fecha_inicio');
    const mx = by.reduce((a, b) => (b.value > a.v ? { m: b.name, v: b.value } : a), { m: '—', v: 0 });
    return <Kpi t="6 · Mes pico de inicio de ausencias" v={mx.m} s={`${mx.v} registros en ese mes`} />;
  }
  return null;
}

/* ------------ turnos ------------ */
function turnosTrabajo(i, p) {
  const t = p.turnos || [];
  if (i === 0) return <BarP title="1 · Definiciones de turno (por etiqueta)" data={porCampo(t, (r) => r.nombre_turno || r.nombre || r.descripcion || '—', 8)} xk="name" yk="value" />;
  if (i === 1) return <Kpi t="2 · Catálogo registrado" v={t.length} s="Filas en sistema" />;
  if (i === 2) return <PieP title="3 · Cobertura de horas (si hay campo)" data={porCampo(t, (r) => (r.horas ? 'Con horas' : 'Sin horas'))} nameK="name" valueK="value" />;
  if (i === 3) return <LineP title="4 · Orden de alta (índice en la lista)" data={t.slice(0, 24).map((r, j) => ({ j, n: 1 }))} xk="j" yk="n" h={140} />;
  if (i === 4) return <Kpi t="5 · Longitud media de descripción" v={t.length ? fmtN(t.reduce((s, r) => s + String(r.descripcion || '').length, 0) / t.length) : 0} s="Caracteres" />;
  if (i === 5) return <BarP title="6 · Primer token de nombre (agrupación)" data={porCampo(t, (r) => String(r.nombre_turno || r.nombre || '—').split(/\s+/)[0], 6)} xk="name" yk="value" />;
  return null;
}

/* ------------ grupos ------------ */
function gruposTrabajo(i, p) {
  const g = p.grupos || [];
  if (i === 0) return <BarP title="1 · Equipos por denominación" data={porCampo(g, (r) => r.nombre_grupo || r.nombre || '—', 8)} xk="name" yk="value" />;
  if (i === 1) return <Kpi t="2 · Total de equipos" v={g.length} s="" />;
  if (i === 2) return <PieP title="3 · Grupos con descripción vs mínimos" data={porCampo(g, (r) => (String(r.descripcion || '').trim() ? 'Con descripción' : 'Breve'))} nameK="name" valueK="value" />;
  if (i === 3) return <LineP title="4 · Secuencia de filas (densidad del catálogo)" data={g.map((r, j) => ({ x: j + 1, y: 1 }))} xk="x" yk="y" h={120} />;
  if (i === 4) return <Kpi t="5 · Nombre más largo (caracteres)" v={g.length ? Math.max(...g.map((r) => String(r.nombre_grupo || r.nombre || '').length)) : 0} s="Máximo en listado" />;
  if (i === 5) return <BarP title="6 · Frecuencia de palabra inicial" data={porCampo(g, (r) => String(r.nombre_grupo || r.nombre || 'x').split(/\s+/)[0].slice(0, 12), 7)} xk="name" yk="value" />;
  return null;
}

/* ------------ sanciones ------------ */
function sanciones(i, p) {
  const s = p.sanciones || [];
  if (i === 0) return <BarP title="1 · Tipología de sanción" data={porCampo(s, (r) => r.tipo_sancion || '—', 8)} xk="name" yk="value" />;
  if (i === 1) return <BarP title="2 · Hechos por mes de aplicación" data={mesDesdeFecha(s, 'fecha_aplicacion')} xk="name" yk="value" />;
  if (i === 2) return <Kpi t="3 · Suspensiones con días informados" v={s.filter((r) => r.dias_suspension != null && String(r.dias_suspension) !== '').length} s={`Sobre ${s.length} hechos`} />;
  if (i === 3) return <PieP title="4 · Vigencia del acto (activo/inactivo)" data={porCampo(s, (r) => (r.activo == 0 || r.activo === false ? 'Archivada' : 'Vigente'))} nameK="name" valueK="value" />;
  if (i === 4) return <LineP title="5 · Días de suspensión (primeros 15 con dato)" data={s.filter((r) => r.dias_suspension).slice(0, 15).map((r, j) => ({ k: j + 1, d: Number(r.dias_suspension) || 0 }))} xk="k" yk="d" />;
  if (i === 5) return <BarP title="6 · Empleados con más antecedentes" data={topCarnetCount(s).slice(0, 6)} xk="name" yk="value" />;
  return null;
}

/* ------------ reconocimientos ------------ */
function reconocimientos(i, p) {
  const r = p.reconocimientos || [];
  if (i === 0) return <BarP title="1 · Tipo de reconocimiento" data={porCampo(r, (x) => x.tipo_reconocimiento || x.tipo || '—', 8)} xk="name" yk="value" />;
  if (i === 1) return <BarP title="2 · Registros por mes" data={mesDesdeFecha(r, 'fecha_reconocimiento')} xk="name" yk="value" />;
  if (i === 2) return <Kpi t="3 · Total de distinciones" v={r.length} s="" />;
  if (i === 3) return <PieP title="4 · Presencia de observación escrita" data={porCampo(r, (x) => (String(x.observaciones || '').trim() ? 'Con nota' : 'Sin nota'))} nameK="name" valueK="value" />;
  if (i === 4) return <LineP title="5 · Índice de hechos (línea neutra)" data={r.slice(0, 30).map((x, j) => ({ n: j + 1, v: 1 }))} xk="n" yk="v" h={120} />;
  if (i === 5) return <BarP title="6 · Carrera: empleados con más distinciones" data={topCarnetCount(r).slice(0, 6)} xk="name" yk="value" />;
  return null;
}

/* ------------ jubilaciones ------------ */
function jubilaciones(i, p) {
  const j = p.jubilaciones || [];
  if (i === 0) return <BarP title="1 · Modalidad de retiro / jubilación" data={porCampo(j, (x) => x.tipo_jubilacion || x.tipo || '—', 8)} xk="name" yk="value" />;
  if (i === 1) return <BarP title="2 · Fecha efectiva por mes" data={mesDesdeFecha(j, 'fecha_efectiva')} xk="name" yk="value" />;
  if (i === 2) return <Kpi t="3 · Expedientes de cierre" v={j.length} s="" />;
  if (i === 3) return <PieP title="4 · Estado de trámite (si existe)" data={porCampo(j, (x) => (x.estado || 'Sin estado'))} nameK="name" valueK="value" />;
  if (i === 4) return <Kpi t="5 · Beneficio / monto declarado (filas con número)" v={j.filter((x) => x.monto_beneficio != null || x.monto != null).length} s="Según columnas disponibles" />;
  if (i === 5) {
    return <BarP title="6 · Top 6 empleados por cantidad de líneas de jubilación" data={topCarnetCount(j).slice(0, 6)} xk="name" yk="value" />;
  }
  return null;
}

/* ------------ asistencias ------------ */
function asistencias(i, p) {
  const a = p.asistencias || [];
  if (i === 0) return <BarP title="1 · Códigos de asistencia" data={porCampo(a, (r) => r.codigo_asistencia || '—', 10)} xk="name" yk="value" />;
  if (i === 1) return <PieP title="2 · Causas más citadas (texto)" data={porCampo(a, (r) => (r.desc_causas || '—').toString().slice(0, 20), 6)} nameK="name" valueK="value" />;
  if (i === 2) return <Kpi t="3 · Horas declaradas: suma" v={fmtN(a.reduce((s, r) => s + (Number(r.horas_trabajadas) || 0), 0))} s="Acumulado listado" />;
  if (i === 3) return <LineP title="4 · Densidad de filas" data={a.slice(0, 40).map((r, j) => ({ u: j + 1, h: Number(r.horas_trabajadas) || 0 }))} xk="u" yk="h" />;
  if (i === 4) return <Kpi t="5 · Registros con horas = 0" v={a.filter((r) => (Number(r.horas_trabajadas) || 0) === 0).length} s="" />;
  if (i === 5) {
    return (
      <BarP
        title="6 · Frecuencia de longitud de causa"
        data={porCampo(a, (r) => String((r.desc_causas || '').length) + ' car.', 8)}
        xk="name"
        yk="value"
      />
    );
  }
  return null;
}

/* ------------ certificaciones ------------ */
function certificaciones(i, p) {
  const c = p.certificaciones || [];
  if (i === 0) return <BarP title="1 · Entidad o rubro" data={porCampo(c, (r) => r.entidad || r.tipo || '—', 8)} xk="name" yk="value" />;
  if (i === 1) return <BarP title="2 · Vigencia por mes (si hay fecha fin)" data={mesDesdeFecha(c, 'fecha_vencimiento')} xk="name" yk="value" />;
  if (i === 2) return <Kpi t="3 · Certificados vivos" v={c.length} s="Total de filas" />;
  if (i === 3) return <PieP title="4 · Carga de número de foja" data={porCampo(c, (r) => (r.numero_certificado ? 'Con Nº' : 'Sin Nº'))} nameK="name" valueK="value" />;
  if (i === 4) return <LineP title="5 · Evolución del stock (índice)" data={c.slice(0, 25).map((r, j) => ({ n: j + 1, t: 1 }))} xk="n" yk="t" h={100} />;
  if (i === 5) return <Kpi t="6 · Nombre promedio de curso (long.)" v={c.length ? fmtN(c.reduce((s, r) => s + String(r.nombre_curso || r.titulo || '').length, 0) / c.length) : 0} s="Caracteres" />;
  return null;
}

/* ------------ cursos ------------ */
function cursos(i, p) {
  const c = p.cursos || [];
  if (i === 0) return <BarP title="1 · Proveedores o modalidad" data={porCampo(c, (r) => r.modalidad || r.proveedor || '—', 7)} xk="name" yk="value" />;
  if (i === 1) return <BarP title="2 · Inicio por trimestre (fecha)" data={mesDesdeFecha(c, 'fecha_inicio')} xk="name" yk="value" />;
  if (i === 2) return <Kpi t="3 · Cursos ofertados" v={c.length} s="" />;
  if (i === 3) return <PieP title="4 · Cursos con cupo / sin cupo" data={porCampo(c, (r) => (r.cupo && Number(r.cupo) > 0 ? 'Con cupo' : 'Sin cupo'))} nameK="name" valueK="value" />;
  if (i === 4) return <Kpi t="5 · Horas-aula (suma aproximada)" v={fmtN(c.reduce((s, r) => s + (Number(r.duracion_horas) || 0), 0))} s="Suma de campo duración" />;
  if (i === 5) return <BarP title="6 · Palabra inicial en el título" data={porCampo(c, (r) => String(r.nombre_curso || r.titulo || '—').split(/\s+/)[0].slice(0, 14), 8)} xk="name" yk="value" />;
  return null;
}

/* ------------ eval capacitación ------------ */
function evalCap(i, p) {
  const e = p.evalcap || [];
  if (i === 0) return <BarP title="1 · Resultado global" data={porCampo(e, (r) => r.resultado || r.nota || '—', 8)} xk="name" yk="value" />;
  if (i === 1) return <BarP title="2 · Evaluaciones por mes" data={mesDesdeFecha(e, 'fecha_evaluacion')} xk="name" yk="value" />;
  if (i === 2) return <Kpi t="3 · Muestras de evaluación" v={e.length} s="" />;
  if (i === 3) return <LineP title="4 · Tendencia de nota (si es numérico)" data={e.map((r, j) => ({ p: j + 1, n: parseFloat(r.nota) || 0 })).filter((x) => x.n)} xk="p" yk="n" />;
  if (i === 4) return <PieP title="5 · Curso vinculado" data={porCampo(e, (r) => (r.id_curso || r.curso ? 'Vinculado' : 'Sin id'))} nameK="name" valueK="value" />;
  if (i === 5) {
    const nums = e.map((r) => parseFloat(String(r.nota), 10)).filter((x) => Number.isFinite(x));
    return <Kpi t="6 · Rango de notas" v={nums.length ? `${fmtN(Math.min(...nums))} – ${fmtN(Math.max(...nums))}` : '—'} s="Min / max" />;
  }
  return null;
}

/* ------------ evaluaciones ------------ */
function evaluaciones(i, p) {
  const e = p.evaluaciones || [];
  if (i === 0) return <BarP title="1 · Estado del ciclo" data={porCampo(e, (r) => r.estado || '—', 6)} xk="name" yk="value" />;
  if (i === 1) return <BarP title="2 · Periodo o año" data={porCampo(e, (r) => (r.anio || r.periodo || '—').toString().slice(0, 8), 6)} xk="name" yk="value" />;
  if (i === 2) return <Kpi t="3 · Ciclos de desempeño" v={e.length} s="" />;
  if (i === 3) return <PieP title="4 · Con observación final" data={porCampo(e, (r) => (String(r.comentario || r.observaciones || '').trim() ? 'Con texto' : 'Mínima'))} nameK="name" valueK="value" />;
  if (i === 4) return <LineP title="5 · Puntuación (si numérica) por orden" data={e.map((r, j) => ({ p: j + 1, s: parseFloat(r.puntaje) || 0 }))} xk="p" yk="s" />;
  if (i === 5) return <BarP title="6 · Frecuencia de instrumento" data={porCampo(e, (r) => r.tipo_instrumento || r.instrumento || 'STANDARD', 6)} xk="name" yk="value" />;
  return null;
}

/* ------------ objetivos ------------ */
function objetivos(i, p) {
  const o = p.objetivos || [];
  if (i === 0) return <BarP title="1 · Estado (cumplido / en curso)" data={porCampo(o, (r) => r.estado || '—', 5)} xk="name" yk="value" />;
  if (i === 1) return <BarP title="2 · Vencimientos por mes" data={mesDesdeFecha(o, 'fecha_objetivo')} xk="name" yk="value" />;
  if (i === 2) return <Kpi t="3 · Metas en cartera" v={o.length} s="" />;
  if (i === 3) return <PieP title="4 · Ponderación: con KPI numérico" data={porCampo(o, (r) => (r.meta_numerica != null ? 'Con KPI' : 'Cualitativo'))} nameK="name" valueK="value" />;
  if (i === 4) return <LineP title="5 · Carga (índice de fila)" data={o.map((r, j) => ({ g: j + 1, y: 1 }))} xk="g" yk="y" h={100} />;
  if (i === 5) return <Kpi t="6 · Descripción: longitud media" v={o.length ? fmtN(o.reduce((s, r) => s + String(r.descripcion || '').length, 0) / o.length) : 0} s="caracteres" />;
  return null;
}

/* ------------ salarios ------------ */
function salarios(i, p) {
  const s = p.salarios || [];
  const em = p.empleados || [];
  if (i === 0) return <BarP title="1 · Última escala: agrupación por depto" data={head(em, (e) => e.departamento || '—')} xk="name" yk="value" />;
  if (i === 1) return <BarP title="2 · Muestras de salario: por mes (si existe fecha)" data={mesDesdeFecha(s, 'fecha')} xk="name" yk="value" />;
  if (i === 2) return <Kpi t="3 · Líneas de nómina" v={s.length} s="Tabla salarios" />;
  if (i === 3) {
    const pts = s
      .map((r, j) => ({ n: j + 1, m: importeSalarioFila(r) }))
      .filter((x) => x.m > 0)
      .slice(0, 20);
    return <LineP title="4 · Tendencia de importe (salario_neto u otros campos numéricos)" data={pts} xk="n" yk="m" />;
  }
  if (i === 4) return <PieP title="5 · Tipo de haber (si existe)" data={porCampo(s, (r) => r.tipo || r.concepto || 'Haber')} nameK="name" valueK="value" />;
  if (i === 5) return <Kpi t="6 · Masa: suma aprox. de importes" v={fmtN(s.reduce((a, r) => a + importeSalarioFila(r), 0))} s="salario_neto / monto / salario" />;
  return null;
}

/* ------------ seg seg------------ */
function segSeg(i, p) {
  const s = p.segseg || [];
  if (i === 0) return <BarP title="1 · Nivel o tipo de riesgo" data={porCampo(s, (r) => r.nivel_riesgo || r.tipo || '—', 6)} xk="name" yk="value" />;
  if (i === 1) return <BarP title="2 · Inspecciones por mes" data={mesDesdeFecha(s, 'fecha_inspeccion')} xk="name" yk="value" />;
  if (i === 2) return <Kpi t="3 · Controles" v={s.length} s="" />;
  if (i === 3) return <PieP title="4 · Con plan de acción" data={porCampo(s, (r) => (String(r.plan_accion || '').trim() ? 'Con plan' : 'Sin plan'))} nameK="name" valueK="value" />;
  if (i === 4) return <LineP title="5 · Riesgo percibido (índice)" data={s.slice(0, 20).map((r, j) => ({ t: j + 1, n: 1 }))} xk="t" yk="n" h={100} />;
  if (i === 5) return <Kpi t="6 · Acciones: texto medio" v={s.length ? fmtN(s.reduce((a, r) => a + String(r.accion_correctiva || '').length, 0) / s.length) : 0} s="caract." />;
  return null;
}

/* ------------ seguridad laboral (no confundir) ------------ */
function segLab(i, p) {
  const s = p.seguridad || [];
  if (i === 0) return <BarP title="1 · Categoría de evento" data={porCampo(s, (r) => r.categoria || r.tipo_incidente || '—', 6)} xk="name" yk="value" />;
  if (i === 1) return <BarP title="2 · Hechos por mes" data={mesDesdeFecha(s, 'fecha_evento')} xk="name" yk="value" />;
  if (i === 2) return <Kpi t="3 · Registros de incidente" v={s.length} s="" />;
  if (i === 3) return <PieP title="4 · Con lesión vs sin lesión" data={porCampo(s, (r) => (r.hubo_lesion || r.lesion ? 'Con lesión' : 'Solo material'))} nameK="name" valueK="value" />;
  if (i === 4) return <Kpi t="5 · Días de baja (suma)" v={fmtN(s.reduce((a, r) => a + (Number(r.dias_baja) || 0), 0))} s="Si existe campo" />;
  if (i === 5) return <LineP title="6 · Densidad temporal" data={s.slice(0, 25).map((r, j) => ({ e: j + 1, u: 1 }))} xk="e" yk="u" h={100} />;
  return null;
}

/* ------------ cargos ------------ */
function cargos(i, p) {
  const c = p.cargos || [];
  if (i === 0) return <BarP title="1 · Nombre de puesto" data={porCampo(c, (r) => (r.nombre || '—').slice(0, 20), 8)} xk="name" yk="value" />;
  if (i === 1) return <PieP title="2 · Cargos activos" data={porCampo(c, (r) => (r.activo == 0 ? 'Baja' : 'Alta en catálogo'))} nameK="name" valueK="value" />;
  if (i === 2) return <Kpi t="3 · Posiciones en catálogo" v={c.length} s="" />;
  if (i === 3) return <Kpi t="4 · Descripciones rellenadas" v={c.filter((r) => String(r.descripcion || '').length > 10).length} s="" />;
  if (i === 4) return <LineP title="5 · Carga" data={c.map((r, j) => ({ a: j + 1, b: 1 }))} xk="a" yk="b" h={90} />;
  if (i === 5) return <BarP title="6 · Categoría o familia" data={porCampo(c, (r) => r.categoria_cargo || r.familia || 'General', 6)} xk="name" yk="value" />;
  return null;
}

/* ------------ departamentos ------------ */
function departamentos(i, p) {
  const d = p.departamentos || [];
  const em = p.empleados || [];
  if (i === 0) return <BarP title="1 · Nombre de unidad" data={porCampo(d, (r) => (r.nombre || r.nombre_departamento || '—').slice(0, 20), 8)} xk="name" yk="value" />;
  if (i === 1) return <BarP title="2 · Carga real: gente viva (empleados) por depto" data={head(em, (e) => e.departamento || '—')} xk="name" yk="value" />;
  if (i === 2) return <Kpi t="3 · Unidades administrativas" v={d.length} s="Catálogo" />;
  if (i === 3) return <PieP title="4 · Centros con responsable" data={porCampo(d, (r) => (r.responsable || r.jefe ? 'Con jefe' : 'Pendiente'))} nameK="name" valueK="value" />;
  if (i === 4) return <Kpi t="5 · Código de costo informado" v={d.filter((r) => r.codigo || r.id_costo).length} s="Filas" />;
  if (i === 5) return <LineP title="6 · Tamaño de nombre" data={d.slice(0, 15).map((r, j) => ({ o: j + 1, l: String(r.nombre || '').length }))} xk="o" yk="l" />;
  return null;
}

/* ------------ cert médicos ------------ */
function certMed(i, p) {
  const c = p.certMed || [];
  if (i === 0) return <BarP title="1 · Tipo o aptitud" data={porCampo(c, (r) => r.tipo || r.aptitud || '—', 6)} xk="name" yk="value" />;
  if (i === 1) return <BarP title="2 · Vencimientos (mes)" data={mesDesdeFecha(c, 'fecha_vencimiento')} xk="name" yk="value" />;
  if (i === 2) return <Kpi t="3 · Fichas clínicas" v={c.length} s="" />;
  if (i === 3) return <PieP title="4 · Apto / no apto" data={porCampo(c, (r) => (r.resultado || r.aptitud || 'Sin dato').toString().slice(0, 8))} nameK="name" valueK="value" />;
  if (i === 4) return <LineP title="5 · Emisión por mes" data={mesDesdeFecha(c, 'fecha_emision')} xk="name" yk="value" h={200} />;
  if (i === 5) return <Kpi t="6 · Restricciones: textos" v={c.filter((r) => String(r.restricciones || '').length > 3).length} s="Con restricción" />;
  return null;
}

/* ------------ eval médicas ------------ */
function evalMed(i, p) {
  const m = p.evalMed || [];
  if (i === 0) return <BarP title="1 · Resultado / aptitud" data={porCampo(m, (r) => r.resultado || '—', 6)} xk="name" yk="value" />;
  if (i === 1) return <BarP title="2 · Evaluaciones por mes" data={mesDesdeFecha(m, 'fecha_evaluacion')} xk="name" yk="value" />;
  if (i === 2) return <Kpi t="3 · Exámenes" v={m.length} s="" />;
  if (i === 3) return <PieP title="4 · Próxima cita" data={porCampo(m, (r) => (r.fecha_proxima ? 'Programada' : 'A definir'))} nameK="name" valueK="value" />;
  if (i === 4) return <Kpi t="5 · IMC: muestras con dato" v={m.filter((r) => r.imc != null || r.peso).length} s="Si el campo existe" />;
  if (i === 5) return <LineP title="6 · Tensión / signos: índice" data={m.slice(0, 20).map((r, j) => ({ u: j + 1, v: 1 }))} xk="u" yk="v" h={100} />;
  return null;
}

export const REGISTRO_SES_HERR = {
  empleados,
  'bajas-empleados': bajasEmpleado,
  'reporte-personal': reportePersonal,
  'cambios-cargo': cambiosCargo,
  'reporte-consolidado': repConsol,
  vacaciones,
  'turnos-trabajo': turnosTrabajo,
  'grupos-trabajo': gruposTrabajo,
  sanciones,
  reconocimientos,
  jubilaciones,
  asistencias,
  certificaciones,
  cursos,
  evalcapacitacion: evalCap,
  evaluaciones,
  objetivos,
  salarios,
  segseguridad: segSeg,
  seguridad: segLab,
  cargos,
  departamentos,
  'cert-medicos': certMed,
  'eval-medicas': evalMed,
};

export function renderBloque6(moduleKey, index, pack) {
  const f = REGISTRO_SES_HERR[moduleKey];
  if (!f) {
    return <Alert variant="secondary" className="mb-0 small">No hay panel para este módulo.</Alert>;
  }
  const el = f(index, pack);
  return el || <Alert variant="light" className="mb-0 small">Sin datos o índice incorrecto.</Alert>;
}

