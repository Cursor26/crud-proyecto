import { useState, useEffect, useCallback } from 'react';
import Axios, { API_BASE } from '../axiosConfig';
import Swal from 'sweetalert2';
import AppSelect from './AppSelect';

const PRIORIDADES = [
  { id: 'alta', label: 'Alta' },
  { id: 'media', label: 'Media' },
  { id: 'baja', label: 'Baja' },
];

const DEFAULT_REGLAS_PRIORIDAD = {
  alta: [60, 30, 15, 7, 1],
  media: [30, 15, 7],
  baja: [15, 7],
};

const MIN_SLOTS_PRIORIDAD = { alta: 3, media: 2, baja: 1 };
const MAX_SLOTS_ALTA = 8;

function parseDiasText(text) {
  return String(text || '')
    .split(/[,;\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 365);
}

function diasToText(arr) {
  return Array.isArray(arr) ? arr.join(', ') : '';
}

function normalizarDiasArray(arr) {
  if (!Array.isArray(arr)) return [];
  const nums = arr
    .map((d) => Number(d))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 365);
  return [...new Set(nums)].sort((a, b) => b - a);
}

function sanitizeReglasPrioridad(raw) {
  const rp = raw && typeof raw === 'object' ? raw : {};
  let alta = normalizarDiasArray(rp.alta?.length ? rp.alta : DEFAULT_REGLAS_PRIORIDAD.alta);
  let media = normalizarDiasArray(rp.media?.length ? rp.media : DEFAULT_REGLAS_PRIORIDAD.media);
  let baja = normalizarDiasArray(rp.baja?.length ? rp.baja : DEFAULT_REGLAS_PRIORIDAD.baja);
  if (alta.length < MIN_SLOTS_PRIORIDAD.alta) {
    alta = DEFAULT_REGLAS_PRIORIDAD.alta.slice(0, MIN_SLOTS_PRIORIDAD.alta);
  }
  const maxMedia = Math.max(MIN_SLOTS_PRIORIDAD.media, alta.length - 1);
  if (media.length > maxMedia) media = media.slice(0, maxMedia);
  if (media.length < MIN_SLOTS_PRIORIDAD.media) {
    media = DEFAULT_REGLAS_PRIORIDAD.media.slice(0, MIN_SLOTS_PRIORIDAD.media);
  }
  const maxBaja = Math.max(MIN_SLOTS_PRIORIDAD.baja, media.length - 1);
  if (baja.length > maxBaja) baja = baja.slice(0, maxBaja);
  if (baja.length < MIN_SLOTS_PRIORIDAD.baja) {
    baja = DEFAULT_REGLAS_PRIORIDAD.baja.slice(0, MIN_SLOTS_PRIORIDAD.baja);
  }
  return { alta, media, baja };
}

function applyHierarchy(reglas) {
  let alta = [...reglas.alta];
  let media = [...reglas.media];
  let baja = [...reglas.baja];
  const maxMedia = Math.max(MIN_SLOTS_PRIORIDAD.media, alta.length - 1);
  if (media.length > maxMedia) media = media.slice(0, maxMedia);
  const maxBaja = Math.max(MIN_SLOTS_PRIORIDAD.baja, media.length - 1);
  if (baja.length > maxBaja) baja = baja.slice(0, maxBaja);
  return { alta, media, baja };
}

function maxSlotsPrioridad(prioridad, reglas) {
  if (prioridad === 'alta') return MAX_SLOTS_ALTA;
  if (prioridad === 'media') {
    return Math.max(MIN_SLOTS_PRIORIDAD.media, reglas.alta.length - 1);
  }
  return Math.max(MIN_SLOTS_PRIORIDAD.baja, reglas.media.length - 1);
}

function canAddSlotPrioridad(prioridad, reglas) {
  return reglas[prioridad].length < maxSlotsPrioridad(prioridad, reglas);
}

function validateReglasPrioridad(reglas) {
  for (const p of PRIORIDADES) {
    if (!reglas[p.id]?.length) {
      return `Indique al menos un día para prioridad ${p.label}.`;
    }
    if (reglas[p.id].some((n) => !Number.isFinite(n) || n < 1 || n > 365)) {
      return `Use valores entre 1 y 365 días en prioridad ${p.label}.`;
    }
    if (new Set(reglas[p.id]).size !== reglas[p.id].length) {
      return `No repita el mismo día en prioridad ${p.label}.`;
    }
  }
  if (reglas.media.length >= reglas.alta.length) {
    return 'Prioridad Media debe tener menos hitos que Alta.';
  }
  if (reglas.baja.length >= reglas.media.length) {
    return 'Prioridad Baja debe tener menos hitos que Media.';
  }
  return null;
}

function sugerirNuevoDia(dias) {
  if (!dias.length) return 30;
  const min = Math.min(...dias);
  return Math.max(1, min > 1 ? min - 1 : 1);
}

function ReglasPrioridadEditor({ reglas, onChange, puedeGuardar }) {
  const actualizarDia = (prioridad, index, valor) => {
    const n = Number(valor);
    onChange((prev) => {
      const arr = [...prev[prioridad]];
      if (valor === '' || !Number.isFinite(n)) return prev;
      arr[index] = Math.min(365, Math.max(1, Math.round(n)));
      return applyHierarchy({ ...prev, [prioridad]: arr });
    });
  };

  const quitarDia = (prioridad, index) => {
    onChange((prev) => {
      if (prev[prioridad].length <= MIN_SLOTS_PRIORIDAD[prioridad]) return prev;
      const arr = prev[prioridad].filter((_, i) => i !== index);
      return applyHierarchy({ ...prev, [prioridad]: arr });
    });
  };

  const agregarDia = (prioridad) => {
    onChange((prev) => {
      if (!canAddSlotPrioridad(prioridad, prev)) return prev;
      const arr = [...prev[prioridad], sugerirNuevoDia(prev[prioridad])];
      return applyHierarchy({ ...prev, [prioridad]: arr });
    });
  };

  return (
    <div className="rec-prioridad-reglas mb-4">
      {PRIORIDADES.map((p) => {
        const dias = reglas[p.id] || [];
        const puedeAgregar = puedeGuardar && canAddSlotPrioridad(p.id, reglas);
        const maxSlots = maxSlotsPrioridad(p.id, reglas);
        return (
          <div key={p.id} className="rec-prioridad-fila mb-3">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <label className="form-label small mb-0 fw-semibold">{p.label}</label>
              <span className="text-muted small">
                {dias.length} de {maxSlots} hitos
              </span>
            </div>
            <div className="rec-prioridad-dias" role="group" aria-label={`Días prioridad ${p.label}`}>
              {dias.map((dia, idx) => (
                <div key={`${p.id}-${idx}`} className="rec-prioridad-dia">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    className="rec-prioridad-dia-input"
                    value={dia}
                    onChange={(e) => actualizarDia(p.id, idx, e.target.value)}
                    disabled={!puedeGuardar}
                    aria-label={`Días antes del vencimiento, ${p.label}, hito ${idx + 1}`}
                  />
                  {puedeGuardar && dias.length > MIN_SLOTS_PRIORIDAD[p.id] && (
                    <button
                      type="button"
                      className="rec-prioridad-dia-remove"
                      onClick={() => quitarDia(p.id, idx)}
                      title="Quitar este día"
                      aria-label={`Quitar hito ${idx + 1} de ${p.label}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {puedeGuardar && (
                <button
                  type="button"
                  className="rec-prioridad-add"
                  onClick={() => agregarDia(p.id)}
                  disabled={!puedeAgregar}
                  title={
                    puedeAgregar
                      ? 'Añadir otro día de aviso'
                      : p.id === 'media'
                        ? 'Media no puede tener tantos hitos como Alta'
                        : p.id === 'baja'
                          ? 'Baja no puede tener tantos hitos como Media'
                          : 'Máximo de hitos alcanzado'
                  }
                  aria-label={`Añadir día, prioridad ${p.label}`}
                >
                  +
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecordatoriosContratosConfig({ puedeEditar, puedeEjecutar, esAdmin }) {
  const puedeGuardar = puedeEditar ?? esAdmin;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [activo, setActivo] = useState(true);
  const [reglasPrioridad, setReglasPrioridad] = useState({ ...DEFAULT_REGLAS_PRIORIDAD });
  const [tiposContrato, setTiposContrato] = useState([]);
  const [reglasTipo, setReglasTipo] = useState([]);
  const [envios, setEnvios] = useState([]);

  const cargar = useCallback(() => {
    setLoading(true);
    Axios.get(`${API_BASE}/config/recordatorios-contratos`)
      .then((res) => {
        const cfg = res.data?.config || {};
        setActivo(cfg.activo !== false);
        setReglasPrioridad(sanitizeReglasPrioridad(cfg.reglas_prioridad));
        setReglasTipo(
          Array.isArray(cfg.reglas_tipo)
            ? cfg.reglas_tipo.map((r) => ({
                id_tipo_contrato: r.id_tipo_contrato,
                dias: diasToText(r.dias),
                activo: r.activo !== false,
              }))
            : []
        );
        setTiposContrato(Array.isArray(res.data?.tipos_contrato) ? res.data.tipos_contrato : []);
        setEnvios(Array.isArray(res.data?.ultimos_envios) ? res.data.ultimos_envios : []);
      })
      .catch(() => setEnvios([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregarReglaTipo = () => {
    const primero = tiposContrato.find((t) => Number(t.activo) !== 0);
    if (!primero) {
      Swal.fire('Sin tipos', 'Cree tipos de contrato en Contratación → Tipos de contrato.', 'info');
      return;
    }
    setReglasTipo((prev) => [
      ...prev,
      { id_tipo_contrato: primero.id_tipo_contrato, dias: '30, 15, 7', activo: true },
    ]);
  };

  const guardar = async () => {
    if (!puedeGuardar) {
      await Swal.fire('Sin permiso', 'Se requiere permiso de edición en contratos para guardar.', 'warning');
      return;
    }
    const reglas_prioridad = {
      alta: normalizarDiasArray(reglasPrioridad.alta),
      media: normalizarDiasArray(reglasPrioridad.media),
      baja: normalizarDiasArray(reglasPrioridad.baja),
    };
    const errPrioridad = validateReglasPrioridad(reglas_prioridad);
    if (errPrioridad) {
      await Swal.fire('Jerarquía de prioridades', errPrioridad, 'warning');
      return;
    }
    const reglas_tipo = reglasTipo
      .map((r) => ({
        id_tipo_contrato: Number(r.id_tipo_contrato),
        dias: parseDiasText(r.dias),
        activo: r.activo !== false,
      }))
      .filter((r) => r.id_tipo_contrato > 0 && r.dias.length > 0);

    setSaving(true);
    try {
      const res = await Axios.put(`${API_BASE}/config/recordatorios-contratos`, {
        activo,
        reglas_prioridad,
        reglas_tipo,
      });
      await Swal.fire('Guardado', res.data?.message || 'Configuración actualizada.', 'success');
      cargar();
    } catch (err) {
      await Swal.fire('Error', err.response?.data?.message || err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const ejecutarAhora = async () => {
    if (!puedeEjecutar) return;
    setRunning(true);
    try {
      const res = await Axios.post(`${API_BASE}/contratos/recordatorios/ejecutar-ahora`, { forzar: true });
      await Swal.fire('Ejecutado', res.data?.message || 'Listo.', 'success');
      cargar();
    } catch (err) {
      await Swal.fire('Error', err.response?.data?.message || err.message, 'error');
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <p className="text-muted small">Cargando configuración avanzada…</p>;

  return (
    <div
      className={`recordatorios-avanzado ${activo ? 'recordatorios-avanzado--activo' : 'recordatorios-avanzado--inactivo'}`}
    >
      <p className="recordatorios-intro small mb-3">
        El <strong>servidor</strong> ejecuta la revisión y el envío automáticos (horario y programación internos).
        Aquí define si están activos y en qué días antes del vencimiento avisar (regla por <strong>tipo</strong> si existe;
        si no, por <strong>prioridad</strong> del contrato).
      </p>

      <div className="form-check form-switch mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          id="recActivoAv"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          disabled={!puedeGuardar}
        />
        <label
          className={`form-check-label recordatorios-switch-label ${activo ? 'recordatorios-switch-label--on' : 'recordatorios-switch-label--off'}`}
          htmlFor="recActivoAv"
        >
          Activar recordatorios automáticos
        </label>
      </div>

      <h6 className="text-muted small text-uppercase mb-2">Reglas por prioridad del contrato</h6>
      <p className="form-text mb-2">
        Asigne la prioridad en cada contrato (Alta / Media / Baja). Un correo por hito cuando falten exactamente esos días.
        <strong> Alta</strong> admite más hitos que <strong>Media</strong>, y Media más que <strong>Baja</strong>.
      </p>
      <ReglasPrioridadEditor
        reglas={reglasPrioridad}
        onChange={setReglasPrioridad}
        puedeGuardar={puedeGuardar}
      />

      <h6 className="text-muted small text-uppercase mb-2">Reglas por tipo de contrato (opcional)</h6>
      <p className="form-text mb-2">
        Si un tipo tiene regla propia, sustituye la de prioridad para esos contratos (ej. laborales, servicios, proveedores).
      </p>
      {reglasTipo.map((regla, idx) => (
        <div key={`${regla.id_tipo_contrato}-${idx}`} className="row g-2 align-items-end mb-2">
          <div className="col-md-4">
            <AppSelect
              variant="filter"
              className="form-select form-select-sm"
              value={String(regla.id_tipo_contrato || '')}
              onChange={(e) => {
                const v = Number(e.target.value);
                setReglasTipo((prev) => prev.map((r, i) => (i === idx ? { ...r, id_tipo_contrato: v } : r)));
              }}
              disabled={!puedeGuardar}
            >
              {tiposContrato.map((t) => (
                <option key={t.id_tipo_contrato} value={t.id_tipo_contrato}>
                  {t.nombre}
                  {Number(t.activo) === 0 ? ' (inactivo)' : ''}
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="col-md-5">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Días: 30, 15, 7"
              value={regla.dias}
              onChange={(e) => {
                const v = e.target.value;
                setReglasTipo((prev) => prev.map((r, i) => (i === idx ? { ...r, dias: v } : r)));
              }}
              disabled={!puedeGuardar}
            />
          </div>
          <div className="col-md-2">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                checked={regla.activo !== false}
                onChange={(e) => {
                  setReglasTipo((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, activo: e.target.checked } : r))
                  );
                }}
                disabled={!puedeGuardar}
              />
              <label className="form-check-label small">Activa</label>
            </div>
          </div>
          {puedeGuardar && (
            <div className="col-md-1">
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => setReglasTipo((prev) => prev.filter((_, i) => i !== idx))}
              >
                ×
              </button>
            </div>
          )}
        </div>
      ))}
      {puedeGuardar && (
        <button type="button" className="btn btn-sm btn-outline-primary mb-4" onClick={agregarReglaTipo}>
          + Añadir regla por tipo
        </button>
      )}

      <div className="d-flex flex-wrap gap-2 mb-4">
        {puedeGuardar && (
          <button type="button" className="btn btn-primary btn-sm" onClick={guardar} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </button>
        )}
        {puedeEjecutar && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={ejecutarAhora} disabled={running}>
            {running ? 'Ejecutando…' : 'Ejecutar ahora (prueba)'}
          </button>
        )}
      </div>

      <h6 className="small text-muted mb-2">Últimos envíos</h6>
      {envios.length === 0 ? (
        <p className="text-muted small mb-0">Sin registros aún.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Contrato</th>
                <th>Días</th>
                <th>Destino</th>
                <th>Origen</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {envios.map((e) => (
                <tr key={e.id_envio}>
                  <td className="small text-nowrap">
                    {e.enviado_en ? new Date(e.enviado_en).toLocaleString('es') : '—'}
                  </td>
                  <td>{e.numero_contrato}</td>
                  <td>{e.dias_antes_vencimiento}</td>
                  <td className="small">{e.correo_destino}</td>
                  <td>{e.origen}</td>
                  <td>
                    <span
                      className={`badge ${
                        e.resultado === 'ok'
                          ? 'text-bg-success'
                          : e.resultado === 'advertencia'
                            ? 'text-bg-warning text-dark'
                            : 'text-bg-danger'
                      }`}
                    >
                      {e.resultado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RecordatoriosContratosConfig;
