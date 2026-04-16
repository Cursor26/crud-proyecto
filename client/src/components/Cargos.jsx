import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';

const Cargos = () => {
  const [registros, setRegistros] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [salarioBase, setSalarioBase] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [activo, setActivo] = useState(true);
  const [editando, setEditando] = useState(false);
  const [idOriginal, setIdOriginal] = useState('');

  const getRegistros = () => {
    Axios.get('http://localhost:3001/cargos')
      .then(res => setRegistros(res.data))
      .catch(err => console.error('Error al cargar cargos:', err));
  };

  useEffect(() => {
    getRegistros();
  }, []);

  const limpiarForm = () => {
    setNombre('');
    setDescripcion('');
    setSalarioBase('');
    setDepartamento('');
    setActivo(true);
    setEditando(false);
    setIdOriginal('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      nombre,
      descripcion,
      salario_base: parseFloat(salarioBase) || 0,
      departamento,
      activo: activo ? 1 : 0
    };

    if (editando) {
      Axios.put(`http://localhost:3001/update-cargo/${idOriginal}`, data)
        .then(() => {
          Swal.fire('Actualizado', 'Cargo actualizado', 'success');
          getRegistros();
          limpiarForm();
        })
        .catch(err =>
          Swal.fire(
            'Error',
            err.response?.data?.message || err.message,
            'error'
          )
        );
    } else {
      Axios.post('http://localhost:3001/create-cargo', data)
        .then(() => {
          Swal.fire('Creado', 'Cargo creado exitosamente', 'success');
          getRegistros();
          limpiarForm();
        })
        .catch(err =>
          Swal.fire(
            'Error',
            err.response?.data?.message || err.message,
            'error'
          )
        );
    }
  };

  const editarRegistro = (reg) => {
    setEditando(true);
    setIdOriginal(reg.id_cargo);
    setNombre(reg.nombre);
    setDescripcion(reg.descripcion || '');
    setSalarioBase(reg.salario_base || '');
    setDepartamento(reg.departamento || '');
    setActivo(reg.activo == 1);
  };

  const eliminarRegistro = (id) => {
    Swal.fire({
      title: '¿Eliminar cargo?',
      text: `Se eliminará el cargo ID ${id}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar'
    }).then(result => {
      if (result.isConfirmed) {
        Axios.delete(`http://localhost:3001/delete-cargo/${id}`)
          .then(() => {
            Swal.fire('Eliminado', 'Cargo eliminado', 'success');
            getRegistros();
          })
          .catch(err =>
            Swal.fire(
              'Error',
              err.response?.data?.message || err.message,
              'error'
            )
          );
      }
    }); 
  };

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center mt-0">
        <div>
          <h4 className="">Gestión de Cargos</h4>
          <small className="text-muted">
            Define y administra los puestos de trabajo disponibles
          </small>
        </div>
      </div>
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-end mb-3 gap-3">
            <div className="flex-grow-1">
              <label className="form-label mb-1">Cargo *</label>
              <input
                placeholder='👤 Nombre del cargo (ej: Gerente de Producción)'
                type="text"
                className="form-control form-control-lg"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
              />
            </div>
            <div style={{ minWidth: 200 }}>
              <label className="form-label mb-1">Departamento</label>
              <input
                placeholder='🏢 Departamento (ej: RRHH, Producción)'
                type="text"
                className="form-control form-control-lg"
                value={departamento}
                onChange={e => setDepartamento(e.target.value)}
              />
            </div>
            <div style={{ minWidth: 180 }}>
              <label className="form-label mb-1">Salario base</label>
              <input
                placeholder='$ 0.00'
                type="number"
                step="0.01"
                className="form-control form-control-lg"
                value={salarioBase}
                onChange={e => setSalarioBase(e.target.value)}
              />
            </div>
            <div className="d-flex gap-2 align-items-end">
              <button
                type="button"
                className={`btn ${editando ? 'btn-warning' : 'btn-success'} btn-lg px-4`}
                onClick={handleSubmit}
              >
                {editando ? 'Actualizar' : 'Crear Cargo'}
              </button>
              {editando && (
                <button
                  type="button"
                  className="btn btn-secondary btn-lg px-4"
                  onClick={limpiarForm}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label mb-1">Descripción</label>
            <textarea
              placeholder='📋 Descripción del puesto y responsabilidades'
              className="form-control form-control-lg"
              rows="3"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
            />
          </div>
          <div className="form-check mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="activoCheck"
              checked={activo}
              onChange={e => setActivo(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="activoCheck">
              Cargo activo
            </label>
          </div>
          <hr className="mt-0" />
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">Lista de cargos</h6>
            <small className="text-muted">
              Total cargos: {registros.length}
            </small>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '8%' }}>#</th>
                  <th style={{ width: '22%' }}>Nombre</th>
                  <th style={{ width: '20%' }}>Departamento</th>
                  <th style={{ width: '12%' }}>Salario Base</th>
                  <th style={{ width: '10%' }}>Activo</th>
                  <th>Descripción</th>
                  <th style={{ width: '18%' }} className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registros.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4">
                      No hay cargos creados. Crea el primero arriba.
                    </td>
                  </tr>
                )}
                {registros.map((reg, index) => (
                  <tr key={reg.id_cargo}>
                    <td><strong>{reg.id_cargo}</strong></td>
                    <td>{reg.nombre}</td>
                    <td>{reg.departamento || '-'}</td>
                    <td>${parseFloat(reg.salario_base || 0).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${reg.activo ? 'bg-success' : 'bg-secondary'}`}>
                        {reg.activo ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      <span className="text-truncate d-inline-block" style={{ maxWidth: '100%' }} title={reg.descripcion}>
                        {reg.descripcion || 'Sin descripción'}
                      </span>
                    </td>
                    <td className="text-center">
                      <EditTableActionButton onClick={() => editarRegistro(reg)} className="me-2" />
                      <DeleteTableActionButton onClick={() => eliminarRegistro(reg.id_cargo)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cargos;
