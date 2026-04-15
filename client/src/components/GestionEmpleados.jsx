import { useState, useEffect } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { Modal, Button, Table as BTable } from 'react-bootstrap';

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
        limpiarEmpleado();
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
        limpiarEmpleado();
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
      <h4>Gestión de empleados</h4>
      <small className="text-muted">Administración de los emplados de la empresa (RF19: nivel escolar y superación en el formulario)</small>
      <div className="card p-3">
        <div className="row">
          <div className="col-md-2">
            <input
              type="number"
              className="form-control"
              placeholder="Carnet (11 díg)"
              value={empCarnet}
              onChange={(e) => setEmpCarnet(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <input type="text" className="form-control" placeholder="Nombre" value={empNombre} onChange={(e) => setEmpNombre(e.target.value)} />
          </div>
          <div className="col-md-2">
            <input type="text" className="form-control" placeholder="Apellidos" value={empApellidos} onChange={(e) => setEmpApellidos(e.target.value)} />
          </div>
          <div className="col-md-2">
            <input type="text" className="form-control" placeholder="Puesto" value={empPuesto} onChange={(e) => setEmpPuesto(e.target.value)} />
          </div>
          <div className="col-md-2">
            <input type="number" className="form-control" placeholder="Teléfono" value={empTelefono} onChange={(e) => setEmpTelefono(e.target.value)} />
          </div>
          <div className="col-md-2">
            <input type="text" className="form-control" placeholder="Departamento" value={empDepartamento} onChange={(e) => setEmpDepartamento(e.target.value)} />
          </div>
        </div>
        <div className="row mt-2">
          <div className="col-md-3">
            <input type="text" className="form-control" placeholder="Evaluaciones" value={empEvaluaciones} onChange={(e) => setEmpEvaluaciones(e.target.value)} />
          </div>
          <div className="col-md-2">
            <input type="number" step="0.01" className="form-control" placeholder="Salario" value={empSalario} onChange={(e) => setEmpSalario(e.target.value)} />
          </div>
          <div className="col-md-3">
            <input type="text" className="form-control" placeholder="Beneficios" value={empBeneficios} onChange={(e) => setEmpBeneficios(e.target.value)} />
          </div>
          <div className="col-md-2">
            <input type="text" className="form-control" placeholder="Cursos" value={empCursos} onChange={(e) => setEmpCursos(e.target.value)} />
          </div>
          <div className="col-md-2">
            <input type="text" className="form-control" placeholder="Certificados" value={empCertificados} onChange={(e) => setEmpCertificados(e.target.value)} />
          </div>
        </div>
        <div className="row mt-2">
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Nivel escolar (RF19)"
              value={empNivelEscolar}
              onChange={(e) => setEmpNivelEscolar(e.target.value)}
            />
          </div>
          <div className="col-md-5">
            <input
              type="text"
              className="form-control"
              placeholder="Superación en proceso (curso, título en curso…)"
              value={empSuperacion}
              onChange={(e) => setEmpSuperacion(e.target.value)}
            />
          </div>
        </div>
        <div className="row mt-2">
          <div className="col-md-3">
            <input type="text" className="form-control" placeholder="Licencias" value={empLicencias} onChange={(e) => setEmpLicencias(e.target.value)} />
          </div>
          <div className="col-md-3">
            <input type="text" className="form-control" placeholder="Resultados Auditorías" value={empAuditorias} onChange={(e) => setEmpAuditorias(e.target.value)} />
          </div>
          <div className="col-md-3">
            <input type="text" className="form-control" placeholder="Acceso" value={empAcceso} onChange={(e) => setEmpAcceso(e.target.value)} />
          </div>
          <div className="col-md-3">
            <input type="text" className="form-control" placeholder="Seguimiento Seguridad" value={empSeguridad} onChange={(e) => setEmpSeguridad(e.target.value)} />
          </div>
        </div>
        <div className="row mt-3">
          <div className="col-md-12">
            <button type="button" className="btn btn-primary" onClick={editarEmpleado ? updateEmpleado : addEmpleado}>
              {editarEmpleado ? 'Actualizar' : 'Agregar'}
            </button>
            {editarEmpleado && (
              <button type="button" className="btn btn-secondary ms-2" onClick={limpiarEmpleado}>
                Cancelar
              </button>
            )}
          </div>
        </div>
        <hr />
        <table className="table table-bordered table-striped">
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
                  <button type="button" className="btn btn-sm me-2" onClick={() => editarEmpleadoTabla(emp)}>
                    <img src="/images/editar.png" alt="" width="40" height="40" />
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => deleteEmpleado(emp)}>
                    <img src="/images/eliminar.png" alt="" width="40" height="40" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                    <td>{row.fecha_cambio}</td>
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
