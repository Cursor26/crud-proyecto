import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { FormModal } from './FormModal';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

const TurnosTrabajo = () => {
  const puedeEscribir = usePuedeEscribir();
  const [registros, setRegistros] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [carnet, setCarnet] = useState('');
  const [nombreTurno, setNombreTurno] = useState('');
  const [horaEntrada, setHoraEntrada] = useState('');
  const [horaSalida, setHoraSalida] = useState('');
  const [diasAplicacion, setDiasAplicacion] = useState('Lunes a viernes');
  const [horasDiarias, setHorasDiarias] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [activo, setActivo] = useState(true);
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');
  const [showTurnoModal, setShowTurnoModal] = useState(false);

  const getRegistros = () => {
    Axios.get('/turnos-trabajo')
      .then((res) => setRegistros(res.data))
      .catch((err) => {
        console.error('Error al cargar turnos:', err);
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      });
  };

  const getEmpleados = () => {
    Axios.get('/empleados?solo_activos=1')
      .then((res) => {
        const ordenados = [...res.data].sort((a, b) =>
          `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es')
        );
        setEmpleados(ordenados);
      })
      .catch((err) => console.error('Error al cargar empleados:', err));
  };

  useEffect(() => {
    getRegistros();
    getEmpleados();
  }, []);

  const limpiarForm = () => {
    setCarnet('');
    setNombreTurno('');
    setHoraEntrada('');
    setHoraSalida('');
    setDiasAplicacion('Lunes a viernes');
    setHorasDiarias('');
    setObservaciones('');
    setActivo(true);
    setEditando(false);
    setIdOriginal('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!carnet || !nombreTurno.trim() || !horaEntrada || !horaSalida) {
      Swal.fire('Atención', 'Seleccione empleado, nombre del turno y ambas horas.', 'warning');
      return;
    }

    const data = {
      carnet_identidad: String(carnet).trim(),
      nombre_turno: nombreTurno.trim(),
      hora_entrada: horaEntrada.length === 5 ? `${horaEntrada}:00` : horaEntrada,
      hora_salida: horaSalida.length === 5 ? `${horaSalida}:00` : horaSalida,
      dias_aplicacion: diasAplicacion.trim() || 'Lunes a viernes',
      horas_diarias: horasDiarias === '' ? null : horasDiarias,
      observaciones: observaciones.trim() || null,
      activo: activo ? 1 : 0,
    };

    if (editando) {
      Axios.put(`/update-turno/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Actualizado', 'Turno actualizado correctamente', 'success');
          getRegistros();
          limpiarForm();
          setShowTurnoModal(false);
        })
        .catch((err) =>
          Swal.fire('Error', err.response?.data?.message || err.message, 'error')
        );
    } else {
      Axios.post('/create-turno', data)
        .then(() => {
          Swal.fire('Creado', 'Turno asignado correctamente', 'success');
          getRegistros();
          limpiarForm();
          setShowTurnoModal(false);
        })
        .catch((err) =>
          Swal.fire('Error', err.response?.data?.message || err.message, 'error')
        );
    }
  };

  const editarRegistro = (reg) => {
    setEditando(true);
    setIdOriginal(reg.id_turno);
    setCarnet(String(reg.carnet_identidad));
    setNombreTurno(reg.nombre_turno || '');
    setHoraEntrada(reg.hora_entrada || '');
    setHoraSalida(reg.hora_salida || '');
    setDiasAplicacion(reg.dias_aplicacion || 'Lunes a viernes');
    setHorasDiarias(reg.horas_diarias != null ? String(reg.horas_diarias) : '');
    setObservaciones(reg.observaciones || '');
    setActivo(reg.activo == 1);
    setShowTurnoModal(true);
  };

  const eliminarRegistro = (id) => {
    Swal.fire({
      title: '¿Eliminar turno?',
      text: 'Se quitará la asignación de este turno.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`/delete-turno/${id}`)
          .then(() => {
            Swal.fire('Eliminado', 'Turno eliminado', 'success');
            getRegistros();
          })
          .catch((err) =>
            Swal.fire('Error', err.response?.data?.message || err.message, 'error')
          );
      }
    });
  };

  const turnosExportAepg = useMemo(() => {
    const headers = [
      'Empleado',
      'Carnet',
      'Turno',
      'Hora entrada',
      'Hora salida',
      'Días aplicación',
      'Horas diarias',
      'Observaciones',
      'Activo',
    ];
    const dataRows = registros.map((r) => [
      `${r.nombre || ''} ${r.apellidos || ''}`.trim() || '—',
      r.carnet_identidad != null ? String(r.carnet_identidad) : '—',
      r.nombre_turno != null ? String(r.nombre_turno) : '—',
      r.hora_entrada != null ? String(r.hora_entrada) : '—',
      r.hora_salida != null ? String(r.hora_salida) : '—',
      r.dias_aplicacion != null ? String(r.dias_aplicacion) : '—',
      r.horas_diarias != null && r.horas_diarias !== '' ? String(r.horas_diarias) : '—',
      r.observaciones != null && r.observaciones !== '' ? String(r.observaciones) : '—',
      r.activo == 1 ? 'Sí' : 'No',
    ]);
    return { headers, dataRows };
  }, [registros]);

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <ModuleTitleBar
        title="Turnos de trabajo"
        actions={
          <>
            <ExportacionAepgGrupo
              tituloSistema={AEPG_TITULO_RRHH}
              subtitulo="Reporte: turnos de trabajo asignados."
              descripcion="Todas las asignaciones de turno con horas, días, observaciones y estado (sin acciones en pantalla)."
              nombreBaseArchivo={`AEPG_turnos_trabajo_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Turnos"
              headers={turnosExportAepg.headers}
              dataRows={turnosExportAepg.dataRows}
              disabled={!registros.length}
            />
          <button type="button" className="btn btn-primary btn-form-nowrap" disabled={!puedeEscribir} onClick={() => { limpiarForm(); setShowTurnoModal(true); }}>
            <i className="bi bi-calendar2-week me-2" aria-hidden="true" />
            Asignar turno
          </button>
          </>
        }
      />

      <FormModal
        show={showTurnoModal}
        onHide={() => setShowTurnoModal(false)}
        title={editando ? 'Editar turno' : '+ Turno'}
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
          <div className="minimal-field"><label className="minimal-label">Nombre del turno:</label><input type="text" className="minimal-input" placeholder="------------------------" value={nombreTurno} onChange={(e) => setNombreTurno(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Hora entrada:</label><input type="time" className="minimal-input" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Hora salida:</label><input type="time" className="minimal-input" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Días de aplicación:</label><input type="text" className="minimal-input" placeholder="------------------------" value={diasAplicacion} onChange={(e) => setDiasAplicacion(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Horas / día:</label><input type="number" step="0.25" min="0" className="minimal-input" placeholder="------------------------" value={horasDiarias} onChange={(e) => setHorasDiarias(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Observaciones:</label><input type="text" className="minimal-input" placeholder="------------------------" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} /></div>
          <label className="minimal-radio"><input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Activo</label>
        </div>
      </FormModal>


      <div className="card shadow-sm border-0 p-3">
        <h6 className="mb-3">Turnos asignados</h6>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Empleado</th>
                <th>Carnet</th>
                <th>Turno</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Días</th>
                <th>H h/día</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-4">
                    No hay turnos registrados.
                  </td>
                </tr>
              ) : (
                registros.map((r) => (
                  <tr key={r.id_turno}>
                    <td>
                      {r.nombre} {r.apellidos}
                    </td>
                    <td>{r.carnet_identidad}</td>
                    <td>{r.nombre_turno}</td>
                    <td>{r.hora_entrada}</td>
                    <td>{r.hora_salida}</td>
                    <td>{r.dias_aplicacion}</td>
                    <td>{r.horas_diarias != null ? r.horas_diarias : '—'}</td>
                    <td>{r.activo == 1 ? 'Sí' : 'No'}</td>
                    <td className="text-center">
                      <EditTableActionButton onClick={() => editarRegistro(r)} className="me-1" />
                      <DeleteTableActionButton onClick={() => eliminarRegistro(r.id_turno)} />
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

export default TurnosTrabajo;
