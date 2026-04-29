import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { Modal } from 'react-bootstrap';
import '../App.css';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';
import ListSearchToolbar from './ListSearchToolbar';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';
import { parseNonNegativeNumber } from '../utils/validation';

const CODIGOS_ASISTENCIA = ['', 'PRESENTE', 'AUSENCIA', 'TARDANZA', 'VACACIONES', 'LICENCIA', 'FERIADO', 'OTRO'];

function filtrarRegistros(registros, q, nombrePorCarnet) {
  if (!q || !String(q).trim()) return registros;
  const t = String(q).trim().toLowerCase();
  return registros.filter((reg) => {
    const nom = (nombrePorCarnet(reg.id_tabla) || '').toLowerCase();
    if (String(reg.id_tabla).toLowerCase().includes(t)) return true;
    if (nom.includes(t)) return true;
    if (String(reg.codigo_asistencia || '').toLowerCase().includes(t)) return true;
    if (String(reg.desc_causas || '').toLowerCase().includes(t)) return true;
    if (String(reg.horas_trabajadas || '').toLowerCase().includes(t)) return true;
    return false;
  });
}

const Asistencias = () => {
  const puedeEscribir = usePuedeEscribir();
  const [registros, setRegistros] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [idTabla, setIdTabla] = useState('');
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [horas, setHoras] = useState('');
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');
  const { empleados, nombrePorCarnet } = useEmpleadosOptions();

  const getRegistros = () => {
    Axios.get('/asistencias')
      .then((res) => setRegistros(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error('Error al cargar:', err));
  };

  useEffect(() => {
    getRegistros();
  }, []);

  const filtrados = useMemo(
    () => filtrarRegistros(registros, busqueda, nombrePorCarnet),
    [registros, busqueda, nombrePorCarnet],
  );

  const asistenciasExportAepg = useMemo(() => {
    const headers = ['Carnet', 'Empleado', 'Código asistencia', 'Descripción causas', 'Horas trabajadas'];
    const dataRows = filtrados.map((reg) => [
      reg.id_tabla,
      nombrePorCarnet(reg.id_tabla) || '—',
      reg.codigo_asistencia || '—',
      reg.desc_causas != null ? String(reg.desc_causas) : '—',
      reg.horas_trabajadas != null && reg.horas_trabajadas !== '' ? String(reg.horas_trabajadas) : '—',
    ]);
    return { headers, dataRows };
  }, [filtrados, nombrePorCarnet]);

  const limpiarForm = () => {
    setIdTabla('');
    setCodigo('');
    setDescripcion('');
    setHoras('');
    setEditando(false);
    setIdOriginal('');
  };

  const abrirNuevo = () => {
    limpiarForm();
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!idTabla) {
      Swal.fire('Error', 'Seleccioná un empleado', 'warning');
      return;
    }
    if (horas !== '' && horas != null) {
      const h = parseNonNegativeNumber(horas, { allowEmpty: false });
      if (h == null || h < 0) {
        Swal.fire('Error', 'Las horas no pueden ser negativas', 'warning');
        return;
      }
    }
    const data = {
      id_tabla: idTabla,
      codigo_asistencia: codigo,
      desc_causas: descripcion,
      horas_trabajadas: horas,
    };
    if (editando) {
      Axios.put(`/update-asistencia/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Actualizado', 'Registro actualizado', 'success');
          getRegistros();
          limpiarForm();
          setShowModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('/create-asistencia', data)
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
    setIdOriginal(reg.id_tabla);
    setIdTabla(String(reg.id_tabla ?? ''));
    setCodigo(reg.codigo_asistencia || '');
    setDescripcion(reg.desc_causas || '');
    setHoras(reg.horas_trabajadas != null && reg.horas_trabajadas !== '' ? String(reg.horas_trabajadas) : '');
    setShowModal(true);
  };

  const eliminarRegistro = (id) => {
    Swal.fire({
      title: '¿Eliminar?',
      text: `Se eliminará el registro con ID ${id}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`/delete-asistencia/${id}`)
          .then(() => {
            Swal.fire('Eliminado', 'Registro eliminado', 'success');
            getRegistros();
          })
          .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
      }
    });
  };

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <ModuleTitleBar
        title="Gestión de Asistencias"
        actions={
          <>
            <ExportacionAepgGrupo
              tituloSistema={AEPG_TITULO_RRHH}
              subtitulo="Reporte: asistencias (código, causas, horas). Módulo Asistencias AEPG."
              descripcion="Listado filtrado actual: empleado, carnet, código, descripción y horas (sin columnas de acciones)."
              nombreBaseArchivo={`AEPG_asistencias_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Asistencias"
              headers={asistenciasExportAepg.headers}
              dataRows={asistenciasExportAepg.dataRows}
              disabled={!registros.length}
            />
            <button type="button" className="btn btn-primary btn-sm" onClick={abrirNuevo} disabled={!puedeEscribir}>
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              Nuevo registro
            </button>
          </>
        }
      />
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <ListSearchToolbar value={busqueda} onChange={setBusqueda} placeholder="Empleado, carnet, código, descripción, horas…" />
          <h6 className="mb-2">Registros ({filtrados.length} de {registros.length})</h6>
          <div className="table-responsive">
            <table className="table table-data-compact table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '18%' }}>Empleado</th>
                  <th style={{ width: '15%' }}>Código</th>
                  <th>Descripción causas</th>
                  <th style={{ width: '12%' }}>Horas</th>
                  <th style={{ width: '16%' }} className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-3">
                      No hay registros para mostrar
                    </td>
                  </tr>
                )}
                {filtrados.map((reg) => (
                  <tr key={reg.id_tabla}>
                    <td>
                      <div>{nombrePorCarnet(reg.id_tabla) || '—'}</div>
                      <small className="text-muted">{reg.id_tabla}</small>
                    </td>
                    <td>{reg.codigo_asistencia}</td>
                    <td style={{ maxWidth: 320 }}>
                      <span className="text-truncate d-inline-block" style={{ maxWidth: '100%' }}>
                        {reg.desc_causas}
                      </span>
                    </td>
                    <td>{reg.horas_trabajadas}</td>
                    <td className="text-center">
                      <EditTableActionButton onClick={() => editarRegistro(reg)} className="me-1" />
                      <DeleteTableActionButton onClick={() => eliminarRegistro(reg.id_tabla)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal show={showModal} onHide={() => { setShowModal(false); limpiarForm(); }} size="lg" scrollable centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>{editando ? 'Editar asistencia' : 'Nueva asistencia'}</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleSubmit}>
          <Modal.Body className="modal-form-body-scroll">
            <div className="mb-3">
              <label className="form-label">Empleado</label>
              <AppSelect
                className="form-select"
                value={idTabla}
                onChange={(e) => setIdTabla(e.target.value)}
                disabled={editando}
                required
              >
                <option value="" disabled>
                  — Seleccione empleado —
                </option>
                {empleados.map((emp) => (
                  <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                    {emp.carnet_identidad} — {emp.nombre} {emp.apellidos}
                  </option>
                ))}
              </AppSelect>
            </div>
            <div className="mb-3">
              <label className="form-label">Código asistencia</label>
              <AppSelect className="form-select" value={codigo} onChange={(e) => setCodigo(e.target.value)}>
                {CODIGOS_ASISTENCIA.map((c, i) => (
                  <option key={`${i}-${c || 'x'}`} value={c}>
                    {c || '— Seleccione —'}
                  </option>
                ))}
              </AppSelect>
            </div>
            <div className="mb-3">
              <label className="form-label">Horas trabajadas</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="form-control"
                value={horas}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') return setHoras('');
                  const n = parseFloat(v);
                  if (!Number.isNaN(n) && n < 0) setHoras('0');
                  else setHoras(v);
                }}
                placeholder="0"
              />
            </div>
            <div>
              <label className="form-label">Descripción de causas</label>
              <textarea className="form-control" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowModal(false);
                limpiarForm();
              }}
            >
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

export default Asistencias;
