import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';
import { FormModal } from './FormModal';
import ListSearchToolbar from './ListSearchToolbar';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import { parseNonNegativeNumber } from '../utils/validation';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

const Cargos = () => {
  const puedeEscribir = usePuedeEscribir();
  const [registros, setRegistros] = useState([]);
  const [deptosApi, setDeptosApi] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [salarioBase, setSalarioBase] = useState('');
  const [deptoSel, setDeptoSel] = useState('');
  const [deptoOtro, setDeptoOtro] = useState('');
  const [activo, setActivo] = useState(true);
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [busq, setBusq] = useState('');

  const nombresDeptos = useMemo(
    () => [...new Set(deptosApi.map((d) => d.nombre).filter((n) => n && String(n).trim()))].sort((a, b) => a.localeCompare(b, 'es')),
    [deptosApi]
  );

  const getRegistros = () => {
    Axios.get('/cargos')
      .then((res) => setRegistros(res.data))
      .catch((err) => console.error('Error al cargar cargos:', err));
  };

  useEffect(() => {
    getRegistros();
    Axios.get('/departamentos')
      .then((r) => setDeptosApi(r.data || []))
      .catch(() => setDeptosApi([]));
  }, []);

  const deptoValue = deptoSel === '__otro__' ? deptoOtro.trim() : deptoSel;

  const limpiarForm = () => {
    setNombre('');
    setDescripcion('');
    setSalarioBase('');
    setDeptoSel('');
    setDeptoOtro('');
    setActivo(true);
    setEditando(false);
    setIdOriginal('');
  };

  const guardar = () => {
    if (!nombre.trim()) {
      Swal.fire('Error', 'Indique el nombre del cargo', 'warning');
      return;
    }
    const s = parseNonNegativeNumber(salarioBase, { allowEmpty: true });
    if (salarioBase !== '' && s == null) {
      Swal.fire('Error', 'Salario base no válido', 'warning');
      return;
    }
    const data = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      salario_base: s != null ? s : 0,
      departamento: deptoValue,
      activo: activo ? 1 : 0,
    };
    if (editando) {
      Axios.put(`/update-cargo/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Actualizado', 'Cargo actualizado', 'success');
          getRegistros();
          limpiarForm();
          setShowModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      Axios.post('/create-cargo', data)
        .then(() => {
          Swal.fire('Creado', 'Cargo creado', 'success');
          getRegistros();
          limpiarForm();
          setShowModal(false);
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    }
  };

  const editarRegistro = (reg) => {
    setEditando(true);
    setIdOriginal(reg.id_cargo);
    setNombre(reg.nombre);
    setDescripcion(reg.descripcion || '');
    setSalarioBase(reg.salario_base != null ? String(reg.salario_base) : '');
    const dep = (reg.departamento || '').trim();
    if (dep && nombresDeptos.includes(dep)) {
      setDeptoSel(dep);
      setDeptoOtro('');
    } else {
      setDeptoSel('__otro__');
      setDeptoOtro(dep);
    }
    setActivo(reg.activo == 1);
    setShowModal(true);
  };

  const eliminarRegistro = (id) => {
    Swal.fire({
      title: '¿Eliminar cargo?',
      text: `Se eliminará el cargo ID ${id}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`/delete-cargo/${id}`)
          .then(() => {
            Swal.fire('Eliminado', 'Cargo eliminado', 'success');
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
      const s = `${reg.nombre} ${reg.departamento} ${reg.descripcion} ${reg.salario_base} ${reg.activo}`.toLowerCase();
      return s.includes(t);
    });
  }, [registros, busq]);

  const cargosExportAepg = useMemo(() => {
    const headers = ['ID', 'Nombre', 'Departamento', 'Salario base', 'Activo', 'Descripción'];
    const dataRows = filtrados.map((reg) => [
      reg.id_cargo,
      reg.nombre != null ? String(reg.nombre) : '—',
      reg.departamento != null && reg.departamento !== '' ? String(reg.departamento) : '—',
      reg.salario_base != null && reg.salario_base !== '' ? String(reg.salario_base) : '0',
      reg.activo ? 'Sí' : 'No',
      reg.descripcion != null && reg.descripcion !== '' ? String(reg.descripcion) : '—',
    ]);
    return { headers, dataRows };
  }, [filtrados]);

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <ModuleTitleBar
        title="Gestión de Cargos"
        actions={
          <>
            <ExportacionAepgGrupo
              tituloSistema={AEPG_TITULO_RRHH}
              subtitulo="Reporte: catálogo de cargos (salario, departamento, activo)."
              descripcion="Listado filtrado: datos de cada cargo, sin la columna de acciones en pantalla."
              nombreBaseArchivo={`AEPG_cargos_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Cargos"
              headers={cargosExportAepg.headers}
              dataRows={cargosExportAepg.dataRows}
              disabled={!registros.length}
            />
          <button type="button" className="btn btn-primary btn-lg px-4" onClick={() => { limpiarForm(); setShowModal(true); }} disabled={!puedeEscribir}>
            + Cargo
          </button>
          </>
        }
      />
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <ListSearchToolbar value={busq} onChange={setBusq} placeholder="Nombre, departamento, descripción, salario…" />
          <h6 className="mb-2">Lista de cargos ({filtrados.length} de {registros.length})</h6>
          <div className="table-responsive">
            <table className="table table-data-compact table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '8%' }}>#</th>
                  <th style={{ width: '22%' }}>Nombre</th>
                  <th style={{ width: '20%' }}>Departamento</th>
                  <th style={{ width: '12%' }}>Salario base</th>
                  <th style={{ width: '10%' }}>Activo</th>
                  <th>Descripción</th>
                  <th style={{ width: '18%' }} className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4">No hay cargos con los criterios indicados.</td>
                  </tr>
                ) : (
                  filtrados.map((reg) => (
                    <tr key={reg.id_cargo}>
                      <td>
                        <strong>{reg.id_cargo}</strong>
                      </td>
                      <td>{reg.nombre}</td>
                      <td>{reg.departamento || '—'}</td>
                      <td>${parseFloat(reg.salario_base || 0).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${reg.activo ? 'bg-success' : 'bg-secondary'}`}>{reg.activo ? 'Sí' : 'No'}</span>
                      </td>
                      <td style={{ maxWidth: 300 }}>
                        <span className="text-truncate d-inline-block" style={{ maxWidth: '100%' }} title={reg.descripcion}>
                          {reg.descripcion || '—'}
                        </span>
                      </td>
                      <td className="text-center">
                        <EditTableActionButton onClick={() => editarRegistro(reg)} className="me-2" />
                        <DeleteTableActionButton onClick={() => eliminarRegistro(reg.id_cargo)} />
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
        title={editando ? 'Editar cargo' : 'Nuevo cargo'}
        onPrimary={guardar}
        primaryLabel={editando ? 'Actualizar' : 'Crear'}
        primaryDisabled={!puedeEscribir}
      >
        <div className="row g-2">
          <div className="col-12 col-md-6">
            <label className="form-label">Nombre *</label>
            <input className="form-control" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Departamento</label>
            <AppSelect className="form-select" value={deptoSel} onChange={(e) => setDeptoSel(e.target.value)}>
              <option value="">— Seleccione o escriba en Otro —</option>
              {nombresDeptos.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value="__otro__">Otro (especificar)</option>
            </AppSelect>
          </div>
          {deptoSel === '__otro__' && (
            <div className="col-12 col-md-6">
              <label className="form-label">Especificar departamento</label>
              <input className="form-control" value={deptoOtro} onChange={(e) => setDeptoOtro(e.target.value)} />
            </div>
          )}
          <div className="col-12 col-md-6">
            <label className="form-label">Salario base</label>
            <input type="number" min={0} step="0.01" className="form-control" value={salarioBase} onChange={(e) => setSalarioBase(e.target.value)} />
          </div>
          <div className="col-12 col-md-6 d-flex align-items-end">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="activoC" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              <label className="form-check-label" htmlFor="activoC">
                Activo
              </label>
            </div>
          </div>
          <div className="col-12">
            <label className="form-label">Descripción</label>
            <textarea className="form-control" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default Cargos;
