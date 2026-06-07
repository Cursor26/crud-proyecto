import { useState, useEffect, useCallback } from 'react';
import Axios, { API_BASE } from '../axiosConfig';
import { BTN_GUARDAR, BTN_SECUNDARIO } from '../lib/actionButtonClasses';
import Swal from 'sweetalert2';

const TIPOS = [
  {
    id: 'por_vencer',
    titulo: 'Contrato por vencer',
    desc: 'Correos automáticos y manuales cuando falten los días configurados (recordatorio de renovación).',
  },
  {
    id: 'vencido',
    titulo: 'Contrato vencido',
    desc: 'Aviso cuando la fecha fin ya pasó y el contrato sigue activo.',
  },
  {
    id: 'cancelado',
    titulo: 'Contrato cancelado',
    desc: 'Notificación al cancelarse un contrato (aprobación o acción directa).',
  },
];

function ContratosCorreoPlantillasConfig({ puedeEditar }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [placeholders, setPlaceholders] = useState('');
  const [plantillas, setPlantillas] = useState({
    por_vencer: { asunto: '', cuerpo: '' },
    vencido: { asunto: '', cuerpo: '' },
    cancelado: { asunto: '', cuerpo: '' },
  });
  const [tipoActivo, setTipoActivo] = useState('por_vencer');
  const [correoPrueba, setCorreoPrueba] = useState('');
  const [probando, setProbando] = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    Axios.get(`${API_BASE}/config/contratos-correo-plantillas`)
      .then((res) => {
        setPlantillas(res.data?.plantillas || {});
        setPlaceholders(res.data?.placeholders || '');
      })
      .catch((err) => {
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      const email = String(user?.email || '').trim();
      if (email) setCorreoPrueba(email);
    } catch {
      /* ignore */
    }
  }, []);

  const actualizarCampo = (tipo, campo, valor) => {
    setPlantillas((prev) => ({
      ...prev,
      [tipo]: { ...prev[tipo], [campo]: valor },
    }));
  };

  const probarPlantilla = async () => {
    if (!puedeEditar) {
      await Swal.fire('Sin permiso', 'Se requiere permiso de edición en contratos.', 'warning');
      return;
    }
    const email = correoPrueba.trim();
    if (!email) {
      await Swal.fire('Correo requerido', 'Indique un correo de prueba.', 'warning');
      return;
    }
    setProbando(true);
    try {
      const res = await Axios.post(`${API_BASE}/config/contratos-correo-plantillas/probar`, {
        email,
        tipo: tipoActivo,
        plantilla: plantillas[tipoActivo],
      });
      await Swal.fire('Enviado', res.data?.message || 'Correo de prueba enviado.', 'success');
    } catch (err) {
      await Swal.fire('Error', err.response?.data?.message || err.message, 'error');
    } finally {
      setProbando(false);
    }
  };

  const guardar = async () => {
    if (!puedeEditar) {
      await Swal.fire('Sin permiso', 'Se requiere permiso de edición en contratos.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await Axios.put(`${API_BASE}/config/contratos-correo-plantillas`, { plantillas });
      setPlantillas(res.data?.plantillas || plantillas);
      await Swal.fire('Guardado', res.data?.message || 'Plantillas actualizadas.', 'success');
    } catch (err) {
      await Swal.fire('Error', err.response?.data?.message || err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted small">Cargando plantillas de correo…</p>;

  const activa = TIPOS.find((t) => t.id === tipoActivo) || TIPOS[0];
  const datos = plantillas[tipoActivo] || { asunto: '', cuerpo: '' };

  return (
    <div className="contratos-correo-plantillas">
      <p className="text-muted small mb-3">
        Personalice el asunto y el texto de los correos. Use variables entre llaves dobles; el sistema las
        sustituye por los valores del contrato al enviar.
      </p>
      {placeholders ? (
        <p className="small mb-3">
          <strong>Variables disponibles:</strong>{' '}
          <code className="user-select-all">{placeholders}</code>
        </p>
      ) : null}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn btn-sm ${tipoActivo === t.id ? 'contratos-btn-view' : 'btn-outline-secondary'}`}
            onClick={() => setTipoActivo(t.id)}
            title={t.desc}
          >
            {t.titulo}
          </button>
        ))}
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <h6 className="fw-bold mb-1">{activa.titulo}</h6>
          <p className="text-muted small mb-3">{activa.desc}</p>

          <div className="mb-3">
            <label className="form-label small fw-semibold" htmlFor={`plantilla-asunto-${tipoActivo}`}>
              Asunto del correo
            </label>
            <input
              id={`plantilla-asunto-${tipoActivo}`}
              type="text"
              className="form-control form-control-sm"
              value={datos.asunto || ''}
              onChange={(e) => actualizarCampo(tipoActivo, 'asunto', e.target.value)}
              disabled={!puedeEditar}
              maxLength={200}
            />
          </div>

          <div className="mb-0">
            <label className="form-label small fw-semibold" htmlFor={`plantilla-cuerpo-${tipoActivo}`}>
              Cuerpo del mensaje
            </label>
            <textarea
              id={`plantilla-cuerpo-${tipoActivo}`}
              className="form-control form-control-sm"
              rows={12}
              value={datos.cuerpo || ''}
              onChange={(e) => actualizarCampo(tipoActivo, 'cuerpo', e.target.value)}
              disabled={!puedeEditar}
              spellCheck
            />
          </div>
        </div>
      </div>

      {puedeEditar ? (
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            type="button"
            className={BTN_GUARDAR}
            onClick={guardar}
            disabled={saving}
            title="Guardar plantillas de correo"
          >
            {saving ? 'Guardando…' : 'Guardar plantillas'}
          </button>
          <div className="contratos-correo-prueba-box d-flex align-items-stretch flex-grow-1 flex-sm-grow-0">
            <input
              type="email"
              className="form-control form-control-sm contratos-correo-prueba-box__input"
              placeholder="Correo de prueba"
              value={correoPrueba}
              onChange={(e) => setCorreoPrueba(e.target.value)}
              title="Correo al que se enviará la plantilla actual (aunque no esté guardada)"
              aria-label="Correo de prueba"
            />
          </div>
          <button
            type="button"
            className={BTN_SECUNDARIO}
            onClick={probarPlantilla}
            disabled={probando || saving}
            title={`Enviar correo de prueba con la plantilla «${activa.titulo}» y datos de ejemplo`}
          >
            {probando ? 'Enviando…' : 'Probar'}
          </button>
        </div>
      ) : (
        <p className="text-muted small mb-0">Solo lectura: necesita permiso de edición en contratos para modificar.</p>
      )}
    </div>
  );
}

export default ContratosCorreoPlantillasConfig;
