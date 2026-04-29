import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { FormModal } from './FormModal';
import ModuleTitleBar from './ModuleTitleBar';
import { fmtFechaTabla } from '../utils/formatDates';
import AppSelect from './AppSelect';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

const Sanciones = () => {
  const puedeEscribir = usePuedeEscribir();
  const [registros, setRegistros] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [carnet, setCarnet] = useState('');
  const [tipoSancion, setTipoSancion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fechaAplicacion, setFechaAplicacion] = useState(() => new Date().toISOString().slice(0, 10));
  const [diasSuspension, setDiasSuspension] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [activo, setActivo] = useState(true);
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');
  const [showSancionModal, setShowSancionModal] = useState(false);

  const getRegistros = () => {
    Axios.get('/sanciones-empleado')
      .then((res) => setRegistros(res.data))
      .catch((err) => {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      });
  };

  const getEmpleados = () => {
    Axios.get('/empleados')
      .then((res) => {
        const ordenados = [...res.data].sort((a, b) =>
          `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es')
        );
        setEmpleados(ordenados);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    getRegistros();
    getEmpleados();
  }, []);

  const limpiarForm = () => {
    setCarnet('');
    setTipoSancion('');
    setMotivo('');
    setFechaAplicacion(new Date().toISOString().slice(0, 10));
    setDiasSuspension('');
    setObservaciones('');
    setActivo(true);
    setEditando(false);
    setIdOriginal('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!carnet || !tipoSancion.trim() || !motivo.trim() || !fechaAplicacion) {
      Swal.fire('Atención', 'Complete empleado, tipo, motivo y fecha.', 'warning');
      return;
    }
    const data = {
      carnet_identidad: String(carnet).trim(),
      tipo_sancion: tipoSancion.trim(),
      motivo: motivo.trim(),
      fecha_aplicacion: fechaAplicacion,
      dias_suspension: diasSuspension === '' ? null : diasSuspension,
      observaciones: observaciones.trim() || null,
      activo: activo ? 1 : 0,
    };
    if (editando) {
      Axios.put(`/update-sancion-empleado/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Listo', 'Sanción actualizada', 'success');
          getRegistros();
          limpiarForm();
          setShowSancionModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('/create-sancion-empleado', data)
        .then(() => {
          Swal.fire('Listo', 'Sanción registrada', 'success');
          getRegistros();
          limpiarForm();
          setShowSancionModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    }
  };

  const editarRegistro = (r) => {
    setEditando(true);
    setIdOriginal(r.id_sancion);
    setCarnet(String(r.carnet_identidad));
    setTipoSancion(r.tipo_sancion || '');
    setMotivo(r.motivo || '');
    setFechaAplicacion(r.fecha_aplicacion || '');
    setDiasSuspension(r.dias_suspension != null ? String(r.dias_suspension) : '');
    setObservaciones(r.observaciones || '');
    setActivo(r.activo == 1);
    setShowSancionModal(true);
  };

  const eliminarRegistro = (r) => {
    Swal.fire({
      title: '¿Eliminar sanción?',
      text: 'Se borrará el registro de forma permanente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((res) => {
      if (res.isConfirmed) {
        Axios.delete(`/delete-sancion-empleado/${r.id_sancion}`)
          .then(() => {
            Swal.fire('Eliminado', '', 'success');
            getRegistros();
          })
          .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
      }
    });
  };

  const sancionesExportAepg = useMemo(() => {
    const headers = [
      'ID',
      'Fecha aplicación',
      'Empleado',
      'Carnet',
      'Tipo',
      'Motivo',
      'Días suspensión',
      'Observaciones',
      'Activo',
    ];
    const dataRows = registros.map((r) => [
      r.id_sancion,
      r.fecha_aplicacion != null && r.fecha_aplicacion !== '' ? String(r.fecha_aplicacion) : '—',
      `${r.nombre || ''} ${r.apellidos || ''}`.trim() || '—',
      r.carnet_identidad != null ? String(r.carnet_identidad) : '—',
      r.tipo_sancion != null ? String(r.tipo_sancion) : '—',
      r.motivo != null ? String(r.motivo) : '—',
      r.dias_suspension != null && r.dias_suspension !== '' ? String(r.dias_suspension) : '—',
      r.observaciones != null && r.observaciones !== '' ? String(r.observaciones) : '—',
      r.activo == 1 ? 'Sí' : 'No',
    ]);
    return { headers, dataRows };
  }, [registros]);

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <ModuleTitleBar
        title="Sanciones"
        actions={
          <>
            <ExportacionAepgGrupo
              tituloSistema={AEPG_TITULO_RRHH}
              subtitulo="Reporte: sanciones disciplinarias."
              descripcion="Todos los registros de sanciones con motivo y observaciones (información sensible — maneje con cuidado)."
              nombreBaseArchivo={`AEPG_sanciones_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Sanciones"
              headers={sancionesExportAepg.headers}
              dataRows={sancionesExportAepg.dataRows}
              disabled={!registros.length}
            />
          <button type="button" className="btn btn-primary btn-form-nowrap" disabled={!puedeEscribir} onClick={() => { limpiarForm(); setShowSancionModal(true); }}>
            <i className="bi bi-exclamation-octagon me-2" aria-hidden="true" />
            Registrar sanción
          </button>
          </>
        }
      />

      <FormModal
        show={showSancionModal}
        onHide={() => setShowSancionModal(false)}
        title={editando ? 'Editar sanción' : '+ Sanción'}
        subtitle=""
        onPrimary={() => handleSubmit({ preventDefault: () => {} })}
        primaryLabel={editando ? 'Actualizar' : 'Guardar'}
        primaryDisabled={!puedeEscribir}
      >
        <div className="minimal-form-stack">
          <div className="minimal-field">
            <label className="minimal-label">Empleado:</label>
            <AppSelect className={`minimal-select ${carnet ? 'is-selected' : ''}`} value={carnet} onChange={(e) => setCarnet(e.target.value)} disabled={editando}>
              <option value="" disabled hidden>--- Seleccione ---</option>
              {empleados.map((emp) => (
                <option key={emp.carnet_identidad} value={emp.carnet_identidad}>{emp.carnet_identidad} — {emp.nombre} {emp.apellidos}</option>
              ))}
            </AppSelect>
          </div>
          <div className="minimal-field"><label className="minimal-label">Tipo de sanción:</label><input type="text" className="minimal-input" placeholder="------------------------" value={tipoSancion} onChange={(e) => setTipoSancion(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Fecha aplicación:</label><input type="date" className="minimal-input" value={fechaAplicacion} onChange={(e) => setFechaAplicacion(e.target.value)} disabled={editando} /></div>
          <div className="minimal-field"><label className="minimal-label">Días suspensión:</label><input type="number" min={0} className="minimal-input" placeholder="------------------------" value={diasSuspension} onChange={(e) => setDiasSuspension(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Motivo:</label><input type="text" className="minimal-input" placeholder="------------------------" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Observaciones:</label><input type="text" className="minimal-input" placeholder="------------------------" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} /></div>
          <label className="minimal-radio"><input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Activo</label>
        </div>
      </FormModal>

      <div className="card shadow-sm border-0 p-3">
        <h6 className="mb-3">Sanciones registradas</h6>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Fecha</th>
                <th>Empleado</th>
                <th>Carnet</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th>Días susp.</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
                    No hay sanciones registradas.
                  </td>
                </tr>
              ) : (
                registros.map((r) => (
                  <tr key={r.id_sancion}>
                    <td className="text-nowrap">{fmtFechaTabla(r.fecha_aplicacion)}</td>
                    <td>
                      {r.nombre} {r.apellidos}
                    </td>
                    <td>{r.carnet_identidad}</td>
                    <td>{r.tipo_sancion}</td>
                    <td style={{ maxWidth: 240, whiteSpace: 'pre-wrap' }}>{r.motivo}</td>
                    <td>{r.dias_suspension != null ? r.dias_suspension : '—'}</td>
                    <td>{r.activo == 1 ? 'Sí' : 'No'}</td>
                    <td className="text-center">
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
    </div>
  );
};

export default Sanciones;
