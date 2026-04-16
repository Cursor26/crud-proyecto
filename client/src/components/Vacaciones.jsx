import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import { FormModal } from './FormModal';

const Vacaciones = () => {
    const [registros, setRegistros] = useState([]);
    const [idTabla, setIdTabla] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [diasTotales, setDiasTotales] = useState('');
    const [motivo, setMotivo] = useState('');
    const [aprobado, setAprobado] = useState(false);
    const [observaciones, setObservaciones] = useState('');
    const [editando, setEditando] = useState(false);
    const [idOriginal, setIdOriginal] = useState('');
    const [showVacacionesModal, setShowVacacionesModal] = useState(false);
    const { empleados, nombrePorCarnet } = useEmpleadosOptions();

    const getRegistros = () => {
        Axios.get('http://localhost:3001/vacaciones')
            .then(res => {
                const datos = res.data.map(item => ({
                    ...item,
                    fecha_inicio: item.fecha_inicio ? item.fecha_inicio.split('T')[0] : '',
                    fecha_fin: item.fecha_fin ? item.fecha_fin.split('T')[0] : ''
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
        setFechaInicio('');
        setFechaFin('');
        setDiasTotales('');
        setMotivo('');
        setAprobado(false);
        setObservaciones('');
        setEditando(false);
        setIdOriginal('');
    };

    const calcularDias = () => {
        if (fechaInicio && fechaFin) {
            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);
            const diffTime = Math.abs(fin - inicio);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            setDiasTotales(diffDays);
        }
    };

    useEffect(() => {
        calcularDias();
    }, [fechaInicio, fechaFin]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!idTabla) {
            Swal.fire('Error', 'El ID de tabla es obligatorio', 'warning');
            return;
        }
        const data = {
            id_tabla: idTabla,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            dias_totales: diasTotales,
            motivo,
            aprobado,
            observaciones
        };

        if (editando) {
            Axios.put(`http://localhost:3001/update-vacacion/${idOriginal}`, data)
                .then(() => {
                    Swal.fire('Actualizado', 'Registro actualizado', 'success');
                    getRegistros();
                    limpiarForm();
                    setShowVacacionesModal(false);
                })
                .catch(err =>
                    Swal.fire(
                        'Error',
                        err.response?.data?.message || err.message,
                        'error'
                    )
                );
        } else {
            Axios.post('http://localhost:3001/create-vacacion', data)
                .then(() => {
                    Swal.fire('Creado', 'Registro creado', 'success');
                    getRegistros();
                    limpiarForm();
                    setShowVacacionesModal(false);
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
        setFechaInicio(reg.fecha_inicio || '');
        setFechaFin(reg.fecha_fin || '');
        setDiasTotales(reg.dias_totales || '');
        setMotivo(reg.motivo || '');
        setAprobado(reg.aprobado === 1 || reg.aprobado === true);
        setObservaciones(reg.observaciones || '');
        setShowVacacionesModal(true);
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
                Axios.delete(`http://localhost:3001/delete-vacacion/${id}`)
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
                    <h4 className="">Gestión de Vacaciones</h4>
                    <small className="text-muted">
                        Administración de períodos vacacionales
                    </small>
                </div>
                <div>
                    <button type="button" className="btn btn-primary" onClick={() => { limpiarForm(); setShowVacacionesModal(true); }}>
                        <i className="bi bi-calendar-plus me-2" aria-hidden="true" />
                        Agregar vacaciones
                    </button>
                </div>
            </div>

            <FormModal
                show={showVacacionesModal}
                onHide={() => setShowVacacionesModal(false)}
                title={editando ? 'Editar vacaciones' : '+ Vacaciones'}
                subtitle=""
                onPrimary={(e) => handleSubmit(e || { preventDefault: () => {} })}
                primaryLabel={editando ? 'Actualizar' : 'Guardar'}
            >
                <div className="minimal-form-stack">
                    <div className="minimal-field">
                        <label className="minimal-label">Empleado:</label>
                        <select
                            className={`minimal-select ${idTabla ? 'is-selected' : ''}`}
                            value={idTabla}
                            onChange={(e) => setIdTabla(e.target.value)}
                            disabled={editando}
                        >
                            <option value="" disabled hidden>--- Seleccione ---</option>
                            {empleados.map((emp) => (
                                <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                                    {emp.carnet_identidad} — {emp.nombre} {emp.apellidos}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="minimal-field"><label className="minimal-label">Fecha inicio:</label><input type="date" className="minimal-input" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} /></div>
                    <div className="minimal-field"><label className="minimal-label">Fecha fin:</label><input type="date" className="minimal-input" value={fechaFin} onChange={e => setFechaFin(e.target.value)} /></div>
                    <div className="minimal-field"><label className="minimal-label">Días totales:</label><input type="number" className="minimal-input" value={diasTotales} readOnly /></div>
                    <div className="minimal-field"><label className="minimal-label">Motivo:</label><input type="text" className="minimal-input" placeholder="------------------------" value={motivo} onChange={e => setMotivo(e.target.value)} /></div>
                    <label className="minimal-radio"><input type="checkbox" checked={aprobado} onChange={e => setAprobado(e.target.checked)} /> Aprobado</label>
                    <div className="minimal-field"><label className="minimal-label">Observaciones:</label><input type="text" className="minimal-input" placeholder="------------------------" value={observaciones} onChange={e => setObservaciones(e.target.value)} /></div>
                </div>
            </FormModal>

            {/* Tarjeta principal */}
            <div className="card shadow-sm border-0">
                <div className="card-body">
                    <hr className="mt-0" />

                    {/* Encabezado de tabla y contador */}
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">Registros de vacaciones</h6>
                        <small className="text-muted">
                            Total registros: {registros.length}
                        </small>
                    </div>

                    {/* Tabla responsiva dentro de la tarjeta */}
                    <div className="table-responsive">
                        <table className="table table-sm table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Empleado</th>
                                    <th>Fecha Inicio</th>
                                    <th>Fecha Fin</th>
                                    <th>Días</th>
                                    <th>Motivo</th>
                                    <th>Aprobado</th>
                                    <th>Observaciones</th>
                                    <th className="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registros.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="text-center text-muted py-3">
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
                                        <td>{reg.fecha_inicio}</td>
                                        <td>{reg.fecha_fin}</td>
                                        <td>{reg.dias_totales}</td>
                                        <td>{reg.motivo}</td>
                                        <td>{reg.aprobado ? 'Sí' : 'No'}</td>
                                        <td>{reg.observaciones}</td>
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

export default Vacaciones;