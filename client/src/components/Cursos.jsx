
import { useState, useEffect } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';

const Cursos = () => {
    const [registros, setRegistros] = useState([]);
    const [idTabla, setIdTabla] = useState('');
    const [curso, setCurso] = useState('');
    const [descr, setDescr] = useState('');
    const [logrado, setLogrado] = useState(false);
    const [fechaFin, setFechaFin] = useState('');
    const [editando, setEditando] = useState(false);
    const [idOriginal, setIdOriginal] = useState('');
    const { empleados, nombrePorCarnet } = useEmpleadosOptions();

    const getRegistros = () => {
        Axios.get('http://localhost:3001/cursos')
            .then(res => {
                // Asegurar que la fecha se muestre correctamente
                const datos = res.data.map(item => ({
                    ...item,
                    fech_fin_curso: item.fech_fin_curso ? item.fech_fin_curso.split('T')[0] : ''
                }));
                setRegistros(datos);
            })
            .catch(err => console.error('Error al cargar:', err));
    };

    useEffect(() => {
        getRegistros();
    }, []);

    const limpiarForm = () => {
        setIdTabla('');
        setCurso('');
        setDescr('');
        setLogrado(false);
        setFechaFin('');
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
            curso,
            descr,
            logrado,
            fech_fin_curso: fechaFin || null
        };

        if (editando) {
            Axios.put(`http://localhost:3001/update-curso/${idOriginal}`, data)
                .then(() => {
                    Swal.fire('Actualizado', 'Registro actualizado', 'success');
                    getRegistros();
                    limpiarForm();
                })
                .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
        } else {
            Axios.post('http://localhost:3001/create-curso', data)
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
        setCurso(reg.curso || '');
        setDescr(reg.descr || '');
        setLogrado(reg.logrado === 1 || reg.logrado === true);
        setFechaFin(reg.fech_fin_curso || '');
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
                Axios.delete(`http://localhost:3001/delete-curso/${id}`)
                    .then(() => {
                        Swal.fire('Eliminado', 'Registro eliminado', 'success');
                        getRegistros();
                    })
                    .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
            }
        });
    };

    return (
        <div className="container mt-3">

            <h4>Gestión de Cursos</h4>

                    <small className="text-muted">
                        Administración de la superación
                    </small>

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
                                <option value="" disabled hidden>— Seleccione empleado —</option>
                                {empleados.map((emp) => (
                                    <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                                        {emp.carnet_identidad} — {emp.nombre} {emp.apellidos}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3 mb-2">
                            <label>Curso</label>
                            <input
                                type="text"
                                className="form-control"
                                value={curso}
                                onChange={e => setCurso(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3 mb-2">
                            <label>Fecha Fin</label>
                            <input
                                type="date"
                                className="form-control"
                                value={fechaFin}
                                onChange={e => setFechaFin(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3 mb-2">
                            <label>Logrado</label>
                            <div className="form-check mt-2">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={logrado}
                                    onChange={e => setLogrado(e.target.checked)}
                                />
                                <label className="form-check-label">Sí</label>
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-9 mb-2">
                            <label>Descripción</label>
                            <textarea
                                className="form-control"
                                rows="2"
                                value={descr}
                                onChange={e => setDescr(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="d-flex gap-2 mt-3">
                        <button type="submit" className={`btn ${editando ? 'btn-warning' : 'btn-success'} btn-sm`}>
                            {editando ? 'Actualizar' : 'Guardar'}
                        </button>
                        {editando && <button type="button" className="btn btn-secondary ms-2" onClick={limpiarForm}>Cancelar</button>}
                    </div>
                </form>
                <hr />
                <h4>Registros existentes</h4>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table table-bordered table-striped">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Curso</th>
                                <th>Descripción</th>
                                <th>Logrado</th>
                                <th>Fecha Fin</th>
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
                                    <td>{reg.curso}</td>
                                    <td>{reg.descr}</td>
                                    <td>{reg.logrado ? 'Sí' : 'No'}</td>

<td>{reg.fech_fin_curso}</td>
                                    <td>
                                        <EditTableActionButton onClick={() => editarRegistro(reg)} className="me-1" />
                                        <DeleteTableActionButton onClick={() => eliminarRegistro(reg.id_tabla)} />
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

export default Cursos;