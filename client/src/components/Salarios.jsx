import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';
import { FormModal } from './FormModal';
import ListSearchToolbar from './ListSearchToolbar';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import { parseNonNegativeNumber } from '../utils/validation';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

const Salarios = () => {
    const puedeEscribir = usePuedeEscribir();
    const [registros, setRegistros] = useState([]);
    const [idTabla, setIdTabla] = useState('');
    const [salarioNeto, setSalarioNeto] = useState('');
    const [editando, setEditando] = useState(false);
    const [idOriginal, setIdOriginal] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [busq, setBusq] = useState('');
    const { empleados, nombrePorCarnet } = useEmpleadosOptions();

    const getRegistros = () => {
        Axios.get('/salarios')
            .then((res) => setRegistros(res.data))
            .catch((err) => console.error('Error al cargar:', err));
    };

    useEffect(() => {
        getRegistros();
    }, []);

    const limpiarForm = () => {
        setIdTabla('');
        setSalarioNeto('');
        setEditando(false);
        setIdOriginal('');
    };

    const guardar = () => {
        if (!idTabla) {
            Swal.fire('Error', 'El empleado es obligatorio', 'warning');
            return;
        }
        const n = parseNonNegativeNumber(salarioNeto, { allowEmpty: true });
        if (salarioNeto !== '' && n == null) {
            Swal.fire('Error', 'Salario no válido', 'warning');
            return;
        }
        const data = { id_tabla: idTabla, salario_neto: n != null ? String(n) : salarioNeto };
        if (editando) {
            Axios.put(`/update-salario/${idOriginal}`, data)
                .then(() => {
                    Swal.fire('Actualizado', 'Registro actualizado', 'success');
                    getRegistros();
                    limpiarForm();
                    setShowModal(false);
                })
                .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
        } else {
            Axios.post('/create-salario', data)
                .then(() => {
                    Swal.fire('Creado', 'Registro creado', 'success');
                    getRegistros();
                    limpiarForm();
                    setShowModal(false);
                })
                .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
        }
    };

    const editarRegistro = (reg) => {
        setEditando(true);
        setIdOriginal(reg.id_tabla);
        setIdTabla(String(reg.id_tabla ?? ''));
        setSalarioNeto(reg.salario_neto != null ? String(reg.salario_neto) : '');
        setShowModal(true);
    };

    const eliminarRegistro = (id) => {
        Swal.fire({
            title: '¿Eliminar?',
            text: `Se eliminará el registro con ID ${id}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí',
        }).then((result) => {
            if (result.isConfirmed) {
                Axios.delete(`/delete-salario/${id}`)
                    .then(() => {
                        Swal.fire('Eliminado', 'Registro eliminado', 'success');
                        getRegistros();
                    })
                    .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
            }
        });
    };

    const filtrados = useMemo(() => {
        const t = busq.trim().toLowerCase();
        if (!t) return registros;
        return registros.filter((reg) => {
            const s = `${reg.id_tabla} ${reg.salario_neto} ${nombrePorCarnet(reg.id_tabla) || ''}`.toLowerCase();
            return s.includes(t);
        });
    }, [registros, busq, nombrePorCarnet]);

    const salariosExportAepg = useMemo(() => {
        const headers = ['Carnet', 'Empleado', 'Salario neto'];
        const dataRows = filtrados.map((reg) => [
            reg.id_tabla,
            nombrePorCarnet(reg.id_tabla) || '—',
            reg.salario_neto != null && reg.salario_neto !== '' ? String(reg.salario_neto) : '—',
        ]);
        return { headers, dataRows };
    }, [filtrados, nombrePorCarnet]);

    return (
        <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
            <ModuleTitleBar
                title="Gestión de Salarios"
                actions={
                    <>
                        <ExportacionAepgGrupo
                            tituloSistema={AEPG_TITULO_RRHH}
                            subtitulo="Reporte: salarios netos por empleado."
                            descripcion="Listado filtrado: carnet, empleado e importe (sin acciones; datos confidenciales — maneje el archivo con cuidado)."
                            nombreBaseArchivo={`AEPG_salarios_${new Date().toISOString().slice(0, 10)}`}
                            sheetName="Salarios"
                            headers={salariosExportAepg.headers}
                            dataRows={salariosExportAepg.dataRows}
                            disabled={!registros.length}
                        />
                    <button type="button" className="btn btn-primary btn-sm btn-form-nowrap" onClick={() => { limpiarForm(); setShowModal(true); }} disabled={!puedeEscribir}>
                        + Salario
                    </button>
                    </>
                }
            />
            <div className="card shadow-sm border-0">
                <div className="card-body">
                    <ListSearchToolbar value={busq} onChange={setBusq} placeholder="Empleado, carnet, importe de salario…" />
                    <h6 className="mb-2">Registros ({filtrados.length} de {registros.length})</h6>
                    <div className="table-responsive">
                        <table className="table table-data-compact table-sm table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th style={{ width: '40%' }}>Empleado</th>
                                    <th style={{ width: '40%' }}>Salario neto</th>
                                    <th style={{ width: '20%' }} className="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="text-center text-muted py-3">No hay registros.</td>
                                    </tr>
                                ) : (
                                    filtrados.map((reg) => (
                                        <tr key={reg.id_tabla}>
                                            <td>
                                                <div>{nombrePorCarnet(reg.id_tabla) || '—'}</div>
                                                <small className="text-muted">{reg.id_tabla}</small>
                                            </td>
                                            <td>{reg.salario_neto}</td>
                                            <td className="text-center">
                                                <EditTableActionButton onClick={() => editarRegistro(reg)} className="me-1" />
                                                <DeleteTableActionButton onClick={() => eliminarRegistro(reg.id_tabla)} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <FormModal
                show={showModal}
                onHide={() => { setShowModal(false); limpiarForm(); }}
                title={editando ? 'Editar salario' : 'Nuevo salario'}
                onPrimary={guardar}
                primaryLabel={editando ? 'Actualizar' : 'Guardar'}
                primaryDisabled={!puedeEscribir}
            >
                <div className="row g-2">
                    <div className="col-12">
                        <label className="form-label">Empleado</label>
                        <AppSelect className="form-select" value={idTabla} onChange={(e) => setIdTabla(e.target.value)} disabled={editando} required>
                            <option value="" disabled hidden>— Seleccione empleado —</option>
                            {empleados.map((emp) => (
                                <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                                    {emp.carnet_identidad} — {emp.nombre} {emp.apellidos}
                                </option>
                            ))}
                        </AppSelect>
                    </div>
                    <div className="col-12">
                        <label className="form-label">Salario neto</label>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="form-control"
                            value={salarioNeto}
                            onChange={(e) => setSalarioNeto(e.target.value)}
                        />
                    </div>
                </div>
            </FormModal>
        </div>
    );
};

export default Salarios;
