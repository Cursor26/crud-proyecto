
import { useState, useEffect } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';

const Certificaciones = () => {
    const [registros, setRegistros] = useState([]);
    const [idTabla, setIdTabla] = useState('');
    const [certificacion, setCertificacion] = useState('');
    const [editando, setEditando] = useState(false);
    const [idOriginal, setIdOriginal] = useState('');
    const { empleados, nombrePorCarnet } = useEmpleadosOptions();

    const getRegistros = () => {
        Axios.get('http://localhost:3001/certificaciones')
            .then(res => setRegistros(res.data))
            .catch(err => console.error('Error al cargar:', err));
    };

    useEffect(() => {
        getRegistros();
    }, []);

    const limpiarForm = () => {
        setIdTabla('');
        setCertificacion('');
        setEditando(false);
        setIdOriginal('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!idTabla) {
            Swal.fire('Error', 'El ID de tabla es obligatorio', 'warning');
            return;
        }
        const data = {
            id_tabla: idTabla,
            certificacion: certificacion
        };

        if (editando) {
            Axios.put(`http://localhost:3001/update-certificacion/${idOriginal}`, data)
                .then(() => {
                    Swal.fire('Actualizado', 'Registro actualizado', 'success');
                    getRegistros();
                    limpiarForm();
                })
                .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
        } else {
            Axios.post('http://localhost:3001/create-certificacion', data)
                .then(() => {
                    Swal.fire('Creado', 'Registro creado', 'success');
                    getRegistros();
                    limpiarForm();
                })
                .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
        }
    };

    const editarRegistro = (reg) => {
        setEditando(true);
        setIdOriginal(reg.id_tabla);
        setIdTabla(String(reg.id_tabla ?? ''));
        setCertificacion(reg.certificacion || '');
    };

    const eliminarRegistro = (id) => {
        Swal.fire({
            title: '¿Eliminar?',
            text: `Se eliminará el registro con ID ${id}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí'
        }).then(result => {
            if (result.isConfirmed) {
                Axios.delete(`http://localhost:3001/delete-certificacion/${id}`)
                    .then(() => {
                        Swal.fire('Eliminado', 'Registro eliminado', 'success');
                        getRegistros();
                    })
                    .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
            }
        });
    };

    return (
        <div className="container mt-4">
<div className='mt-8'>
 <h4>Gestión de Certificaciones</h4>
                    <small className="text-muted">
                        Administración de certificaciones del personal
                    </small>

</div>

            <div className="card p-3">
               
                <form onSubmit={handleSubmit}>
                    <div className="row">
                        <div className="col-md-5 mb-2">
                            <label>Empleado</label>
                            <select
                                className="form-select"
                                value={idTabla}
                                onChange={(e) => setIdTabla(e.target.value)}
                                disabled={editando}
                                required
                            >
                                <option value="">— Seleccione empleado —</option>
                                {empleados.map((emp) => (
                                    <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                                        {emp.carnet_identidad} — {emp.nombre} {emp.apellidos}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-6 mb-2">
                            <label>Certificación</label>
                            <input
                                type="text"


className="form-control"
                                value={certificacion}
                                onChange={e => setCertificacion(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <button type="submit" className={`btn ${editando ? 'btn-warning' : 'btn-success'} btn-sm`}>
                            {editando ? 'Actualizar' : 'Guardar'}
                        </button>
                        {editando && <button type="button" className="btn btn-secondary btn-sm" onClick={limpiarForm}>Cancelar</button>}
                    </div>
                </form>
                <hr />
                <h4>Registros existentes</h4>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table table-bordered table-striped">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Certificación</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registros.map(reg => (
                                <tr key={reg.id_tabla}>
                                    <td>
                                        <div>{nombrePorCarnet(reg.id_tabla) || '—'}</div>
                                        <small className="text-muted">{reg.id_tabla}</small>
                                    </td>
                                    <td>{reg.certificacion}</td>
                                    <td>
                                        <button className="btn btn-sm me-1" onClick={() => editarRegistro(reg)}><img src="/images/editar.png" alt="" width="40" height="40"/></button>
                                        <button className="btn btn-sm" onClick={() => eliminarRegistro(reg.id_tabla)}><img src="/images/eliminar.png" alt="" width="40" height="40"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Certificaciones;