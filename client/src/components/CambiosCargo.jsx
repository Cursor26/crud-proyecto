import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import '../App.css';
import Swal from 'sweetalert2';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';
import { FormModal } from './FormModal';
import ListSearchToolbar from './ListSearchToolbar';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import { fmtFechaTabla } from '../utils/formatDates';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';

const esActivo = (e) => e.activo == null || e.activo === 1 || e.activo === '1';

const CambiosCargo = () => {
  const puedeEscribir = usePuedeEscribir();
  const [empleados, setEmpleados] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [carnet, setCarnet] = useState('');
  const [puestoSel, setPuestoSel] = useState('');
  const [puestoOtro, setPuestoOtro] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showHistModal, setShowHistModal] = useState(false);
  const [busq, setBusq] = useState('');
  const [histBusq, setHistBusq] = useState('');
  const [historial, setHistorial] = useState([]);
  const [editH, setEditH] = useState(null);
  const [hTipo, setHTipo] = useState('puesto');
  const [hAnt, setHAnt] = useState('');
  const [hNue, setHNue] = useState('');

  const cargarHistorial = () => {
    Axios.get('/historial-laboral?limite=500')
      .then((r) => setHistorial(r.data || []))
      .catch((err) => {
        console.error(err);
        setHistorial([]);
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      });
  };

  const cargar = () => {
    Axios.get('/empleados')
      .then((res) => {
        const ordenados = [...res.data].sort((a, b) => `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es'));
        setEmpleados(ordenados);
      })
      .catch((err) => {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      });
  };

  useEffect(() => {
    cargar();
    cargarHistorial();
    Axios.get('/cargos')
      .then((r) => setCargos((r.data || []).filter((c) => c.activo == 1 || c.activo == null)))
      .catch(() => setCargos([]));
  }, []);

  const nombresCargo = useMemo(
    () => [...new Set(cargos.map((c) => c.nombre).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [cargos]
  );

  const puestoNuevo = () => (puestoSel === '__otro__' ? puestoOtro.trim() : puestoSel);

  const abrirEditarHistorial = (row) => {
    setEditH(row);
    const t = String(row.tipo_cambio || 'puesto').toLowerCase();
    setHTipo(t === 'departamento' || t === 'salario' ? t : 'puesto');
    setHAnt(row.valor_anterior != null ? String(row.valor_anterior) : '');
    setHNue(row.valor_nuevo != null ? String(row.valor_nuevo) : '');
    setShowHistModal(true);
  };

  const guardarEditHistorial = () => {
    if (!editH) return;
    Axios.put(`/historial-laboral/${editH.id}`, {
      tipo_cambio: hTipo,
      valor_anterior: hAnt,
      valor_nuevo: hNue,
    })
      .then(() => {
        Swal.fire('Listo', 'Registro de historial actualizado', 'success');
        setShowHistModal(false);
        setEditH(null);
        cargarHistorial();
        cargar();
      })
      .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
  };

  const borrarMovHistorial = (row) => {
    Swal.fire({
      title: '¿Eliminar movimiento del historial?',
      text: 'No revierte el puesto actual en la ficha; solo quita el registro de auditoría. ¿Continuar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      Axios.delete(`/historial-laboral/${row.id}`)
        .then(() => {
          Swal.fire('Listo', 'Movimiento eliminado', 'success');
          cargarHistorial();
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    });
  };

  const filtradoHistorial = useMemo(() => {
    const t = histBusq.trim().toLowerCase();
    if (!t) return historial;
    return historial.filter((h) => {
      const s = `${h.carnet_identidad} ${h.nombre} ${h.apellidos} ${h.tipo_cambio} ${h.valor_anterior} ${h.valor_nuevo} ${h.fecha_cambio}`.toLowerCase();
      return s.includes(t);
    });
  }, [historial, histBusq]);

  const historialExportAepg = useMemo(() => {
    const headers = ['Fecha', 'Carnet', 'Empleado', 'Tipo', 'Valor ant.', 'Valor nue.'];
    const dataRows = filtradoHistorial.map((h) => [
      fmtFechaTabla(h.fecha_cambio),
      h.carnet_identidad,
      `${h.nombre || ''} ${h.apellidos || ''}`.trim() || '—',
      h.tipo_cambio || '—',
      h.valor_anterior != null ? String(h.valor_anterior) : '—',
      h.valor_nuevo != null ? String(h.valor_nuevo) : '—',
    ]);
    return { headers, dataRows };
  }, [filtradoHistorial]);

  const activos = empleados.filter(esActivo);
  const filtradosActivos = useMemo(() => {
    const t = busq.trim().toLowerCase();
    if (!t) return activos;
    return activos.filter((e) => {
      const s = `${e.carnet_identidad} ${e.nombre} ${e.apellidos} ${e.puesto} ${e.departamento}`.toLowerCase();
      return s.includes(t);
    });
  }, [activos, busq]);

  const seleccionado = empleados.find((e) => String(e.carnet_identidad) === String(carnet));

  const limpiar = () => {
    setCarnet('');
    setPuestoSel('');
    setPuestoOtro('');
  };

  const guardarCambio = () => {
    if (!carnet) {
      Swal.fire('Atención', 'Seleccione un empleado.', 'warning');
      return;
    }
    const pn = puestoNuevo();
    if (!pn) {
      Swal.fire('Atención', 'Indique el nuevo puesto o cargo (lista o texto en Otro).', 'warning');
      return;
    }
    Swal.fire({
      title: '¿Registrar cambio de cargo?',
      html: seleccionado
        ? `<p>De <strong>${seleccionado.puesto || '—'}</strong> a <strong>${pn}</strong>.</p>`
        : '',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      Axios.post('/empleado-cambio-cargo', {
        carnet_identidad: carnet,
        puesto_nuevo: pn,
      })
        .then(() => {
          Swal.fire('Listo', 'Cambio de cargo registrado (queda en el historial laboral).', 'success');
          limpiar();
          setShowModal(false);
          cargar();
          cargarHistorial();
        })
        .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
    });
  };

  return (
    <div className="content-wrapper p-3" style={{ backgroundColor: '#f5f7fb', minHeight: '100vh' }}>
      <ModuleTitleBar
        title="Cambios de cargo"
        actions={
          <button type="button" className="btn btn-success btn-form-nowrap" onClick={() => { limpiar(); setShowModal(true); }} disabled={!puedeEscribir}>
            Registrar cambio
          </button>
        }
      />
      <div className="card shadow-sm border-0 p-3">
        <h6 className="mb-2">Vista de personal activo</h6>
        <ListSearchToolbar value={busq} onChange={setBusq} placeholder="Carnet, nombre, puesto, departamento…" />
        <h6 className="mb-2">Mostrando {filtradosActivos.length} de {activos.length}</h6>
        <div className="table-responsive">
          <table className="table table-data-compact table-sm table-bordered table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Carnet</th>
                <th>Nombre</th>
                <th>Puesto actual</th>
                <th>Departamento</th>
              </tr>
            </thead>
            <tbody>
              {filtradosActivos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-3">Nadie con los criterios indicados.</td>
                </tr>
              ) : (
                filtradosActivos.map((e) => (
                  <tr key={e.carnet_identidad}>
                    <td>{e.carnet_identidad}</td>
                    <td>
                      {e.nombre} {e.apellidos}
                    </td>
                    <td>{e.puesto || '—'}</td>
                    <td>{e.departamento || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card shadow-sm border-0 p-3 mt-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
          <h6 className="mb-0">Historial de cambios laborales (puesto y, en registros antiguos, salario o departamento)</h6>
          <ExportacionAepgGrupo
            subtitulo="Reporte: historial laboral. Exportación AEPG."
            descripcion="Movimientos mostrados según la búsqueda del recuadro (histórico filtrado en pantalla)."
            nombreBaseArchivo={`AEPG_cambios_cargo_historial_${new Date().toISOString().slice(0, 10)}`}
            sheetName="Historial laboral"
            headers={historialExportAepg.headers}
            dataRows={historialExportAepg.dataRows}
            disabled={!filtradoHistorial.length}
          />
        </div>
        <ListSearchToolbar value={histBusq} onChange={setHistBusq} placeholder="Carnet, nombre, tipo, fechas…" />
        <p className="text-muted small mb-2">Mostrando {filtradoHistorial.length} de {historial.length} movimientos</p>
        <div className="table-responsive">
          <table className="table table-data-compact table-sm table-bordered table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Fecha</th>
                <th>Carnet</th>
                <th>Empleado</th>
                <th>Tipo</th>
                <th>Valor ant.</th>
                <th>Valor nue.</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradoHistorial.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-3">No hay movimientos o no coinciden con la búsqueda.</td>
                </tr>
              ) : (
                filtradoHistorial.map((h) => (
                  <tr key={h.id}>
                    <td className="text-nowrap">{fmtFechaTabla(h.fecha_cambio)}</td>
                    <td>{h.carnet_identidad}</td>
                    <td>
                      {h.nombre} {h.apellidos}
                    </td>
                    <td><span className="badge bg-secondary text-wrap">{h.tipo_cambio || '—'}</span></td>
                    <td style={{ maxWidth: 140, whiteSpace: 'pre-wrap' }}>{h.valor_anterior ?? '—'}</td>
                    <td style={{ maxWidth: 140, whiteSpace: 'pre-wrap' }}>{h.valor_nuevo ?? '—'}</td>
                    <td className="text-nowrap">
                      <EditTableActionButton title="Editar registro" onClick={() => abrirEditarHistorial(h)} />
                      <DeleteTableActionButton title="Quitar del historial" onClick={() => borrarMovHistorial(h)} />
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
        onHide={() => { setShowModal(false); limpiar(); }}
        title="Registrar cambio de cargo"
        onPrimary={guardarCambio}
        primaryLabel="Guardar cambio"
        primaryDisabled={!puedeEscribir}
      >
        <div className="row g-2">
          <div className="col-12">
            <label className="form-label">Empleado (activos)</label>
            <AppSelect className="form-select" value={carnet} onChange={(e) => setCarnet(e.target.value)} required>
              <option value="" disabled hidden>— Seleccione —</option>
              {activos.map((emp) => (
                <option key={emp.carnet_identidad} value={emp.carnet_identidad}>
                  {emp.carnet_identidad} — {emp.nombre} {emp.apellidos} ({emp.puesto || 'sin puesto'})
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="col-12 col-md-8">
            <label className="form-label">Nuevo puesto / cargo</label>
            <AppSelect className="form-select" value={puestoSel} onChange={(e) => setPuestoSel(e.target.value)}>
              <option value="" disabled hidden>— Seleccione del catálogo o Otro —</option>
              {nombresCargo.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value="__otro__">Otro (especificar abajo)</option>
            </AppSelect>
          </div>
          {puestoSel === '__otro__' && (
            <div className="col-12 col-md-8">
              <label className="form-label">Especificar puesto</label>
              <input className="form-control" value={puestoOtro} onChange={(e) => setPuestoOtro(e.target.value)} required />
            </div>
          )}
          <p className="text-muted small col-12 mb-0">
            El salario neto se gestiona en el módulo <strong>Salarios</strong> (tabla <code>salarios</code>), no en la ficha de empleado.
          </p>
        </div>
      </FormModal>

      <FormModal
        show={showHistModal}
        onHide={() => {
          setShowHistModal(false);
          setEditH(null);
        }}
        title="Editar movimiento de historial"
        subtitle={editH ? `ID ${editH.id} · ${editH.carnet_identidad}` : ''}
        onPrimary={guardarEditHistorial}
        primaryLabel="Guardar"
        primaryDisabled={!puedeEscribir || !editH}
      >
        <div className="row g-2">
          <div className="col-12 col-md-4">
            <label className="form-label">Tipo de cambio</label>
            <select className="form-select" value={hTipo} onChange={(e) => setHTipo(e.target.value)}>
              <option value="puesto">puesto</option>
              <option value="departamento">departamento</option>
              <option value="salario">salario</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Valor anterior</label>
            <input className="form-control" value={hAnt} onChange={(e) => setHAnt(e.target.value)} />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Valor nuevo</label>
            <input className="form-control" value={hNue} onChange={(e) => setHNue(e.target.value)} />
          </div>
        </div>
        <p className="text-muted small mt-2 mb-0">
          Corregir datos de registro. Para cambiar el puesto vigente usá <strong>Registrar cambio</strong>. El salario neto se mantiene en el módulo Salarios.
        </p>
      </FormModal>
    </div>
  );
};

export default CambiosCargo;
