import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { fmtFechaTabla } from '../utils/formatDates';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';
import { FormModal } from './FormModal';
import ListSearchToolbar from './ListSearchToolbar';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import { TIPO_CHEQUEO_MED, RESULTADO_CHEQUEO } from '../constants/hrCatalogos';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

const TIPO_OPTS = TIPO_CHEQUEO_MED.filter(Boolean);
const RES_OPTS = RESULTADO_CHEQUEO.filter(Boolean);

const EvaluacionesMedicas = () => {
  const puedeEscribir = usePuedeEscribir();
  const [registros, setRegistros] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [carnet, setCarnet] = useState('');
  const [fechaEvaluacion, setFechaEvaluacion] = useState(() => new Date().toISOString().slice(0, 10));
  const [tipoChequeo, setTipoChequeo] = useState(TIPO_OPTS[0] || 'Periódico');
  const [resultado, setResultado] = useState(RES_OPTS[0] || 'Apto');
  const [resultadoOtro, setResultadoOtro] = useState('');
  const [medicoNombre, setMedicoNombre] = useState('');
  const [proximoChequeo, setProximoChequeo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [activo, setActivo] = useState(true);
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [busq, setBusq] = useState('');

  const getRegistros = () => {
    Axios.get('/evaluaciones-medicas')
      .then((res) => setRegistros(res.data))
      .catch((err) => {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      });
  };

  const getEmpleados = () => {
    Axios.get('/empleados')
      .then((res) => {
        const ordenados = [...res.data].sort((a, b) => `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es'));
        setEmpleados(ordenados);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    getRegistros();
    getEmpleados();
  }, []);

  const resultadoTexto = () => (resultado === 'Otro' ? resultadoOtro.trim() : resultado);

  const limpiarForm = () => {
    setCarnet('');
    setFechaEvaluacion(new Date().toISOString().slice(0, 10));
    setTipoChequeo(TIPO_OPTS[0] || 'Periódico');
    setResultado(RES_OPTS[0] || 'Apto');
    setResultadoOtro('');
    setMedicoNombre('');
    setProximoChequeo('');
    setObservaciones('');
    setActivo(true);
    setEditando(false);
    setIdOriginal('');
  };

  const guardar = () => {
    const resTxt = resultadoTexto();
    if (!carnet || !fechaEvaluacion || !resTxt || !medicoNombre.trim()) {
      Swal.fire('Atención', 'Complete empleado, fecha, resultado y médico responsable.', 'warning');
      return;
    }
    const data = {
      carnet_identidad: String(carnet).trim(),
      fecha_evaluacion: fechaEvaluacion,
      tipo_chequeo: tipoChequeo.trim() || 'Periódico',
      resultado: resTxt,
      medico_nombre: medicoNombre.trim(),
      proximo_chequeo: proximoChequeo.trim() || null,
      observaciones: observaciones.trim() || null,
      activo: activo ? 1 : 0,
    };
    if (editando) {
      Axios.put(`/update-evaluacion-medica/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Listo', 'Evaluación actualizada', 'success');
          getRegistros();
          limpiarForm();
          setShowModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('/create-evaluacion-medica', data)
        .then(() => {
          Swal.fire('Listo', 'Registrado', 'success');
          getRegistros();
          limpiarForm();
          setShowModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    }
  };

  const editarRegistro = (r) => {
    setEditando(true);
    setIdOriginal(r.id_eval_medica);
    setCarnet(String(r.carnet_identidad));
    setFechaEvaluacion(r.fecha_evaluacion || '');
    setTipoChequeo(TIPO_OPTS.includes(r.tipo_chequeo) ? r.tipo_chequeo : TIPO_OPTS[0] || 'Periódico');
    const res = r.resultado || '';
    if (RES_OPTS.filter((x) => x !== 'Otro').includes(res)) {
      setResultado(res);
      setResultadoOtro('');
    } else {
      setResultado('Otro');
      setResultadoOtro(res);
    }
    setMedicoNombre(r.medico_nombre || '');
    setProximoChequeo(r.proximo_chequeo || '');
    setObservaciones(r.observaciones || '');
    setActivo(r.activo == 1);
    setShowModal(true);
  };

  const eliminarRegistro = (r) => {
    Swal.fire({
      title: '¿Eliminar registro?',
      text: 'Se borrará esta evaluación médica.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((resC) => {
      if (resC.isConfirmed) {
        Axios.delete(`/delete-evaluacion-medica/${r.id_eval_medica}`)
          .then(() => {
            Swal.fire('Eliminado', '', 'success');
            getRegistros();
          })
          .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
      }
    });
  };

  const filtrados = useMemo(() => {
    const t = busq.trim().toLowerCase();
    if (!t) return registros;
    return registros.filter((r) => {
      const s = `${r.carnet_identidad} ${r.nombre} ${r.apellidos} ${r.tipo_chequeo} ${r.resultado} ${r.medico_nombre} ${r.fecha_evaluacion} ${r.proximo_chequeo}`.toLowerCase();
      return s.includes(t);
    });
  }, [registros, busq]);

  const evalMedExportAepg = useMemo(() => {
    const headers = [
      'Fecha evaluación',
      'Empleado',
      'Carnet',
      'Tipo chequeo',
      'Resultado',
      'Médico',
      'Próximo chequeo',
      'Observaciones',
      'Activo',
    ];
    const dataRows = filtrados.map((r) => [
      r.fecha_evaluacion != null && r.fecha_evaluacion !== '' ? String(r.fecha_evaluacion) : '—',
      `${r.nombre || ''} ${r.apellidos || ''}`.trim() || '—',
      r.carnet_identidad != null ? String(r.carnet_identidad) : '—',
      r.tipo_chequeo != null ? String(r.tipo_chequeo) : '—',
      r.resultado != null ? String(r.resultado) : '—',
      r.medico_nombre != null ? String(r.medico_nombre) : '—',
      r.proximo_chequeo != null && r.proximo_chequeo !== '' ? String(r.proximo_chequeo) : '—',
      r.observaciones != null && r.observaciones !== '' ? String(r.observaciones) : '—',
      r.activo == 1 ? 'Sí' : 'No',
    ]);
    return { headers, dataRows };
  }, [filtrados]);

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <ModuleTitleBar
        title="Evaluaciones médicas"
        actions={
          <>
            <ExportacionAepgGrupo
              tituloSistema={AEPG_TITULO_RRHH}
              subtitulo="Reporte: evaluaciones y chequeos médicos ocupacionales."
              descripcion="Listado filtrado con observaciones; datos de salud — maneje con cuidado."
              nombreBaseArchivo={`AEPG_evaluaciones_medicas_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Eval_medicas"
              headers={evalMedExportAepg.headers}
              dataRows={evalMedExportAepg.dataRows}
              disabled={!registros.length}
            />
          <button type="button" className="btn btn-primary btn-form-nowrap" onClick={() => { limpiarForm(); setShowModal(true); }} disabled={!puedeEscribir}>
            + Chequeo
          </button>
          </>
        }
      />
      <div className="card shadow-sm border-0 p-3">
        <ListSearchToolbar value={busq} onChange={setBusq} placeholder="Empleado, carnet, tipo, resultado, médico, fechas…" />
        <h6 className="mb-2">Historial ({filtrados.length} de {registros.length})</h6>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Fecha</th>
                <th>Empleado</th>
                <th>Carnet</th>
                <th>Tipo</th>
                <th>Resultado</th>
                <th>Médico</th>
                <th>Próximo</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-4">No hay evaluaciones con los criterios indicados.</td>
                </tr>
              ) : (
                filtrados.map((r) => (
                  <tr key={r.id_eval_medica}>
                    <td className="text-nowrap">{fmtFechaTabla(r.fecha_evaluacion)}</td>
                    <td>
                      {r.nombre} {r.apellidos}
                    </td>
                    <td>{r.carnet_identidad}</td>
                    <td>{r.tipo_chequeo}</td>
                    <td>{r.resultado}</td>
                    <td>{r.medico_nombre}</td>
                    <td className="text-nowrap">{r.proximo_chequeo ? fmtFechaTabla(r.proximo_chequeo) : '—'}</td>
                    <td>{r.activo == 1 ? 'Sí' : 'No'}</td>
                    <td>
                      <EditTableActionButton onClick={() => editarRegistro(r)} className="me-1" />
                      <DeleteTableActionButton onClick={() => eliminarRegistro(r)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <FormModal
        show={showModal}
        onHide={() => { setShowModal(false); limpiarForm(); }}
        title={editando ? 'Editar evaluación' : 'Registrar chequeo médico'}
        onPrimary={guardar}
        primaryLabel={editando ? 'Guardar cambios' : 'Registrar'}
        primaryDisabled={!puedeEscribir}
      >
        <div className="row g-2">
          <div className="col-12 col-md-6">
            <label className="form-label">Empleado</label>
            <AppSelect className="form-select" value={carnet} onChange={(e) => setCarnet(e.target.value)} required disabled={editando}>
              <option value="" disabled hidden>— Seleccione —</option>
              {empleados.map((emp) => (
                <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                  {emp.carnet_identidad} — {emp.nombre} {emp.apellidos}
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Fecha del chequeo</label>
            <input type="date" className="form-control" value={fechaEvaluacion} onChange={(e) => setFechaEvaluacion(e.target.value)} required disabled={editando} />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Tipo de chequeo</label>
            <AppSelect className="form-select" value={tipoChequeo} onChange={(e) => setTipoChequeo(e.target.value)}>
              {TIPO_OPTS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </AppSelect>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Próximo control</label>
            <input type="date" className="form-control" value={proximoChequeo} onChange={(e) => setProximoChequeo(e.target.value)} />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Resultado</label>
            <AppSelect className="form-select" value={resultado} onChange={(e) => setResultado(e.target.value)}>
              {RES_OPTS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </AppSelect>
          </div>
          {resultado === 'Otro' && (
            <div className="col-12 col-md-8">
              <label className="form-label">Especificar resultado</label>
              <input className="form-control" value={resultadoOtro} onChange={(e) => setResultadoOtro(e.target.value)} required />
            </div>
          )}
          <div className="col-12 col-md-5">
            <label className="form-label">Médico / responsable *</label>
            <input className="form-control" value={medicoNombre} onChange={(e) => setMedicoNombre(e.target.value)} required />
          </div>
          <div className="col-12 col-md-3 d-flex align-items-end">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="actE" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              <label className="form-check-label" htmlFor="actE">Activo</label>
            </div>
          </div>
          <div className="col-12">
            <label className="form-label">Observaciones</label>
            <textarea className="form-control" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default EvaluacionesMedicas;
