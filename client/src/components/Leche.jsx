import { useState, useEffect, useMemo, useCallback } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { Modal } from 'react-bootstrap';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_PRODUCCION } from '../utils/exportAepgPlantilla';
import { fmtFechaTabla } from '../utils/formatDates';
import {
  errorMensajeCampoNumericoProduccion,
  armaPayloadProduccion,
  resumenErroresProduccion,
  fechaLocalHoyISO,
  hayCerosOVaciosEnFormulario,
} from '../utils/produccionFormValidation';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import ModuleTitleBar from './ModuleTitleBar';
import ListSearchToolbar from './ListSearchToolbar';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import LecheStatsPanel from './LecheStatsPanel';
import ProduccionFormInstrucciones from './ProduccionFormInstrucciones';
import ProduccionFormCampoNumero from './ProduccionFormCampoNumero';

const categorias = [
  'Zenea', 'Rosafe', 'Nazareno',
  'total1', 'total2', 'total3', 'total4', 'total5', 'total',
];
const sufijos = [
  'Vacas_total', 'Vacas_ordeño', 'Produccion_total', 'Total_ventas',
  'Total_contra', 'Total_indust', 'Acopio', 'Queso_ALGIBE', 'Queso_COMP',
  'Ollo', 'Poblac_CAMP', 'Vtas_Trab', 'ORGA', 'TOTAL',
  'Recria', 'Vaq', 'Cabras', 'Torll', 'Perd',
];
const campos = [];
categorias.forEach((cat) => {
  sufijos.forEach((suf) => {
    campos.push(`${cat}_${suf}`);
  });
});

function registroCoincideBusqueda(reg, q) {
  if (!q || !String(q).trim()) return true;
  const t = String(q).trim().toLowerCase();
  const fechaStr = reg.fecha ? String(reg.fecha).split('T')[0] : '';
  if (fechaStr.toLowerCase().includes(t)) return true;
  if (String(reg.creado_por || '').toLowerCase().includes(t)) return true;
  if (String(reg.actualizado_por || '').toLowerCase().includes(t)) return true;
  for (const c of campos) {
    const v = reg[c];
    if (v != null && String(v).toLowerCase().includes(t)) return true;
  }
  return false;
}

const Leche = () => {
  const puedeEscribir = usePuedeEscribir();
  const [registros, setRegistros] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEstadisticas, setShowEstadisticas] = useState(false);
  const [fecha, setFecha] = useState('');
  const [formData, setFormData] = useState({});
  const [editando, setEditando] = useState(false);
  const [fechaOriginal, setFechaOriginal] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    const initial = {};
    campos.forEach((c) => {
      initial[c] = '';
    });
    setFormData(initial);
  }, []);

  const getRegistros = () => {
    Axios.get('/leche')
      .then((res) => {
        const datos = (res.data || []).map((item) => ({
          ...item,
          fecha: item.fecha ? item.fecha.split('T')[0] : item.fecha,
        }));
        setRegistros(datos);
      })
      .catch((err) => console.error('Error al cargar:', err));
  };

  useEffect(() => {
    getRegistros();
  }, []);

  const registrosFiltrados = useMemo(
    () => registros.filter((r) => registroCoincideBusqueda(r, busqueda)),
    [registros, busqueda],
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTouched((p) => ({ ...p, [name]: true }));
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFieldBlur = (e) => {
    const { name } = e.target;
    setTouched((p) => ({ ...p, [name]: true }));
  };

  const errMsg = useCallback(
    (name) => {
      const e = errorMensajeCampoNumericoProduccion(formData[name]);
      if (!e) return null;
      if (touched[name] || submitAttempted) return e;
      return null;
    },
    [formData, touched, submitAttempted],
  );

  const limpiarForm = () => {
    const empty = {};
    campos.forEach((c) => {
      empty[c] = '';
    });
    setFormData(empty);
    setFecha('');
    setEditando(false);
    setFechaOriginal('');
    setSubmitAttempted(false);
    setTouched({});
  };

  const abrirNuevo = () => {
    limpiarForm();
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    const errs = resumenErroresProduccion(campos, formData);
    if (errs.length) {
      const slice = errs.slice(0, 32);
      const html = slice.map(
        (x) => `<div class="text-start small mb-1"><strong>${x.campo}</strong> — ${x.mensaje}</div>`,
      ).join('');
      const more = errs.length > 32
        ? `<p class="text-start small text-muted mt-2 mb-0">…y ${errs.length - 32} medidas con el mismo tipo de error (número inválido o negativo). Corregí y volvé a intentar.</p>`
        : '';
      await Swal.fire({
        title: 'Revisar medidas',
        icon: 'warning',
        html: `${html}${more}`,
        width: 680,
        confirmButtonText: 'Entendido',
      });
      return;
    }
    if (hayCerosOVaciosEnFormulario(campos, formData)) {
      const c = await Swal.fire({
        title: 'Hay valores en cero o vacíos',
        html: '<p class="text-start small mb-0">Ingresaste <strong>0</strong> en alguna medida o dejaste <strong>campos sin completar</strong> (se guardarán como cero). Si es lo que querés, confirmá. Si no, cancelá y completá el formulario.</p>',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Revisar el formulario',
        focusCancel: true,
        width: 600,
      });
      if (!c.isConfirmed) return;
    }
    const data = armaPayloadProduccion(campos, formData, fecha);
    if (editando) {
      Axios.put(`/update-leche/${fechaOriginal}`, data)
        .then(() => {
          Swal.fire('Actualizado', 'Registro actualizado', 'success');
          getRegistros();
          limpiarForm();
          setShowModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('/create-leche', data)
        .then(() => {
          Swal.fire('Creado', 'Registro creado', 'success');
          getRegistros();
          limpiarForm();
          setShowModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    }
  };

  const editarRegistro = (reg) => {
    setEditando(true);
    setSubmitAttempted(false);
    setTouched({});
    const fechaSolo = reg.fecha ? reg.fecha.split('T')[0] : '';
    setFechaOriginal(fechaSolo);
    setFecha(fechaSolo);
    const nuevosDatos = {};
    campos.forEach((c) => {
      nuevosDatos[c] = reg[c] != null && reg[c] !== '' ? reg[c] : '';
    });
    setFormData(nuevosDatos);
    setShowModal(true);
  };

  const eliminarRegistro = (rawFecha) => {
    const fechaSolo = String(rawFecha).split('T')[0];
    Swal.fire({
      title: 'Confirmar eliminación — Leche',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Conservar registro',
      focusCancel: true,
      width: 640,
      html: (
        '<div class="text-start">'
        + '<p>Se <strong>elimina de la tabla de trabajo</strong> el registro del día <strong>'
        + `${fechaSolo}</strong> (Leche).</p>`
        + '<ul class="small ps-3 mb-2">'
        + '<li>Antes de borrar, el sistema deja <strong>copia en archivo de auditoría</strong> (eliminación registrada) según la política interna.</li>'
        + '<li>Después no podrás <strong>restaurar</strong> con un botón: si el borrado fue un error, tendrás que <strong>crear otra carga de día</strong> con la fecha adecuada; los numéricos admiten 0 o vacío (guardado como 0), y si hay ceros o vacíos el sistema pide confirmación antes de guardar.</li>'
        + '<li>Los informes o estadística que tomen la fecha afectada dejarán de ver este renglón en la vista normal.</li>'
        + '</ul></div>'
      ),
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`/delete-leche/${fechaSolo}`)
          .then(() => {
            Swal.fire('Eliminado', 'Registro eliminado', 'success');
            getRegistros();
          })
          .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
      }
    });
  };

  const lecheExportAepg = useMemo(() => {
    const headers = ['Fecha', ...campos, 'Creado por', 'Actualizado por'];
    const dataRows = registros.map((r) => [
      r.fecha,
      ...campos.map((c) => (r[c] == null || r[c] === '' ? '—' : r[c])),
      r.creado_por || '—',
      r.actualizado_por || '—',
    ]);
    return { headers, dataRows };
  }, [registros]);

  return (
    <div className="container-fluid px-0">
      <ModuleTitleBar
        title="Gestión de Leche"
        actions={
          <>
            <button type="button" className="btn btn-primary btn-form-nowrap" onClick={abrirNuevo} disabled={!puedeEscribir}>
              <i className="bi bi-plus-lg me-2" aria-hidden="true" />
              Nuevo registro
            </button>
            <ExportacionAepgGrupo
              tituloSistema={AEPG_TITULO_PRODUCCION}
              subtitulo="Reporte: leche. Generado con la gestión de producción/estadística AEPG."
              descripcion="Renglones con curvas, totales, acopio/queso y trazabilidad (creado/actualizado por)."
              nombreBaseArchivo={`AEPG_leche_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Leche"
              headers={lecheExportAepg.headers}
              dataRows={lecheExportAepg.dataRows}
              disabled={!registros.length}
            />
            <button
              type="button"
              className="btn btn-outline-info btn-sm btn-form-nowrap d-inline-flex align-items-center"
              onClick={() => setShowEstadisticas(true)}
            >
              <i className="bi bi-graph-up-arrow me-2" aria-hidden="true" />
              Estadísticas e informes
            </button>
          </>
        }
      />
      <Modal
        show={showEstadisticas}
        onHide={() => setShowEstadisticas(false)}
        size="xl"
        fullscreen="lg-down"
        scrollable
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Estadísticas, análisis e informes — Leche</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0" style={{ maxHeight: 'min(90vh, 900px)' }}>
          <div className="p-2 p-md-3 overflow-auto" style={{ maxHeight: 'min(90vh, 900px)' }}>
            <LecheStatsPanel registros={registros} />
          </div>
        </Modal.Body>
      </Modal>
      <div className="card p-3">
        <ListSearchToolbar value={busqueda} onChange={setBusqueda} placeholder="Fecha, valores, creado por, etc." />
        <h4 className="h6 text-muted mb-2">Registros ({registrosFiltrados.length} de {registros.length})</h4>
        <div style={{ overflowX: 'auto' }}>
          <table className="table table-data-compact table-bordered table-striped table-sm">
            <thead>
              <tr>
                <th>Fecha</th>
                {campos.map((c) => (
                  <th key={c}>{c}</th>
                ))}
                <th>Creado por</th>
                <th>Actualizado por</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((reg) => (
                <tr key={reg.fecha}>
                  <td className="text-nowrap">{fmtFechaTabla(reg.fecha)}</td>
                  {campos.map((c) => (
                    <td key={c}>{reg[c]}</td>
                  ))}
                  <td className="small">{reg.creado_por || '—'}</td>
                  <td className="small">{reg.actualizado_por || '—'}</td>
                  <td>
                    <EditTableActionButton onClick={() => editarRegistro(reg)} className="me-1" />
                    <DeleteTableActionButton onClick={() => eliminarRegistro(reg.fecha)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => { setShowModal(false); limpiarForm(); }} size="xl" scrollable backdrop="static" centered>
        <Modal.Header closeButton>
          <Modal.Title>{editando ? 'Editar registro' : 'Nuevo registro'}</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleSubmit} noValidate>
          <Modal.Body className="modal-form-body-scroll">
            <ProduccionFormInstrucciones
              titulo="Cómo completar un día de registro (Leche)"
              nombreModulo="Leche"
            />
            <div className="row mb-3 align-items-end g-2">
              <div className="col-md-4 col-lg-3">
                <label className="form-label" htmlFor="produccion-fecha-leche">Fecha del registro</label>
                <input
                  id="produccion-fecha-leche"
                  type="date"
                  className="form-control"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  disabled={editando}
                />
                <p className="form-text small mb-0" id="produccion-fecha-help-leche">
                  Opcional: si no elegís una fecha, al guardar se asigna <strong>la de hoy</strong> según
                  tu dispositivo ({fechaLocalHoyISO()}).
                </p>
              </div>
              <div className="col-auto">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setFecha(fechaLocalHoyISO())}
                  disabled={editando}
                >
                  Poner la fecha de hoy
                </button>
              </div>
            </div>
            <div className="row">
              {categorias.map((cat) => (
                <div key={cat} className="col-md-6 border p-2 mb-2">
                  <h5 className="bg-light p-1">{cat}</h5>
                  <div className="row">
                    {sufijos.map((suf) => {
                      const nombreCampo = `${cat}_${suf}`;
                      return (
                        <ProduccionFormCampoNumero
                          key={nombreCampo}
                          name={nombreCampo}
                          label={suf}
                          value={formData[nombreCampo] || ''}
                          onChange={handleInputChange}
                          onBlur={handleFieldBlur}
                          error={errMsg(nombreCampo)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-outline-secondary" onClick={() => { setShowModal(false); limpiarForm(); }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-success" disabled={!puedeEscribir}>
              {editando ? 'Actualizar' : 'Guardar'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
};

export default Leche;
