
import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';
import { FormModal } from './FormModal';
import ListSearchToolbar from './ListSearchToolbar';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import { EVALUACION_ESTADO_OPCIONES } from '../constants/hrCatalogos';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

const EVAL_OPTS = EVALUACION_ESTADO_OPCIONES.filter(Boolean);

const Evaluaciones = () => {
    const puedeEscribir = usePuedeEscribir();
    const [registros, setRegistros] = useState([]);
    const [idTabla, setIdTabla] = useState('');
    const [evaluacion, setEvaluacion] = useState(EVAL_OPTS[0] || 'Pendiente');
    const [descr, setDescr] = useState('');
    const [editando, setEditando] = useState(false);
    const [idOriginal, setIdOriginal] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [busq, setBusq] = useState('');
    const { empleados, nombrePorCarnet } = useEmpleadosOptions();

    const getRegistros = () => {
        Axios.get('/evaluaciones')
            .then((res) => setRegistros(res.data))
            .catch((err) => console.error('Error al cargar:', err));
    };

    useEffect(() => {
        getRegistros();
    }, []);

    const limpiarForm = () => {
        setIdTabla('');
        setEvaluacion(EVAL_OPTS[0] || 'Pendiente');
        setDescr('');
        setEditando(false);
        setIdOriginal('');
    };

    const guardar = () => {
        if (!idTabla) {
            Swal.fire('Error', 'El empleado es obligatorio', 'warning');
            return;
        }
        const data = { id_tabla: idTabla, evaluacion, descr };
        if (editando) {
            Axios.put(`/update-evaluacion/${idOriginal}`, data)
                .then(() => {
                    Swal.fire('Actualizado', 'Registro actualizado', 'success');
                    getRegistros();
                    limpiarForm();
                    setShowModal(false);
                })
                .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
        } else {
            Axios.post('/create-evaluacion', data)
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
        setEvaluacion(EVAL_OPTS.includes(reg.evaluacion) ? reg.evaluacion : EVAL_OPTS[0]);
        setDescr(reg.descr || '');
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
                Axios.delete(`/delete-evaluacion/${id}`)
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
            const s = `${reg.id_tabla} ${reg.evaluacion} ${reg.descr} ${nombrePorCarnet(reg.id_tabla) || ''}`.toLowerCase();
            return s.includes(t);
        });
    }, [registros, busq, nombrePorCarnet]);

    const evaluacionesExportAepg = useMemo(() => {
        const headers = ['Carnet', 'Empleado', 'Evaluación', 'Descripción'];
        const dataRows = filtrados.map((reg) => [
            reg.id_tabla,
            nombrePorCarnet(reg.id_tabla) || '—',
            reg.evaluacion != null ? String(reg.evaluacion) : '—',
            reg.descr != null && reg.descr !== '' ? String(reg.descr) : '—',
        ]);
        return { headers, dataRows };
    }, [filtrados, nombrePorCarnet]);

    return (
        <div className="container-fluid px-0">
            <ModuleTitleBar
                title="Gestión de Evaluaciones"
                actions={
                    <>
                        <ExportacionAepgGrupo
                            tituloSistema={AEPG_TITULO_RRHH}
                            subtitulo="Reporte: evaluaciones de desempeño."
                            descripcion="Listado filtrado: empleado, estado y descripción (sin acciones)."
                            nombreBaseArchivo={`AEPG_evaluaciones_${new Date().toISOString().slice(0, 10)}`}
                            sheetName="Evaluaciones"
                            headers={evaluacionesExportAepg.headers}
                            dataRows={evaluacionesExportAepg.dataRows}
                            disabled={!registros.length}
                        />
                    <button type="button" className="btn btn-primary btn-form-nowrap" onClick={() => { limpiarForm(); setShowModal(true); }} disabled={!puedeEscribir}>
                        + Evaluación
                    </button>
                    </>
                }
            />
            <div className="card p-3">
                <ListSearchToolbar value={busq} onChange={setBusq} placeholder="Empleado, evaluación, descripción…" />
                <h6 className="mb-2">Registros ({filtrados.length} de {registros.length})</h6>
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
                            {filtrados.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center text-muted py-4">No hay registros.</td>
                                </tr>
                            ) : (
                                filtrados.map((reg) => (
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <FormModal
                show={showModal}
                onHide={() => { setShowModal(false); limpiarForm(); }}
                title={editando ? 'Editar evaluación' : 'Nueva evaluación'}
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
                        <label className="form-label">Evaluación</label>
                        <AppSelect className="form-select" value={evaluacion} onChange={(e) => setEvaluacion(e.target.value)}>
                            {EVAL_OPTS.map((o) => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </AppSelect>
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

export default Evaluaciones;
