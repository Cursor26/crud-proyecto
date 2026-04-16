
import { useState, useEffect } from 'react';
import Axios from 'axios';

   
   import '../App.css';


import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';

const Asistencias = () => {




 const showHello = () => {
 alert('Hola Mundo');
    };


    const [registros, setRegistros] = useState([]);
    const [idTabla, setIdTabla] = useState('');
    const [codigo, setCodigo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [horas, setHoras] = useState('');
    const [editando, setEditando] = useState(false);
    const [idOriginal, setIdOriginal] = useState('');
    const { empleados, nombrePorCarnet } = useEmpleadosOptions();

    const getRegistros = () => {
        Axios.get('http://localhost:3001/asistencias')
            .then(res => setRegistros(res.data))
            .catch(err => console.error('Error al cargar:', err));
    };    useEffect(() => {
        getRegistros();
    }, []);    const limpiarForm = () => {
        setIdTabla('');
        setCodigo('');
        setDescripcion('');
        setHoras('');
        setEditando(false);
        setIdOriginal('');
    };    const handleSubmit = (e) => {
        e.preventDefault();
        if (!idTabla) {
            Swal.fire('Error', 'El ID de tabla es obligatorio', 'warning');
            return;
        }
        const data = {
            id_tabla: idTabla,
            codigo_asistencia: codigo,
            desc_causas: descripcion,
            horas_trabajadas: horas
        };        if (editando) {
            Axios.put(`http://localhost:3001/update-asistencia/${idOriginal}`, data)
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
            Axios.post('http://localhost:3001/create-asistencia', data)
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
    };    const editarRegistro = (reg) => {
        setEditando(true);
        setIdOriginal(reg.id_tabla);
        setIdTabla(String(reg.id_tabla ?? ''));
        setCodigo(reg.codigo_asistencia || '');
        setDescripcion(reg.desc_causas || '');
        setHoras(reg.horas_trabajadas || '');
    };    const eliminarRegistro = (id) => {
        Swal.fire({
            title: '¿Eliminar?',
            text: `Se eliminará el registro con ID ${id}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí'
        }).then(result => {
            if (result.isConfirmed) {
                Axios.delete(`http://localhost:3001/delete-asistencia/${id}`)
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
    };    return (
        <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
            {/* Encabezado tipo dashboard */}
            <div className="d-flex justify-content-between align-items-center mt-0">
                <div>
                    <h4 className="">Gestión de Asistencias</h4>

                    




                    <small className="text-muted">
                        Administración de causas de asistencia y horas trabajadas
                    </small>
                </div>
                <div>
{/*                     <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={getRegistros}
                    >
                        Actualizar lista
                    </button> */}
                </div>
            </div>            {/* Tarjeta principal */}
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
                        <div style={{ minWidth: 180 }}>
                            <label className="form-label mb-1">Código Asistencia</label>
                            <input
                            placeholder='💻 Código asistencia'
                                type="text"
                                className="form-control form-control-sm"
                                value={codigo}
                                onChange={e => setCodigo(e.target.value)}
                            />
                        </div>
                        <div style={{ minWidth: 150 }}>
                            <label className="form-label mb-1">Horas Trabajadas</label>
                            <input
                             placeholder='⏳ Horas trabajadas'
                                type="number"
                                step="0.01"
                                className="form-control form-control-sm"
                                value={horas}
                                onChange={e => setHoras(e.target.value)}
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
                    </div>                    {/* Descripción en una fila aparte */}
                    <div className="mb-3">
                        <label className="form-label mb-1">Descripción de Causas</label>
                        <textarea
                            placeholder='📋 Descripción'
                            className="form-control form-control-sm"
                            rows="2"
                            value={descripcion}
                            onChange={e => setDescripcion(e.target.value)}
                        />
                    </div>                    {/* Línea separadora */}
                    <hr className="mt-0" />                    {/* Encabezado de tabla y contador */}
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">Registros de asistencias</h6>
                        <small className="text-muted">
                            Total registros: {registros.length}
                        </small>
                    </div>                    {/* Tabla responsiva dentro de la tarjeta */}
                    <div className="table-responsive">
                        <table className="table table-sm table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th style={{ width: '18%' }}>Empleado</th>
                                    <th style={{ width: '15%' }}>Código</th>
                                    <th>Descripción causas</th>
                                    <th style={{ width: '12%' }}>Horas</th>
                                    <th style={{ width: '16%' }} className="text-center">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {registros.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="text-center text-muted py-3">
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
                                        <td>{reg.codigo_asistencia}</td>
                                        <td style={{ maxWidth: 320 }}>
                                            <span className="text-truncate d-inline-block" style={{ maxWidth: '100%' }}>
                                                {reg.desc_causas}
                                            </span>
                                        </td>
                                        <td>{reg.horas_trabajadas}</td>
                                        <td className="text-center">
                                            <EditTableActionButton onClick={() => editarRegistro(reg)} className="me-1" />
                                            <DeleteTableActionButton onClick={() => eliminarRegistro(reg.id_tabla)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>                </div>
            </div>
        </div>
    );
};export default Asistencias;