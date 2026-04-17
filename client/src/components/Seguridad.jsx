import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';

const Seguridad = () => {
    const [registros, setRegistros] = useState([]);
    const [idTabla, setIdTabla] = useState('');
    const [acceso, setAcceso] = useState('');
    const [editando, setEditando] = useState(false);
    const [idOriginal, setIdOriginal] = useState('');
    const { empleados, nombrePorCarnet } = useEmpleadosOptions();

    const getRegistros = () => {
        Axios.get('http://localhost:3001/seguridad')
            .then(res => setRegistros(res.data))
            .catch(err => console.error('Error al cargar:', err));
    };

    useEffect(() => {
        getRegistros();
    }, []);

    const limpiarForm = () => {
        setIdTabla('');
        setAcceso('');
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
            acceso
        };

        if (editando) {
            Axios.put(`http://localhost:3001/update-seguridad/${idOriginal}`, data)
                .then(() => {
                    Swal.fire('Actualizado', 'Registro actualizado', 'success');
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
            Axios.post('http://localhost:3001/create-seguridad', data)
                .then(() => {
                    Swal.fire('Creado', 'Registro creado', 'success');
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
        setIdOriginal(reg.id_tabla);
        setIdTabla(String(reg.id_tabla ?? ''));
        setAcceso(reg.acceso || '');
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
                Axios.delete(`http://localhost:3001/delete-seguridad/${id}`)
                    .then(() => {
                        Swal.fire('Eliminado', 'Registro eliminado', 'success');
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
            {/* Encabezado tipo dashboard */}
            <div className="d-flex justify-content-between align-items-center mt-0">
                <div>
                    <h4 className="">Gestión de Seguridad</h4>
                </div>
                <div>
                    {/* Botón de actualizar comentado, igual que en asistencias */}
                </div>
            </div>
{/* Tarjeta principal */}
            <div className="card shadow-sm border-0">
                <div className="card-body">
                    {/* Barra superior de filtros / formulario compacto */}
                    <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-end mb-3 gap-3">
                        <div className="flex-grow-1">
                            <label className="form-label mb-1">Empleado</label>
                            <select
                                className="form-select form-select-sm"
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
                        <div style={{ minWidth: 250 }}>
                            <label className="form-label mb-1">Acceso</label>
                            <input
                                placeholder="🔐 Acceso"
                                type="text"
                                className="form-control form-control-sm"
                                value={acceso}
                                onChange={e => setAcceso(e.target.value)}
                            />
                        </div>
                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className={`btn ${editando ? 'btn-warning' : 'btn-success'} btn-sm`}
                                onClick={handleSubmit}
                            >
                                {editando ? 'Actualizar' : 'Guardar'}
                            </button>
                            {editando && (
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={limpiarForm}
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </div>

                    <hr className="mt-0" />

                    {/* Encabezado de tabla y contador */}
                    <h6 className="mb-2">Registros de seguridad</h6>

                    {/* Tabla responsiva dentro de la tarjeta */}
                    <div className="table-responsive">
                        <table className="table table-data-compact table-sm table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th style={{ width: '40%' }}>Empleado</th>
                                    <th style={{ width: '40%' }}>Acceso</th>
                                    <th style={{ width: '20%' }} className="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registros.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="text-center text-muted py-3">
                                            No hay registros para mostrar
                                        </td>
</tr>
                                )}
                                {registros.map(reg => (
                                    <tr key={reg.id_tabla}>
                                        <td>
                                            <div>{nombrePorCarnet(reg.id_tabla) || '—'}</div>
                                            <small className="text-muted">{reg.id_tabla}</small>
                                        </td>
                                        <td>{reg.acceso}</td>
                                        <td className="text-center">
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
        </div>
    );
};

export default Seguridad;