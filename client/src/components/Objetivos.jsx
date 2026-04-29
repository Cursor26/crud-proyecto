
import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import { fmtFechaTabla } from '../utils/formatDates';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';
import { FormModal } from './FormModal';
import ListSearchToolbar from './ListSearchToolbar';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import { OBJETIVO_TIPOS } from '../constants/hrCatalogos';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

const Objetivos = () => {
    const puedeEscribir = usePuedeEscribir();
    const [registros, setRegistros] = useState([]);
    const [idTabla, setIdTabla] = useState('');
    const [objSel, setObjSel] = useState(OBJETIVO_TIPOS[0]);
    const [objOtro, setObjOtro] = useState('');
    const [descr, setDescr] = useState('');
    const [logrado, setLogrado] = useState(false);
    const [fechaLogrado, setFechaLogrado] = useState('');
    const [editando, setEditando] = useState(false);
    const [idOriginal, setIdOriginal] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [busq, setBusq] = useState('');
    const { empleados, nombrePorCarnet } = useEmpleadosOptions();

    const getRegistros = () => {
        Axios.get('/objetivos')
            .then((res) => {
                const datos = res.data.map((item) => ({
                    ...item,
                    fecha_logrado: item.fecha_logrado ? item.fecha_logrado.split('T')[0] : '',
                }));
                setRegistros(datos);
            })
            .catch((err) => console.error('Error al cargar:', err));
    };

    useEffect(() => {
        getRegistros();
    }, []);

    const objetivoTexto = () => (objSel === 'Otro' ? objOtro.trim() : objSel);

    const limpiarForm = () => {
        setIdTabla('');
        setObjSel(OBJETIVO_TIPOS[0]);
        setObjOtro('');
        setDescr('');
        setLogrado(false);
        setFechaLogrado('');
        setEditando(false);
        setIdOriginal('');
    };

    const guardar = () => {
        if (!idTabla) {
            Swal.fire('Error', 'El empleado es obligatorio', 'warning');
            return;
        }
        const objetivo = objetivoTexto();
        if (!objetivo) {
            Swal.fire('Error', 'Indicá el objetivo o el texto en "Otro"', 'warning');
            return;
        }
        const data = { id_tabla: idTabla, objetivo, descr, logrado, fecha_logrado: fechaLogrado || null };
        if (editando) {
            Axios.put(`/update-objetivo/${idOriginal}`, data)
                .then(() => {
                    Swal.fire('Actualizado', 'Registro actualizado', 'success');
                    getRegistros();
                    limpiarForm();
                    setShowModal(false);
                })
                .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
        } else {
            Axios.post('/create-objetivo', data)
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
        const t = reg.objetivo || '';
        if (OBJETIVO_TIPOS.filter((x) => x !== 'Otro').includes(t)) {
            setObjSel(t);
            setObjOtro('');
        } else {
            setObjSel('Otro');
            setObjOtro(t);
        }
        setDescr(reg.descr || '');
        setLogrado(reg.logrado === 1 || reg.logrado === true);
        setFechaLogrado(reg.fecha_logrado || '');
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
                Axios.delete(`/delete-objetivo/${id}`)
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
            const s = `${reg.id_tabla} ${reg.objetivo} ${reg.descr} ${reg.fecha_logrado} ${nombrePorCarnet(reg.id_tabla) || ''}`.toLowerCase();
            return s.includes(t);
        });
    }, [registros, busq, nombrePorCarnet]);

    const objetivosExportAepg = useMemo(() => {
        const headers = ['Carnet', 'Empleado', 'Objetivo', 'Descripción', 'Logrado', 'Fecha logrado'];
        const dataRows = filtrados.map((reg) => [
            reg.id_tabla,
            nombrePorCarnet(reg.id_tabla) || '—',
            reg.objetivo != null ? String(reg.objetivo) : '—',
            reg.descr != null && reg.descr !== '' ? String(reg.descr) : '—',
            reg.logrado === 1 || reg.logrado === true ? 'Sí' : 'No',
            reg.fecha_logrado != null && reg.fecha_logrado !== '' ? String(reg.fecha_logrado) : '—',
        ]);
        return { headers, dataRows };
    }, [filtrados, nombrePorCarnet]);

    return (
        <div className="container-fluid px-0">
            <ModuleTitleBar
                title="Gestión de Objetivos"
                actions={
                    <>
                        <ExportacionAepgGrupo
                            tituloSistema={AEPG_TITULO_RRHH}
                            subtitulo="Reporte: objetivos y seguimiento."
                            descripcion="Listado filtrado: empleado, objetivo, descripción, logrado y fecha (sin acciones)."
                            nombreBaseArchivo={`AEPG_objetivos_${new Date().toISOString().slice(0, 10)}`}
                            sheetName="Objetivos"
                            headers={objetivosExportAepg.headers}
                            dataRows={objetivosExportAepg.dataRows}
                            disabled={!registros.length}
                        />
                    <button type="button" className="btn btn-primary btn-form-nowrap" onClick={() => { limpiarForm(); setShowModal(true); }} disabled={!puedeEscribir}>
                        + Objetivo
                    </button>
                    </>
                }
            />
            <div className="card p-3">
                <ListSearchToolbar value={busq} onChange={setBusq} placeholder="Empleado, objetivo, descripción, fechas…" />
                <h6 className="mb-2">Registros ({filtrados.length} de {registros.length})</h6>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table table-data-compact table-bordered table-striped">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Objetivo</th>
                                <th>Descripción</th>
                                <th>Logrado</th>
                                <th>Fecha logrado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted py-4">No hay registros.</td>
                                </tr>
                            ) : (
                                filtrados.map((reg) => (
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <FormModal
                show={showModal}
                onHide={() => { setShowModal(false); limpiarForm(); }}
                title={editando ? 'Editar objetivo' : 'Nuevo objetivo'}
                onPrimary={guardar}
                primaryLabel={editando ? 'Actualizar' : 'Guardar'}
                primaryDisabled={!puedeEscribir}
            >
                <div className="row g-2">
                    <div className="col-12 col-md-6">
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
                        <label className="form-label">Objetivo</label>
                        <AppSelect className="form-select" value={objSel} onChange={(e) => setObjSel(e.target.value)}>
                            {OBJETIVO_TIPOS.map((o) => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </AppSelect>
                    </div>
                    {objSel === 'Otro' && (
                        <div className="col-12">
                            <label className="form-label">Especificar</label>
                            <input className="form-control" value={objOtro} onChange={(e) => setObjOtro(e.target.value)} />
                        </div>
                    )}
                    <div className="col-12 col-md-4">
                        <label className="form-label">Fecha logrado</label>
                        <input type="date" className="form-control" value={fechaLogrado} onChange={(e) => setFechaLogrado(e.target.value)} />
                    </div>
                    <div className="col-12 col-md-4 d-flex align-items-end">
                        <div className="form-check">
                            <input type="checkbox" className="form-check-input" id="logO" checked={logrado} onChange={(e) => setLogrado(e.target.checked)} />
                            <label className="form-check-label" htmlFor="logO">Logrado</label>
                        </div>
                    </div>
                    <div className="col-12">
                        <label className="form-label">Descripción</label>
                        <textarea className="form-control" rows={2} value={descr} onChange={(e) => setDescr(e.target.value)} />
                    </div>
                </div>
            </FormModal>
        </div>
    );
};

export default Objetivos;
