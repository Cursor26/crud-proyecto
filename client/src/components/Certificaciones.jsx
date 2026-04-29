
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
import { CERTIFICACION_TIPOS } from '../constants/hrCatalogos';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

const Certificaciones = () => {
    const puedeEscribir = usePuedeEscribir();
    const [registros, setRegistros] = useState([]);
    const [idTabla, setIdTabla] = useState('');
    const [certSel, setCertSel] = useState('BPM');
    const [certOtro, setCertOtro] = useState('');
    const [editando, setEditando] = useState(false);
    const [idOriginal, setIdOriginal] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [busq, setBusq] = useState('');
    const { empleados, nombrePorCarnet } = useEmpleadosOptions();

    const getRegistros = () => {
        Axios.get('/certificaciones')
            .then((res) => setRegistros(res.data))
            .catch((err) => console.error('Error al cargar:', err));
    };

    useEffect(() => {
        getRegistros();
    }, []);

    const certTexto = () => (certSel === 'Otro' ? certOtro.trim() : certSel);

    const limpiarForm = () => {
        setIdTabla('');
        setCertSel('BPM');
        setCertOtro('');
        setEditando(false);
        setIdOriginal('');
    };

    const guardar = () => {
        if (!idTabla) {
            Swal.fire('Error', 'El empleado es obligatorio', 'warning');
            return;
        }
        const c = certTexto();
        if (!c) {
            Swal.fire('Error', 'Indicá la certificación o el texto en "Otro"', 'warning');
            return;
        }
        const data = { id_tabla: idTabla, certificacion: c };
        if (editando) {
            Axios.put(`/update-certificacion/${idOriginal}`, data)
                .then(() => {
                    Swal.fire('Actualizado', 'Registro actualizado', 'success');
                    getRegistros();
                    limpiarForm();
                    setShowModal(false);
                })
                .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
        } else {
            Axios.post('/create-certificacion', data)
                .then(() => {
                    Swal.fire('Creado', 'Registro creado', 'success');
                    getRegistros();
                    limpiarForm();
                    setShowModal(false);
                })
                .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
        }
    };

    const abrirNuevo = () => {
        limpiarForm();
        setShowModal(true);
    };

    const editarRegistro = (reg) => {
        setEditando(true);
        setIdOriginal(reg.id_tabla);
        setIdTabla(String(reg.id_tabla ?? ''));
        const t = reg.certificacion || '';
        if (CERTIFICACION_TIPOS.filter((x) => x !== 'Otro').includes(t)) {
            setCertSel(t);
            setCertOtro('');
        } else {
            setCertSel('Otro');
            setCertOtro(t);
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
                Axios.delete(`/delete-certificacion/${id}`)
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
            const s = `${reg.id_tabla} ${reg.certificacion} ${nombrePorCarnet(reg.id_tabla) || ''}`.toLowerCase();
            return s.includes(t);
        });
    }, [registros, busq, nombrePorCarnet]);

    const certificacionesExportAepg = useMemo(() => {
        const headers = ['Carnet', 'Empleado', 'Certificación'];
        const dataRows = filtrados.map((reg) => [
            reg.id_tabla,
            nombrePorCarnet(reg.id_tabla) || '—',
            reg.certificacion != null ? String(reg.certificacion) : '—',
        ]);
        return { headers, dataRows };
    }, [filtrados, nombrePorCarnet]);

    return (
        <div className="container-fluid px-0">
            <ModuleTitleBar
                title="Gestión de Certificaciones"
                actions={
                    <>
                        <ExportacionAepgGrupo
                            tituloSistema={AEPG_TITULO_RRHH}
                            subtitulo="Reporte: certificaciones de personal."
                            descripcion="Listado filtrado: carnet, empleado y certificación (sin acciones ni botones)."
                            nombreBaseArchivo={`AEPG_certificaciones_${new Date().toISOString().slice(0, 10)}`}
                            sheetName="Certificaciones"
                            headers={certificacionesExportAepg.headers}
                            dataRows={certificacionesExportAepg.dataRows}
                            disabled={!registros.length}
                        />
                    <button
                        type="button"
                        className="btn btn-primary btn-form-nowrap"
                        onClick={abrirNuevo}
                        disabled={!puedeEscribir}
                    >
                        + Certificación
                    </button>
                    </>
                }
            />
            <div className="card p-3">
                <ListSearchToolbar
                    value={busq}
                    onChange={setBusq}
                    placeholder="Empleado, carnet, certificación…"
                />
                <h6 className="mb-2">Registros ({filtrados.length} de {registros.length})</h6>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table table-data-compact table-bordered table-striped">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Certificación</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="text-center text-muted py-4">
                                        No hay registros con los criterios indicados.
                                    </td>
                                </tr>
                            ) : (
                                filtrados.map((reg) => (
                                    <tr key={reg.id_tabla}>
                                        <td>
                                            <div>{nombrePorCarnet(reg.id_tabla) || '—'}</div>
                                            <small className="text-muted">{reg.id_tabla}</small>
                                        </td>
                                        <td>{reg.certificacion}</td>
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
                onHide={() => {
                    setShowModal(false);
                    limpiarForm();
                }}
                title={editando ? 'Editar certificación' : 'Nueva certificación'}
                onPrimary={guardar}
                primaryLabel={editando ? 'Actualizar' : 'Guardar'}
                primaryDisabled={!puedeEscribir}
            >
                <div className="row g-2">
                    <div className="col-12 col-md-6">
                        <label className="form-label">Empleado</label>
                        <AppSelect
                            className="form-select"
                            value={idTabla}
                            onChange={(e) => setIdTabla(e.target.value)}
                            disabled={editando}
                            required
                        >
                            <option value="" disabled hidden>
                                — Seleccione empleado —
                            </option>
                            {empleados.map((emp) => (
                                <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                                    {emp.carnet_identidad} — {emp.nombre} {emp.apellidos}
                                </option>
                            ))}
                        </AppSelect>
                    </div>
                    <div className="col-12 col-md-6">
                        <label className="form-label">Certificación</label>
                        <AppSelect
                            className="form-select"
                            value={certSel}
                            onChange={(e) => setCertSel(e.target.value)}
                        >
                            {CERTIFICACION_TIPOS.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </AppSelect>
                    </div>
                    {certSel === 'Otro' && (
                        <div className="col-12">
                            <label className="form-label">Especificar</label>
                            <input
                                className="form-control"
                                value={certOtro}
                                onChange={(e) => setCertOtro(e.target.value)}
                                placeholder="Nombre de la certificación"
                            />
                        </div>
                    )}
                </div>
            </FormModal>
        </div>
    );
};

export default Certificaciones;
