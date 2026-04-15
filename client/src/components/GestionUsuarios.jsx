import { useState, useEffect } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';

function GestionUsuarios() {
  const [usuariosList, setUsuarios] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [userNombre, setUserNombre] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRol, setUserRol] = useState('rrhh');
  const [editandoUsuario, setEditandoUsuario] = useState(false);
  const [userEmailOriginal, setUserEmailOriginal] = useState('');

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
    setUserRol('rrhh');
    setUserEmailOriginal('');
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
        limpiarUsuario();
        Swal.fire('Creado', 'Usuario creado', 'success');
      })
      .catch((error) => {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
      });
  };

  const updateUsuario = () => {
    Axios.put(`http://localhost:3001/update-usuario/${userEmailOriginal}`, {
      nombre: userNombre,
      password: userPassword,
      rol: userRol,
    })
      .then(() => {
        getUsuarios();
        limpiarUsuario();
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
  };

  return (
    <div>
      <h4>Gestión de Usuarios</h4>
      <small className="text-muted">Administración de los usuarios del programa</small>
      <div className="card p-3">
        <div className="row">
          <div className="col-md-3">
            <input
              type="email"
              className="form-control"
              placeholder="Email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              disabled={editandoUsuario}
            />
          </div>
          <div className="col-md-3">
            <input type="text" className="form-control" placeholder="Nombre" value={userNombre} onChange={(e) => setUserNombre(e.target.value)} />
          </div>
          <div className="col-md-2">
            <input
              type="password"
              className="form-control"
              placeholder={editandoUsuario ? 'Nueva contraseña' : 'Contraseña'}
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <select className="form-control" value={userRol} onChange={(e) => setUserRol(e.target.value)}>
              <option value="rrhh">Rec. humanos</option>
              <option value="contratacion">Contratación</option>
              <option value="admin">Administrador</option>
              <option value="produccion">Producción</option>
            </select>
          </div>
          <div className="col-md-2">
            <button type="button" className="btn btn-primary" onClick={editandoUsuario ? updateUsuario : addUsuario}>
              {editandoUsuario ? 'Actualizar' : 'Crear'}
            </button>
            {editandoUsuario && (
              <button type="button" className="btn btn-secondary ms-2" onClick={limpiarUsuario}>
                Cancelar
              </button>
            )}
          </div>
        </div>
        <hr />
        <table className="table table-bordered table-striped">
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
                  <button type="button" className="btn btn-sm me-2" onClick={() => editarUsuario(u)}>
                    <img src="/images/editar.png" alt="" width="40" height="40" />
                  </button>
                  <button type="button" className="btn  btn-sm" onClick={() => deleteUsuario(u.email)}>
                    <img src="/images/eliminar.png" alt="" width="40" height="40" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GestionUsuarios;
