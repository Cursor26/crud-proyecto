import { useState, useEffect } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';

const SegSeguridad = () => {
    const [registros, setRegistros] = useState([]);
    const [idTabla, setIdTabla] = useState('');
    const [cantUno, setCantUno] = useState('');
    const [descUno, setDescUno] = useState('');
    const [cantDos, setCantDos] = useState('');
    const [descDos, setDescDos] = useState('');
    const [cantTres, setCantTres] = useState('');
    const [descTres, setDescTres] = useState('');
    const [editando, setEditando] = useState(false);
    const [idOriginal, setIdOriginal] = useState('');
    const { empleados, nombrePorCarnet } = useEmpleadosOptions();

    const getRegistros = () => {
        Axios.get('http://localhost:3001/segseguridad')
            .then(res => setRegistros(res.data))
            .catch(err => console.error('Error al cargar:', err));
    };

    useEffect(() => {
        getRegistros();
    }, []);

    const limpiarForm = () => {
        setIdTabla('');
        setCantUno('');
        setDescUno('');
        setCantDos('');
        setDescDos('');
        setCantTres('');
        setDescTres('');
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
            cant_accuno: cantUno,
            desc_uno: descUno,
            cant_accdos: cantDos,
            desc_dos: descDos,
            cant_acctres: cantTres,
            desc_tres: descTres
        };

        if (editando) {
            Axios.put(`http://localhost:3001/update-segseguridad/${idOriginal}`, data)
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
            Axios.post('http://localhost:3001/create-segseguridad', data)
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
        setCantUno(reg.cant_accuno || '');
        setDescUno(reg.desc_uno || '');
        setCantDos(reg.cant_accdos || '');
        setDescDos(reg.desc_dos || '');
        setCantTres(reg.cant_acctres || '');
        setDescTres(reg.desc_tres || '');
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
                Axios.delete(`http://localhost:3001/delete-segseguridad/${id}`)
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
            <ModuleTitleBar title="Gestión de Seg. Seguridad" />

            {/* Tarjeta principal */}
            <div className="card shadow-sm border-0">
                <div className="card-body">
                    {/* Barra superior de filtros / formulario compacto */}
                    <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-end mb-3 gap-3">
                        <div className="flex-grow-1">
                            <label className="form-label mb-1">Empleado</label>
                            <AppSelect
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
                            </AppSelect>
                        </div>
                    </div>

                    {/* Primer incidente */}
                    <div className="row mb-2">
                        <div className="col-md-2">
                            <label className="form-label mb-1">Cant. Accidente 1</label>
                            <input
                                placeholder="🔢 Cantidad"
                                type="number"
                                className="form-control form-control-sm"
                                value={cantUno}
                                onChange={e => setCantUno(e.target.value)}
                            />
                        </div>
                        <div className="col-md-10">
                            <label className="form-label mb-1">Descripción 1</label>
                            <input
                                placeholder="📋 Descripción"
                                type="text"
                                className="form-control form-control-sm"
                                value={descUno}
                                onChange={e => setDescUno(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Segundo incidente */}
                    <div className="row mb-2">
                        <div className="col-md-2">
                            <label className="form-label mb-1">Cant. Accidente 2</label>
                            <input
                                placeholder="🔢 Cantidad"
                                type="number"
                                className="form-control form-control-sm"
                                value={cantDos}
                                onChange={e => setCantDos(e.target.value)}
                            />
                        </div>
                        <div className="col-md-10">
                            <label className="form-label mb-1">Descripción 2</label>
                            <input
                                placeholder="📋 Descripción"
                                type="text"
                                className="form-control form-control-sm"
                                value={descDos}
                                onChange={e => setDescDos(e.target.value)}
                            />
                        </div>
                    </div>
 {/* Tercer incidente */}
                    <div className="row mb-2">
                        <div className="col-md-2">
                            <label className="form-label mb-1">Cant. Accidente 3</label>
                            <input
                                placeholder="🔢 Cantidad"
                                type="number"
                                className="form-control form-control-sm"
                                value={cantTres}
                                onChange={e => setCantTres(e.target.value)}
                            />
                        </div>
                        <div className="col-md-10">
                            <label className="form-label mb-1">Descripción 3</label>
                            <input
                                placeholder="📋 Descripción"
                                type="text"
                                className="form-control form-control-sm"
                                value={descTres}
                                onChange={e => setDescTres(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="d-flex gap-2 mt-3">
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

                    <hr className="mt-3" />

                    {/* Encabezado de tabla y contador */}
                    <h6 className="mb-2">Registros de seguridad</h6>

                    {/* Tabla responsiva dentro de la tarjeta */}
                    <div className="table-responsive">
                        <table className="table table-data-compact table-sm table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Empleado</th>
                                    <th>Cant1</th>
                                    <th>Desc1</th>
                                    <th>Cant2</th>
                                    <th>Desc2</th>
                                    <th>Cant3</th>
                                    <th>Desc3</th>
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
                                        <td>{reg.cant_accuno}</td>
                                        <td>{reg.desc_uno}</td>
                                        <td>{reg.cant_accdos}</td>
                                        <td>{reg.desc_dos}</td>
                                        <td>{reg.cant_acctres}</td>
                                        <td>{reg.desc_tres}</td>
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

export default SegSeguridad;