
// src/components/Usuarios.jsx
import { useState, useEffect } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import AppSelect from './AppSelect';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('rrhh'); // valor por defecto
  const [editando, setEditando] = useState(false);
  const [emailOriginal, setEmailOriginal] = useState('');

  const getUsuarios = () => {
    Axios.get('http://localhost:3001/usuarios')
      .then((res) => setUsuarios(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error(err));
  };

  useEffect(() => { getUsuarios(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editando) {
      // Actualizar
      Axios.put(`http://localhost:3001/update-usuario/${emailOriginal}`, { nombre, password, rol })
        .then(() => {
          Swal.fire('Actualizado', 'Usuario actualizado', 'success');
          limpiar();
          getUsuarios();
        })
        .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    } else {
      // Crear
      Axios.post('http://localhost:3001/create-usuario', { email, nombre, password, rol })
        .then(() => {
          Swal.fire('Creado', 'Usuario creado', 'success');
          limpiar();
          getUsuarios();
        })
        .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    }
  };

  const eliminarUsuario = (email) => {
    Swal.fire({
      title: '¿Eliminar?',
      text: 'Se eliminará' ,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí'
    }).then(result => {
      if (result.isConfirmed) {
        Axios.delete(`http://localhost:3001/delete-usuario/${email}`)
          .then(() => {
            Swal.fire('Eliminado', 'Usuario eliminado', 'success');
            getUsuarios();
          })
          .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
      }
    });
  };

  const editarUsuario = (user) => {
    setEditando(true);
    setEmailOriginal(user.email);
    setEmail(user.email);
    setNombre(user.nombre);
    setRol(user.rol);
    setPassword(''); // No mostramos la contraseña
  };

  const limpiar = () => {
    setEditando(false);
    setEmail('');
    setNombre('');
    setPassword('');
    setRol('rrhh');
    setEmailOriginal('');
  };

  return (
    <div className="card p-3">
      <h3>Gestión de Usuarios</h3>
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-3">
            <input type="email" className="form-control" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required={!editando} disabled={editando} />
          </div>
          <div className="col-md-3">
            <input type="text" className="form-control" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} required />
          </div>
          <div className="col-md-2">
            <input type="password" className="form-control" placeholder={editando ? 'Nueva contraseña' : 'Contraseña'} value={password} onChange={e => setPassword(e.target.value)} required={!editando} />
          </div>
          <div className="col-md-2">
            <AppSelect className="form-control" value={rol} onChange={e => setRol(e.target.value)}>
              <option value="rrhh">RRHH</option>
              <option value="contratacion">Contratación</option>
              <option value="admin">Administrador</option>
            </AppSelect>
          </div>
          <div className="col-md-2 d-flex flex-wrap align-items-center gap-2">
            <button type="submit" className="btn btn-success btn-form-nowrap">{editando ? 'Actualizar' : 'Crear'}</button>
            {editando && <button type="button" className="btn btn-secondary btn-form-nowrap" onClick={limpiar}>Cancelar</button>}
          </div>
        </div>
      </form>
      <hr />
      <table className="table table-data-compact table-striped">
        <thead>
          <tr><th>Email</th><th>Nombre</th><th>Rol</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {usuarios.map(u => (
            <tr key={u.email}>
              <td>{u.email}</td>
              <td>{u.nombre}</td>
              <td>{u.rol}</td>
              <td>
                <button className="btn btn-warning btn-sm me-2" onClick={() => editarUsuario(u)}>Editar</button>
                <button className="btn btn-danger btn-sm" onClick={() => eliminarUsuario(u.email)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Usuarios;