import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import { fmtFechaTabla } from '../utils/formatDates';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';
import { FormModal } from './FormModal';
import ListSearchToolbar from './ListSearchToolbar';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import { TIPO_CERT_MED } from '../constants/hrCatalogos';
import { parseNonNegativeNumber } from '../utils/validation';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

const TIPOS = TIPO_CERT_MED.filter((x) => x !== '');

function splitDesc(s) {
  if (!s) return { categoria: '', otro: '', body: '' };
  const m = s.match(/^([^:]+):\s*([\s\S]*)$/);
  if (!m) return { categoria: '', otro: '', body: s };
  const first = m[1].trim();
  const rest = m[2].trim();
  const known = TIPOS.filter((x) => x !== 'Otro');
  if (known.includes(first)) return { categoria: first, otro: '', body: rest };
  return { categoria: 'Otro', otro: first, body: rest };
}

function mergeDesc(categoria, otro, body) {
  const b = (body || '').trim();
  if (!categoria) return b;
  if (categoria === 'Otro') {
    const o = (otro || '').trim();
    return o ? `${o}: ${b}` : b;
  }
  return b ? `${categoria}: ${b}` : categoria;
}

const CertificadosMedicos = () => {
  const puedeEscribir = usePuedeEscribir();
  const [registros, setRegistros] = useState([]);
  const [carnet, setCarnet] = useState('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [diasLicencia, setDiasLicencia] = useState('');
  const [medicoNombre, setMedicoNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categoriaOtro, setCategoriaOtro] = useState('');
  const [descBody, setDescBody] = useState('');
  const [activo, setActivo] = useState(true);
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [busq, setBusq] = useState('');
  const { empleados, nombrePorCarnet } = useEmpleadosOptions();

  const getRegistros = () => {
    Axios.get('/certificados-medicos')
      .then((res) => setRegistros(res.data))
      .catch((err) => console.error('Error al cargar cert. médicos:', err));
  };

  useEffect(() => {
    getRegistros();
  }, []);

  const limpiarForm = () => {
    setCarnet('');
    setFechaEmision('');
    setFechaVencimiento('');
    setDiasLicencia('');
    setMedicoNombre('');
    setCategoria('');
    setCategoriaOtro('');
    setDescBody('');
    setActivo(true);
    setEditando(false);
    setIdOriginal('');
  };

  const guardar = () => {
    if (!carnet) {
      Swal.fire('Error', 'Carnet de identidad requerido', 'warning');
      return;
    }
    const d = parseNonNegativeNumber(diasLicencia, { allowEmpty: true });
    const data = {
      carnet_identidad: carnet,
      fecha_emision: fechaEmision,
      fecha_vencimiento: fechaVencimiento,
      dias_licencia: d != null ? Math.floor(d) : 0,
      medico_nombre: medicoNombre,
      descripcion: mergeDesc(categoria, categoriaOtro, descBody),
      activo: activo ? 1 : 0,
    };
    if (editando) {
      Axios.put(`/update-cert-medico/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Actualizado', 'Certificado médico actualizado', 'success');
          getRegistros();
          limpiarForm();
          setShowModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('/create-cert-medico', data)
        .then(() => {
          Swal.fire('Creado', 'Certificado médico registrado', 'success');
          getRegistros();
          limpiarForm();
          setShowModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    }
  };

  const editarRegistro = (reg) => {
    setEditando(true);
    setIdOriginal(reg.id_cert_medico);
    setCarnet(String(reg.carnet_identidad ?? ''));
    setFechaEmision(reg.fecha_emision || '');
    setFechaVencimiento(reg.fecha_vencimiento || '');
    setDiasLicencia(reg.dias_licencia != null ? String(reg.dias_licencia) : '');
    setMedicoNombre(reg.medico_nombre || '');
    const p = splitDesc(reg.descripcion || '');
    setCategoria(p.categoria);
    setCategoriaOtro(p.otro);
    setDescBody(p.body);
    setActivo(reg.activo == 1);
    setShowModal(true);
  };

  const eliminarRegistro = (id) => {
    Swal.fire({
      title: '¿Eliminar certificado?',
      text: `Se eliminará el certificado médico ID ${id}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`/delete-cert-medico/${id}`)
          .then(() => {
            Swal.fire('Eliminado', 'Certificado eliminado', 'success');
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
      const s = `${r.id_cert_medico} ${r.carnet_identidad} ${r.fecha_emision} ${r.fecha_vencimiento} ${r.dias_licencia} ${r.medico_nombre} ${r.descripcion} ${
        nombrePorCarnet(r.carnet_identidad) || ''
      }`.toLowerCase();
      return s.includes(t);
    });
  }, [registros, busq, nombrePorCarnet]);

  const certMedExportAepg = useMemo(() => {
    const headers = [
      'ID',
      'Carnet',
      'Empleado',
      'Emisión',
      'Vencimiento',
      'Días licencia',
      'Médico',
      'Vigente',
      'Descripción',
    ];
    const dataRows = filtrados.map((reg) => [
      reg.id_cert_medico,
      reg.carnet_identidad,
      nombrePorCarnet(reg.carnet_identidad) || '—',
      reg.fecha_emision != null && reg.fecha_emision !== '' ? String(reg.fecha_emision) : '—',
      reg.fecha_vencimiento != null && reg.fecha_vencimiento !== '' ? String(reg.fecha_vencimiento) : '—',
      reg.dias_licencia != null && reg.dias_licencia !== '' ? String(reg.dias_licencia) : '—',
      reg.medico_nombre != null && reg.medico_nombre !== '' ? String(reg.medico_nombre) : '—',
      reg.activo ? 'Sí' : 'No',
      reg.descripcion != null && reg.descripcion !== '' ? String(reg.descripcion) : '—',
    ]);
    return { headers, dataRows };
  }, [filtrados, nombrePorCarnet]);

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <ModuleTitleBar
        title="Certificados Médicos"
        actions={
          <>
            <ExportacionAepgGrupo
              tituloSistema={AEPG_TITULO_RRHH}
              subtitulo="Reporte: certificados médicos y licencias."
              descripcion="Listado filtrado: datos del certificado, incluida descripción completa. Datos sensibles de salud — maneje con cuidado."
              nombreBaseArchivo={`AEPG_certificados_medicos_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Cert_medicos"
              headers={certMedExportAepg.headers}
              dataRows={certMedExportAepg.dataRows}
              disabled={!registros.length}
            />
          <button
            type="button"
            className={`btn btn-form-nowrap ${editando ? 'btn-warning' : 'btn-success'} btn-lg`}
            onClick={() => { limpiarForm(); setShowModal(true); }}
            disabled={!puedeEscribir}
          >
            + Certificado
          </button>
          </>
        }
      />
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <ListSearchToolbar
            value={busq}
            onChange={setBusq}
            placeholder="ID, empleado, fechas, médico, días, descripción…"
          />
          <h6 className="mb-2">Certificados ({filtrados.length} de {registros.length})</h6>
          <div className="table-responsive">
            <table className="table table-hover table-data-compact">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Empleado</th>
                  <th>Emisión</th>
                  <th>Venc.</th>
                  <th>Días</th>
                  <th>Médico</th>
                  <th>Vigente</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">No hay certificados con los criterios indicados.</td>
                  </tr>
                ) : (
                  filtrados.map((reg) => (
                    <tr key={reg.id_cert_medico}>
                      <td>
                        <strong>{reg.id_cert_medico}</strong>
                      </td>
                      <td className="cell-empleado-max">
                        <div className="cell-nombre-wrap">{nombrePorCarnet(reg.carnet_identidad) || '—'}</div>
                        <small className="text-muted cell-id-nowrap">{reg.carnet_identidad}</small>
                      </td>
                      <td className="text-nowrap">{fmtFechaTabla(reg.fecha_emision)}</td>
                      <td className="text-nowrap">{fmtFechaTabla(reg.fecha_vencimiento)}</td>
                      <td>{reg.dias_licencia}</td>
                      <td>{reg.medico_nombre}</td>
                      <td>
                        <span className={`badge fs-6 ${reg.activo ? 'bg-success' : 'bg-secondary'}`}>{reg.activo ? 'Sí' : 'No'}</span>
                      </td>
                      <td>
                        <EditTableActionButton onClick={() => editarRegistro(reg)} className="me-1" />
                        <DeleteTableActionButton onClick={() => eliminarRegistro(reg.id_cert_medico)} />
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
        title={editando ? 'Editar certificado' : 'Nuevo certificado'}
        onPrimary={guardar}
        primaryLabel={editando ? 'Actualizar' : 'Registrar'}
        primaryDisabled={!puedeEscribir}
        size="lg"
      >
        <div className="row g-2">
          <div className="col-12 col-md-6 col-xl-4">
            <label className="form-label">Empleado *</label>
            <AppSelect className="form-select" value={carnet} onChange={(e) => setCarnet(e.target.value)} required disabled={editando}>
              <option value="" disabled hidden>— Seleccione empleado —</option>
              {empleados.map((emp) => (
                <option key={emp.carnet_identidad} value={String(emp.carnet_identidad)}>
                  {emp.carnet_identidad} — {emp.nombre} {emp.apellidos}
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="col-6 col-md-3 col-xl-2">
            <label className="form-label">Emisión</label>
            <input type="date" className="form-control" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} />
          </div>
          <div className="col-6 col-md-3 col-xl-2">
            <label className="form-label">Venc.</label>
            <input type="date" className="form-control" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
          </div>
          <div className="col-6 col-md-3 col-xl-2">
            <label className="form-label">Días licencia</label>
            <input
              type="number"
              className="form-control"
              min={0}
              value={diasLicencia}
              onChange={(e) => setDiasLicencia(e.target.value === '' ? '' : String(Math.max(0, Math.floor(parseFloat(e.target.value) || 0))))}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Médico</label>
            <input className="form-control" value={medicoNombre} onChange={(e) => setMedicoNombre(e.target.value)} />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Clasificación</label>
            <AppSelect className="form-select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">— (opcional) —</option>
              {TIPOS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </AppSelect>
          </div>
          {categoria === 'Otro' && (
            <div className="col-12 col-md-6">
              <label className="form-label">Especificar tipo</label>
              <input className="form-control" value={categoriaOtro} onChange={(e) => setCategoriaOtro(e.target.value)} />
            </div>
          )}
          <div className="col-12">
            <label className="form-label">Descripción / detalle</label>
            <textarea className="form-control" rows={3} value={descBody} onChange={(e) => setDescBody(e.target.value)} />
          </div>
          <div className="form-check col-12">
            <input className="form-check-input" type="checkbox" id="actM" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            <label className="form-check-label" htmlFor="actM">Certificado vigente</label>
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default CertificadosMedicos;
