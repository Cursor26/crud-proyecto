import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';
import { FormModal } from './FormModal';
import ListSearchToolbar from './ListSearchToolbar';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import { parseNonNegativeNumber } from '../utils/validation';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

function strNonNeg(v) {
  if (v === '' || v == null) return '';
  const n = parseNonNegativeNumber(v, { allowEmpty: true });
  return n == null ? '' : String(n);
}

const SegSeguridad = () => {
  const puedeEscribir = usePuedeEscribir();
  const [registros, setRegistros] = useState([]);
  const [idTabla, setIdTabla] = useState('');
  const [cantUno, setCantUno] = useState('');
  const [descUno, setDescUno] = useState('');
  const [cantDos, setCantDos] = useState('');
  const [descDos, setDescDos] = useState('');
  const [cantTres, setCantTres] = useState('');
  const [descTres, setDescTres] = useState('');
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [busq, setBusq] = useState('');
  const { empleados, nombrePorCarnet } = useEmpleadosOptions();

  const getRegistros = () => {
    Axios.get('/segseguridad')
      .then((res) => setRegistros(res.data))
      .catch((err) => console.error('Error al cargar:', err));
  };

  useEffect(() => {
    getRegistros();
  }, []);

  const limpiarForm = () => {
    setIdTabla('');
    setCantUno('');
    setDescUno('');
    setCantDos('');
    setDescDos('');
    setCantTres('');
    setDescTres('');
    setEditando(false);
    setIdOriginal('');
  };

  const guardar = () => {
    if (!idTabla) {
      Swal.fire('Error', 'El empleado es obligatorio', 'warning');
      return;
    }
    const data = {
      id_tabla: idTabla,
      cant_accuno: strNonNeg(cantUno) || (cantUno === '' ? '' : '0'),
      desc_uno: descUno,
      cant_accdos: strNonNeg(cantDos) || (cantDos === '' ? '' : '0'),
      desc_dos: descDos,
      cant_acctres: strNonNeg(cantTres) || (cantTres === '' ? '' : '0'),
      desc_tres: descTres,
    };
    if (editando) {
      Axios.put(`/update-segseguridad/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Actualizado', 'Registro actualizado', 'success');
          getRegistros();
          limpiarForm();
          setShowModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('/create-segseguridad', data)
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
    setCantUno(reg.cant_accuno != null ? String(reg.cant_accuno) : '');
    setDescUno(reg.desc_uno || '');
    setCantDos(reg.cant_accdos != null ? String(reg.cant_accdos) : '');
    setDescDos(reg.desc_dos || '');
    setCantTres(reg.cant_acctres != null ? String(reg.cant_acctres) : '');
    setDescTres(reg.desc_tres || '');
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
        Axios.delete(`/delete-segseguridad/${id}`)
          .then(() => {
            Swal.fire('Eliminado', 'Registro eliminado', 'success');
            getRegistros();
          })
          .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
      }
    });
  };

  const filtrados = useMemo(() => {
    const t = busq.trim().toLowerCase();
    if (!t) return registros;
    return registros.filter((reg) => {
      const s = `${reg.id_tabla} ${reg.cant_accuno} ${reg.desc_uno} ${reg.cant_accdos} ${reg.desc_dos} ${reg.cant_acctres} ${reg.desc_tres} ${
        nombrePorCarnet(reg.id_tabla) || ''
      }`.toLowerCase();
      return s.includes(t);
    });
  }, [registros, busq, nombrePorCarnet]);

  const segSegExportAepg = useMemo(() => {
    const headers = ['Carnet', 'Empleado', 'Cant. 1', 'Desc. 1', 'Cant. 2', 'Desc. 2', 'Cant. 3', 'Desc. 3'];
    const dataRows = filtrados.map((reg) => [
      reg.id_tabla,
      nombrePorCarnet(reg.id_tabla) || '—',
      reg.cant_accuno != null && reg.cant_accuno !== '' ? String(reg.cant_accuno) : '—',
      reg.desc_uno != null && reg.desc_uno !== '' ? String(reg.desc_uno) : '—',
      reg.cant_accdos != null && reg.cant_accdos !== '' ? String(reg.cant_accdos) : '—',
      reg.desc_dos != null && reg.desc_dos !== '' ? String(reg.desc_dos) : '—',
      reg.cant_acctres != null && reg.cant_acctres !== '' ? String(reg.cant_acctres) : '—',
      reg.desc_tres != null && reg.desc_tres !== '' ? String(reg.desc_tres) : '—',
    ]);
    return { headers, dataRows };
  }, [filtrados, nombrePorCarnet]);

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <ModuleTitleBar
        title="Gestión de Seg. Seguridad"
        actions={
          <>
            <ExportacionAepgGrupo
              tituloSistema={AEPG_TITULO_RRHH}
              subtitulo="Reporte: seguimiento de seguridad (tres pares cantidad / descripción)."
              descripcion="Listado filtrado actual; sin columna de acciones."
              nombreBaseArchivo={`AEPG_seguridad_laboral_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Seg_Seguridad"
              headers={segSegExportAepg.headers}
              dataRows={segSegExportAepg.dataRows}
              disabled={!registros.length}
            />
          <button type="button" className="btn btn-primary btn-sm btn-form-nowrap" onClick={() => { limpiarForm(); setShowModal(true); }} disabled={!puedeEscribir}>
            + Registro
          </button>
          </>
        }
      />
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <ListSearchToolbar value={busq} onChange={setBusq} placeholder="Empleado, cantidades, descripciones, carnet…" />
          <h6 className="mb-2">Registros ({filtrados.length} de {registros.length})</h6>
          <div className="table-responsive">
            <table className="table table-data-compact table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Empleado</th>
                  <th>Cant1</th>
                  <th>Desc1</th>
                  <th>Cant2</th>
                  <th>Desc2</th>
                  <th>Cant3</th>
                  <th>Desc3</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-3">No hay registros.</td>
                  </tr>
                ) : (
                  filtrados.map((reg) => (
                    <tr key={reg.id_tabla}>
                      <td>
                        <div>{nombrePorCarnet(reg.id_tabla) || '—'}</div>
                        <small className="text-muted">{reg.id_tabla}</small>
                      </td>
                      <td>{reg.cant_accuno}</td>
                      <td>{reg.desc_uno}</td>
                      <td>{reg.cant_accdos}</td>
                      <td>{reg.desc_dos}</td>
                      <td>{reg.cant_acctres}</td>
                      <td>{reg.desc_tres}</td>
                      <td className="text-center">
                        <EditTableActionButton onClick={() => editarRegistro(reg)} className="me-1" />
                        <DeleteTableActionButton onClick={() => eliminarRegistro(reg.id_tabla)} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <FormModal
        show={showModal}
        onHide={() => { setShowModal(false); limpiarForm(); }}
        title={editando ? 'Editar registro' : 'Nuevo registro (accidentes)'}
        onPrimary={guardar}
        primaryLabel={editando ? 'Actualizar' : 'Guardar'}
        primaryDisabled={!puedeEscribir}
        size="lg"
      >
        <div className="row g-2 mb-2">
          <div className="col-12">
            <label className="form-label">Empleado</label>
            <AppSelect className="form-select" value={idTabla} onChange={(e) => setIdTabla(e.target.value)} disabled={editando} required>
              <option value="" disabled hidden>— Seleccione empleado —</option>
              {empleados.map((emp) => (
                <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                  {emp.carnet_identidad} — {emp.nombre} {emp.apellidos}
                </option>
              ))}
            </AppSelect>
          </div>
        </div>
        {[1, 2, 3].map((n) => {
          const cant = n === 1 ? cantUno : n === 2 ? cantDos : cantTres;
          const setCant = n === 1 ? setCantUno : n === 2 ? setCantDos : setCantTres;
          const desc = n === 1 ? descUno : n === 2 ? descDos : descTres;
          const setDesc = n === 1 ? setDescUno : n === 2 ? setDescDos : setDescTres;
          return (
            <div className="row g-2 mb-2" key={n}>
              <div className="col-12 col-sm-2">
                <label className="form-label">Cant. {n}</label>
                <input
                  type="number"
                  min={0}
                  className="form-control form-control-sm"
                  value={cant}
                  onChange={(e) => setCant(e.target.value === '' ? '' : String(Math.max(0, Math.floor(parseFloat(e.target.value) || 0))))}
                />
              </div>
              <div className="col-12 col-sm-10">
                <label className="form-label">Descripción {n}</label>
                <input className="form-control form-control-sm" value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>
            </div>
          );
        })}
      </FormModal>
    </div>
  );
};

export default SegSeguridad;
