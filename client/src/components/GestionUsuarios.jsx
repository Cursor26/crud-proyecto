import { useState, useEffect } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import { FormModal } from './FormModal';

function GestionUsuarios() {
  const [usuariosList, setUsuarios] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [userNombre, setUserNombre] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRol, setUserRol] = useState('');
  const [editandoUsuario, setEditandoUsuario] = useState(false);
  const [userEmailOriginal, setUserEmailOriginal] = useState('');
  const [showUsuarioModal, setShowUsuarioModal] = useState(false);

  const getUsuarios = () => {
    Axios.get('http://localhost:3001/usuarios')
      .then((response) => setUsuarios(response.data))
      .catch((error) => console.error('Error al cargar usuarios:', error));
  };

  useEffect(() => {
    getUsuarios();
  }, []);

  const limpiarUsuario = () => {
    setEditandoUsuario(false);
    setUserEmail('');
    setUserNombre('');
    setUserPassword('');
    setUserRol('');
    setUserEmailOriginal('');
  };

  const cerrarModalUsuario = () => {
    limpiarUsuario();
    setShowUsuarioModal(false);
  };

  const abrirModalNuevoUsuario = () => {
    limpiarUsuario();
    setShowUsuarioModal(true);
  };

  const guardarUsuarioModal = () => {
    if (editandoUsuario) updateUsuario();
    else addUsuario();
  };

  const addUsuario = () => {
    Axios.post('http://localhost:3001/create-usuario', {
      email: userEmail,
      nombre: userNombre,
      password: userPassword,
      rol: userRol,
    })
      .then(() => {
        getUsuarios();
        cerrarModalUsuario();
        Swal.fire('Creado', 'Usuario creado', 'success');
      })
      .catch((error) => {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
      });
  };

  const updateUsuario = () => {
    Axios.put(`http://localhost:3001/update-usuario/${encodeURIComponent(userEmailOriginal)}`, {
      email: userEmail,
      nombre: userNombre,
      password: userPassword,
      rol: userRol,
    })
      .then(() => {
        getUsuarios();
        cerrarModalUsuario();
        Swal.fire('Actualizado', 'Usuario actualizado', 'success');
      })
      .catch((error) => {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
      });
  };

  const deleteUsuario = (email) => {
    Swal.fire({
      title: '¿Eliminar usuario?',
      text: 'Se eliminará',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`http://localhost:3001/delete-usuario/${email}`)
          .then(() => {
            getUsuarios();
            Swal.fire('Eliminado', 'Usuario eliminado', 'success');
          })
          .catch((error) => {
            Swal.fire('Error', error.response?.data?.message || error.message, 'error');
          });
      }
    });
  };

  const editarUsuario = (u) => {
    setEditandoUsuario(true);
    setUserEmailOriginal(u.email);
    setUserEmail(u.email);
    setUserNombre(u.nombre);
    setUserRol(u.rol);
    setUserPassword('');
    setShowUsuarioModal(true);
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h4 className="mb-1">Gestión de Usuarios</h4>
        </div>
        <button type="button" className="btn btn-primary btn-form-nowrap d-inline-flex align-items-center" onClick={abrirModalNuevoUsuario}>
          <i className="bi bi-person-plus me-2" aria-hidden="true" />
          Agregar usuario
        </button>
      </div>

      <FormModal
        show={showUsuarioModal}
        onHide={cerrarModalUsuario}
        title={editandoUsuario ? 'Editar usuario' : '+ Usuario'}
        subtitle=""
        onPrimary={guardarUsuarioModal}
        primaryLabel={editandoUsuario ? 'Actualizar' : 'Crear'}
      >
        <div className="minimal-form-stack">
          <div className="minimal-field">
            <label className="minimal-label">Email:</label>
            <input
              type="email"
              className="minimal-input"
              placeholder="------------------------"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Nombre:</label>
            <input type="text" className="minimal-input" placeholder="------------------------" value={userNombre} onChange={(e) => setUserNombre(e.target.value)} />
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Contraseña:</label>
            <input
              type="password"
              className="minimal-input"
              placeholder="------------------------"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
            />
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Rol:</label>
            <select className={`minimal-select ${userRol ? 'is-selected' : ''}`} value={userRol} onChange={(e) => setUserRol(e.target.value)}>
              <option value="" disabled hidden>--- Seleccione ---</option>
              <option value="rrhh">Rec. humanos</option>
              <option value="contratacion">Contratación</option>
              <option value="admin">Administrador</option>
              <option value="produccion">Producción</option>
            </select>
          </div>
        </div>
      </FormModal>

      <div className="card p-3">
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosList.map((u) => (
                <tr key={u.email}>
                  <td>{u.email}</td>
                  <td>{u.nombre}</td>
                  <td>{u.rol}</td>
                  <td>
                    <EditTableActionButton onClick={() => editarUsuario(u)} className="me-2" />
                    <DeleteTableActionButton onClick={() => deleteUsuario(u.email)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default GestionUsuarios;
