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

const Reconocimientos = () => {
  const puedeEscribir = usePuedeEscribir();
  const [registros, setRegistros] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [carnet, setCarnet] = useState('');
  const [tipo, setTipo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaOtorgamiento, setFechaOtorgamiento] = useState(() => new Date().toISOString().slice(0, 10));
  const [valorEstimulo, setValorEstimulo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [activo, setActivo] = useState(true);
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');
  const [showReconocimientoModal, setShowReconocimientoModal] = useState(false);

  const getRegistros = () => {
    Axios.get('/reconocimientos-empleado')
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
    setTipo('');
    setDescripcion('');
    setFechaOtorgamiento(new Date().toISOString().slice(0, 10));
    setValorEstimulo('');
    setObservaciones('');
    setActivo(true);
    setEditando(false);
    setIdOriginal('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!carnet || !tipo.trim() || !descripcion.trim() || !fechaOtorgamiento) {
      Swal.fire('Atención', 'Complete empleado, tipo, descripción y fecha.', 'warning');
      return;
    }
    const data = {
      carnet_identidad: String(carnet).trim(),
      tipo_reconocimiento: tipo.trim(),
      descripcion: descripcion.trim(),
      fecha_otorgamiento: fechaOtorgamiento,
      valor_estimulo: valorEstimulo === '' ? null : valorEstimulo,
      observaciones: observaciones.trim() || null,
      activo: activo ? 1 : 0,
    };
    if (editando) {
      Axios.put(`/update-reconocimiento-empleado/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Listo', 'Reconocimiento actualizado', 'success');
          getRegistros();
          limpiarForm();
          setShowReconocimientoModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('/create-reconocimiento-empleado', data)
        .then(() => {
          Swal.fire('Listo', 'Reconocimiento registrado', 'success');
          getRegistros();
          limpiarForm();
          setShowReconocimientoModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    }
  };

  const editarRegistro = (r) => {
    setEditando(true);
    setIdOriginal(r.id_reconocimiento);
    setCarnet(String(r.carnet_identidad));
    setTipo(r.tipo_reconocimiento || '');
    setDescripcion(r.descripcion || '');
    setFechaOtorgamiento(r.fecha_otorgamiento || '');
    setValorEstimulo(r.valor_estimulo != null ? String(r.valor_estimulo) : '');
    setObservaciones(r.observaciones || '');
    setActivo(r.activo == 1);
    setShowReconocimientoModal(true);
  };

  const eliminarRegistro = (r) => {
    Swal.fire({
      title: '¿Eliminar reconocimiento?',
      text: 'Se borrará el registro de forma permanente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((res) => {
      if (res.isConfirmed) {
        Axios.delete(`/delete-reconocimiento-empleado/${r.id_reconocimiento}`)
          .then(() => {
            Swal.fire('Eliminado', '', 'success');
            getRegistros();
          })
          .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
      }
    });
  };

  const reconocimientosExportAepg = useMemo(() => {
    const headers = [
      'ID',
      'Fecha otorgamiento',
      'Empleado',
      'Carnet',
      'Tipo',
      'Descripción',
      'Valor estímulo',
      'Observaciones',
      'Activo',
    ];
    const dataRows = registros.map((r) => [
      r.id_reconocimiento,
      r.fecha_otorgamiento != null && r.fecha_otorgamiento !== '' ? String(r.fecha_otorgamiento) : '—',
      `${r.nombre || ''} ${r.apellidos || ''}`.trim() || '—',
      r.carnet_identidad != null ? String(r.carnet_identidad) : '—',
      r.tipo_reconocimiento != null ? String(r.tipo_reconocimiento) : '—',
      r.descripcion != null ? String(r.descripcion) : '—',
      r.valor_estimulo != null && r.valor_estimulo !== '' ? String(r.valor_estimulo) : '—',
      r.observaciones != null && r.observaciones !== '' ? String(r.observaciones) : '—',
      r.activo == 1 ? 'Sí' : 'No',
    ]);
    return { headers, dataRows };
  }, [registros]);

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <ModuleTitleBar
        title="Reconocimientos"
        actions={
          <>
            <ExportacionAepgGrupo
              tituloSistema={AEPG_TITULO_RRHH}
              subtitulo="Reporte: reconocimientos y estímulos."
              descripcion="Todos los registros con descripción y observaciones completas."
              nombreBaseArchivo={`AEPG_reconocimientos_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Reconocimientos"
              headers={reconocimientosExportAepg.headers}
              dataRows={reconocimientosExportAepg.dataRows}
              disabled={!registros.length}
            />
          <button type="button" className="btn btn-primary btn-form-nowrap" disabled={!puedeEscribir} onClick={() => { limpiarForm(); setShowReconocimientoModal(true); }}>
            <i className="bi bi-award me-2" aria-hidden="true" />
            Registrar reconocimiento
          </button>
          </>
        }
      />

      <FormModal
        show={showReconocimientoModal}
        onHide={() => setShowReconocimientoModal(false)}
        title={editando ? 'Editar reconocimiento' : '+ Reconocimiento'}
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
          <div className="minimal-field"><label className="minimal-label">Tipo:</label><input type="text" className="minimal-input" placeholder="------------------------" value={tipo} onChange={(e) => setTipo(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Fecha otorgamiento:</label><input type="date" className="minimal-input" value={fechaOtorgamiento} onChange={(e) => setFechaOtorgamiento(e.target.value)} disabled={editando} /></div>
          <div className="minimal-field"><label className="minimal-label">Valor estímulo:</label><input type="number" step="0.01" min={0} className="minimal-input" placeholder="------------------------" value={valorEstimulo} onChange={(e) => setValorEstimulo(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Descripción:</label><input type="text" className="minimal-input" placeholder="------------------------" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Observaciones:</label><input type="text" className="minimal-input" placeholder="------------------------" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} /></div>
          <label className="minimal-radio"><input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Activo</label>
        </div>
      </FormModal>

      <div className="card shadow-sm border-0 p-3">
        <h6 className="mb-3">Reconocimientos registrados</h6>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Fecha</th>
                <th>Empleado</th>
                <th>Carnet</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Valor</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
                    No hay reconocimientos registrados.
                  </td>
                </tr>
              ) : (
                registros.map((r) => (
                  <tr key={r.id_reconocimiento}>
                    <td className="text-nowrap">{fmtFechaTabla(r.fecha_otorgamiento)}</td>
                    <td>
                      {r.nombre} {r.apellidos}
                    </td>
                    <td>{r.carnet_identidad}</td>
                    <td>{r.tipo_reconocimiento}</td>
                    <td style={{ maxWidth: 260, whiteSpace: 'pre-wrap' }}>{r.descripcion}</td>
                    <td>{r.valor_estimulo != null ? r.valor_estimulo : '—'}</td>
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

export default Reconocimientos;
