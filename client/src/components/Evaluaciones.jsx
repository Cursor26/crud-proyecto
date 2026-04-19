
import { useState, useEffect } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import ModuleTitleBar from './ModuleTitleBar';

const Evaluaciones = () => {
    const [registros, setRegistros] = useState([]);
    const [idTabla, setIdTabla] = useState('');
    const [evaluacion, setEvaluacion] = useState('');
    const [descr, setDescr] = useState('');
    const [editando, setEditando] = useState(false);
    const [idOriginal, setIdOriginal] = useState('');
    const { empleados, nombrePorCarnet } = useEmpleadosOptions();

    const getRegistros = () => {
        Axios.get('http://localhost:3001/evaluaciones')
            .then(res => setRegistros(res.data))
            .catch(err => console.error('Error al cargar:', err));
    };

    useEffect(() => {
        getRegistros();
    }, []);

    const limpiarForm = () => {
        setIdTabla('');
        setEvaluacion('');
        setDescr('');
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
            evaluacion,
            descr
        };

        if (editando) {
            Axios.put(`http://localhost:3001/update-evaluacion/${idOriginal}`, data)
                .then(() => {
                    Swal.fire('Actualizado', 'Registro actualizado', 'success');
                    getRegistros();
                    limpiarForm();
                })
                .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
        } else {
            Axios.post('http://localhost:3001/create-evaluacion', data)
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
        setEvaluacion(reg.evaluacion || '');
        setDescr(reg.descr || '');
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
                Axios.delete(`http://localhost:3001/delete-evaluacion/${id}`)
                    .then(() => {
                        Swal.fire('Eliminado', 'Registro eliminado', 'success');
                        getRegistros();
                    })
                    .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
            }
        });
    }

    return (


        
        <div className="container-fluid px-0">
            <ModuleTitleBar title="Gestión de Evaluaciones" />
            <div className="card p-3">
                
                <form onSubmit={handleSubmit}>
                    <div className="row">
                        <div className="col-md-4 mb-2">
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
                        <div className="col-md-4 mb-2">
                            <label>Evaluación</label>

<input
                                type="text"
                                className="form-control"
                                value={evaluacion}
                                onChange={e => setEvaluacion(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-8 mb-2">
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
                                <th>Evaluación</th>
                                <th>Descripción</th>
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
                                    <td>{reg.evaluacion}</td>
                                    <td>{reg.descr}</td>
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
    )
}

export default Evaluaciones;