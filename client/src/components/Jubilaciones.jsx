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
import { TIPOS_SALIDA_JUBIL } from '../constants/hrCatalogos';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

const TIPO_OPTS = TIPOS_SALIDA_JUBIL.filter(Boolean);

const Jubilaciones = () => {
  const puedeEscribir = usePuedeEscribir();
  const [registros, setRegistros] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [carnet, setCarnet] = useState('');
  const [tipoSalida, setTipoSalida] = useState(TIPO_OPTS[0] || 'Retiro voluntario');
  const [tipoOtro, setTipoOtro] = useState('');
  const [fechaEfectiva, setFechaEfectiva] = useState(() => new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [activo, setActivo] = useState(true);
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [busq, setBusq] = useState('');

  const getRegistros = () => {
    Axios.get('/jubilaciones-empleado')
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

  const tipoTexto = () => (tipoSalida === 'Otro' ? tipoOtro.trim() : tipoSalida);

  const limpiarForm = () => {
    setCarnet('');
    setTipoSalida(TIPO_OPTS[0] || 'Retiro voluntario');
    setTipoOtro('');
    setFechaEfectiva(new Date().toISOString().slice(0, 10));
    setMotivo('');
    setObservaciones('');
    setActivo(true);
    setEditando(false);
    setIdOriginal('');
  };

  const guardar = () => {
    const ts = tipoTexto();
    if (!carnet || !ts || !fechaEfectiva || !motivo.trim()) {
      Swal.fire('Atención', 'Complete empleado, tipo de salida, fecha efectiva y motivo.', 'warning');
      return;
    }
    const data = {
      carnet_identidad: String(carnet).trim(),
      tipo_salida: ts,
      fecha_efectiva: fechaEfectiva,
      motivo: motivo.trim(),
      observaciones: observaciones.trim() || null,
      activo: activo ? 1 : 0,
    };
    if (editando) {
      Axios.put(`/update-jubilacion-empleado/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Listo', 'Registro actualizado', 'success');
          getRegistros();
          limpiarForm();
          setShowModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('/create-jubilacion-empleado', data)
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
    setIdOriginal(r.id_jubilacion);
    setCarnet(String(r.carnet_identidad));
    const t = (r.tipo_salida || '').trim();
    if (TIPO_OPTS.filter((x) => x !== 'Otro').includes(t)) {
      setTipoSalida(t);
      setTipoOtro('');
    } else {
      setTipoSalida('Otro');
      setTipoOtro(t);
    }
    setFechaEfectiva(r.fecha_efectiva || '');
    setMotivo(r.motivo || '');
    setObservaciones(r.observaciones || '');
    setActivo(r.activo == 1);
    setShowModal(true);
  };

  const eliminarRegistro = (r) => {
    Swal.fire({
      title: '¿Eliminar registro?',
      text: 'Se borrará de forma permanente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((resConfirm) => {
      if (resConfirm.isConfirmed) {
        Axios.delete(`/delete-jubilacion-empleado/${r.id_jubilacion}`)
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
      const emp = empleados.find((e) => String(e.carnet_identidad) === String(r.carnet_identidad));
      const nm = emp ? `${emp.nombre} ${emp.apellidos}`.trim() : '';
      const s = `${r.carnet_identidad} ${r.tipo_salida} ${r.motivo} ${r.observaciones} ${r.fecha_efectiva} ${r.activo} ${nm}`.toLowerCase();
      return s.includes(t);
    });
  }, [registros, busq, empleados]);

  const jubilacionesExportAepg = useMemo(() => {
    const headers = ['Carnet', 'Empleado', 'Tipo salida', 'Fecha efectiva', 'Motivo', 'Observaciones', 'Activo'];
    const dataRows = filtrados.map((r) => {
      const emp = empleados.find((e) => String(e.carnet_identidad) === String(r.carnet_identidad));
      const nm = emp ? `${emp.nombre} ${emp.apellidos}`.trim() : '';
      return [
        r.carnet_identidad,
        nm || '—',
        r.tipo_salida != null ? String(r.tipo_salida) : '—',
        r.fecha_efectiva != null && r.fecha_efectiva !== '' ? String(r.fecha_efectiva) : '—',
        r.motivo != null ? String(r.motivo) : '—',
        r.observaciones != null && r.observaciones !== '' ? String(r.observaciones) : '—',
        r.activo == 1 ? 'Sí' : 'No',
      ];
    });
    return { headers, dataRows };
  }, [filtrados, empleados]);

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <ModuleTitleBar
        title="Jubilaciones y retiros"
        actions={
          <>
            <ExportacionAepgGrupo
              tituloSistema={AEPG_TITULO_RRHH}
              subtitulo="Reporte: jubilaciones, retiros y bajas."
              descripcion="Listado filtrado con motivo y observaciones (más detalle que la grilla resumida)."
              nombreBaseArchivo={`AEPG_jubilaciones_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Jubilaciones"
              headers={jubilacionesExportAepg.headers}
              dataRows={jubilacionesExportAepg.dataRows}
              disabled={!registros.length}
            />
          <button type="button" className="btn btn-primary btn-form-nowrap" onClick={() => { limpiarForm(); setShowModal(true); }} disabled={!puedeEscribir}>
            + Registro
          </button>
          </>
        }
      />
      <div className="card shadow-sm border-0 p-3">
        <ListSearchToolbar value={busq} onChange={setBusq} placeholder="Carnet, tipo, motivo, fechas, observaciones…" />
        <h6 className="mb-2">Registros ({filtrados.length} de {registros.length})</h6>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Empleado</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">No hay registros.</td>
                </tr>
              ) : (
                filtrados.map((r) => {
                  const emp = empleados.find((e) => String(e.carnet_identidad) === String(r.carnet_identidad));
                  const nm = emp ? `${emp.nombre} ${emp.apellidos}`.trim() : '';
                  return (
                  <tr key={r.id_jubilacion}>
                    <td>
                      <div>{nm || '—'}</div>
                      <small className="text-muted">{r.carnet_identidad}</small>
                    </td>
                    <td>{r.tipo_salida}</td>
                    <td className="text-nowrap">{fmtFechaTabla(r.fecha_efectiva)}</td>
                    <td>{r.activo == 1 ? 'Sí' : 'No'}</td>
                    <td>
                      <EditTableActionButton onClick={() => editarRegistro(r)} className="me-1" />
                      <DeleteTableActionButton onClick={() => eliminarRegistro(r)} />
                    </td>
                  </tr>
                );})
              )}
            </tbody>
          </table>
        </div>
      </div>
      <FormModal
        show={showModal}
        onHide={() => { setShowModal(false); limpiarForm(); }}
        title={editando ? 'Editar jubilación / retiro' : 'Registrar jubilación o retiro'}
        onPrimary={guardar}
        primaryLabel="Guardar"
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
          <div className="col-12 col-md-6">
            <label className="form-label">Tipo de salida</label>
            <AppSelect className="form-select" value={tipoSalida} onChange={(e) => setTipoSalida(e.target.value)}>
              {TIPO_OPTS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </AppSelect>
          </div>
          {tipoSalida === 'Otro' && (
            <div className="col-12">
              <label className="form-label">Especificar</label>
              <input className="form-control" value={tipoOtro} onChange={(e) => setTipoOtro(e.target.value)} />
            </div>
          )}
          <div className="col-12 col-md-6">
            <label className="form-label">Fecha efectiva</label>
            <input type="date" className="form-control" value={fechaEfectiva} onChange={(e) => setFechaEfectiva(e.target.value)} required />
          </div>
          <div className="col-12 col-md-6 d-flex align-items-end">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="actJ" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              <label className="form-check-label" htmlFor="actJ">Activo</label>
            </div>
          </div>
          <div className="col-12">
            <label className="form-label">Motivo / resumen *</label>
            <textarea className="form-control" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
          </div>
          <div className="col-12">
            <label className="form-label">Observaciones</label>
            <input className="form-control" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default Jubilaciones;
