import { useState, useEffect } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { Modal, Button, Table as BTable } from 'react-bootstrap';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import { FormModal } from './FormModal';
import { fmtFechaTabla } from '../utils/formatDates';

function GestionEmpleados() {
  const [empCarnet, setEmpCarnet] = useState('');
  const [empNombre, setEmpNombre] = useState('');
  const [empApellidos, setEmpApellidos] = useState('');
  const [empPuesto, setEmpPuesto] = useState('');
  const [empTelefono, setEmpTelefono] = useState('');
  const [empDepartamento, setEmpDepartamento] = useState('');
  const [empEvaluaciones, setEmpEvaluaciones] = useState('');
  const [empSalario, setEmpSalario] = useState('');
  const [empBeneficios, setEmpBeneficios] = useState('');
  const [empCursos, setEmpCursos] = useState('');
  const [empCertificados, setEmpCertificados] = useState('');
  const [empLicencias, setEmpLicencias] = useState('');
  const [empAuditorias, setEmpAuditorias] = useState('');
  const [empAcceso, setEmpAcceso] = useState('');
  const [empSeguridad, setEmpSeguridad] = useState('');
  const [empNivelEscolar, setEmpNivelEscolar] = useState('');
  const [empSuperacion, setEmpSuperacion] = useState('');
  const [editarEmpleado, setEditarEmpleado] = useState(false);
  const [empleadosListTrue, setEmpleadosTrue] = useState([]);
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialTitulo, setHistorialTitulo] = useState('');
  const [historialRows, setHistorialRows] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [showEmpleadoModal, setShowEmpleadoModal] = useState(false);

  const getEmpleados = () => {
    Axios.get('http://localhost:3001/empleados')
      .then((response) => setEmpleadosTrue(response.data))
      .catch((error) => console.error('Error al cargar empleados:', error));
  };

  useEffect(() => {
    getEmpleados();
  }, []);

  const addEmpleado = () => {
    Axios.post('http://localhost:3001/create-empleado', {
      carnet_identidad: empCarnet,
      nombre: empNombre,
      apellidos: empApellidos,
      puesto: empPuesto,
      telefono: empTelefono,
      departamento: empDepartamento,
      evaluaciones: empEvaluaciones,
      salario_normal: empSalario,
      beneficios: empBeneficios,
      cursos_disponibles: empCursos,
      certificados: empCertificados,
      licencias: empLicencias,
      resultados_auditorias: empAuditorias,
      acceso: empAcceso,
      seguimiento_seguridad: empSeguridad,
      nivel_escolar: empNivelEscolar || null,
      superacion_en_proceso: empSuperacion || null,
    })
      .then(() => {
        getEmpleados();
        cerrarModalEmpleado();
        Swal.fire('Registro exitoso', 'Empleado agregado', 'success');
      })
      .catch((error) => {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
      });
  };

  const updateEmpleado = () => {
    Axios.put('http://localhost:3001/update-empleado', {
      carnet_identidad: empCarnet,
      nombre: empNombre,
      apellidos: empApellidos,
      puesto: empPuesto,
      telefono: empTelefono,
      departamento: empDepartamento,
      evaluaciones: empEvaluaciones,
      salario_normal: empSalario,
      beneficios: empBeneficios,
      cursos_disponibles: empCursos,
      certificados: empCertificados,
      licencias: empLicencias,
      resultados_auditorias: empAuditorias,
      acceso: empAcceso,
      seguimiento_seguridad: empSeguridad,
      nivel_escolar: empNivelEscolar || null,
      superacion_en_proceso: empSuperacion || null,
    })
      .then(() => {
        getEmpleados();
        cerrarModalEmpleado();
        Swal.fire('Actualización exitosa', 'Empleado actualizado', 'success');
      })
      .catch((error) => {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
      });
  };

  const deleteEmpleado = (val) => {
    Swal.fire({
      title: '¿Eliminar empleado?',
      text: 'Se eliminará el empleado',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`http://localhost:3001/delete-empleado/${val.carnet_identidad}`)
          .then(() => {
            getEmpleados();
            Swal.fire('Eliminado', 'Empleado eliminado', 'success');
          })
          .catch((error) => {
            Swal.fire('Error', error.response?.data?.message || error.message, 'error');
          });
      }
    });
  };

  const cerrarModalEmpleado = () => {
    limpiarEmpleado();
    setShowEmpleadoModal(false);
  };

  const abrirModalAgregarEmpleado = () => {
    limpiarEmpleado();
    setShowEmpleadoModal(true);
  };

  const guardarEmpleadoModal = () => {
    if (editarEmpleado) updateEmpleado();
    else addEmpleado();
  };

  const editarEmpleadoTabla = (val) => {
    setEditarEmpleado(true);
    setEmpCarnet(val.carnet_identidad);
    setEmpNombre(val.nombre);
    setEmpApellidos(val.apellidos);
    setEmpPuesto(val.puesto);
    setEmpTelefono(val.telefono || '');
    setEmpDepartamento(val.departamento || '');
    setEmpEvaluaciones(val.evaluaciones || '');
    setEmpSalario(val.salario_normal || '');
    setEmpBeneficios(val.beneficios || '');
    setEmpCursos(val.cursos_disponibles || '');
    setEmpCertificados(val.certificados || '');
    setEmpLicencias(val.licencias || '');
    setEmpAuditorias(val.resultados_auditorias || '');
    setEmpAcceso(val.acceso || '');
    setEmpSeguridad(val.seguimiento_seguridad || '');
    setEmpNivelEscolar(val.nivel_escolar || '');
    setEmpSuperacion(val.superacion_en_proceso || '');
    setShowEmpleadoModal(true);
  };

  const etiquetaTipoCambio = (tipo) => {
    if (tipo === 'puesto') return 'Puesto';
    if (tipo === 'departamento') return 'Departamento';
    if (tipo === 'salario') return 'Salario';
    return tipo;
  };

  const abrirHistorial = (emp) => {
    setHistorialTitulo(`${emp.nombre} ${emp.apellidos} — carnet ${emp.carnet_identidad}`);
    setShowHistorial(true);
    setHistorialLoading(true);
    setHistorialRows([]);
    Axios.get(`http://localhost:3001/historial-laboral/${emp.carnet_identidad}`)
      .then((r) => setHistorialRows(r.data))
      .catch((error) => {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
        setShowHistorial(false);
      })
      .finally(() => setHistorialLoading(false));
  };

  const limpiarEmpleado = () => {
    setEmpCarnet('');
    setEmpNombre('');
    setEmpApellidos('');
    setEmpPuesto('');
    setEmpTelefono('');
    setEmpDepartamento('');
    setEmpEvaluaciones('');
    setEmpSalario('');
    setEmpBeneficios('');
    setEmpCursos('');
    setEmpCertificados('');
    setEmpLicencias('');
    setEmpAuditorias('');
    setEmpAcceso('');
    setEmpSeguridad('');
    setEmpNivelEscolar('');
    setEmpSuperacion('');
    setEditarEmpleado(false);
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h4 className="mb-1">Gestión de empleados</h4>
        </div>
        <button type="button" className="btn btn-primary btn-form-nowrap d-inline-flex align-items-center" onClick={abrirModalAgregarEmpleado}>
          <i className="bi bi-person-plus me-2" aria-hidden="true" />
          Agregar empleado
        </button>
      </div>

      <FormModal
        show={showEmpleadoModal}
        onHide={cerrarModalEmpleado}
        title={editarEmpleado ? 'Editar empleado' : '+ Empleado'}
        subtitle=""
        onPrimary={guardarEmpleadoModal}
        primaryLabel={editarEmpleado ? 'Actualizar' : 'Guardar'}
      >
        <div className="minimal-form-stack">
          <div className="minimal-field"><label className="minimal-label">Carnet:</label><input type="number" className="minimal-input" placeholder="------------------------" value={empCarnet} onChange={(e) => setEmpCarnet(e.target.value)} disabled={editarEmpleado} /></div>
          <div className="minimal-field"><label className="minimal-label">Nombre:</label><input type="text" className="minimal-input" placeholder="------------------------" value={empNombre} onChange={(e) => setEmpNombre(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Apellidos:</label><input type="text" className="minimal-input" placeholder="------------------------" value={empApellidos} onChange={(e) => setEmpApellidos(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Puesto:</label><input type="text" className="minimal-input" placeholder="------------------------" value={empPuesto} onChange={(e) => setEmpPuesto(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Teléfono:</label><input type="number" className="minimal-input" placeholder="------------------------" value={empTelefono} onChange={(e) => setEmpTelefono(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Departamento:</label><input type="text" className="minimal-input" placeholder="------------------------" value={empDepartamento} onChange={(e) => setEmpDepartamento(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Evaluaciones:</label><input type="text" className="minimal-input" placeholder="------------------------" value={empEvaluaciones} onChange={(e) => setEmpEvaluaciones(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Salario:</label><input type="number" step="0.01" className="minimal-input" placeholder="------------------------" value={empSalario} onChange={(e) => setEmpSalario(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Beneficios:</label><input type="text" className="minimal-input" placeholder="------------------------" value={empBeneficios} onChange={(e) => setEmpBeneficios(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Cursos:</label><input type="text" className="minimal-input" placeholder="------------------------" value={empCursos} onChange={(e) => setEmpCursos(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Certificados:</label><input type="text" className="minimal-input" placeholder="------------------------" value={empCertificados} onChange={(e) => setEmpCertificados(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Nivel escolar:</label><input type="text" className="minimal-input" placeholder="------------------------" value={empNivelEscolar} onChange={(e) => setEmpNivelEscolar(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Superación en proceso:</label><input type="text" className="minimal-input" placeholder="------------------------" value={empSuperacion} onChange={(e) => setEmpSuperacion(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Licencias:</label><input type="text" className="minimal-input" placeholder="------------------------" value={empLicencias} onChange={(e) => setEmpLicencias(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Resultados auditorías:</label><input type="text" className="minimal-input" placeholder="------------------------" value={empAuditorias} onChange={(e) => setEmpAuditorias(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Acceso:</label><input type="text" className="minimal-input" placeholder="------------------------" value={empAcceso} onChange={(e) => setEmpAcceso(e.target.value)} /></div>
          <div className="minimal-field"><label className="minimal-label">Seguimiento seguridad:</label><input type="text" className="minimal-input" placeholder="------------------------" value={empSeguridad} onChange={(e) => setEmpSeguridad(e.target.value)} /></div>
        </div>
      </FormModal>

      <div className="card p-3">
        <div className="table-responsive">
        <table className="table table-data-compact table-bordered table-striped">
          <thead>
            <tr>
              <th>Carnet</th>
              <th>Nombre</th>
              <th>Apellidos</th>
              <th>Puesto</th>
              <th>Teléfono</th>
              <th>Departamento</th>
              <th>Salario</th>
              <th>Nivel escolar</th>
              <th>Superación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empleadosListTrue.map((emp) => (
              <tr key={emp.carnet_identidad}>
                <td>{emp.carnet_identidad}</td>
                <td>{emp.nombre}</td>
                <td>{emp.apellidos}</td>
                <td>{emp.puesto}</td>
                <td>{emp.telefono}</td>
                <td>{emp.departamento}</td>
                <td>{emp.salario_normal}</td>
                <td>{emp.nivel_escolar || '—'}</td>
                <td style={{ maxWidth: 200, whiteSpace: 'pre-wrap' }}>{emp.superacion_en_proceso || '—'}</td>
                <td>
                  <button type="button" className="btn btn-sm btn-outline-secondary me-1" title="Historial laboral" onClick={() => abrirHistorial(emp)}>
                    Historial
                  </button>
                  <EditTableActionButton onClick={() => editarEmpleadoTabla(emp)} className="me-2" />
                  <DeleteTableActionButton onClick={() => deleteEmpleado(emp)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <Modal show={showHistorial} onHide={() => setShowHistorial(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Historial laboral</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-3">{historialTitulo}</p>
          {historialLoading ? (
            <p className="mb-0">Cargando…</p>
          ) : historialRows.length === 0 ? (
            <p className="mb-0">No hay cambios registrados de puesto, departamento o salario.</p>
          ) : (
            <BTable striped bordered hover size="sm" className="mb-0">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Campo</th>
                  <th>Valor anterior</th>
                  <th>Valor nuevo</th>
                </tr>
              </thead>
              <tbody>
                {historialRows.map((row) => (
                  <tr key={row.id}>
                    <td className="text-nowrap">{fmtFechaTabla(row.fecha_cambio)}</td>
                    <td>{etiquetaTipoCambio(row.tipo_cambio)}</td>
                    <td>{row.valor_anterior ?? '—'}</td>
                    <td>{row.valor_nuevo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </BTable>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowHistorial(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default GestionEmpleados;
