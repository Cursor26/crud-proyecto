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
import { NIVEL_ACCESO_SEG } from '../constants/hrCatalogos';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

const ACC_OPTS = NIVEL_ACCESO_SEG.filter(Boolean);

const Seguridad = () => {
    const puedeEscribir = usePuedeEscribir();
    const [registros, setRegistros] = useState([]);
    const [idTabla, setIdTabla] = useState('');
    const [accesoSel, setAccesoSel] = useState(ACC_OPTS[0]);
    const [accesoOtro, setAccesoOtro] = useState('');
    const [editando, setEditando] = useState(false);
    const [idOriginal, setIdOriginal] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [busq, setBusq] = useState('');
    const { empleados, nombrePorCarnet } = useEmpleadosOptions();

    const getRegistros = () => {
        Axios.get('/seguridad')
            .then((res) => setRegistros(res.data))
            .catch((err) => console.error('Error al cargar:', err));
    };

    useEffect(() => {
        getRegistros();
    }, []);

    const accesoTexto = () => (accesoSel === 'Otro' ? accesoOtro.trim() : accesoSel);

    const limpiarForm = () => {
        setIdTabla('');
        setAccesoSel(ACC_OPTS[0]);
        setAccesoOtro('');
        setEditando(false);
        setIdOriginal('');
    };

    const guardar = () => {
        if (!idTabla) {
            Swal.fire('Error', 'El empleado es obligatorio', 'warning');
            return;
        }
        const acceso = accesoTexto();
        if (!acceso) {
            Swal.fire('Error', 'Indicá el tipo de acceso o el texto en "Otro"', 'warning');
            return;
        }
        const data = { id_tabla: idTabla, acceso };
        if (editando) {
            Axios.put(`/update-seguridad/${idOriginal}`, data)
                .then(() => {
                    Swal.fire('Actualizado', 'Registro actualizado', 'success');
                    getRegistros();
                    limpiarForm();
                    setShowModal(false);
                })
                .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
        } else {
            Axios.post('/create-seguridad', data)
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
        const t = reg.acceso || '';
        if (ACC_OPTS.filter((x) => x !== 'Otro').includes(t)) {
            setAccesoSel(t);
            setAccesoOtro('');
        } else {
            setAccesoSel('Otro');
            setAccesoOtro(t);
        }
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
                Axios.delete(`/delete-seguridad/${id}`)
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
            const s = `${reg.id_tabla} ${reg.acceso} ${nombrePorCarnet(reg.id_tabla) || ''}`.toLowerCase();
            return s.includes(t);
        });
    }, [registros, busq, nombrePorCarnet]);

    const seguridadExportAepg = useMemo(() => {
        const headers = ['Carnet', 'Empleado', 'Nivel de acceso'];
        const dataRows = filtrados.map((reg) => [
            reg.id_tabla,
            nombrePorCarnet(reg.id_tabla) || '—',
            reg.acceso != null ? String(reg.acceso) : '—',
        ]);
        return { headers, dataRows };
    }, [filtrados, nombrePorCarnet]);

    return (
        <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
            <ModuleTitleBar
                title="Gestión de Seguridad"
                actions={
                    <>
                        <ExportacionAepgGrupo
                            tituloSistema={AEPG_TITULO_RRHH}
                            subtitulo="Reporte: niveles de acceso y seguridad."
                            descripcion="Listado filtrado: empleado y acceso (sin acciones)."
                            nombreBaseArchivo={`AEPG_seguridad_acceso_${new Date().toISOString().slice(0, 10)}`}
                            sheetName="Seguridad"
                            headers={seguridadExportAepg.headers}
                            dataRows={seguridadExportAepg.dataRows}
                            disabled={!registros.length}
                        />
                    <button type="button" className="btn btn-primary btn-sm btn-form-nowrap" onClick={() => { limpiarForm(); setShowModal(true); }} disabled={!puedeEscribir}>
                        + Registro
                    </button>
                    </>
                }
            />
            <div className="card shadow-sm border-0">
                <div className="card-body">
                    <ListSearchToolbar value={busq} onChange={setBusq} placeholder="Empleado, acceso, carnet…" />
                    <h6 className="mb-2">Registros ({filtrados.length} de {registros.length})</h6>
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
                                            <td>{reg.acceso}</td>
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
                title={editando ? 'Editar seguridad' : 'Nuevo registro de seguridad'}
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
                    <div className="col-12 col-md-6">
                        <label className="form-label">Nivel de acceso</label>
                        <AppSelect className="form-select" value={accesoSel} onChange={(e) => setAccesoSel(e.target.value)}>
                            {ACC_OPTS.map((o) => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </AppSelect>
                    </div>
                    {accesoSel === 'Otro' && (
                        <div className="col-12">
                            <label className="form-label">Especificar</label>
                            <input className="form-control" value={accesoOtro} onChange={(e) => setAccesoOtro(e.target.value)} />
                        </div>
                    )}
                </div>
            </FormModal>
        </div>
    );
};

export default Seguridad;
