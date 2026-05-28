
import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { useEmpleadosOptions } from '../hooks/useEmpleadosOptions';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import ModuleTitleBar from './ModuleTitleBar';
import { fmtFechaTabla } from '../utils/formatDates';
import AppSelect from './AppSelect';
import { FormModal } from './FormModal';
import ListSearchToolbar from './ListSearchToolbar';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import { CURSO_TIPOS } from '../constants/hrCatalogos';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import { AEPG_TITULO_RRHH } from '../utils/exportAepgPlantilla';

const Cursos = () => {
    const puedeEscribir = usePuedeEscribir();
    const [registros, setRegistros] = useState([]);
    const [idTabla, setIdTabla] = useState('');
    const [cursoSel, setCursoSel] = useState(CURSO_TIPOS[0]);
    const [cursoOtro, setCursoOtro] = useState('');
    const [descr, setDescr] = useState('');
    const [logrado, setLogrado] = useState(false);
    const [fechaFin, setFechaFin] = useState('');
    const [editando, setEditando] = useState(false);
    const [idOriginal, setIdOriginal] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [busq, setBusq] = useState('');
    const { empleados, nombrePorCarnet } = useEmpleadosOptions();

    const getRegistros = () => {
        Axios.get('/cursos')
            .then((res) => {
                const datos = res.data.map((item) => ({
                    ...item,
                    fech_fin_curso: item.fech_fin_curso ? item.fech_fin_curso.split('T')[0] : '',
                }));
                setRegistros(datos);
            })
            .catch((err) => console.error('Error al cargar:', err));
    };

    useEffect(() => {
        getRegistros();
    }, []);

    const cursoNombre = () => (cursoSel === 'Otro' ? cursoOtro.trim() : cursoSel);

    const limpiarForm = () => {
        setIdTabla('');
        setCursoSel(CURSO_TIPOS[0]);
        setCursoOtro('');
        setDescr('');
        setLogrado(false);
        setFechaFin('');
        setEditando(false);
        setIdOriginal('');
    };

    const guardar = () => {
        if (!idTabla) {
            Swal.fire('Error', 'El empleado es obligatorio', 'warning');
            return;
        }
        const curso = cursoNombre();
        if (!curso) {
            Swal.fire('Error', 'Indicá el curso o el texto en "Otro"', 'warning');
            return;
        }
        const data = { id_tabla: idTabla, curso, descr, logrado, fech_fin_curso: fechaFin || null };
        if (editando) {
            Axios.put(`/update-curso/${idOriginal}`, data)
                .then(() => {
                    Swal.fire('Actualizado', 'Registro actualizado', 'success');
                    getRegistros();
                    limpiarForm();
                    setShowModal(false);
                })
                .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
        } else {
            Axios.post('/create-curso', data)
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
        const t = reg.curso || '';
        if (CURSO_TIPOS.filter((x) => x !== 'Otro').includes(t)) {
            setCursoSel(t);
            setCursoOtro('');
        } else {
            setCursoSel('Otro');
            setCursoOtro(t);
        }
        setDescr(reg.descr || '');
        setLogrado(reg.logrado === 1 || reg.logrado === true);
        setFechaFin(reg.fech_fin_curso || '');
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
                Axios.delete(`/delete-curso/${id}`)
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
            const s = `${reg.id_tabla} ${reg.curso} ${reg.descr} ${reg.fech_fin_curso} ${nombrePorCarnet(reg.id_tabla) || ''}`.toLowerCase();
            return s.includes(t);
        });
    }, [registros, busq, nombrePorCarnet]);

    const cursosExportAepg = useMemo(() => {
        const headers = ['Carnet', 'Empleado', 'Curso', 'Descripción', 'Logrado', 'Fecha fin curso'];
        const dataRows = filtrados.map((reg) => [
            reg.id_tabla,
            nombrePorCarnet(reg.id_tabla) || '—',
            reg.curso != null ? String(reg.curso) : '—',
            reg.descr != null && reg.descr !== '' ? String(reg.descr) : '—',
            reg.logrado === 1 || reg.logrado === true ? 'Sí' : 'No',
            reg.fech_fin_curso != null && reg.fech_fin_curso !== '' ? String(reg.fech_fin_curso) : '—',
        ]);
        return { headers, dataRows };
    }, [filtrados, nombrePorCarnet]);

    return (
        <div className="container-fluid px-0">
            <ModuleTitleBar
                title="Gestión de Cursos"
                actions={
                    <>
                        <ExportacionAepgGrupo
                            tituloSistema={AEPG_TITULO_RRHH}
                            subtitulo="Reporte: cursos y formación de personal."
                            descripcion="Listado filtrado: empleado, curso, descripción, finalización (sin acciones)."
                            nombreBaseArchivo={`AEPG_cursos_${new Date().toISOString().slice(0, 10)}`}
                            sheetName="Cursos"
                            headers={cursosExportAepg.headers}
                            dataRows={cursosExportAepg.dataRows}
                            disabled={!registros.length}
                        />
                    <button type="button" className="btn btn-primary btn-form-nowrap" onClick={() => { limpiarForm(); setShowModal(true); }} disabled={!puedeEscribir}>
                        + Curso
                    </button>
                    </>
                }
            />
            <div className="card p-3">
                <ListSearchToolbar value={busq} onChange={setBusq} placeholder="Empleado, curso, descripción, fechas…" />
                <h6 className="mb-2">Registros ({filtrados.length} de {registros.length})</h6>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table table-data-compact table-bordered table-striped">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Curso</th>
                                <th>Descripción</th>
                                <th>Logrado</th>
                                <th>Fecha Fin</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted py-4">
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
                                        <td>{reg.curso}</td>
                                        <td>{reg.descr}</td>
                                        <td>{reg.logrado ? 'Sí' : 'No'}</td>
                                        <td className="text-nowrap">{fmtFechaTabla(reg.fech_fin_curso)}</td>
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
                title={editando ? 'Editar curso' : 'Nuevo curso'}
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
                        <label className="form-label">Curso</label>
                        <AppSelect className="form-select" value={cursoSel} onChange={(e) => setCursoSel(e.target.value)}>
                            {CURSO_TIPOS.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </AppSelect>
                    </div>
                    {cursoSel === 'Otro' && (
                        <div className="col-12">
                            <label className="form-label">Especificar</label>
                            <input className="form-control" value={cursoOtro} onChange={(e) => setCursoOtro(e.target.value)} />
                        </div>
                    )}
                    <div className="col-12 col-md-4">
                        <label className="form-label">Fecha fin</label>
                        <input type="date" className="form-control" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                    </div>
                    <div className="col-12 col-md-4 d-flex align-items-end">
                        <div className="form-check">
                            <input type="checkbox" className="form-check-input" id="logC" checked={logrado} onChange={(e) => setLogrado(e.target.checked)} />
                            <label className="form-check-label" htmlFor="logC">Logrado</label>
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

export default Cursos;
