import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';

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
                    {/* Botón de actualizar comentado */}
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
                                <option value="">— Seleccione empleado —</option>
                                {empleados.map((emp) => (
                                    <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                                        {emp.carnet_identidad} — {emp.nombre} {emp.apellidos}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ minWidth: 150 }}>
                            <label className="form-label mb-1">Fecha Inicio</label>
                            <input
                                placeholder="📅 Inicio"
                                type="date"
                                className="form-control form-control-sm"
                                value={fechaInicio}
                                onChange={e => setFechaInicio(e.target.value)}
                            />
                        </div>
                        <div style={{ minWidth: 150 }}>
                            <label className="form-label mb-1">Fecha Fin</label>
                            <input
                                placeholder="📅 Fin"
                                type="date"
                                className="form-control form-control-sm"
                                value={fechaFin}
                                onChange={e => setFechaFin(e.target.value)}
                            />
                        </div>
                        <div style={{ minWidth: 100 }}>
                            <label className="form-label mb-1">Días Totales</label>
                            <input
                                placeholder="⏱️ Días"
                                type="number"
 className="form-control form-control-sm"
                                value={diasTotales}
                                readOnly
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

                    {/* Motivo */}
                    <div className="mb-2">
                        <label className="form-label mb-1">Motivo</label>
                        <input
                            placeholder="✏️ Motivo de las vacaciones"
                            type="text"
                            className="form-control form-control-sm"
                            value={motivo}
                            onChange={e => setMotivo(e.target.value)}
                        />
                    </div>

                    {/* Aprobado y Observaciones en la misma fila */}
                    <div className="row mb-2">
                        <div className="col-md-3">
                            <label className="form-label mb-1">Aprobado</label>
                            <div className="form-check mt-2">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={aprobado}
                                    onChange={e => setAprobado(e.target.checked)}
                                />
                                <label className="form-check-label">Sí</label>
                            </div>
                        </div>
                        <div className="col-md-9">
                            <label className="form-label mb-1">Observaciones</label>
                            <textarea
                                placeholder="📝 Observaciones adicionales"
                                className="form-control form-control-sm"
                                rows="2"
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                            />
                        </div>
                    </div>

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
[01/04/2026 04:34 p. m.] Kevin Cabeza: <th>Fecha Inicio</th>
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
                                            <button
                                                className="btn btn-sm me-1"
                                                onClick={() => editarRegistro(reg)}
                                            >
                                                <img src="/images/editar.png" alt="" width="40" height="40" />
                                            </button>
                                            <button
                                                className="btn btn-sm me-1"
                                                onClick={() => eliminarRegistro(reg.id_tabla)}
                                            >
                                                <img src="/images/eliminar.png" alt="" width="40" height="40" />
                                            </button>
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