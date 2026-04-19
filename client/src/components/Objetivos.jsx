
import { useState, useEffect } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import { fmtFechaTabla } from '../utils/formatDates';
import ModuleTitleBar from './ModuleTitleBar';

const Objetivos = () => {
    const [registros, setRegistros] = useState([]);
    const [idTabla, setIdTabla] = useState('');
    const [objetivo, setObjetivo] = useState('');
    const [descr, setDescr] = useState('');
    const [logrado, setLogrado] = useState(false);
    const [fechaLogrado, setFechaLogrado] = useState('');
    const [editando, setEditando] = useState(false);
    const [idOriginal, setIdOriginal] = useState('');
    const { empleados, nombrePorCarnet } = useEmpleadosOptions();

    const getRegistros = () => {
        Axios.get('http://localhost:3001/objetivos')
            .then(res => {
                // Asegurar formato de fecha
                const datos = res.data.map(item => ({
                    ...item,
                    fecha_logrado: item.fecha_logrado ? item.fecha_logrado.split('T')[0] : ''
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
        setObjetivo('');
        setDescr('');
        setLogrado(false);
        setFechaLogrado('');
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
            objetivo,
            descr,
            logrado,
            fecha_logrado: fechaLogrado || null
        };

        if (editando) {
            Axios.put(`http://localhost:3001/update-objetivo/${idOriginal}`, data)
                .then(() => {
                    Swal.fire('Actualizado', 'Registro actualizado', 'success');
                    getRegistros();
                    limpiarForm();
                })
                .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
        } else {
            Axios.post('http://localhost:3001/create-objetivo', data)
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
        setObjetivo(reg.objetivo || '');
        setDescr(reg.descr || '');
        setLogrado(reg.logrado === 1 || reg.logrado === true);
        setFechaLogrado(reg.fecha_logrado || '');
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
                Axios.delete(`http://localhost:3001/delete-objetivo/${id}`)
                    .then(() => {
                        Swal.fire('Eliminado', 'Registro eliminado', 'success');
                        getRegistros();
                    })
                    .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
            }
        });
    };

    return (
        <div className="container-fluid px-0">
            <ModuleTitleBar title="Gestión de Objetivos" />
            <div className="card p-3">
                
                <form onSubmit={handleSubmit}>
                    <div className="row">
                        <div className="col-md-3 mb-2">


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
                            <label>Objetivo</label>
                            <input
                                type="text"
                                className="form-control"
                                value={objetivo}
                                onChange={e => setObjetivo(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3 mb-2">
                            <label>Fecha Logrado</label>
                            <input
                                type="date"
                                className="form-control"
                                value={fechaLogrado}
                                onChange={e => setFechaLogrado(e.target.value)}
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
                    <div className="mt-3">
                        <button type="submit" className="btn btn-success btn-form-nowrap">
                            {editando ? 'Actualizar' : 'Guardar'}
                        </button>
                        {editando && <button type="button" className="btn btn-secondary btn-form-nowrap ms-2" onClick={limpiarForm}>Cancelar</button>}
                    </div>
                </form>
                <hr />
                <h4>Registros existentes</h4>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table table-data-compact table-bordered table-striped">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Objetivo</th>
                                <th>Descripción</th>
                                <th>Logrado</th>
                                <th>Fecha Logrado</th>
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
                                    <td>{reg.objetivo}</td>


<td>{reg.descr}</td>
                                    <td>{reg.logrado ? 'Sí' : 'No'}</td>
                                    <td className="text-nowrap">{fmtFechaTabla(reg.fecha_logrado)}</td>
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

export default Objetivos;