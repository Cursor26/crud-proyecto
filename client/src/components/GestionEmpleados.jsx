import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { Modal, Button, Table as BTable } from 'react-bootstrap';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import { FormModal } from './FormModal';
import ModuleTitleBar from './ModuleTitleBar';
import AppSelect from './AppSelect';
import ListSearchToolbar from './ListSearchToolbar';
import { fmtFechaTabla } from '../utils/formatDates';
import {
  esCarnetEmpleado11,
  esTelefonoEmpleado8,
  filtrarSoloDigitos,
  normalizarMientrasEscribeSoloLetras,
  normalizarTextoEmpresaOSuplemento,
  razonesRevisarTextoAreaExpediente,
  razonesSugerirRevisarTextoEmpresaOsuplemento,
  esSoloBlancosOVacio,
  MSJ_OBLIGATORIO_NO_SOLO_BLANCOS,
} from '../utils/validation';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import { NIVEL_ESCOLAR_OPCIONES } from '../constants/hrCatalogos';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';

function Hint({ children, variant = 'muted' }) {
  const cls = variant === 'warning' ? 'text-warning' : variant === 'success' ? 'text-success' : 'text-muted';
  return <p className={`small ${cls} mb-0 mt-1`}>{children}</p>;
}

function GestionEmpleados() {
  const puedeEscribir = usePuedeEscribir();
  const [empCarnet, setEmpCarnet] = useState('');
  const [empNombre, setEmpNombre] = useState('');
  const [empApellidos, setEmpApellidos] = useState('');
  const [empPuesto, setEmpPuesto] = useState('');
  const [empTelefono, setEmpTelefono] = useState('');
  const [empBeneficios, setEmpBeneficios] = useState('');
  const [empAuditorias, setEmpAuditorias] = useState('');
  const [empNivelEscolar, setEmpNivelEscolar] = useState('');
  const [empSuperacion, setEmpSuperacion] = useState('');
  const [editarEmpleado, setEditarEmpleado] = useState(false);
  const [empleadosListTrue, setEmpleadosTrue] = useState([]);
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialTitulo, setHistorialTitulo] = useState('');
  const [historialRows, setHistorialRows] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [showEmpleadoModal, setShowEmpleadoModal] = useState(false);
  const [busqGeneral, setBusqGeneral] = useState('');
  const [busqCarnet, setBusqCarnet] = useState('');

  const [licRegistros, setLicRegistros] = useState([]);
  const [showLicModal, setShowLicModal] = useState(false);
  const [licEditando, setLicEditando] = useState(false);
  const [licId, setLicId] = useState('');
  const [licCarnet, setLicCarnet] = useState('');
  const [licDescrip, setLicDescrip] = useState('');
  const [licFecha, setLicFecha] = useState('');
  const [licObs, setLicObs] = useState('');
  const [licActivo, setLicActivo] = useState(true);
  const [busqLic, setBusqLic] = useState('');

  const getEmpleados = () => {
    Axios.get('/empleados')
      .then((response) => setEmpleadosTrue(response.data))
      .catch((error) => console.error('Error al cargar empleados:', error));
  };

  const getLicencias = () => {
    Axios.get('/licencias-empleado')
      .then((r) => setLicRegistros(r.data || []))
      .catch((error) => console.error('Error al cargar licencias:', error));
  };

  useEffect(() => {
    getEmpleados();
    getLicencias();
  }, []);

  const puestosComboOpciones = useMemo(() => {
    const set = new Set();
    for (const e of empleadosListTrue) {
      const p = e.puesto != null ? String(e.puesto).trim() : '';
      if (p) set.add(p);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [empleadosListTrue]);

  const confirmarNombresIrregulares = async (nom, ape) => {
    const reN = razonesSugerirRevisarTextoEmpresaOsuplemento(nom);
    const reA = razonesSugerirRevisarTextoEmpresaOsuplemento(ape);
    if (reN.length === 0 && reA.length === 0) return true;
    const bloques = [];
    if (reN.length) bloques.push(`— Nombre: ${reN.join(' · ')}.`);
    if (reA.length) bloques.push(`— Apellidos: ${reA.join(' · ')}.`);
    const { isConfirmed } = await Swal.fire({
      title: 'Revisar antes de guardar',
      html: `<p class="text-start mb-2">El sistema detectó pautas poco habituales (cifras, puntos o signos raros), igual que en empresa y suplementos de contrato. Compruebe que coincida con el documento.</p><p class="text-start small mb-0">${bloques.join(
        '<br>',
      )}</p><p class="mt-3 mb-0">¿Desea guardar de todos modos?</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Volver a revisar',
    });
    return isConfirmed;
  };

  const confirmarTextosAreaIrregulares = async () => {
    const bloques = [];
    const b = razonesRevisarTextoAreaExpediente(empBeneficios);
    const s = razonesRevisarTextoAreaExpediente(empSuperacion);
    const a = razonesRevisarTextoAreaExpediente(empAuditorias);
    if (b.length) bloques.push(`— Beneficios: ${b.join(' · ')}.`);
    if (s.length) bloques.push(`— Superación en proceso: ${s.join(' · ')}.`);
    if (a.length) bloques.push(`— Resultados de auditorías: ${a.join(' · ')}.`);
    if (bloques.length === 0) return true;
    const { isConfirmed } = await Swal.fire({
      title: 'Revisar textos largos',
      html: `<p class="text-start mb-2">Hay texto que parece irregular (por ejemplo, sin letras o con caracteres poco habituales). No es un error: solo conviene validarlo.</p><p class="text-start small mb-0">${bloques.join(
        '<br>',
      )}</p><p class="mt-3 mb-0">¿Guardar de todos modos?</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Volver a revisar',
    });
    return isConfirmed;
  };

  const pieNombreHint = (raw, etiqueta) => {
    const t = String(raw || '');
    const raz = razonesSugerirRevisarTextoEmpresaOsuplemento(normalizarTextoEmpresaOSuplemento(t));
    if (raz.length === 0) return null;
    return (
      <Hint variant="warning">
        {etiqueta}: conviene revisar ({raz.join(' · ')}).
      </Hint>
    );
  };

  const pieAreaHint = (raw) => {
    const raz = razonesRevisarTextoAreaExpediente(raw);
    if (raz.length === 0) return null;
    return (
      <Hint variant="warning">
        Texto irregular: {raz.join(' · ')}. Revise antes de guardar.
      </Hint>
    );
  };

  const enviarEmpleado = async (esEdicion) => {
    if (!esEdicion && !esCarnetEmpleado11(empCarnet)) {
      Swal.fire('Carnet', 'Debe indicar exactamente 11 dígitos numéricos (sin letras ni signos).', 'warning');
      return;
    }
    if (!esTelefonoEmpleado8(empTelefono)) {
      Swal.fire('Teléfono', 'Debe indicar exactamente 8 dígitos numéricos.', 'warning');
      return;
    }
    const nom = normalizarTextoEmpresaOSuplemento(empNombre);
    const ape = normalizarTextoEmpresaOSuplemento(empApellidos);
    if (esSoloBlancosOVacio(nom) || esSoloBlancosOVacio(ape)) {
      Swal.fire('Nombre y apellidos', MSJ_OBLIGATORIO_NO_SOLO_BLANCOS, 'warning');
      return;
    }
    const puestoVal = String(empPuesto || '').trim();
    if (!puestoVal) {
      Swal.fire('Puesto', 'El puesto es obligatorio (texto libre o elegido de la lista).', 'warning');
      return;
    }
    const nivelVal = String(empNivelEscolar || '').trim();
    if (!nivelVal) {
      Swal.fire('Nivel escolar', 'Debe seleccionar un nivel escolar.', 'warning');
      return;
    }
    const okN = await confirmarNombresIrregulares(nom, ape);
    if (!okN) return;
    const okA = await confirmarTextosAreaIrregulares();
    if (!okA) return;

    const body = {
      carnet_identidad: String(empCarnet).trim(),
      nombre: nom,
      apellidos: ape,
      puesto: puestoVal,
      telefono: String(empTelefono).trim(),
      beneficios: String(empBeneficios || '').trim() || null,
      resultados_auditorias: String(empAuditorias || '').trim() || null,
      nivel_escolar: nivelVal,
      superacion_en_proceso: String(empSuperacion || '').trim() || null,
    };

    try {
      if (esEdicion) {
        await Axios.put('/update-empleado', body);
        Swal.fire('Actualización exitosa', 'Empleado actualizado', 'success');
      } else {
        await Axios.post('/create-empleado', body);
        Swal.fire('Registro exitoso', 'Empleado agregado', 'success');
      }
      getEmpleados();
      cerrarModalEmpleado();
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || error.message, 'error');
    }
  };

  const guardarEmpleadoModal = () => {
    void enviarEmpleado(editarEmpleado);
  };

  const deleteEmpleado = (val) => {
    Swal.fire({
      title: '¿Eliminar empleado?',
      text: 'Se eliminará el empleado',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`/delete-empleado/${val.carnet_identidad}`)
          .then(() => {
            getEmpleados();
            getLicencias();
            Swal.fire('Eliminado', 'Empleado eliminado', 'success');
          })
          .catch((error) => {
            Swal.fire('Error', error.response?.data?.message || error.message, 'error');
          });
      }
    });
  };

  const cerrarModalEmpleado = () => {
    limpiarEmpleado();
    setShowEmpleadoModal(false);
  };

  const abrirModalAgregarEmpleado = () => {
    limpiarEmpleado();
    setShowEmpleadoModal(true);
  };

  const editarEmpleadoTabla = (val) => {
    setEditarEmpleado(true);
    setEmpCarnet(String(val.carnet_identidad ?? ''));
    setEmpNombre(val.nombre || '');
    setEmpApellidos(val.apellidos || '');
    setEmpPuesto(val.puesto || '');
    setEmpTelefono(val.telefono != null ? filtrarSoloDigitos(val.telefono, 8) : '');
    setEmpBeneficios(val.beneficios || '');
    setEmpAuditorias(val.resultados_auditorias || '');
    setEmpNivelEscolar(val.nivel_escolar || '');
    setEmpSuperacion(val.superacion_en_proceso || '');
    setShowEmpleadoModal(true);
  };

  const etiquetaTipoCambio = (tipo) => {
    if (tipo === 'puesto') return 'Puesto';
    if (tipo === 'departamento') return 'Departamento';
    if (tipo === 'salario') return 'Salario';
    return tipo;
  };

  const abrirHistorial = (emp) => {
    setHistorialTitulo(`${emp.nombre} ${emp.apellidos} — carnet ${emp.carnet_identidad}`);
    setShowHistorial(true);
    setHistorialLoading(true);
    setHistorialRows([]);
    Axios.get(`/historial-laboral/${emp.carnet_identidad}`)
      .then((r) => setHistorialRows(r.data))
      .catch((error) => {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
        setShowHistorial(false);
      })
      .finally(() => setHistorialLoading(false));
  };

  const empleadosFiltrados = useMemo(() => {
    const g = busqGeneral.trim().toLowerCase();
    const c = busqCarnet.trim().toLowerCase();
    return empleadosListTrue.filter((emp) => {
      if (c && !String(emp.carnet_identidad || '').toLowerCase().includes(c)) return false;
      if (!g) return true;
      const s = (v) => String(v ?? '').toLowerCase();
      return [
        s(emp.carnet_identidad),
        s(emp.nombre),
        s(emp.apellidos),
        s(emp.puesto),
        s(emp.telefono),
        s(emp.nivel_escolar),
        s(emp.superacion_en_proceso),
        s(emp.beneficios),
        s(emp.resultados_auditorias),
      ].some((x) => x.includes(g));
    });
  }, [empleadosListTrue, busqGeneral, busqCarnet]);

  const empleadosExportAoa = useMemo(() => {
    const h = [
      'Carnet',
      'Nombre',
      'Apellidos',
      'Puesto',
      'Teléfono',
      'Beneficios',
      'Nivel escolar',
      'Superación',
      'Resultados auditorías',
      'Activo',
      'Fecha baja',
      'Motivo baja',
    ];
    const r = (v) => (v == null || v === '' ? '—' : v);
    const rows = empleadosFiltrados.map((e) => [
      e.carnet_identidad,
      r(e.nombre),
      r(e.apellidos),
      r(e.puesto),
      r(e.telefono),
      r(e.beneficios),
      r(e.nivel_escolar),
      r(e.superacion_en_proceso),
      r(e.resultados_auditorias),
      e.activo == null || e.activo === 1 || e.activo === '1' ? 'Sí' : 'No',
      r(e.fecha_baja),
      r(e.motivo_baja),
    ]);
    return { h, rows };
  }, [empleadosFiltrados]);

  const limpiarEmpleado = () => {
    setEmpCarnet('');
    setEmpNombre('');
    setEmpApellidos('');
    setEmpPuesto('');
    setEmpTelefono('');
    setEmpBeneficios('');
    setEmpAuditorias('');
    setEmpNivelEscolar('');
    setEmpSuperacion('');
    setEditarEmpleado(false);
  };

  const empleadosOrdenados = useMemo(() => {
    return [...empleadosListTrue].sort((a, b) =>
      `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es'),
    );
  }, [empleadosListTrue]);

  const licFiltradas = useMemo(() => {
    const t = busqLic.trim().toLowerCase();
    if (!t) return licRegistros;
    return licRegistros.filter((r) => {
      const blob = [
        r.carnet_identidad,
        r.nombre,
        r.apellidos,
        r.descripcion,
        r.observaciones,
      ]
        .map((x) => String(x ?? '').toLowerCase())
        .join(' ');
      return blob.includes(t);
    });
  }, [licRegistros, busqLic]);

  const limpiarLic = () => {
    setLicEditando(false);
    setLicId('');
    setLicCarnet('');
    setLicDescrip('');
    setLicFecha('');
    setLicObs('');
    setLicActivo(true);
  };

  const abrirLicNueva = () => {
    limpiarLic();
    setShowLicModal(true);
  };

  const editarLic = (row) => {
    setLicEditando(true);
    setLicId(String(row.id_licencia));
    setLicCarnet(String(row.carnet_identidad));
    setLicDescrip(row.descripcion || '');
    setLicFecha(row.fecha_registro || '');
    setLicObs(row.observaciones || '');
    setLicActivo(row.activo == 1);
    setShowLicModal(true);
  };

  const guardarLic = (e) => {
    e.preventDefault();
    if (!licCarnet || !String(licDescrip).trim()) {
      Swal.fire('Atención', 'Complete empleado y descripción de la licencia.', 'warning');
      return;
    }
    const data = {
      carnet_identidad: String(licCarnet).trim(),
      descripcion: String(licDescrip).trim(),
      fecha_registro: licFecha || null,
      observaciones: licObs.trim() || null,
      activo: licActivo ? 1 : 0,
    };
    const req = licEditando
      ? Axios.put(`/update-licencia-empleado/${licId}`, data)
      : Axios.post('/create-licencia-empleado', data);
    req
      .then(() => {
        Swal.fire('Listo', licEditando ? 'Licencia actualizada' : 'Licencia registrada', 'success');
        getLicencias();
        limpiarLic();
        setShowLicModal(false);
      })
      .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
  };

  const eliminarLic = (row) => {
    Swal.fire({
      title: '¿Eliminar licencia?',
      text: 'Se borrará el registro.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((res) => {
      if (res.isConfirmed) {
        Axios.delete(`/delete-licencia-empleado/${row.id_licencia}`)
          .then(() => {
            Swal.fire('Eliminado', '', 'success');
            getLicencias();
          })
          .catch((err) => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
      }
    });
  };

  const carnetFaltan = 11 - filtrarSoloDigitos(empCarnet, 11).length;
  const telFaltan = 8 - filtrarSoloDigitos(empTelefono, 8).length;

  return (
    <div>
      <ModuleTitleBar
        title="Gestión de empleados"
        actions={
          <>
            <ExportacionAepgGrupo
              subtitulo="Reporte: empleados (nómina y expediente). Generado desde Gestión de empleados de AEPG."
              descripcion="Listado filtrado: carnet, nombres, puesto, teléfono, beneficios, nivel escolar, superación, auditorías y bajas."
              nombreBaseArchivo={`AEPG_empleados_${new Date().toISOString().slice(0, 10)}`}
              sheetName="Empleados"
              headers={empleadosExportAoa.h}
              dataRows={empleadosExportAoa.rows}
              disabled={!empleadosFiltrados.length}
            />
            <button
              type="button"
              className="btn btn-primary btn-form-nowrap d-inline-flex align-items-center"
              onClick={abrirModalAgregarEmpleado}
              disabled={!puedeEscribir}
            >
              <i className="bi bi-person-plus me-2" aria-hidden="true" />
              Agregar empleado
            </button>
          </>
        }
      />

      <FormModal
        show={showEmpleadoModal}
        onHide={cerrarModalEmpleado}
        title={editarEmpleado ? 'Editar empleado' : '+ Empleado'}
        subtitle=""
        onPrimary={guardarEmpleadoModal}
        primaryLabel={editarEmpleado ? 'Actualizar' : 'Guardar'}
        primaryDisabled={!puedeEscribir}
      >
        <div className="minimal-form-stack">
          <div className="minimal-field">
            <label className="minimal-label">Carnet (11 dígitos, obligatorio):</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className="minimal-input"
              placeholder="Solo números, 11 cifras"
              value={empCarnet}
              onChange={(e) => setEmpCarnet(filtrarSoloDigitos(e.target.value, 11))}
              disabled={editarEmpleado}
            />
            {!editarEmpleado &&
              (carnetFaltan > 0 ? (
                <Hint variant="warning">Faltan {carnetFaltan} dígito(s) para completar los 11 obligatorios.</Hint>
              ) : (
                <Hint variant="success">Carnet completo (11 dígitos).</Hint>
              ))}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Nombre (obligatorio):</label>
            <input
              type="text"
              className="minimal-input"
              placeholder="Mismas reglas que empresa / suplementos de contrato"
              value={empNombre}
              onChange={(e) => setEmpNombre(normalizarMientrasEscribeSoloLetras(e.target.value))}
              onBlur={() => setEmpNombre(normalizarTextoEmpresaOSuplemento(empNombre))}
            />
            {pieNombreHint(empNombre, 'Nombre')}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Apellidos (obligatorio):</label>
            <input
              type="text"
              className="minimal-input"
              placeholder="Mismas reglas que empresa / suplementos de contrato"
              value={empApellidos}
              onChange={(e) => setEmpApellidos(normalizarMientrasEscribeSoloLetras(e.target.value))}
              onBlur={() => setEmpApellidos(normalizarTextoEmpresaOSuplemento(empApellidos))}
            />
            {pieNombreHint(empApellidos, 'Apellidos')}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Puesto — texto a guardar (obligatorio):</label>
            <input
              type="text"
              className="minimal-input mb-2"
              placeholder="Escriba el puesto o elija abajo para copiar uno ya usado"
              value={empPuesto}
              onChange={(e) => setEmpPuesto(e.target.value)}
            />
            <AppSelect
              className="minimal-select"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v) setEmpPuesto(v);
              }}
            >
              <option value="">— Elegir puesto ya registrado en la nómina —</option>
              {puestosComboOpciones.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </AppSelect>
            <Hint>
              El valor que se guarda es siempre el del campo de texto superior. La lista solo ayuda a reutilizar
              puestos existentes; puede combinar ambas opciones en cualquier momento.
            </Hint>
            {empPuesto.trim() ? (
              <Hint variant="success">Puesto a guardar: «{empPuesto.trim()}»</Hint>
            ) : (
              <Hint variant="warning">Indique el puesto (obligatorio).</Hint>
            )}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Teléfono (8 dígitos, obligatorio):</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="tel"
              className="minimal-input"
              placeholder="Solo números, 8 cifras"
              value={empTelefono}
              onChange={(e) => setEmpTelefono(filtrarSoloDigitos(e.target.value, 8))}
            />
            {telFaltan > 0 ? (
              <Hint variant="warning">Faltan {telFaltan} dígito(s) para completar los 8 obligatorios.</Hint>
            ) : (
              <Hint variant="success">Teléfono completo (8 dígitos).</Hint>
            )}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Beneficios (opcional):</label>
            <textarea
              className="minimal-input"
              rows={3}
              placeholder="Opcional — descripción de beneficios"
              value={empBeneficios}
              onChange={(e) => setEmpBeneficios(e.target.value)}
            />
            {pieAreaHint(empBeneficios)}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Nivel escolar (obligatorio):</label>
            <AppSelect
              className={`minimal-select ${empNivelEscolar ? 'is-selected' : ''}`}
              value={empNivelEscolar}
              onChange={(e) => setEmpNivelEscolar(e.target.value)}
            >
              {NIVEL_ESCOLAR_OPCIONES.map((o) => (
                <option key={o || 'empty'} value={o}>
                  {o || '--- Seleccione nivel ---'}
                </option>
              ))}
            </AppSelect>
            {!String(empNivelEscolar || '').trim() ? (
              <Hint variant="warning">Seleccione un nivel escolar para poder guardar.</Hint>
            ) : (
              <Hint variant="success">Nivel escolar indicado.</Hint>
            )}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Superación en proceso (opcional):</label>
            <textarea
              className="minimal-input"
              rows={3}
              placeholder="Opcional — capacitación o estudios en curso"
              value={empSuperacion}
              onChange={(e) => setEmpSuperacion(e.target.value)}
            />
            {pieAreaHint(empSuperacion)}
          </div>
          <div className="minimal-field">
            <label className="minimal-label">Resultados auditorías (opcional):</label>
            <textarea
              className="minimal-input"
              rows={3}
              placeholder="Opcional — resumen o referencia de auditorías"
              value={empAuditorias}
              onChange={(e) => setEmpAuditorias(e.target.value)}
            />
            {pieAreaHint(empAuditorias)}
          </div>
        </div>
      </FormModal>

      <Modal
        show={showLicModal}
        onHide={() => {
          limpiarLic();
          setShowLicModal(false);
        }}
        size="lg"
        centered
        scrollable
        dialogClassName="modal-premium-dialog modal-minimal-dialog"
        contentClassName="modal-premium-content modal-minimal-content"
      >
        <Modal.Header closeButton className="modal-premium-header modal-minimal-header border-0">
          <div className="modal-premium-header-inner modal-minimal-header-inner">
            <span className="modal-premium-badge modal-minimal-badge">
              {licEditando ? 'Editar licencia' : 'Registrar licencia'}
            </span>
            <p className="modal-premium-subtitle mb-0 small text-muted">
              Tabla aparte, vinculada al carnet del empleado.
            </p>
          </div>
        </Modal.Header>
        <Modal.Body className="modal-premium-body modal-minimal-body">
          <form id="form-lic-empleado" onSubmit={guardarLic} className="minimal-form-stack">
            <div className="minimal-field">
              <label className="minimal-label">Empleado:</label>
              <AppSelect
                className={`minimal-select ${licCarnet ? 'is-selected' : ''}`}
                value={licCarnet}
                onChange={(e) => setLicCarnet(e.target.value)}
                disabled={!puedeEscribir || licEditando}
                required
              >
                <option value="" disabled hidden>
                  — Seleccione empleado —
                </option>
                {empleadosOrdenados.map((emp) => (
                  <option key={emp.carnet_identidad} value={String(emp.carnet_identidad)}>
                    {emp.apellidos} {emp.nombre} · {emp.carnet_identidad}
                  </option>
                ))}
              </AppSelect>
            </div>
            <div className="minimal-field">
              <label className="minimal-label">Descripción:</label>
              <textarea
                className="minimal-input"
                rows={3}
                required
                value={licDescrip}
                onChange={(e) => setLicDescrip(e.target.value)}
              />
            </div>
            <div className="minimal-field">
              <label className="minimal-label">Fecha de referencia (opcional):</label>
              <input type="date" className="minimal-input" value={licFecha} onChange={(e) => setLicFecha(e.target.value)} />
            </div>
            <div className="minimal-field">
              <label className="minimal-label">Observaciones:</label>
              <textarea className="minimal-input" rows={2} value={licObs} onChange={(e) => setLicObs(e.target.value)} />
            </div>
            <div className="minimal-field d-flex align-items-center gap-2">
              <input type="checkbox" id="lic-activo" checked={licActivo} onChange={(e) => setLicActivo(e.target.checked)} />
              <label htmlFor="lic-activo" className="minimal-label mb-0">
                Activa
              </label>
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer className="modal-premium-footer modal-minimal-footer border-0">
          <Button type="submit" form="form-lic-empleado" variant="success" disabled={!puedeEscribir}>
            {licEditando ? 'Actualizar' : 'Guardar'}
          </Button>
          <Button
            variant="outline-secondary"
            onClick={() => {
              limpiarLic();
              setShowLicModal(false);
            }}
          >
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>

      <div className="card p-3 mb-4">
        <ListSearchToolbar
          value={busqGeneral}
          onChange={setBusqGeneral}
          placeholder="Buscar en toda la fila (nombre, carnet, puesto, textos…)"
        >
          <div style={{ minWidth: 140 }}>
            <label className="form-label small text-muted mb-0">Carnet</label>
            <input
              className="form-control form-control-sm"
              value={busqCarnet}
              onChange={(e) => setBusqCarnet(e.target.value)}
              placeholder="Filtrar"
            />
          </div>
        </ListSearchToolbar>
        <p className="small text-muted mb-2">
          Mostrando {empleadosFiltrados.length} de {empleadosListTrue.length}
        </p>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped">
            <thead>
              <tr>
                <th>Carnet</th>
                <th>Nombre</th>
                <th>Apellidos</th>
                <th>Puesto</th>
                <th>Teléfono</th>
                <th>Nivel escolar</th>
                <th>Superación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleadosFiltrados.map((emp) => (
                <tr key={emp.carnet_identidad}>
                  <td>{emp.carnet_identidad}</td>
                  <td>{emp.nombre}</td>
                  <td>{emp.apellidos}</td>
                  <td>{emp.puesto}</td>
                  <td>{emp.telefono}</td>
                  <td>{emp.nivel_escolar || '—'}</td>
                  <td style={{ maxWidth: 200, whiteSpace: 'pre-wrap' }}>{emp.superacion_en_proceso || '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary me-1"
                      title="Historial laboral"
                      onClick={() => abrirHistorial(emp)}
                    >
                      Historial
                    </button>
                    <EditTableActionButton onClick={() => editarEmpleadoTabla(emp)} className="me-2" />
                    <DeleteTableActionButton onClick={() => deleteEmpleado(emp)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <h5 className="mb-0">Licencias por empleado</h5>
          <button type="button" className="btn btn-primary btn-sm" disabled={!puedeEscribir} onClick={abrirLicNueva}>
            <i className="bi bi-journal-plus me-1" aria-hidden="true" />
            Registrar licencia
          </button>
        </div>
        <p className="small text-muted">
          Las licencias ya no forman parte de la ficha compacta del empleado: cada registro es una fila en esta tabla.
        </p>
        <div className="mb-2" style={{ maxWidth: 320 }}>
          <label className="form-label small text-muted mb-0">Buscar</label>
          <input className="form-control form-control-sm" value={busqLic} onChange={(e) => setBusqLic(e.target.value)} placeholder="Carnet, nombre o texto" />
        </div>
        <div className="table-responsive">
          <table className="table table-data-compact table-bordered table-striped table-sm">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Empleado</th>
                <th>Carnet</th>
                <th>Descripción</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {licFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted small">
                    No hay licencias registradas o el filtro no coincide.
                  </td>
                </tr>
              ) : (
                licFiltradas.map((r) => (
                  <tr key={r.id_licencia}>
                    <td className="text-nowrap">{r.fecha_registro ? fmtFechaTabla(r.fecha_registro) : '—'}</td>
                    <td>
                      {r.nombre} {r.apellidos}
                    </td>
                    <td>{r.carnet_identidad}</td>
                    <td style={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>{r.descripcion}</td>
                    <td>{r.activo == 1 ? 'Sí' : 'No'}</td>
                    <td>
                      <EditTableActionButton onClick={() => editarLic(r)} className="me-2" />
                      <DeleteTableActionButton onClick={() => eliminarLic(r)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={showHistorial} onHide={() => setShowHistorial(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Historial laboral</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-3">{historialTitulo}</p>
          {historialLoading ? (
            <p className="mb-0">Cargando…</p>
          ) : historialRows.length === 0 ? (
            <p className="mb-0">No hay cambios registrados de puesto, departamento o salario (p. ej. vía cambio de cargo).</p>
          ) : (
            <BTable striped bordered hover size="sm" className="mb-0">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Campo</th>
                  <th>Valor anterior</th>
                  <th>Valor nuevo</th>
                </tr>
              </thead>
              <tbody>
                {historialRows.map((row) => (
                  <tr key={row.id}>
                    <td className="text-nowrap">{fmtFechaTabla(row.fecha_cambio)}</td>
                    <td>{etiquetaTipoCambio(row.tipo_cambio)}</td>
                    <td>{row.valor_anterior ?? '—'}</td>
                    <td>{row.valor_nuevo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </BTable>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowHistorial(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default GestionEmpleados;
