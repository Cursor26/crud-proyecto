import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Axios, { API_BASE } from '../axiosConfig';
import Swal from 'sweetalert2';
import ExcelJS from 'exceljs';
import { descargarPdfTablaVerde } from '../utils/exportContratosPdfTabla';
import {
  EditTableActionButton,
  DeleteTableActionButton,
  CancelTableActionButton,
  RenewTableActionButton,
  InfoTableActionButton,
} from './TableActionIconButtons';
import ContratosInfoModal from './ContratosInfoModal';
import { FormModal } from './FormModal';
import AppSelect from './AppSelect';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { usePermissions } from '../context/PermissionsContext';
import { CONTRATOS_LIST_COLUMNS, isColumnVisible, getThemeAccentFromDocument } from '../lib/appPreferences';
import { formatAppDate } from '../lib/formatAppDate';
import { convertirVigenciaLegible, vigenciaLegibleOGuion } from '../lib/convertirVigenciaLegible';
import { combinarDocumentosServidorYCache, deduplicarPdfsContrato } from '../lib/contratosPdfs';
import CatalogoTiposContrato from './CatalogoTiposContrato';
import ContratosCorreoConfig from './ContratosCorreoConfig';
import ContratosCorreosNivelesField, {
  contactosNivelesStateFromContrato,
} from './ContratosCorreosNivelesField';
import {
  tieneAlgunCorreoNivel,
  resumenTodosCorreosNivel,
  prepararPayloadContactosNiveles,
  listCorreosPorEvento,
  nivelesCorreoVacios,
  NIVELES_CORREO,
} from '../lib/contratosCorreosNiveles';
import { validarFormularioContrato } from '../lib/validarFormularioContrato';
import { contactosFromContrato } from '../lib/contratosContactosNotificacion';
import ContratosSuplementosField from './ContratosSuplementosField';
import ContratosAnexosField from './ContratosAnexosField';
import ContratosVigenciaField from './ContratosVigenciaField';
import ContratoWordPreviewPane from './ContratoWordPreviewPane';
import ContratosPendientesDetalle from './ContratosPendientesDetalle';
import ContratosCambiosPendientesModal from './ContratosCambiosPendientesModal';
import ContratosAuditoria from './ContratosAuditoria';
import {
  BTN_ANADIR_MD,
  BTN_CONSULTAR,
  BTN_ELIMINAR_ICON,
  BTN_EXPORTAR,
  BTN_SECUNDARIO,
} from '../lib/actionButtonClasses';
import { TIP } from '../lib/actionTooltips';
import {
  partesAVigenciaAlmacenada,
  sumarFechaConVigencia,
  vigenciaAPartes,
} from '../lib/contratosVigencia';
import { esDocumentoWord } from '../lib/contratosWordPreview';
import {
  parseSuplementosFromContrato,
  prepararSuplementosPayload,
  resumenSuplementos,
  renumerarSuplementosLista,
  celdaSuplementosTabla,
  cantidadSuplementosContrato,
} from '../lib/contratosSuplementos';
import {
  parseAnexosFromContrato,
  prepararAnexosPayload,
  renumerarAnexosLista,
  cantidadAnexosContrato,
} from '../lib/contratosAnexos';
import { CONTRATOS_MENU_SECTIONS, canAccessContratosSection, getContratosTabSectionIds, firstAllowedContratosSection } from '../lib/contratosNavSections';

/** Valores legacy numéricos en BD → etiquetas del formulario (Alimento, Servicio, Compra, Otro). */
const MAP_TIPO_CONTRATO_NUM = {
  '1': 'Alimento',
  '2': 'Servicio',
  '3': 'Compra',
  '4': 'Otro',
};

function etiquetaTipoContratoLegible(raw) {
  const s = raw == null ? '' : String(raw).trim();
  if (!s) return '';
  return MAP_TIPO_CONTRATO_NUM[s] || s;
}

const REPORTE_EXCEL_HEADERS = [
  'Nº contrato',
  'Parte',
  'Empresa',
  'Correo notificación',
  'Tipo de contrato',
  'Vigencia',
  'Suplementos',
  'Fecha inicio',
  'Fecha fin',
  'Estado',
  'Días restantes',
  'Marcado vencido (BD)',
  'Documento PDF',
];

const ARCHIVO_EXCEL_HEADERS = [
  'Nº contrato',
  'Parte',
  'Empresa',
  'Tipo de contrato',
  'Vigencia',
  'Fecha inicio',
  'Fecha fin',
  'Eliminado por',
  'Fecha baja',
  'Retención hasta',
  'Días restantes retención',
  'Nº PDFs',
  'Motivo',
];

function contratoToISODate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function diasParaVencer(fechaFin) {
  if (!fechaFin) return null;
  const fin = new Date(`${contratoToISODate(fechaFin)}T00:00:00`);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ms = fin.getTime() - hoy.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function getEstadoContrato(contrato) {
  const accionPend = String(contrato?.aprobacion_accion || '').toLowerCase();
  const aprobPendiente =
    normalizarAprobacionEstado(contrato?.aprobacion_estado) === 'pendiente' &&
    (accionPend === 'cancelacion' ||
      accionPend === 'cancelacion_archivo' ||
      accionPend === 'archivo' ||
      accionPend === 'edicion' ||
      accionPend === 'alta');
  if (!aprobPendiente && Number(contrato?.cancelado) === 1) return 'Cancelado';
  const dias = diasParaVencer(contrato.fecha_fin);
  if (dias === null) return 'Sin fecha';
  if (dias < 0) return 'Vencido';
  if (dias <= 30) return 'Por vencer';
  if (dias <= 90) return 'En seguimiento';
  return 'Activo';
}

function normalizarAprobacionEstado(val) {
  return String(val || 'aprobado').trim().toLowerCase();
}

function esContratoAltaPendiente(con) {
  return (
    normalizarAprobacionEstado(con?.aprobacion_estado) === 'pendiente' &&
    String(con?.aprobacion_accion || '').toLowerCase() === 'alta'
  );
}

function esContratoConSolicitudPendiente(con) {
  return normalizarAprobacionEstado(con?.aprobacion_estado) === 'pendiente';
}

function esContratoVisibleListaOperativa(con) {
  return !esContratoAltaPendiente(con);
}

function etiquetaAccionPendiente(accion) {
  const a = String(accion || '').toLowerCase();
  if (a === 'alta') return 'Nuevo contrato';
  if (a === 'edicion') return 'Modificación';
  if (a === 'cancelacion') return 'Cancelación';
  if (a === 'cancelacion_archivo') return 'Cancelación y archivo';
  if (a === 'archivo') return 'Eliminar';
  return accion || '—';
}

function claseBadgeAccionPendiente(accion) {
  const a = String(accion || '').toLowerCase();
  if (a === 'archivo' || a === 'cancelacion_archivo') return 'badge bg-danger';
  if (a === 'edicion') return 'badge bg-warning text-dark';
  if (a === 'alta') return 'badge bg-success';
  if (a === 'cancelacion') return 'badge bg-secondary';
  return 'badge bg-secondary';
}

function badgeAprobacionPendiente(con) {
  const accion = String(con?.aprobacion_accion || '').toLowerCase();
  if (normalizarAprobacionEstado(con?.aprobacion_estado) !== 'pendiente') return null;
  if (accion === 'edicion') return 'Cambios pendientes';
  if (accion === 'cancelacion') return 'Cancelación pendiente';
  if (accion === 'cancelacion_archivo') return 'Cancelación y archivo pendiente';
  if (accion === 'archivo') return 'Eliminación pendiente';
  return null;
}

/** Evita que el navegador muestre correos u otros datos guardados en campos de motivo. */
const SWAL_ATTRS_MOTIVO_CONTRATO = {
  maxlength: '500',
  autocomplete: 'off',
  autocorrect: 'off',
  autocapitalize: 'off',
  spellcheck: 'false',
  'data-contrato-motivo': '1',
  'data-form-type': 'other',
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'aria-autocomplete': 'none',
  name: 'motivo-accion-contrato',
  required: 'required',
  'aria-label': 'Motivo de baja',
};

function validarMotivoBajaSwal(value) {
  if (!String(value || '').trim()) {
    return 'Debe indicar el motivo de la baja.';
  }
  return undefined;
}

const SWAL_ATTRS_MOTIVO_RECHAZO = {
  ...SWAL_ATTRS_MOTIVO_CONTRATO,
  rows: '3',
  'aria-label': 'Motivo del rechazo',
  required: 'required',
  name: 'motivo-rechazo-contrato',
};

function didOpenSwalInputSinAutofill() {
  const popup = Swal.getPopup();
  const input = Swal.getInput();
  if (popup) popup.setAttribute('autocomplete', 'off');
  if (!input) return;
  input.setAttribute('autocomplete', 'new-password');
  input.setAttribute('data-contrato-motivo', '1');
  input.setAttribute('data-form-type', 'other');
  input.setAttribute('data-lpignore', 'true');
  input.setAttribute('data-1p-ignore', 'true');
  input.setAttribute('aria-autocomplete', 'none');
  input.setAttribute('id', `swal-motivo-contrato-${Date.now()}`);
  input.setAttribute('readonly', 'readonly');
  const quitarReadonly = () => input.removeAttribute('readonly');
  input.addEventListener('focus', quitarReadonly, { once: true });
  input.addEventListener('mousedown', quitarReadonly, { once: true });
}

function getAlertaContrato(contrato) {
  const dias = diasParaVencer(contrato.fecha_fin);
  if (dias === null) return 'Sin fecha fin';
  if (dias < 0) return `Venció hace ${Math.abs(dias)} día(s)`;
  if (dias <= 7) return `Crítico: ${dias} día(s)`;
  if (dias <= 30) return `Atención: ${dias} día(s)`;
  if (dias <= 90) return `Seguimiento: ${dias} día(s)`;
  return `Vigente: ${dias} día(s)`;
}

function GestionContratos({ vistaInicial = 'contratos', onSectionChange }) {
  const { preferences } = useAppPreferences();
  const { can } = usePermissions();
  const puedeCrearContratos = can('contratos', 'create');
  const puedeEditarContratos = can('contratos', 'edit');
  const puedeExportarContratos = can('contratos', 'export');
  const puedeAprobarContratos = can('contratos', 'approve');
  const tabSectionIds = useMemo(() => getContratosTabSectionIds(can), [can]);
  const themeAccent = useMemo(
    () => getThemeAccentFromDocument().primary,
    [preferences.themeId, preferences.accentColor]
  );
  const showCol = (id) => isColumnVisible(preferences, 'contratos', id);
  const visibleContratoColCount = CONTRATOS_LIST_COLUMNS.filter((c) => showCol(c.id)).length;
  const EMPRESA_ICONOS_STORAGE_KEY = 'contratos_empresa_iconos_v1';
  const CONTRATOS_PDF_STORAGE_KEY = 'contratos_pdf_archivos_v1';
  const CONTRATOS_SUPLEMENTOS_STORAGE_KEY = 'contratos_suplementos_v1';
  const CONTRATOS_ANEXOS_STORAGE_KEY = 'contratos_anexos_v1';
  const [contratoNumero, setContratoNumero] = useState('');
  const [contratoNumeroOriginal, setContratoNumeroOriginal] = useState('');
  const [contratoProveedorCliente, setContratoProveedorCliente] = useState(false);
  const [contratoEmpresa, setContratoEmpresa] = useState('');
  const [contratoContactosNiveles, setContratoContactosNiveles] = useState(nivelesCorreoVacios());
  const [contratoSuplementosMap, setContratoSuplementosMap] = useState({});
  const [contratoAnexosMap, setContratoAnexosMap] = useState({});
  const [contratoVigenciaPartes, setContratoVigenciaPartes] = useState({
    anios: '',
    meses: '',
    dias: '',
  });
  const [contratoTipo, setContratoTipo] = useState('');
  const [contratoPrioridad, setContratoPrioridad] = useState('media');
  const [contratoFechaInicio, setContratoFechaInicio] = useState('');
  const [editarContrato, setEditarContrato] = useState(false);
  const [contratosList, setContratos] = useState([]);
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [contratoFormErrors, setContratoFormErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroParte, setFiltroParte] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroVencimiento, setFiltroVencimiento] = useState('todos');
  const [contratoSeleccionado, setContratoSeleccionado] = useState(null);
  const [activeSection, setActiveSection] = useState(vistaInicial);
  const [bandejaVencimientosModo, setBandejaVencimientosModo] = useState('todos');
  const [renovFechaDesde, setRenovFechaDesde] = useState('');
  const [renovFechaHasta, setRenovFechaHasta] = useState('');
  const [reporteFechaDesde, setReporteFechaDesde] = useState('');
  const [reporteFechaHasta, setReporteFechaHasta] = useState('');
  const [reporteTipo, setReporteTipo] = useState('todos');
  const [reporteEmpresa, setReporteEmpresa] = useState('todas');
  const [archivoList, setArchivoList] = useState([]);
  const [archivoLoading, setArchivoLoading] = useState(false);
  const [archivoBusqueda, setArchivoBusqueda] = useState('');
  const [archivoAnio, setArchivoAnio] = useState('');
  const [empresaIconos, setEmpresaIconos] = useState({});
  const [contratoPdfs, setContratoPdfs] = useState({});
  const [empresaVistaPrevia, setEmpresaVistaPrevia] = useState(null);
  const [pdfVistaPrevia, setPdfVistaPrevia] = useState(null);
  const [pdfVistaMaximizada, setPdfVistaMaximizada] = useState(false);
  const [contratoInfo, setContratoInfo] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [contratoCambios, setContratoCambios] = useState(null);
  const [showCambiosModal, setShowCambiosModal] = useState(false);
  const [pdfRenderNonce, setPdfRenderNonce] = useState(0);
  const [pdfHasCustomPos, setPdfHasCustomPos] = useState(false);
  const [pdfDragPos, setPdfDragPos] = useState({ x: 0, y: 0 });
  const [pdfDragging, setPdfDragging] = useState(false);
  const [pdfDragOffset, setPdfDragOffset] = useState({ x: 0, y: 0 });
  const [nombreArchivoIcono, setNombreArchivoIcono] = useState('');
  const [tiposCatalogoActivos, setTiposCatalogoActivos] = useState([]);
  const inputIconoEmpresaRef = useRef(null);

  const cargarTiposCatalogo = useCallback(() => {
    Axios.get(`${API_BASE}/catalogo/tipos-contrato`)
      .then((res) => setTiposCatalogoActivos(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.warn('No se pudo cargar catálogo de tipos:', err?.message || err));
  }, []);
  const [docPicker, setDocPicker] = useState(null);
  const [docPickerPos, setDocPickerPos] = useState(null);
  const [docPickerCategoria, setDocPickerCategoria] = useState(null);
  const inputPdfContratoRef = useRef(null);
  const pdfModalRef = useRef(null);
  const hasDocument = typeof document !== 'undefined';

  const getContratos = () => {
    Axios.get(`${API_BASE}/contratos`)
      .then((response) => {
        const list = Array.isArray(response.data) ? response.data : [];
        setContratos(list);
        return cargarPdfsDesdeServidor(list.map((c) => c.numero_contrato));
      })
      .catch((error) => console.error('Error al cargar contratos:', error));
  };

  const blobToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const cargarPdfBlobServidor = async (numeroContrato, idDocumento) => {
    const res = await Axios.get(
      `${API_BASE}/contratos/${encodeURIComponent(numeroContrato)}/documentos/${idDocumento}`,
      { responseType: 'blob' }
    );
    return blobToDataUrl(res.data);
  };

  const cargarPdfsDesdeServidor = async (numerosContrato) => {
    const numerosSet = new Set(
      (Array.isArray(numerosContrato) ? numerosContrato : [])
        .map((n) => String(n || '').trim())
        .filter(Boolean)
    );
    if (!numerosSet.size) return;

    try {
      const res = await Axios.get(`${API_BASE}/contratos-documentos`);
      const docs = Array.isArray(res.data) ? res.data : [];

      let localCache = {};
      try {
        const raw = localStorage.getItem(CONTRATOS_PDF_STORAGE_KEY);
        if (raw) localCache = JSON.parse(raw) || {};
      } catch (_) {
        /* ignore */
      }

      const nextPdfs = { ...localCache };
      let localSups = {};
      try {
        const rawS = localStorage.getItem(CONTRATOS_SUPLEMENTOS_STORAGE_KEY);
        if (rawS) localSups = JSON.parse(rawS) || {};
      } catch (_) {
        /* ignore */
      }
      const nextSups = { ...localSups };
      let localAnexos = {};
      try {
        const rawA = localStorage.getItem(CONTRATOS_ANEXOS_STORAGE_KEY);
        if (rawA) localAnexos = JSON.parse(rawA) || {};
      } catch (_) {
        /* ignore */
      }
      const nextAnexos = { ...localAnexos };

      for (const doc of docs) {
        const num = String(doc.numero_contrato || '').trim();
        if (!numerosSet.has(num)) continue;
        const tipoDoc = String(doc.tipo_documento || 'contrato').toLowerCase();
        const esAnexo = tipoDoc === 'anexo';
        const esSuplemento = tipoDoc === 'suplemento';
        if (esAnexo) {
          const anxId = doc.cliente_id ? String(doc.cliente_id) : `srv_${doc.id_documento}`;
          const nombre = doc.nombre_archivo || 'Anexo';
          const tipo = /\.docx?$/i.test(nombre) ? 'word' : 'pdf';
          const serverEntry = {
            id: anxId,
            numero: Number(doc.numero_suplemento) > 0 ? Number(doc.numero_suplemento) : 0,
            nombre,
            tipo,
            dataUrl: '',
            serverId: Number(doc.id_documento),
          };
          const prevEstado = nextAnexos[num] || { activo: true, items: [] };
          const prevList = normalizarListaAnexos(prevEstado.items);
          const prev = prevList.find((s) => s.id === anxId || s.serverId === serverEntry.serverId);
          if (prev?.dataUrl) serverEntry.dataUrl = prev.dataUrl;
          if (!serverEntry.numero) serverEntry.numero = prevList.length + 1;
          const filtered = prevList.filter((s) => s.id !== anxId && s.serverId !== serverEntry.serverId);
          nextAnexos[num] = {
            activo: true,
            items: renumerarAnexosLista([...filtered, serverEntry]),
          };
        } else if (esSuplemento) {
          const supId = doc.cliente_id ? String(doc.cliente_id) : `srv_${doc.id_documento}`;
          const nombre = doc.nombre_archivo || 'Suplemento';
          const tipo = /\.docx?$/i.test(nombre) ? 'word' : 'pdf';
          const serverEntry = {
            id: supId,
            numero: Number(doc.numero_suplemento) > 0 ? Number(doc.numero_suplemento) : 0,
            nombre,
            tipo,
            dataUrl: '',
            serverId: Number(doc.id_documento),
          };
          const prevList = normalizarListaSuplementos(nextSups[num]);
          const prev = prevList.find((s) => s.id === supId || s.serverId === serverEntry.serverId);
          if (prev?.dataUrl) serverEntry.dataUrl = prev.dataUrl;
          if (!serverEntry.numero) serverEntry.numero = prevList.length + 1;
          const filtered = prevList.filter(
            (s) => s.id !== supId && s.serverId !== serverEntry.serverId
          );
          nextSups[num] = renumerarSuplementosLista([...filtered, serverEntry]);
        } else {
          const pdfId = doc.cliente_id ? String(doc.cliente_id) : `srv_${doc.id_documento}`;
          const serverEntry = {
            id: pdfId,
            serverId: Number(doc.id_documento),
            nombre: doc.nombre_archivo || 'Contrato.pdf',
            dataUrl: '',
          };
          const prevList = normalizarListaPdfs(nextPdfs[num]);
          const prev = prevList.find((p) => p.id === pdfId || p.serverId === serverEntry.serverId);
          if (prev?.dataUrl) serverEntry.dataUrl = prev.dataUrl;
          const filtered = prevList.filter(
            (p) =>
              p.id !== pdfId &&
              p.serverId !== serverEntry.serverId &&
              String(p.id) !== String(doc.cliente_id || '')
          );
          nextPdfs[num] = deduplicarPdfsContrato([...filtered, serverEntry]);
        }
      }

      for (const num of numerosSet) {
        nextPdfs[num] = deduplicarPdfsContrato(normalizarListaPdfs(nextPdfs[num]));
        if (nextSups[num]) nextSups[num] = renumerarSuplementosLista(normalizarListaSuplementos(nextSups[num]));
        if (nextAnexos[num]?.items?.length) {
          nextAnexos[num] = {
            activo: nextAnexos[num].activo !== false,
            items: renumerarAnexosLista(normalizarListaAnexos(nextAnexos[num].items)),
          };
        }
      }

      persistirPdfsContrato(nextPdfs);
      persistirSuplementosContrato(nextSups);
      persistirAnexosContrato(nextAnexos);

      const migraciones = [];
      for (const num of numerosSet) {
        const soloLocal = normalizarListaPdfs(nextPdfs[num]).filter((p) => p.dataUrl && !p.serverId);
        if (!soloLocal.length) continue;
        migraciones.push(
          Axios.post(`${API_BASE}/contratos/${encodeURIComponent(num)}/documentos`, {
            documentos: soloLocal.map((p) => ({
              nombre: p.nombre,
              dataUrl: p.dataUrl,
              clienteId: p.id,
            })),
          })
            .then((up) => {
              const guardados = Array.isArray(up.data?.documentos) ? up.data.documentos : [];
              if (!guardados.length) return;
              const actuales = normalizarListaPdfs(nextPdfs[num]);
              const merged = actuales.map((p) => {
                const match = guardados.find(
                  (g) =>
                    (g.cliente_id && String(g.cliente_id) === p.id) ||
                    (!g.cliente_id && !p.serverId && p.dataUrl)
                );
                return match ? { ...p, serverId: Number(match.id_documento) } : p;
              });
              nextPdfs[num] = merged;
              persistirPdfsContrato({ ...nextPdfs });
            })
            .catch((err) => console.warn(`Migración PDF contrato ${num}:`, err?.message || err))
        );
      }
      if (migraciones.length) await Promise.all(migraciones);
    } catch (error) {
      console.warn('No se pudieron cargar PDFs del servidor:', error?.message || error);
    }
  };

  const syncPdfsServidor = async (numeroContrato) => {
    const pdfs = getPdfsContrato(numeroContrato).filter((p) => p.dataUrl);
    if (!pdfs.length) return;
    const res = await Axios.post(`${API_BASE}/contratos/${encodeURIComponent(numeroContrato)}/documentos`, {
      documentos: pdfs.map((p) => ({
        nombre: p.nombre,
        dataUrl: p.dataUrl,
        clienteId: p.id,
      })),
    });
    const guardados = Array.isArray(res.data?.documentos) ? res.data.documentos : [];
    if (!guardados.length) return;
    const key = normalizarNumeroContratoKey(numeroContrato);
    const actuales = getPdfsContrato(numeroContrato);
    const merged = actuales.map((p) => {
      const match = guardados.find(
        (g) => (g.cliente_id && String(g.cliente_id) === p.id) || (!g.cliente_id && !p.serverId)
      );
      return match ? { ...p, serverId: Number(match.id_documento) } : p;
    });
    persistirPdfsContrato({ ...contratoPdfs, [key]: merged });
  };

  const mimeSuplemento = (sup) => {
    if (sup?.tipo === 'word') {
      const n = String(sup.nombre || '').toLowerCase();
      if (n.endsWith('.doc')) return 'application/msword';
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    return 'application/pdf';
  };

  const syncSuplementosServidor = async (numeroContrato) => {
    const sups = getSuplementosContrato(numeroContrato).filter((s) => s.dataUrl);
    if (!sups.length) return;
    const res = await Axios.post(`${API_BASE}/contratos/${encodeURIComponent(numeroContrato)}/documentos`, {
      documentos: sups.map((s) => ({
        nombre: s.nombre,
        dataUrl: s.dataUrl,
        clienteId: s.id,
        tipoDocumento: 'suplemento',
        numeroSuplemento: s.numero,
        mimeType: mimeSuplemento(s),
      })),
    });
    const guardados = Array.isArray(res.data?.documentos) ? res.data.documentos : [];
    if (!guardados.length) return;
    const key = normalizarNumeroContratoKey(numeroContrato);
    const actuales = getSuplementosContrato(numeroContrato);
    const merged = renumerarSuplementosLista(
      actuales.map((s) => {
        const match = guardados.find(
          (g) =>
            (g.cliente_id && String(g.cliente_id) === s.id) ||
            Number(g.numero_suplemento) === s.numero
        );
        return match ? { ...s, serverId: Number(match.id_documento) } : s;
      })
    );
    persistirSuplementosContrato({ ...contratoSuplementosMap, [key]: merged });
  };

  const syncAnexosServidor = async (numeroContrato) => {
    const estado = getAnexosEstadoContrato(numeroContrato);
    if (!estado.activo) return;
    const sups = estado.items.filter((s) => s.dataUrl);
    if (!sups.length) return;
    const res = await Axios.post(`${API_BASE}/contratos/${encodeURIComponent(numeroContrato)}/documentos`, {
      documentos: sups.map((s) => ({
        nombre: s.nombre,
        dataUrl: s.dataUrl,
        clienteId: s.id,
        tipoDocumento: 'anexo',
        numeroAnexo: s.numero,
        mimeType: mimeSuplemento(s),
      })),
    });
    const guardados = Array.isArray(res.data?.documentos) ? res.data.documentos : [];
    if (!guardados.length) return;
    const key = normalizarNumeroContratoKey(numeroContrato);
    const actuales = getAnexosEstadoContrato(numeroContrato);
    const merged = renumerarAnexosLista(
      actuales.items.map((s) => {
        const match = guardados.find(
          (g) =>
            (g.cliente_id && String(g.cliente_id) === s.id) ||
            Number(g.numero_suplemento) === s.numero
        );
        return match ? { ...s, serverId: Number(match.id_documento) } : s;
      })
    );
    persistirAnexosContrato({ ...contratoAnexosMap, [key]: { activo: true, items: merged } });
  };

  const abrirAnexoContrato = async (anx) => {
    const numero = String(contratoNumero || '').trim();
    if (!numero || !anx) return;
    let item = { ...anx };
    if (!item.dataUrl && item.serverId) {
      try {
        Swal.fire({ title: 'Cargando documento…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const dataUrl = await cargarPdfBlobServidor(numero, item.serverId);
        Swal.close();
        const estado = getAnexosEstadoContrato(numero);
        const list = estado.items.map((s) => (s.id === item.id ? { ...s, dataUrl } : s));
        guardarAnexosEstadoContrato(numero, { activo: true, items: list });
        item = { ...item, dataUrl };
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
        return;
      }
    }
    if (!item.dataUrl) {
      Swal.fire('Sin archivo', 'No hay documento disponible para este anexo.', 'info');
      return;
    }
    if (item.tipo === 'word') {
      abrirVistaPreviaDocumento({
        numero,
        nombre: item.nombre || 'Anexo.docx',
        tituloTipo: 'Anexo',
        dataUrl: item.dataUrl,
        tipo: 'word',
      });
      return;
    }
    abrirPdfContrato(numero, {
      id: item.id,
      nombre: item.nombre,
      dataUrl: item.dataUrl,
      serverId: item.serverId,
    });
  };

  const abrirSuplementoContrato = async (sup) => {
    const numero = String(contratoNumero || '').trim();
    if (!numero || !sup) return;
    let item = { ...sup };
    if (!item.dataUrl && item.serverId) {
      try {
        Swal.fire({ title: 'Cargando documento…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const dataUrl = await cargarPdfBlobServidor(numero, item.serverId);
        Swal.close();
        const list = getSuplementosContrato(numero).map((s) =>
          s.id === item.id ? { ...s, dataUrl } : s
        );
        guardarSuplementosListaContrato(numero, list);
        item = { ...item, dataUrl };
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
        return;
      }
    }
    if (!item.dataUrl) {
      Swal.fire('Sin archivo', 'No hay documento disponible para este suplemento.', 'info');
      return;
    }
    if (item.tipo === 'word') {
      abrirVistaPreviaDocumento({
        numero,
        nombre: item.nombre || 'Suplemento.docx',
        tituloTipo: 'Suplemento',
        dataUrl: item.dataUrl,
        tipo: 'word',
      });
      return;
    }
    abrirPdfContrato(numero, {
      id: item.id,
      nombre: item.nombre,
      dataUrl: item.dataUrl,
      serverId: item.serverId,
    });
  };

  const cargarArchivo = () => {
    setArchivoLoading(true);
    const params = new URLSearchParams();
    if (archivoBusqueda.trim()) params.set('busqueda', archivoBusqueda.trim());
    if (archivoAnio.trim()) params.set('anio', archivoAnio.trim());
    Axios.get(`${API_BASE}/contratos-archivo?${params.toString()}`)
      .then((res) => setArchivoList(Array.isArray(res.data) ? res.data : []))
      .catch((error) => {
        console.error('Error al cargar archivo histórico:', error);
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
      })
      .finally(() => setArchivoLoading(false));
  };

  useEffect(() => {
    getContratos();
    cargarTiposCatalogo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- carga inicial

  useEffect(() => {
    if (activeSection !== 'archivo') return;
    cargarArchivo();
  }, [activeSection, archivoBusqueda, archivoAnio]); // eslint-disable-line react-hooks/exhaustive-deps -- cargarArchivo estable por sección

  const prevVistaInicialRef = useRef(vistaInicial);

  useEffect(() => {
    const nextSection = canAccessContratosSection(vistaInicial || 'contratos', can)
      ? (vistaInicial || 'contratos')
      : firstAllowedContratosSection(can);
    const prevSection = prevVistaInicialRef.current;
    if (nextSection === 'vencimientos' && prevSection !== 'vencimientos') {
      setBandejaVencimientosModo('todos');
    }
    prevVistaInicialRef.current = nextSection;
    setActiveSection(nextSection);
  }, [vistaInicial, can]);

  const irASeccion = (seccion) => {
    const destino = canAccessContratosSection(seccion, can) ? seccion : firstAllowedContratosSection(can);
    setActiveSection(destino);
    if (typeof onSectionChange === 'function') onSectionChange(destino);
  };

  useEffect(() => {
    if (!canAccessContratosSection(activeSection, can)) {
      const fallback = firstAllowedContratosSection(can);
      setActiveSection(fallback);
      if (typeof onSectionChange === 'function') onSectionChange(fallback);
    }
  }, [activeSection, can, onSectionChange]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EMPRESA_ICONOS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setEmpresaIconos(parsed);
      }
    } catch (error) {
      console.warn('No se pudieron cargar iconos de empresas:', error);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONTRATOS_PDF_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setContratoPdfs(parsed);
      }
    } catch (error) {
      console.warn('No se pudieron cargar PDFs de contratos:', error);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONTRATOS_SUPLEMENTOS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setContratoSuplementosMap(parsed);
      }
    } catch (error) {
      console.warn('No se pudieron cargar suplementos de contratos:', error);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONTRATOS_ANEXOS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setContratoAnexosMap(parsed);
      }
    } catch (error) {
      console.warn('No se pudieron cargar anexos de contratos:', error);
    }
  }, []);

  const normalizarEmpresaKey = (empresa) => String(empresa || '').trim().toLowerCase();

  const persistirIconosEmpresa = (nextIconos) => {
    setEmpresaIconos(nextIconos);
    try {
      localStorage.setItem(EMPRESA_ICONOS_STORAGE_KEY, JSON.stringify(nextIconos));
    } catch (error) {
      console.warn('No se pudo guardar icono de empresa:', error);
    }
  };

  const getIconoEmpresa = (empresa) => {
    const key = normalizarEmpresaKey(empresa);
    return key ? empresaIconos[key] : '';
  };

  const guardarIconoEmpresa = (empresa, dataUrl) => {
    const key = normalizarEmpresaKey(empresa);
    if (!key || !dataUrl) return;
    persistirIconosEmpresa({ ...empresaIconos, [key]: dataUrl });
  };

  const normalizarNumeroContratoKey = (numero) => String(numero || '').trim();

  const persistirPdfsContrato = (nextPdfs) => {
    setContratoPdfs(nextPdfs);
    try {
      localStorage.setItem(CONTRATOS_PDF_STORAGE_KEY, JSON.stringify(nextPdfs));
    } catch (error) {
      console.warn('No se pudo guardar PDF del contrato:', error);
    }
  };

  const persistirSuplementosContrato = (nextMap) => {
    setContratoSuplementosMap(nextMap);
    try {
      localStorage.setItem(CONTRATOS_SUPLEMENTOS_STORAGE_KEY, JSON.stringify(nextMap));
    } catch (error) {
      console.warn('No se pudieron guardar suplementos:', error);
    }
  };

  const normalizarListaSuplementos = (entry) => {
    if (!Array.isArray(entry)) return [];
    return renumerarSuplementosLista(
      entry
        .map((s, idx) => ({
          id: String(s?.id || `sup_${idx}`),
          numero: Number(s?.numero) > 0 ? Number(s.numero) : idx + 1,
          nombre: String(s?.nombre || '').trim(),
          tipo: s?.tipo === 'word' ? 'word' : 'pdf',
          dataUrl: String(s?.dataUrl || ''),
          serverId: s?.serverId != null ? Number(s.serverId) : null,
        }))
        .filter((s) => s.nombre || s.dataUrl || s.serverId)
    );
  };

  const getSuplementosContrato = useCallback(
    (numeroContrato) => {
      const key = normalizarNumeroContratoKey(numeroContrato);
      if (!key) return [];
      return normalizarListaSuplementos(contratoSuplementosMap[key]);
    },
    [contratoSuplementosMap]
  );

  const guardarSuplementosListaContrato = (numeroContrato, lista) => {
    const key = normalizarNumeroContratoKey(numeroContrato);
    if (!key) return;
    const next = { ...contratoSuplementosMap };
    if (!lista?.length) {
      delete next[key];
    } else {
      next[key] = renumerarSuplementosLista(lista);
    }
    persistirSuplementosContrato(next);
  };

  const persistirAnexosContrato = (nextMap) => {
    setContratoAnexosMap(nextMap);
    try {
      localStorage.setItem(CONTRATOS_ANEXOS_STORAGE_KEY, JSON.stringify(nextMap));
    } catch (error) {
      console.warn('No se pudieron guardar anexos:', error);
    }
  };

  const normalizarListaAnexos = (entry) => {
    if (!Array.isArray(entry)) return [];
    return renumerarAnexosLista(
      entry
        .map((s, idx) => ({
          id: String(s?.id || `anx_${idx}`),
          numero: Number(s?.numero) > 0 ? Number(s.numero) : idx + 1,
          nombre: String(s?.nombre || '').trim(),
          tipo: s?.tipo === 'word' ? 'word' : 'pdf',
          dataUrl: String(s?.dataUrl || ''),
          serverId: s?.serverId != null ? Number(s.serverId) : null,
        }))
        .filter((s) => s.nombre || s.dataUrl || s.serverId)
    );
  };

  const getAnexosEstadoContrato = useCallback(
    (numeroContrato) => {
      const key = normalizarNumeroContratoKey(numeroContrato);
      if (!key) return { activo: false, items: [] };
      const estado = contratoAnexosMap[key];
      if (!estado) return { activo: false, items: [] };
      return {
        activo: estado.activo === true,
        items: normalizarListaAnexos(estado.items),
      };
    },
    [contratoAnexosMap]
  );

  const guardarAnexosEstadoContrato = (numeroContrato, estado) => {
    const key = normalizarNumeroContratoKey(numeroContrato);
    if (!key) return;
    const next = { ...contratoAnexosMap };
    const activo = Boolean(estado?.activo);
    const items = normalizarListaAnexos(estado?.items);
    if (!activo && !items.length) {
      delete next[key];
    } else {
      next[key] = { activo, items: renumerarAnexosLista(items) };
    }
    persistirAnexosContrato(next);
  };

  const generarPdfId = () => `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const normalizarListaPdfs = (entry) => {
    if (!entry) return [];
    if (Array.isArray(entry)) {
      return entry
        .map((p, idx) => ({
          id: String(p?.id || `legacy_${idx}`),
          dataUrl: String(p?.dataUrl || ''),
          nombre: String(p?.nombre || `Contrato_${idx + 1}.pdf`),
          serverId: p?.serverId != null ? Number(p.serverId) : null,
        }))
        .filter((p) => p.dataUrl || p.serverId);
    }
    if (typeof entry === 'string') {
      return [{ id: 'legacy_0', dataUrl: entry, nombre: 'Contrato.pdf' }];
    }
    if (entry?.dataUrl) {
      return [
        {
          id: String(entry.id || 'legacy_0'),
          dataUrl: String(entry.dataUrl),
          nombre: String(entry.nombre || 'Contrato.pdf'),
        },
      ];
    }
    return [];
  };

  const getPdfsContrato = useCallback((numeroContrato) => {
    const key = normalizarNumeroContratoKey(numeroContrato);
    if (!key) return [];
    return deduplicarPdfsContrato(normalizarListaPdfs(contratoPdfs[key]));
  }, [contratoPdfs]);

  const getPdfContrato = (numeroContrato) => {
    const list = getPdfsContrato(numeroContrato);
    return list[0] || null;
  };

  const getEtiquetaPdfsContrato = (numeroContrato) => {
    const pdfs = getPdfsContrato(numeroContrato);
    if (!pdfs.length) return '';
    if (pdfs.length === 1) return pdfs[0].nombre || 'PDF';
    return `${pdfs.length} PDFs: ${pdfs.map((p) => p.nombre).join(', ')}`;
  };

  const guardarPdfsListaContrato = (numeroContrato, pdfs) => {
    const key = normalizarNumeroContratoKey(numeroContrato);
    if (!key) return;
    if (!pdfs?.length) {
      const nextPdfs = { ...contratoPdfs };
      delete nextPdfs[key];
      persistirPdfsContrato(nextPdfs);
      return;
    }
    persistirPdfsContrato({
      ...contratoPdfs,
      [key]: deduplicarPdfsContrato(pdfs),
    });
  };

  const agregarPdfContrato = (numeroContrato, dataUrl, nombre) => {
    const key = normalizarNumeroContratoKey(numeroContrato);
    if (!key || !dataUrl) return;
    const actuales = getPdfsContrato(numeroContrato);
    guardarPdfsListaContrato(numeroContrato, [
      ...actuales,
      { id: generarPdfId(), dataUrl, nombre: nombre || 'Contrato.pdf' },
    ]);
  };

  const aplicarDocumentosServidorAlContrato = async (numeroContrato) => {
    const key = normalizarNumeroContratoKey(numeroContrato);
    if (!key) return;
    try {
      const res = await Axios.get(`${API_BASE}/contratos-documentos`);
      const docs = (Array.isArray(res.data) ? res.data : []).filter(
        (d) => normalizarNumeroContratoKey(d.numero_contrato) === key
      );
      const pdfsSrv = docs.filter(
        (d) => String(d.tipo_documento || 'contrato').toLowerCase() === 'contrato'
      );
      const cachePdfs = getPdfsContrato(key);
      guardarPdfsListaContrato(key, combinarDocumentosServidorYCache(pdfsSrv, cachePdfs));
    } catch (err) {
      console.warn('No se pudieron sincronizar PDFs del contrato:', err?.message || err);
    }
  };

  const eliminarPdfContrato = async (numeroContrato, pdfId = null) => {
    const key = normalizarNumeroContratoKey(numeroContrato);
    if (!key) return;

    const eliminarEnEstado = () => {
      if (!pdfId) {
        const nextPdfs = { ...contratoPdfs };
        delete nextPdfs[key];
        persistirPdfsContrato(nextPdfs);
        return;
      }
      const filtrados = getPdfsContrato(numeroContrato).filter((p) => p.id !== pdfId);
      guardarPdfsListaContrato(numeroContrato, filtrados);
    };

    const pdfs = getPdfsContrato(numeroContrato);
    if (!pdfId) {
      if (!pdfs.length) return;
      await Promise.all(
        pdfs
          .map((p) => Number(p.serverId))
          .filter((sid) => Number.isFinite(sid) && sid > 0)
          .map((serverId) =>
            Axios.delete(
              `${API_BASE}/contratos/${encodeURIComponent(key)}/documentos/${serverId}`
            ).catch((err) => console.warn('No se pudo borrar PDF en servidor:', err?.message || err))
          )
      );
      eliminarEnEstado();
      return;
    }

    const pdf = pdfs.find((p) => p.id === pdfId);
    if (!pdf) return;

    const serverId = pdf.serverId != null ? Number(pdf.serverId) : null;
    const tieneServer = Number.isFinite(serverId) && serverId > 0;

    if (!tieneServer) {
      eliminarEnEstado();
      return;
    }

    try {
      await Axios.delete(
        `${API_BASE}/contratos/${encodeURIComponent(key)}/documentos/${serverId}`
      );
      eliminarEnEstado();
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        eliminarEnEstado();
        return;
      }
      Swal.fire(
        'Error',
        err.response?.data?.message || err.message || 'No se pudo eliminar el archivo.',
        'error'
      );
    }
  };

  const cerrarDocPicker = () => {
    setDocPicker(null);
    setDocPickerPos(null);
    setDocPickerCategoria(null);
  };

  const dataUrlToObjectUrl = (dataUrl) => {
    const raw = String(dataUrl || '').trim();
    const [meta, base64] = raw.split(',');
    if (!meta || !base64) return null;
    const mimeMatch = meta.match(/data:(.*?);base64/);
    const mimeType = mimeMatch?.[1] || 'application/pdf';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  };

  const descargarDocumentoDataUrl = (dataUrl, nombreArchivo) => {
    const url = dataUrlToObjectUrl(dataUrl);
    if (!url) {
      Swal.fire('Error', 'No se pudo preparar la descarga.', 'error');
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo || 'documento';
    a.click();
    URL.revokeObjectURL(url);
  };

  const abrirVistaPreviaDocumento = ({
    numero,
    nombre,
    tituloTipo,
    dataUrl,
    tipo = 'pdf',
  }) => {
    let objectUrl = null;
    if (tipo !== 'word') {
      try {
        objectUrl = dataUrlToObjectUrl(dataUrl);
      } catch (error) {
        console.error('No se pudo preparar el documento para el visor:', error);
      }
    }
    setPdfVistaPrevia({
      numero: String(numero || '').trim() || '—',
      nombre: nombre || (tipo === 'word' ? 'Documento.docx' : 'Documento.pdf'),
      tituloTipo,
      dataUrl: String(dataUrl),
      objectUrl,
      tipo,
    });
    setPdfVistaMaximizada(false);
    setPdfHasCustomPos(false);
    setPdfDragPos({ x: 0, y: 0 });
    setPdfRenderNonce((n) => n + 1);
  };

  const abrirPdfContrato = async (numeroContrato, pdfItem = null) => {
    let pdf = pdfItem || getPdfContrato(numeroContrato);
    if (!pdf) {
      Swal.fire('Sin PDF', 'Este contrato no tiene PDF asociado.', 'info');
      return;
    }

    if (!pdf.dataUrl && pdf.serverId) {
      try {
        Swal.fire({
          title: 'Cargando PDF…',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        const dataUrl = await cargarPdfBlobServidor(numeroContrato, pdf.serverId);
        Swal.close();
        const list = getPdfsContrato(numeroContrato).map((p) =>
          p.id === pdf.id ? { ...p, dataUrl } : p
        );
        guardarPdfsListaContrato(numeroContrato, list);
        pdf = { ...pdf, dataUrl };
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
        return;
      }
    }

    if (!pdf?.dataUrl) {
      Swal.fire('Sin PDF', 'Este contrato no tiene PDF asociado.', 'info');
      return;
    }

    abrirVistaPreviaDocumento({
      numero: numeroContrato,
      nombre: pdf.nombre || 'Contrato.pdf',
      tituloTipo: 'Contrato',
      dataUrl: pdf.dataUrl,
      tipo: 'pdf',
    });
    cerrarDocPicker();
  };

  const getCategoriasDocumentos = (numeroContrato, contratoRow) => {
    const numero = String(numeroContrato || '').trim();
    const itemsContrato = getPdfsContrato(numero).map((p) => ({
      ...p,
      tipo: 'pdf',
      etiqueta: p.nombre || 'Contrato.pdf',
    }));
    let itemsSup = getSuplementosContrato(numero);
    if (!itemsSup.length && contratoRow) {
      itemsSup = parseSuplementosFromContrato(contratoRow).items;
    }
    let estadoAnex = getAnexosEstadoContrato(numero);
    if (!estadoAnex.items.length && contratoRow) {
      estadoAnex = parseAnexosFromContrato(contratoRow);
    }
    const cats = [];
    if (itemsContrato.length) {
      cats.push({ id: 'contrato', label: 'Contrato', items: itemsContrato });
    }
    if (itemsSup.length) {
      cats.push({
        id: 'suplemento',
        label: 'Suplemento',
        items: itemsSup.map((s) => ({
          ...s,
          etiqueta: `Suplemento ${s.numero} — ${s.nombre || 'documento'}`,
        })),
      });
    }
    if (estadoAnex.activo && estadoAnex.items.length) {
      cats.push({
        id: 'anexo',
        label: 'Anexo',
        items: estadoAnex.items.map((a) => ({
          ...a,
          etiqueta: `Anexo ${a.numero} — ${a.nombre || 'documento'}`,
        })),
      });
    }
    return cats;
  };

  const abrirDocumentoTabla = async (numeroContrato, item, categoria) => {
    const numero = String(numeroContrato || '').trim();
    if (!numero || !item) return;
    cerrarDocPicker();

    let doc = { ...item };
    const esWord = esDocumentoWord(doc);

    if (!doc.dataUrl && doc.serverId) {
      try {
        Swal.fire({
          title: 'Cargando documento…',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        const dataUrl = await cargarPdfBlobServidor(numero, doc.serverId);
        Swal.close();
        doc = { ...doc, dataUrl };

        if (categoria === 'contrato') {
          const list = getPdfsContrato(numero).map((p) =>
            p.id === doc.id || p.serverId === doc.serverId ? { ...p, dataUrl } : p
          );
          guardarPdfsListaContrato(numero, list);
        } else if (categoria === 'suplemento') {
          const list = getSuplementosContrato(numero).map((s) =>
            s.id === doc.id ? { ...s, dataUrl } : s
          );
          guardarSuplementosListaContrato(numero, list);
        } else if (categoria === 'anexo') {
          const estado = getAnexosEstadoContrato(numero);
          const list = estado.items.map((s) => (s.id === doc.id ? { ...s, dataUrl } : s));
          guardarAnexosEstadoContrato(numero, { activo: true, items: list });
        }
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
        return;
      }
    }

    if (!doc.dataUrl) {
      Swal.fire('Sin archivo', 'No hay documento disponible.', 'info');
      return;
    }

    const labels = { contrato: 'Contrato', suplemento: 'Suplemento', anexo: 'Anexo' };
    const tituloTipo = labels[categoria] || 'Documento';

    abrirVistaPreviaDocumento({
      numero,
      nombre: doc.etiqueta || doc.nombre || (esWord ? 'Documento.docx' : 'Documento.pdf'),
      tituloTipo,
      dataUrl: doc.dataUrl,
      tipo: esWord ? 'word' : 'pdf',
    });
  };

  useEffect(() => {
    if (!docPicker) return undefined;
    const onDocClick = () => cerrarDocPicker();
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [docPicker]);

  useEffect(() => {
    return () => {
      if (pdfVistaPrevia?.objectUrl) URL.revokeObjectURL(pdfVistaPrevia.objectUrl);
    };
  }, [pdfVistaPrevia]);

  useEffect(() => {
    if (!pdfDragging || pdfVistaMaximizada) return undefined;
    const onMove = (e) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const modalW = pdfModalRef.current?.offsetWidth || 420;
      const modalH = pdfModalRef.current?.offsetHeight || 260;
      const nextX = e.clientX - pdfDragOffset.x;
      const nextY = e.clientY - pdfDragOffset.y;
      const boundedX = Math.max(0, Math.min(vw - modalW, nextX));
      const boundedY = Math.max(0, Math.min(vh - modalH, nextY));
      setPdfDragPos({ x: boundedX, y: boundedY });
    };
    const onUp = () => setPdfDragging(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [pdfDragging, pdfDragOffset, pdfVistaMaximizada]);

  const buildPdfViewerSrc = (pdfPreview, maximizado, nonce) => {
    const raw = String(pdfPreview?.objectUrl || pdfPreview?.dataUrl || '').trim();
    if (!raw) return '';
    const base = raw.split('#')[0];
    /* Edge/Chrome: forzamos page-width en ambos modos y nonce para evitar cache de zoom previo. */
    const mode = maximizado ? 'max' : 'min';
    return `${base}#page=1&zoom=page-width&view=FitH&toolbar=1&navpanes=0&mode=${mode}&v=${nonce}`;
  };

  const renderNumeroContrato = (numeroContrato) => (
    <span className="contratos-numero-wrap">
      <span className="contratos-numero-wrap__num">{numeroContrato}</span>
    </span>
  );

  const buildContratoRowId = (contrato, index) => {
    const numero = String(contrato?.numero_contrato ?? '').trim();
    const empresa = String(contrato?.empresa ?? '').trim();
    const fechaInicio = String(contrato?.fecha_inicio ?? '').trim();
    return `${numero}__${empresa}__${fechaInicio}__${index}`;
  };

  const toggleContratoSeleccionado = (rowId) => {
    setContratoSeleccionado((prev) => (prev === rowId ? null : rowId));
  };

  const renderCeldaDocumentoPdf = (numeroContrato, contratoRow = null) => {
    const numeroNorm = String(numeroContrato || '').trim();
    const categorias = getCategoriasDocumentos(numeroNorm, contratoRow);
    const totalDocs = categorias.reduce((n, c) => n + c.items.length, 0);
    const isVistaAbierta =
      pdfVistaPrevia != null && String(pdfVistaPrevia.numero || '').trim() === numeroNorm;
    const menuAbierto = docPicker?.numero === numeroNorm;

    if (!totalDocs) {
      return <span className="text-muted">—</span>;
    }

    const abrirPicker = (e) => {
      e.stopPropagation();
      if (menuAbierto) {
        cerrarDocPicker();
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      setDocPickerPos({ top: rect.bottom + 4, left: Math.max(8, rect.left - 40) });
      setDocPicker({ numero: numeroNorm, contratoRow });
      setDocPickerCategoria(null);
    };

    const abrirDirectoSiUno =
      categorias.length === 1 && categorias[0].items.length === 1
        ? () => abrirDocumentoTabla(numeroNorm, categorias[0].items[0], categorias[0].id)
        : null;

    return (
      <div
        className="contratos-pdf-picker position-relative d-inline-flex align-items-center justify-content-center"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={`btn btn-link p-0 contratos-pdf-inline contratos-pdf-inline--multi${isVistaAbierta ? ' contratos-pdf-inline--active' : ''}`}
          title="Ver documentos del contrato"
          aria-label={`Documentos del contrato ${numeroContrato}`}
          aria-expanded={menuAbierto}
          onClick={abrirDirectoSiUno || abrirPicker}
        >
          <i className="bi bi-folder2-open" aria-hidden="true" />
          {totalDocs > 1 ? <span className="contratos-pdf-picker__count">{totalDocs}</span> : null}
        </button>
        <span className="ms-1 small text-muted">Docs</span>
      </div>
    );
  };

  const eliminarIconoEmpresa = (empresa) => {
    const key = normalizarEmpresaKey(empresa);
    if (!key || !empresaIconos[key]) return;
    const nextIconos = { ...empresaIconos };
    delete nextIconos[key];
    persistirIconosEmpresa(nextIconos);
    setNombreArchivoIcono('');
  };

  const manejarIconoEmpresaChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setNombreArchivoIcono(file?.name || '');
    if (!file) return;

    const empresaNombre = String(contratoEmpresa || '').trim();
    if (!empresaNombre) {
      Swal.fire('Empresa requerida', 'Primero escribe la empresa para asociar su icono.', 'info');
      return;
    }
    if (!file.type.startsWith('image/')) {
      Swal.fire('Archivo inválido', 'Selecciona una imagen válida (PNG, JPG, SVG, etc.).', 'warning');
      return;
    }
    if (file.size > 1024 * 1024) {
      Swal.fire('Imagen muy pesada', 'Usa una imagen de hasta 1 MB para mantener fluidez.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (dataUrl) guardarIconoEmpresa(empresaNombre, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const manejarPdfContratoChange = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    const numero = String(contratoNumero || '').trim();
    if (!numero) {
      Swal.fire('Número requerido', 'Primero escribe el número de contrato para asociar el PDF.', 'info');
      return;
    }

    const invalidos = files.filter(
      (file) =>
        !(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) || file.size > 5 * 1024 * 1024
    );
    if (invalidos.length > 0) {
      Swal.fire('Archivo inválido', 'Cada PDF debe ser válido y de hasta 5 MB.', 'warning');
      return;
    }

    let pendientes = files.length;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        if (dataUrl) agregarPdfContrato(numero, dataUrl, file.name);
        pendientes -= 1;
        if (pendientes === 0) {
          limpiarErrorContrato('contrato_pdf');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const vigenciaParaGuardar = () => partesAVigenciaAlmacenada(contratoVigenciaPartes);

  const sumarTiempo = (fechaStr) =>
    sumarFechaConVigencia(fechaStr, vigenciaParaGuardar());

  const toISODate = (value) => {
    if (!value) return '';
    return String(value).slice(0, 10);
  };

  const fmtDisplayDate = (value) => formatAppDate(value, preferences.dateFormat) || toISODate(value);

  const getBadgeClass = (estado) => {
    if (estado === 'Cancelado') return 'bg-dark';
    if (estado === 'Vencido') return 'bg-danger';
    if (estado === 'Por vencer') return 'bg-warning text-dark';
    if (estado === 'En seguimiento') return 'bg-info text-dark';
    if (estado === 'Activo') return 'bg-success';
    return 'bg-secondary';
  };

  /* Diferencia de días en formato legible: nunca muestra negativos planos */
  const formatDiferenciaDias = (dias) => {
    if (dias == null) return 'Sin fecha';
    if (dias < 0) return `Vencido hace ${Math.abs(dias)} días`;
    if (dias === 0) return 'Vence hoy';
    return `${dias} días restantes`;
  };

  /* Posición 0–100 del marcador en la barra tricolor (verde -> amarillo -> rojo) */
  const calcularPosicionTiempo = (dias) => {
    if (dias == null) return 50;
    const min = -30;
    const max = 90;
    const v = Math.max(min, Math.min(max, dias));
    return Math.round(((max - v) / (max - min)) * 100);
  };

  /* Etiqueta visual de estado para la cola de renovación (Activo/En Revisión/Vencido) */
  const getEstadoRenovacion = (estado) => {
    if (estado === 'Vencido') return { label: 'Vencido', mod: 'vencido' };
    if (estado === 'Por vencer') return { label: 'En Revisión', mod: 'revision' };
    if (estado === 'En seguimiento') return { label: 'En Revisión', mod: 'revision' };
    if (estado === 'Activo') return { label: 'Activo', mod: 'activo' };
    return { label: estado || 'N/D', mod: 'neutro' };
  };

  /* Inicial visible en el avatar de la empresa */
  const inicialEmpresa = (empresa) => {
    if (!empresa) return '?';
    return String(empresa).trim().charAt(0).toUpperCase();
  };

  useEffect(() => {
    if (empresaVistaPrevia == null && pdfVistaPrevia == null) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (pdfVistaPrevia != null) setPdfVistaPrevia(null);
      if (empresaVistaPrevia != null) setEmpresaVistaPrevia(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [empresaVistaPrevia, pdfVistaPrevia]);

  const limpiarContrato = () => {
    setContratoNumero('');
    setContratoNumeroOriginal('');
    setContratoProveedorCliente(false);
    setContratoEmpresa('');
    setContratoContactosNiveles(nivelesCorreoVacios());
    setContratoVigenciaPartes({ anios: '', meses: '', dias: '' });
    setContratoTipo('');
    setContratoPrioridad('media');
    setContratoFechaInicio('');
    setEditarContrato(false);
    setNombreArchivoIcono('');
    setContratoFormErrors({});
  };

  const limpiarErrorContrato = (campo) => {
    setContratoFormErrors((prev) => {
      if (!prev[campo]) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });
  };

  const validarContratoFormulario = () => {
    const { valid, errors } = validarFormularioContrato({
      numero: contratoNumero,
      empresa: contratoEmpresa,
      tipo: contratoTipo,
      fechaInicio: contratoFechaInicio,
      vigenciaPartes: contratoVigenciaPartes,
      contactosNiveles: contratoContactosNiveles,
      esProveedor: contratoProveedorCliente,
    });
    const nextErrors = { ...errors };
    if (!editarContrato && getPdfsContrato(contratoNumero).length === 0) {
      nextErrors.contrato_pdf = 'Adjunte al menos un PDF del contrato (obligatorio).';
    }
    const isValid = Object.keys(nextErrors).length === 0;
    setContratoFormErrors(nextErrors);
    if (!isValid) {
      Swal.fire(
        'Campos obligatorios',
        'Complete los campos marcados en rojo antes de guardar.',
        'warning'
      );
      requestAnimationFrame(() => {
        document
          .querySelector('[data-contrato-field].minimal-field--invalid, .contrato-correo-nivel-block.minimal-field--invalid')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    return isValid;
  };

  const actualizarContactosNiveles = (niveles) => {
    setContratoContactosNiveles(niveles);
    setContratoFormErrors((prev) => {
      const next = { ...prev };
      let cambio = false;
      for (const nivel of NIVELES_CORREO) {
        if (next[nivel]) {
          delete next[nivel];
          cambio = true;
        }
      }
      return cambio ? next : prev;
    });
  };

  const cerrarModalContrato = () => {
    limpiarContrato();
    setShowContratoModal(false);
  };

  const abrirModalNuevoContrato = () => {
    limpiarContrato();
    setContratoNumeroOriginal('');
    setContratoFormErrors({});
    setShowContratoModal(true);
  };

  const guardarContratoModal = () => {
    if (!validarContratoFormulario()) return;
    if (editarContrato) updateContrato();
    else addContrato();
  };

  const addContrato = () => {
    const nuevaFechaFin = sumarTiempo(contratoFechaInicio);
    const vencidoCalc = diasParaVencer(nuevaFechaFin) != null && diasParaVencer(nuevaFechaFin) < 0 ? 1 : 0;
    const payloadContactos = prepararPayloadContactosNiveles(contratoContactosNiveles);
    const payloadSuplementos = prepararSuplementosPayload(getSuplementosContrato(contratoNumero));
    const payloadAnexos = prepararAnexosPayload(getAnexosEstadoContrato(contratoNumero));

    const bodyCreate = {
      numero_contrato: contratoNumero,
      proveedor_cliente: contratoProveedorCliente ? 1 : 0,
      empresa: contratoEmpresa,
      ...payloadContactos,
      ...payloadSuplementos,
      ...payloadAnexos,
      vigencia: vigenciaParaGuardar(),
      tipo_contrato: contratoTipo,
      prioridad: contratoPrioridad,
      fecha_inicio: contratoFechaInicio,
      fecha_fin: nuevaFechaFin,
      vencido: vencidoCalc,
    };
    Axios.post(`${API_BASE}/create-contrato`, bodyCreate)
      .then(async () => {
        try {
          await syncPdfsServidor(contratoNumero);
          await syncSuplementosServidor(contratoNumero);
          await syncAnexosServidor(contratoNumero);
        } catch (syncErr) {
          console.warn('Documentos no sincronizados al servidor:', syncErr);
        }
        getContratos();
        cerrarModalContrato();
        Swal.fire(
          'Enviado a aprobación',
          'El contrato quedó pendiente. Aparecerá activo cuando un autorizador lo apruebe en la sección Pendientes.',
          'success'
        );
      })
      .catch((error) => {
        const msg =
          error.response?.data?.message ||
          (typeof error.response?.data === 'string' ? error.response.data : null) ||
          error.message;
        Swal.fire('Error', msg, 'error');
      });
  };

  const updateContrato = () => {
    const nuevaFechaFin = sumarTiempo(contratoFechaInicio);
    const vencidoCalc = diasParaVencer(nuevaFechaFin) != null && diasParaVencer(nuevaFechaFin) < 0 ? 1 : 0;
    const numeroNuevo = String(contratoNumero || '').trim();
    const numeroOriginalRaw = contratoNumeroOriginal ?? '';
    const numeroOriginal = String(numeroOriginalRaw).trim();
    const numOriginalSeguro = String(contratoNumeroOriginal ?? numeroNuevo ?? '').trim() || numeroNuevo;
    const payloadContactos = prepararPayloadContactosNiveles(contratoContactosNiveles);
    const payloadSuplementos = prepararSuplementosPayload(getSuplementosContrato(contratoNumero));
    const payloadAnexos = prepararAnexosPayload(getAnexosEstadoContrato(contratoNumero));
    const bodyUpdate = {
      numero_contrato: numeroNuevo,
      numero_contrato_original: numOriginalSeguro,
      proveedor_cliente: contratoProveedorCliente ? 1 : 0,
      empresa: contratoEmpresa,
      ...payloadContactos,
      ...payloadSuplementos,
      ...payloadAnexos,
      vigencia: vigenciaParaGuardar(),
      tipo_contrato: contratoTipo,
      prioridad: contratoPrioridad,
      fecha_inicio: contratoFechaInicio,
      fecha_fin: nuevaFechaFin,
      vencido: vencidoCalc,
    };
    Axios.put(`${API_BASE}/update-contrato`, bodyUpdate)
      .then(async () => {
        try {
          await syncPdfsServidor(numeroNuevo);
          await syncSuplementosServidor(numeroNuevo);
          await syncAnexosServidor(numeroNuevo);
        } catch (syncErr) {
          console.warn('Documentos no sincronizados al servidor:', syncErr);
        }
        return Axios.get(`${API_BASE}/contratos`);
      })
      .then((getRes) => {
        const contratos = Array.isArray(getRes.data) ? getRes.data : [];
        setContratos(contratos);
        if (numeroNuevo !== numeroOriginal) {
          const existeNumeroNuevo = contratos.some((c) => String(c.numero_contrato) === numeroNuevo);
          if (!existeNumeroNuevo) {
            Swal.fire(
              'Actualización parcial',
              'Se guardaron cambios, pero el N° de contrato no se actualizó. Reinicia el servidor para aplicar la nueva lógica.',
              'warning'
            );
            return;
          }
        }

        if (numeroOriginal !== numeroNuevo && contratoPdfs[String(numeroOriginalRaw)]) {
          const nextPdfs = { ...contratoPdfs };
          nextPdfs[numeroNuevo] = nextPdfs[String(numeroOriginalRaw)];
          delete nextPdfs[String(numeroOriginalRaw)];
          persistirPdfsContrato(nextPdfs);
        }
        if (numeroOriginal !== numeroNuevo && contratoSuplementosMap[String(numeroOriginalRaw)]) {
          const nextS = { ...contratoSuplementosMap };
          nextS[numeroNuevo] = nextS[String(numeroOriginalRaw)];
          delete nextS[String(numeroOriginalRaw)];
          persistirSuplementosContrato(nextS);
        }
        if (numeroOriginal !== numeroNuevo && contratoAnexosMap[String(numeroOriginalRaw)]) {
          const nextA = { ...contratoAnexosMap };
          nextA[numeroNuevo] = nextA[String(numeroOriginalRaw)];
          delete nextA[String(numeroOriginalRaw)];
          persistirAnexosContrato(nextA);
        }
        cerrarModalContrato();
        Swal.fire(
          'Enviado a aprobación',
          'Los cambios quedaron pendientes. El contrato activo no se modifica hasta que un autorizador los apruebe.',
          'success'
        );
      })
      .catch((error) => {
        const msg =
          error.response?.data?.message ||
          (typeof error.response?.data === 'string' ? error.response.data : null) ||
          error.message;
        Swal.fire('Error', msg, 'error');
      });
  };

  const esContratoVencido = (con) => con?.estado === 'Vencido';
  const esContratoCancelado = (con) => con?.estado === 'Cancelado' || Number(con?.cancelado) === 1;
  const muestraBotonEliminar = (con) => esContratoVencido(con) || esContratoCancelado(con);

  const mensajeErrorApi = (error, fallback = 'Error de comunicación con el servidor.') => {
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message || fallback;
    if (status === 404) {
      return `${msg} Si acabas de actualizar el sistema, reinicia el servidor Node (puerto 3001).`;
    }
    return msg;
  };

  const solicitarCancelacionPendiente = (val, { motivo, archivar }) =>
    Axios.post(`${API_BASE}/contratos/${encodeURIComponent(val.numero_contrato)}/cancelar`, {
      motivo: String(motivo || '').trim().slice(0, 500),
      archivar: Boolean(archivar),
    })
      .then((res) => {
        getContratos();
        if (res.data?.pendiente) {
          Swal.fire(
            'Solicitud enviada',
            res.data.message ||
              (archivar
                ? 'La cancelación y archivo quedaron pendientes de aprobación. El contrato sigue en la lista hasta que un autorizador apruebe.'
                : 'La cancelación quedó pendiente de aprobación. El contrato sigue activo hasta que un autorizador la apruebe.'),
            'success'
          );
          return;
        }
        Swal.fire(
          'Contrato cancelado',
          res.data?.message ||
            'Quedó en estado Cancelado. Si esperaba una aprobación pendiente, reinicie el servidor Node (puerto 3001) para cargar la versión nueva.',
          'success'
        );
      })
      .catch((error) => {
        Swal.fire('Error', mensajeErrorApi(error), 'error');
      });

  const aprobarContratoPendiente = async (con) => {
    const accion = etiquetaAccionPendiente(con.aprobacion_accion);
    const result = await Swal.fire({
      title: '¿Aprobar solicitud?',
      html: `<p class="mb-2">Contrato <strong>${con.numero_contrato}</strong> — ${String(con.empresa || '').trim() || 'Sin empresa'}</p>
        <p class="mb-0">Acción: <strong>${accion}</strong></p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#15803d',
    });
    if (!result.isConfirmed) return;
    try {
      const accionPend = String(con.aprobacion_accion || '').toLowerCase();
      const esArchivoPendiente = accionPend === 'cancelacion_archivo' || accionPend === 'archivo';
      const pdfs = esArchivoPendiente ? getPdfsContrato(con.numero_contrato) : [];
      const res = await Axios.post(
        `${API_BASE}/contratos/${encodeURIComponent(con.numero_contrato)}/aprobar`,
        esArchivoPendiente
          ? {
              documentos: pdfs.map((p) => ({ id: p.id, nombre: p.nombre, dataUrl: p.dataUrl })),
            }
          : undefined
      );
      getContratos();
      if (esArchivoPendiente) eliminarPdfContrato(con.numero_contrato);
      const msg =
        res.data?.accion === 'cancelacion_archivo' || res.data?.accion === 'archivo'
          ? 'El contrato fue archivado por 5 años y ya no aparece en contratos activos.'
          : res.data?.accion === 'cancelacion'
            ? 'El contrato quedó cancelado.'
            : res.data?.accion === 'alta'
              ? 'El contrato quedó activo.'
              : 'Los cambios fueron aplicados y el contrato quedó activo.';
      Swal.fire('Aprobado', msg, 'success');
    } catch (error) {
      Swal.fire('Error', mensajeErrorApi(error), 'error');
    }
  };

  const rechazarContratoPendiente = async (con) => {
    const accion = etiquetaAccionPendiente(con.aprobacion_accion);
    const result = await Swal.fire({
      title: '¿Rechazar solicitud?',
      html: `<p class="mb-2">Contrato <strong>${con.numero_contrato}</strong> — ${String(con.empresa || '').trim() || 'Sin empresa'}</p>
        <p class="mb-0">Acción: <strong>${accion}</strong></p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b91c1c',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      inputPlaceholder: 'Explique por qué se rechaza esta solicitud (obligatorio)',
      inputAttributes: SWAL_ATTRS_MOTIVO_RECHAZO,
      didOpen: didOpenSwalInputSinAutofill,
      inputValidator: (value) => {
        if (!String(value || '').trim()) {
          return 'Debe indicar el motivo del rechazo.';
        }
        return undefined;
      },
    });
    if (!result.isConfirmed) return;
    const motivo = String(result.value || '').trim().slice(0, 500);
    try {
      const res = await Axios.post(
        `${API_BASE}/contratos/${encodeURIComponent(con.numero_contrato)}/rechazar`,
        { motivo }
      );
      getContratos();
      const msg =
        res.data?.accion === 'alta'
          ? 'El borrador del contrato fue descartado.'
          : res.data?.accion === 'cancelacion' ||
              res.data?.accion === 'cancelacion_archivo' ||
              res.data?.accion === 'archivo'
            ? 'Se descartó la solicitud de cancelación o archivo.'
            : 'Se descartaron los cambios propuestos.';
      Swal.fire('Rechazado', msg, 'success');
    } catch (error) {
      Swal.fire('Error', mensajeErrorApi(error), 'error');
    }
  };

  const solicitarArchivoPendiente = (val, motivo) =>
    Axios.post(`${API_BASE}/contratos/${encodeURIComponent(val.numero_contrato)}/solicitar-archivo`, {
      motivo: String(motivo || '').trim().slice(0, 500),
    })
      .then((res) => {
        getContratos();
        Swal.fire(
          'Solicitud enviada',
          res.data?.message ||
            'La solicitud de archivo quedó pendiente de aprobación. El contrato sigue visible hasta que un autorizador la apruebe.',
          'success'
        );
      })
      .catch((error) => {
        Swal.fire('Error', mensajeErrorApi(error), 'error');
      });

  const eliminarContrato = async (val) => {
    const esCancelado = esContratoCancelado(val);
    const result = await Swal.fire({
      title: esCancelado ? '¿Eliminar contrato cancelado?' : '¿Eliminar contrato vencido?',
      html: `
        <p class="mb-2">Contrato <strong>${val.numero_contrato}</strong> — ${String(val.empresa || '').trim() || 'Sin empresa'}</p>
        <p class="mb-0">Se enviará una solicitud de <strong>archivo por 5 años</strong> a aprobación. El contrato seguirá visible hasta que un autorizador la apruebe.</p>
      `,
      icon: 'warning',
      showCloseButton: true,
      closeButtonAriaLabel: 'Cerrar sin cambios',
      customClass: {
        popup: 'swal-cancel-contrato',
        closeButton: 'swal-cancel-contrato__close',
      },
      showCancelButton: preferences.confirmBeforeDelete,
      confirmButtonText: 'Sí, solicitar eliminación',
      cancelButtonText: 'No',
      confirmButtonColor: '#b91c1c',
      input: 'text',
      inputPlaceholder: 'Motivo de baja (obligatorio)',
      inputAttributes: SWAL_ATTRS_MOTIVO_CONTRATO,
      didOpen: didOpenSwalInputSinAutofill,
      inputValidator: validarMotivoBajaSwal,
    });
    if (!result.isConfirmed) return;
    const motivo = String(result.value || '').trim().slice(0, 500);
    if (!motivo) {
      Swal.fire('Atención', 'Debe indicar el motivo de la baja.', 'warning');
      return;
    }
    solicitarArchivoPendiente(val, motivo);
  };

  const cancelarContrato = (val) => {
    Swal.fire({
      title: '¿Cancelar contrato?',
      html: `
        <p class="mb-2">Contrato <strong>${val.numero_contrato}</strong> — ${String(val.empresa || '').trim() || 'Sin empresa'}</p>
        <p class="mb-0 small text-muted">
          <strong>Cancelar y eliminar contrato:</strong> envía solicitud de cancelación y archivo (5 años) a aprobación; el contrato sigue visible hasta que un autorizador la apruebe.<br />
          <strong>Solo cancelar contrato:</strong> envía solicitud de cancelación a aprobación; el contrato sigue activo hasta que un autorizador la apruebe.
        </p>
      `,
      icon: 'warning',
      showCloseButton: true,
      closeButtonAriaLabel: 'Cerrar sin cambios',
      customClass: {
        popup: 'swal-cancel-contrato',
        closeButton: 'swal-cancel-contrato__close',
      },
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: 'Cancelar y eliminar contrato',
      denyButtonText: 'Solo cancelar contrato',
      confirmButtonColor: '#b91c1c',
      denyButtonColor: '#64748b',
      reverseButtons: true,
      returnInputValueOnDeny: true,
      input: 'text',
      inputPlaceholder: 'Motivo de baja (obligatorio)',
      inputAttributes: SWAL_ATTRS_MOTIVO_CONTRATO,
      didOpen: didOpenSwalInputSinAutofill,
      inputValidator: validarMotivoBajaSwal,
      preDeny: () => {
        const err = validarMotivoBajaSwal(Swal.getInput()?.value);
        if (err) {
          Swal.showValidationMessage(err);
          return false;
        }
        return undefined;
      },
    }).then((result) => {
      if (!result.isConfirmed && !result.isDenied) return;
      const motivo = String(result.value || '').trim().slice(0, 500);
      if (!motivo) {
        Swal.fire('Atención', 'Debe indicar el motivo de la baja.', 'warning');
        return;
      }
      solicitarCancelacionPendiente(val, { motivo, archivar: result.isConfirmed });
    });
  };

  const descargarPdfArchivo = async (idArchivo, idDocumento, nombreArchivo) => {
    try {
      const res = await Axios.get(
        `${API_BASE}/contratos-archivo/${idArchivo}/documentos/${idDocumento}`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo || 'documento.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || error.message, 'error');
    }
  };

  const verDetalleArchivo = async (item) => {
    try {
      const res = await Axios.get(`${API_BASE}/contratos-archivo/${item.id_archivo}`);
      const det = res.data || {};
      const docs = Array.isArray(det.documentos) ? det.documentos : [];
      const retencionTxt = fechaParaExportEs(det.retencion_hasta);
      const bajaTxt = det.eliminado_en ? new Date(det.eliminado_en).toLocaleString('es-ES') : '-';
      const dias = det.dias_restantes_retencion;
      let avisoRetencion = '';
      if (dias != null && dias <= 90 && dias >= 0) {
        avisoRetencion = `<p class="text-warning mb-2"><strong>Atención:</strong> quedan ${dias} día(s) de retención.</p>`;
      } else if (dias != null && dias < 0) {
        avisoRetencion = `<p class="text-danger mb-2"><strong>Retención vencida</strong> (pendiente purga).</p>`;
      }
      const docsHtml =
        docs.length === 0
          ? '<p class="text-muted mb-0">Sin PDFs archivados.</p>'
          : `<ul class="list-unstyled mb-0 text-start">${docs
              .map(
                (d) =>
                  `<li class="mb-1"><button type="button" class="btn btn-link btn-sm p-0 archivo-doc-link" data-doc-id="${d.id_documento}">${d.nombre_archivo}</button></li>`
              )
              .join('')}</ul>`;

      await Swal.fire({
        title: `Expediente ${det.numero_contrato}`,
        html: `
          <div style="text-align:left;font-size:0.92rem">
            ${avisoRetencion}
            <p><strong>Empresa:</strong> ${det.empresa || '-'}</p>
            <p><strong>Tipo:</strong> ${det.tipo_contrato || '-'}</p>
            <p><strong>Parte:</strong> ${Number(det.proveedor_cliente) === 1 ? 'Proveedor' : 'Cliente'}</p>
            <p><strong>Vigencia:</strong> ${vigenciaLegibleOGuion(det.vigencia)}</p>
            <p><strong>Inicio / Fin:</strong> ${fechaParaExportEs(det.fecha_inicio) || '-'} — ${fechaParaExportEs(det.fecha_fin) || '-'}</p>
            <p><strong>Eliminado por:</strong> ${det.eliminado_por || '-'}</p>
            <p><strong>Fecha baja:</strong> ${bajaTxt}</p>
            <p><strong>Retención hasta:</strong> ${retencionTxt || '-'}</p>
            <p><strong>Motivo:</strong> ${det.motivo || '-'}</p>
            <hr />
            <p class="mb-1"><strong>Documentos PDF</strong></p>
            ${docsHtml}
          </div>
        `,
        width: 560,
        didOpen: () => {
          document.querySelectorAll('.archivo-doc-link').forEach((btn) => {
            btn.addEventListener('click', () => {
              const idDoc = Number(btn.getAttribute('data-doc-id'));
              const doc = docs.find((d) => d.id_documento === idDoc);
              if (doc) descargarPdfArchivo(det.id_archivo, idDoc, doc.nombre_archivo);
            });
          });
        },
      });
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || error.message, 'error');
    }
  };

  const construirFilasExportacionArchivo = () =>
    archivoList.map((a) => {
      const dias = a.dias_restantes_retencion;
      return [
        a.numero_contrato,
        Number(a.proveedor_cliente) === 1 ? 'Proveedor' : 'Cliente',
        String(a.empresa || '').trim(),
        etiquetaTipoContratoLegible(a.tipo_contrato),
        convertirVigenciaLegible(a.vigencia),
        fechaParaExportEs(a.fecha_inicio),
        fechaParaExportEs(a.fecha_fin),
        String(a.eliminado_por || '').trim(),
        a.eliminado_en ? new Date(a.eliminado_en).toLocaleString('es-ES') : '',
        fechaParaExportEs(a.retencion_hasta),
        dias ?? '',
        a.num_documentos ?? 0,
        String(a.motivo || '').replace(/\s+/g, ' ').trim(),
      ];
    });

  const exportarArchivoCsvUtf8 = () => {
    const rows = construirFilasExportacionArchivo();
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [ARCHIVO_EXCEL_HEADERS.map(escape).join(';'), ...rows.map((r) => r.map(escape).join(';'))];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archivo_contratos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportarArchivoExcel = async () => {
    const dataRows = construirFilasExportacionArchivo();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Archivo histórico', { views: [{ state: 'frozen', ySplit: 3 }] });
    const totalCols = ARCHIVO_EXCEL_HEADERS.length;
    const lastColLetter = ws.getColumn(totalCols).letter;
    const fechaTxt = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

    ws.mergeCells(`A1:${lastColLetter}1`);
    ws.getCell('A1').value = 'Archivo histórico de contratos (retención 5 años)';
    ws.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
    ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14532D' } };
    ws.getRow(1).height = 24;

    ws.mergeCells(`A2:${lastColLetter}2`);
    ws.getCell('A2').value = `Generado: ${fechaTxt} | Registros: ${dataRows.length}`;
    ws.getCell('A2').font = { color: { argb: 'FF334155' }, size: 10 };
    ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    ws.addRow(ARCHIVO_EXCEL_HEADERS);
    ws.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
    dataRows.forEach((row) => ws.addRow(row));
    ws.autoFilter = { from: 'A3', to: `${lastColLetter}3` };
    ws.columns = [12, 11, 26, 18, 11, 12, 12, 28, 20, 14, 18, 10, 36].map((w) => ({ width: w }));

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archivo_contratos_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportarArchivoPdf = () => {
    const dataRows = construirFilasExportacionArchivo();
    if (dataRows.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin datos',
        text: 'No hay registros en archivo histórico con los filtros actuales.',
      });
      return;
    }
    try {
      const fechaTxt = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
      descargarPdfTablaVerde({
        titulo: 'Archivo histórico de contratos',
        metaLinea: `Generado: ${fechaTxt}  |  Registros: ${dataRows.length}  |  Retención legal 5 años`,
        headers: ARCHIVO_EXCEL_HEADERS,
        dataRows,
        nombreArchivo: `archivo_contratos_${new Date().toISOString().slice(0, 10)}.pdf`,
        fontSize: 5.5,
      });
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'Error al generar PDF',
        text: String(e?.message || e),
      });
    }
  };

  const aniosArchivoOpciones = useMemo(() => {
    const set = new Set();
    archivoList.forEach((a) => {
      if (a.eliminado_en) set.add(String(new Date(a.eliminado_en).getFullYear()));
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [archivoList]);

  const editarContratoTabla = (val) => {
    setEditarContrato(true);
    setContratoFormErrors({});
    setContratoNumero(val.numero_contrato);
    setContratoNumeroOriginal(val.numero_contrato);
    setContratoProveedorCliente(val.proveedor_cliente === 1);
    setContratoEmpresa(val.empresa);
    setContratoContactosNiveles(contactosNivelesStateFromContrato(val));
    const { items } = parseSuplementosFromContrato(val);
    const cache = normalizarListaSuplementos(contratoSuplementosMap[String(val.numero_contrato || '').trim()]);
    const merged = renumerarSuplementosLista(
      items.length
        ? items.map((it) => {
            const hit = cache.find((c) => c.serverId === it.serverId || c.id === it.id);
            return { ...it, id: it.id || hit?.id || `sup_${it.numero}`, dataUrl: hit?.dataUrl || it.dataUrl || '' };
          })
        : cache
    );
    guardarSuplementosListaContrato(val.numero_contrato, merged);
    const anexosParsed = parseAnexosFromContrato(val);
    const cacheAnexos = contratoAnexosMap[String(val.numero_contrato || '').trim()];
    const itemsAnexos = anexosParsed.items.length
      ? anexosParsed.items.map((it) => {
          const hit = cacheAnexos?.items?.find((c) => c.serverId === it.serverId || c.id === it.id);
          return { ...it, id: it.id || hit?.id || `anx_${it.numero}`, dataUrl: hit?.dataUrl || it.dataUrl || '' };
        })
      : cacheAnexos?.items || [];
    guardarAnexosEstadoContrato(val.numero_contrato, {
      activo: anexosParsed.activo || (itemsAnexos.length > 0),
      items: renumerarAnexosLista(itemsAnexos),
    });
    setContratoVigenciaPartes(vigenciaAPartes(val.vigencia));
    setContratoTipo(val.tipo_contrato);
    const pri = String(val.prioridad || 'media').toLowerCase();
    setContratoPrioridad(['alta', 'media', 'baja'].includes(pri) ? pri : 'media');
    const fechaInicio = val.fecha_inicio ? val.fecha_inicio.substring(0, 10) : '';
    setContratoFechaInicio(fechaInicio);
    setShowContratoModal(true);
    aplicarDocumentosServidorAlContrato(val.numero_contrato);
  };

  const abrirInfoContrato = (contrato) => {
    if (!contrato) return;
    setContratoInfo(contrato);
    setShowInfoModal(true);
  };

  const abrirCambiosPendientes = (contrato) => {
    if (!contrato) return;
    setContratoCambios(contrato);
    setShowCambiosModal(true);
  };

  const renovarContrato = (contrato) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioRenovacion = toISODate(hoy.toISOString());
    const sugeridaFin = sumarFechaConVigencia(inicioRenovacion, contrato.vigencia) || inicioRenovacion;

    Swal.fire({
      title: 'Renovar contrato',
      icon: 'question',
      html: `
        <div style="text-align:left">
          <p style="margin-bottom:0.45rem;">
            <strong>Inicio:</strong> ${inicioRenovacion}
          </p>
          <label for="swal-renov-fecha-fin" style="display:block;font-weight:600;margin-bottom:0.25rem;">
            Fecha fin
          </label>
          <input id="swal-renov-fecha-fin" type="date" class="swal2-input" style="margin:0;width:100%;" value="${sugeridaFin}" min="${inicioRenovacion}" />
          <small style="display:block;color:#6b7280;margin-top:0.4rem;">
            Elige la nueva fecha fin del contrato.
          </small>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, renovar',
      focusConfirm: false,
      preConfirm: () => {
        const fechaFin = document.getElementById('swal-renov-fecha-fin')?.value;
        if (!fechaFin) {
          Swal.showValidationMessage('Debes seleccionar una fecha fin.');
          return false;
        }
        if (fechaFin < inicioRenovacion) {
          Swal.showValidationMessage('La fecha fin no puede ser menor a la fecha de inicio.');
          return false;
        }
        return { fechaFin };
      },
    }).then((result) => {
      if (!result.isConfirmed) return;
      const nuevaFechaFin = result.value?.fechaFin;
      if (!nuevaFechaFin) return;

      Axios.put(`${API_BASE}/update-contrato`, {
        numero_contrato: contrato.numero_contrato,
        operacion: 'renovacion',
        proveedor_cliente: contrato.proveedor_cliente ? 1 : 0,
        empresa: contrato.empresa,
        ...prepararPayloadContactosNiveles(contactosNivelesStateFromContrato(contrato)),
        ...prepararSuplementosPayload(getSuplementosContrato(contrato.numero_contrato)),
        ...prepararAnexosPayload(parseAnexosFromContrato(contrato)),
        vigencia: contrato.vigencia,
        tipo_contrato: contrato.tipo_contrato,
        prioridad: contrato.prioridad || 'media',
        fecha_inicio: inicioRenovacion,
        fecha_fin: nuevaFechaFin,
        vencido: 0,
      })
        .then(() => {
          getContratos();
          Swal.fire('Renovado', 'El contrato se renovó correctamente.', 'success');
        })
        .catch((error) => {
          Swal.fire('Error', error.response?.data?.message || error.message, 'error');
        });
    });
  };

  const enviarRecordatorioContrato = (contrato) => {
    if (!contrato?.numero_contrato) return;
    const diasRestantes = diasParaVencer(contrato.fecha_fin);
    const evento = diasRestantes != null && diasRestantes < 0 ? 'vencido' : 'por_vencer';
    const contactos = listCorreosPorEvento(contrato, evento);
    if (!contactos.length) {
      Swal.fire(
        'Correo requerido',
        'Este contrato no tiene correos configurados para recordatorios de vencimiento.',
        'info'
      );
      return;
    }
    const lineaContacto = (c) => `<li>${c.nombre ? `${c.nombre} — ` : ''}${c.correo}</li>`;
    const destinosHtml = contactos.map(lineaContacto).join('');

    Swal.fire({
      title: '¿Enviar recordatorio?',
      html: `
        <div style="text-align:left">
          <p style="margin:0 0 0.35rem;"><strong>Contrato:</strong> ${contrato.numero_contrato}</p>
          <p style="margin:0 0 0.25rem;"><strong>Destinos:</strong></p>
          <ul style="margin:0;padding-left:1.2rem;text-align:left">${destinosHtml}</ul>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      Axios.post(`${API_BASE}/send-contrato-reminder`, {
        numero_contrato: contrato.numero_contrato,
      })
        .then((res) => {
          const isWarning = Boolean(res.data?.deliveryWarning);
          Swal.fire(
            isWarning ? 'Aviso' : 'Enviado',
            res.data?.message || 'Recordatorio enviado correctamente.',
            isWarning ? 'warning' : 'success'
          );
        })
        .catch((error) => {
          Swal.fire('Error', error.response?.data?.message || error.message, 'error');
        });
    });
  };

  const contratosEnriquecidos = useMemo(() => {
    return contratosList.map((con) => {
      const diasRestantes = diasParaVencer(con.fecha_fin);
      const estado = getEstadoContrato(con);
      return { ...con, diasRestantes, estado, alerta: getAlertaContrato(con) };
    });
  }, [contratosList]);

  const contratosOperativos = useMemo(
    () => contratosEnriquecidos.filter(esContratoVisibleListaOperativa),
    [contratosEnriquecidos]
  );

  const contratosPendientes = useMemo(
    () => contratosEnriquecidos.filter(esContratoConSolicitudPendiente),
    [contratosEnriquecidos]
  );

  const contratosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return contratosOperativos.filter((con) => {
      const matchTerm =
        !term ||
        String(con.numero_contrato).toLowerCase().includes(term) ||
        String(con.empresa || '').toLowerCase().includes(term) ||
        String(con.tipo_contrato || '').toLowerCase().includes(term);

      const matchTipo = filtroTipo === 'todos' || con.tipo_contrato === filtroTipo;
      const matchParte =
        filtroParte === 'todos' ||
        (filtroParte === 'proveedor' && con.proveedor_cliente) ||
        (filtroParte === 'cliente' && !con.proveedor_cliente);
      const matchEstado = filtroEstado === 'todos' || con.estado === filtroEstado;
      const matchVencimiento =
        filtroVencimiento === 'todos' ||
        (filtroVencimiento === '7' && con.diasRestantes != null && con.diasRestantes <= 7) ||
        (filtroVencimiento === '30' && con.diasRestantes != null && con.diasRestantes <= 30) ||
        (filtroVencimiento === '90' && con.diasRestantes != null && con.diasRestantes <= 90);

      return matchTerm && matchTipo && matchParte && matchEstado && matchVencimiento;
    });
  }, [contratosOperativos, searchTerm, filtroTipo, filtroParte, filtroEstado, filtroVencimiento]);

  const resumen = useMemo(() => {
    const totalOperativos = contratosOperativos.length;
    const pendientesAprobacion = contratosPendientes.length;
    const activos = contratosOperativos.filter((c) => c.estado === 'Activo').length;
    const porVencer = contratosOperativos.filter((c) => c.estado === 'Por vencer').length;
    const vencidos = contratosOperativos.filter((c) => c.estado === 'Vencido').length;
    const seguimiento = contratosOperativos.filter((c) => c.estado === 'En seguimiento').length;
    return {
      total: totalOperativos + pendientesAprobacion,
      totalOperativos,
      pendientesAprobacion,
      activos,
      porVencer,
      vencidos,
      seguimiento,
    };
  }, [contratosOperativos, contratosPendientes]);

  const tiposDisponibles = useMemo(() => {
    const setTipos = new Set();
    tiposCatalogoActivos.forEach((t) => {
      if (t.nombre) setTipos.add(String(t.nombre).trim());
    });
    contratosOperativos.forEach((c) => {
      const leg = etiquetaTipoContratoLegible(c.tipo_contrato) || c.tipo_contrato;
      if (leg) setTipos.add(String(leg).trim());
    });
    return Array.from(setTipos).sort((a, b) => a.localeCompare(b, 'es'));
  }, [contratosOperativos, tiposCatalogoActivos]);

  const contratosPrioritarios = useMemo(() => {
    return contratosOperativos
      .filter((c) => c.diasRestantes != null && c.diasRestantes <= 90)
      .sort((a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999));
  }, [contratosOperativos]);

  const contratosPorVencer = useMemo(() => contratosOperativos.filter((c) => c.estado === 'Por vencer'), [contratosOperativos]);
  const contratosVencidos = useMemo(() => contratosOperativos.filter((c) => c.estado === 'Vencido'), [contratosOperativos]);
  const contratosCriticos = useMemo(() => {
    return contratosOperativos
      .filter((c) => c.estado === 'Por vencer' || c.estado === 'Vencido')
      .sort((a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999));
  }, [contratosOperativos]);

  const contratosBandejaVencimientos = useMemo(() => {
    if (bandejaVencimientosModo === 'por-vencer') return contratosPorVencer;
    if (bandejaVencimientosModo === 'vencidos') return contratosVencidos;
    if (bandejaVencimientosModo === 'criticos') return contratosCriticos;
    return contratosPrioritarios;
  }, [bandejaVencimientosModo, contratosPorVencer, contratosVencidos, contratosCriticos, contratosPrioritarios]);

  const tituloBandejaVencimientos =
    bandejaVencimientosModo === 'por-vencer'
      ? 'Bandeja de contratos por vencer (< 30 días)'
      : bandejaVencimientosModo === 'vencidos'
        ? 'Bandeja de contratos vencidos'
        : bandejaVencimientosModo === 'criticos'
          ? 'Bandeja de contratos por vencer y vencidos'
          : 'Bandeja de vencimientos y seguimiento (<= 90 días)';

  const mensajeVacioBandejaVencimientos =
    bandejaVencimientosModo === 'por-vencer'
      ? 'No hay contratos por vencer (< 30 días).'
      : bandejaVencimientosModo === 'vencidos'
        ? 'No hay contratos vencidos.'
        : bandejaVencimientosModo === 'criticos'
          ? 'No hay contratos por vencer ni vencidos.'
          : 'No hay contratos próximos a vencer.';

  /* Cola priorizada filtrada por búsqueda y rango de fechas (vista renovaciones) */
  const colaRenovacion = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const desde = renovFechaDesde ? new Date(`${renovFechaDesde}T00:00:00`) : null;
    const hasta = renovFechaHasta ? new Date(`${renovFechaHasta}T23:59:59`) : null;
    return contratosPrioritarios.filter((c) => {
      const matchTerm =
        !term ||
        String(c.numero_contrato).toLowerCase().includes(term) ||
        String(c.empresa || '').toLowerCase().includes(term) ||
        String(c.tipo_contrato || '').toLowerCase().includes(term);
      if (!matchTerm) return false;
      if (!c.fecha_fin || (!desde && !hasta)) return true;
      const fin = new Date(`${toISODate(c.fecha_fin)}T00:00:00`);
      if (desde && fin < desde) return false;
      if (hasta && fin > hasta) return false;
      return true;
    });
  }, [contratosPrioritarios, searchTerm, renovFechaDesde, renovFechaHasta]);

  /* Datos para el gráfico de barras "Contratos por Mes de Vencimiento" */
  const vencimientosPorMes = useMemo(() => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const activos = Array(12).fill(0);
    const vencidos = Array(12).fill(0);
    contratosOperativos.forEach((c) => {
      if (c.fecha_fin) {
        const m = new Date(`${toISODate(c.fecha_fin)}T00:00:00`).getMonth();
        if (c.estado === 'Vencido') vencidos[m] += 1;
        if (c.estado === 'Activo') activos[m] += 1;
      }
    });
    const maxActivos = Math.max(...activos, 1);
    const maxVencidos = Math.max(...vencidos, 1);
    return meses.map((mes, i) => ({
      mes,
      activos: activos[i],
      vencidos: vencidos[i],
      alturaActivos: Math.round((activos[i] / maxActivos) * 100),
      alturaVencidos: Math.round((vencidos[i] / maxVencidos) * 100),
    }));
  }, [contratosOperativos]);

  /* Porcentaje (sobre el total) de inmediatos y vencidos para barras de progreso del panel */
  const porcentajePanel = useMemo(() => {
    const total = contratosOperativos.length || 1;
    return {
      inmediatos: Math.round((contratosPorVencer.length / total) * 100),
      vencidos: Math.round((contratosVencidos.length / total) * 100),
    };
  }, [contratosOperativos, contratosPorVencer, contratosVencidos]);

  const topEmpresas = useMemo(() => {
    const mapa = new Map();
    contratosOperativos.forEach((c) => {
      const key = c.empresa || 'Sin empresa';
      mapa.set(key, (mapa.get(key) || 0) + 1);
    });
    return Array.from(mapa.entries())
      .map(([empresa, cantidad]) => ({ empresa, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6);
  }, [contratosOperativos]);

  const cockpitCalidadGlobal = useMemo(() => {
    const total = contratosOperativos.length;
    if (total === 0) {
      return { sinCorreo: 0, sinPdf: 0, sinSuplementos: 0, sinAnexos: 0, pctDocumental: 100, total: 0 };
    }
    const sinCorreo = contratosOperativos.filter((c) => !tieneAlgunCorreoNivel(c)).length;
    const sinPdf = contratosOperativos.filter((c) => getPdfsContrato(c.numero_contrato).length === 0).length;
    const sinSuplementos = contratosOperativos.filter(
      (c) => cantidadSuplementosContrato(c, getSuplementosContrato(c.numero_contrato)) === 0
    ).length;
    const sinAnexos = contratosOperativos.filter(
      (c) => cantidadAnexosContrato(c, getAnexosEstadoContrato(c.numero_contrato)) === 0
    ).length;
    const pctDocumental = Math.round(((total - sinCorreo + total - sinPdf) / (total * 2)) * 100);
    return { sinCorreo, sinPdf, sinSuplementos, sinAnexos, pctDocumental, total };
  }, [contratosOperativos, getPdfsContrato, getSuplementosContrato, getAnexosEstadoContrato]);

  const cockpitSalud = useMemo(() => {
    const totalCartera = resumen.total || 1;
    const baseOperativos = resumen.totalOperativos || 1;
    const pctVencidos = (resumen.vencidos / baseOperativos) * 100;
    const pctPorVencer = (resumen.porVencer / baseOperativos) * 100;
    const pctPendientes = (resumen.pendientesAprobacion / totalCartera) * 100;
    const gapDoc = 100 - cockpitCalidadGlobal.pctDocumental;
    const penalty =
      pctVencidos * 2 + pctPorVencer * 0.8 + pctPendientes * 1.2 + gapDoc * 0.5;
    const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
    let nivel = 'verde';
    let label = 'Cartera saludable';
    if (score < 50) {
      nivel = 'rojo';
      label = 'Riesgo alto';
    } else if (score < 75) {
      nivel = 'amarillo';
      label = 'Atención requerida';
    }
    return { score, nivel, label };
  }, [resumen, cockpitCalidadGlobal]);

  const cockpitBalanceParte = useMemo(() => {
    let proveedor = 0;
    let cliente = 0;
    contratosOperativos.forEach((c) => {
      if (c.proveedor_cliente) proveedor += 1;
      else cliente += 1;
    });
    const total = proveedor + cliente || 1;
    return {
      proveedor,
      cliente,
      pctProv: Math.round((proveedor / total) * 100),
      pctCli: Math.round((cliente / total) * 100),
    };
  }, [contratosOperativos]);

  const cockpitConcentracion = useMemo(() => {
    const base = resumen.totalOperativos;
    if (base === 0 || topEmpresas.length === 0) return null;
    const top = topEmpresas[0];
    const pct = Math.round((top.cantidad / base) * 100);
    if (pct < 35) return null;
    return { empresa: top.empresa, cantidad: top.cantidad, pct };
  }, [topEmpresas, resumen.totalOperativos]);

  const cockpitTimeline = useMemo(() => {
    return contratosOperativos
      .filter((c) => c.diasRestantes != null && c.diasRestantes >= 0 && c.diasRestantes <= 90)
      .sort((a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999))
      .slice(0, 10);
  }, [contratosOperativos]);

  const cockpitAcciones = useMemo(() => {
    const items = [];
    if (resumen.pendientesAprobacion > 0) {
      items.push({
        key: 'pendientes-aprobacion',
        count: resumen.pendientesAprobacion,
        label: puedeAprobarContratos
          ? 'Solicitudes pendientes de su aprobación'
          : 'Solicitudes en espera de aprobación',
        severity: 'warning',
      });
    }
    if (resumen.vencidos > 0) {
      items.push({
        key: 'vencidos',
        count: resumen.vencidos,
        label: 'Contratos vencidos — renovar o cerrar',
        severity: 'danger',
      });
    }
    if (resumen.porVencer > 0) {
      items.push({
        key: 'por-vencer',
        count: resumen.porVencer,
        label: 'Por vencer en los próximos 30 días',
        severity: 'warning',
      });
    }
    const vencidosAntiguos = contratosVencidos.filter(
      (c) => c.diasRestantes != null && c.diasRestantes < -30
    ).length;
    if (vencidosAntiguos > 0) {
      items.push({
        key: 'vencidos-antiguos',
        count: vencidosAntiguos,
        label: 'Vencidos hace más de 30 días (acción urgente)',
        severity: 'danger',
      });
    }
    if (cockpitCalidadGlobal.sinPdf > 0) {
      items.push({
        key: 'sin-pdf',
        count: cockpitCalidadGlobal.sinPdf,
        label: 'Sin PDF adjunto en el expediente',
        severity: 'info',
      });
    }
    if (cockpitCalidadGlobal.sinSuplementos > 0) {
      items.push({
        key: 'sin-suplementos',
        count: cockpitCalidadGlobal.sinSuplementos,
        label: 'Sin suplementos en el expediente',
        severity: 'info',
      });
    }
    if (cockpitCalidadGlobal.sinAnexos > 0) {
      items.push({
        key: 'sin-anexos',
        count: cockpitCalidadGlobal.sinAnexos,
        label: 'Sin anexos en el expediente',
        severity: 'info',
      });
    }
    if (cockpitCalidadGlobal.sinCorreo > 0) {
      items.push({
        key: 'sin-correo',
        count: cockpitCalidadGlobal.sinCorreo,
        label: 'Sin correo de notificación',
        severity: 'info',
      });
    }
    if (contratosCriticos.length > 0) {
      items.push({
        key: 'renovaciones',
        count: contratosCriticos.length,
        label: 'Ir a cola de renovación priorizada',
        severity: 'primary',
      });
    }
    return items;
  }, [resumen, contratosVencidos, contratosCriticos, cockpitCalidadGlobal, puedeAprobarContratos]);

  const empresasReporteOpciones = useMemo(() => {
    const s = new Set(contratosOperativos.map((c) => c.empresa || 'Sin empresa'));
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'es'));
  }, [contratosOperativos]);

  const contratosFiltradosReporte = useMemo(() => {
    return contratosOperativos.filter((c) => {
      if (reporteTipo !== 'todos' && c.tipo_contrato !== reporteTipo) return false;
      if (reporteEmpresa !== 'todas' && (c.empresa || 'Sin empresa') !== reporteEmpresa) return false;
      if (reporteFechaDesde || reporteFechaHasta) {
        if (!c.fecha_fin) return false;
        const fin = new Date(`${toISODate(c.fecha_fin)}T00:00:00`);
        if (reporteFechaDesde) {
          const desde = new Date(`${reporteFechaDesde}T00:00:00`);
          if (fin < desde) return false;
        }
        if (reporteFechaHasta) {
          const hasta = new Date(`${reporteFechaHasta}T23:59:59`);
          if (fin > hasta) return false;
        }
      }
      return true;
    });
  }, [contratosOperativos, reporteFechaDesde, reporteFechaHasta, reporteTipo, reporteEmpresa]);

  const reportePorTipoRows = useMemo(() => {
    const m = new Map();
    contratosFiltradosReporte.forEach((c) => {
      const t = (c.tipo_contrato && String(c.tipo_contrato).trim()) || 'Sin tipo';
      m.set(t, (m.get(t) || 0) + 1);
    });
    return Array.from(m.entries())
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [contratosFiltradosReporte]);

  const reporteMaxTipoCount = useMemo(
    () => (reportePorTipoRows.length ? Math.max(...reportePorTipoRows.map((r) => r.cantidad)) : 1),
    [reportePorTipoRows]
  );

  const reportePorParte = useMemo(() => {
    let proveedor = 0;
    let cliente = 0;
    contratosFiltradosReporte.forEach((c) => {
      if (c.proveedor_cliente) proveedor += 1;
      else cliente += 1;
    });
    return { proveedor, cliente };
  }, [contratosFiltradosReporte]);

  const previewExportContratos = useMemo(
    () => contratosFiltradosReporte.slice(0, 25),
    [contratosFiltradosReporte]
  );

  const topEmpresasReporte = useMemo(() => {
    const mapa = new Map();
    contratosFiltradosReporte.forEach((c) => {
      const key = c.empresa || 'Sin empresa';
      mapa.set(key, (mapa.get(key) || 0) + 1);
    });
    return Array.from(mapa.entries())
      .map(([empresa, cantidad]) => ({ empresa, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 8);
  }, [contratosFiltradosReporte]);

  const reporteCalidadDatos = useMemo(() => {
    const list = contratosFiltradosReporte;
    const sinCorreo = list.filter((c) => !tieneAlgunCorreoNivel(c)).length;
    const sinPdf = list.filter((c) => getPdfsContrato(c.numero_contrato).length === 0).length;
    const sinSuplementos = list.filter(
      (c) => cantidadSuplementosContrato(c, getSuplementosContrato(c.numero_contrato)) === 0
    ).length;
    const sinAnexos = list.filter(
      (c) => cantidadAnexosContrato(c, getAnexosEstadoContrato(c.numero_contrato)) === 0
    ).length;
    return {
      sinCorreo,
      sinPdf,
      sinSuplementos,
      sinAnexos,
    };
  }, [contratosFiltradosReporte, getPdfsContrato, getSuplementosContrato, getAnexosEstadoContrato]);

  const verTodosPorVencer = () => {
    if (contratosPorVencer.length === 0) {
      Swal.fire('Sin contratos por vencer', 'No hay contratos menores de 30 días para mostrar.', 'info');
      return;
    }
    setBandejaVencimientosModo('por-vencer');
    irASeccion('vencimientos');
  };

  const verTodosVencidos = () => {
    if (contratosVencidos.length === 0) {
      Swal.fire('Sin contratos vencidos', 'No hay contratos vencidos para mostrar.', 'info');
      return;
    }
    setBandejaVencimientosModo('vencidos');
    irASeccion('vencimientos');
  };

  /** Por vencer (<30 días) + vencidos: misma combinación que alertas críticas / pestaña unificada */
  const verTodosPorVencerYVencidos = () => {
    if (contratosCriticos.length === 0) {
      Swal.fire('Sin contratos', 'No hay contratos por vencer ni vencidos para mostrar.', 'info');
      return;
    }
    setBandejaVencimientosModo('criticos');
    irASeccion('vencimientos');
  };

  const ejecutarAccionCockpit = (key) => {
    switch (key) {
      case 'pendientes-aprobacion':
        irASeccion('pendientes');
        break;
      case 'vencidos':
      case 'vencidos-antiguos':
        verTodosVencidos();
        break;
      case 'por-vencer':
        verTodosPorVencer();
        break;
      case 'sin-pdf':
      case 'sin-correo':
      case 'sin-suplementos':
      case 'sin-anexos':
        irASeccion('reportes');
        break;
      case 'renovaciones':
        irASeccion('renovaciones');
        break;
      default:
        break;
    }
  };

  const renovarVencidosMasivo = () => {
    if (contratosVencidos.length === 0) {
      Swal.fire('Sin vencidos', 'No hay contratos vencidos para renovar.', 'info');
      return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioRenovacion = toISODate(hoy.toISOString());
    const sugeridaFin = sumarFechaConVigencia(inicioRenovacion, '1|0|0') || inicioRenovacion;

    Swal.fire({
      title: 'Renovar contratos vencidos',
      html: `
        <div style="text-align:left">
          <p style="margin:0 0 0.55rem;">
            Se renovarán ${contratosVencidos.length} contrato(s) vencido(s).
          </p>
          <p style="margin:0 0 0.45rem;">
            <strong>Inicio:</strong> ${inicioRenovacion}
          </p>
          <label for="swal-renov-fecha-fin-masivo" style="display:block;font-weight:600;margin-bottom:0.25rem;">
            Fecha fin
          </label>
          <input
            id="swal-renov-fecha-fin-masivo"
            type="date"
            class="swal2-input"
            style="margin:0;width:100%;"
            value="${sugeridaFin}"
            min="${inicioRenovacion}"
          />
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, renovar vencidos',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusConfirm: false,
      preConfirm: () => {
        const fechaFin = document.getElementById('swal-renov-fecha-fin-masivo')?.value;
        if (!fechaFin) {
          Swal.showValidationMessage('Debes seleccionar una fecha fin.');
          return false;
        }
        if (fechaFin < inicioRenovacion) {
          Swal.showValidationMessage('La fecha fin no puede ser menor a la fecha de inicio.');
          return false;
        }
        return { fechaFin };
      },
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      const nuevaFechaFinSeleccionada = result.value?.fechaFin;
      if (!nuevaFechaFinSeleccionada) return;

      const resultados = await Promise.allSettled(
        contratosVencidos.map((contrato) => {
          return Axios.put(`${API_BASE}/update-contrato`, {
            numero_contrato: contrato.numero_contrato,
            operacion: 'renovacion',
            proveedor_cliente: contrato.proveedor_cliente ? 1 : 0,
            empresa: contrato.empresa,
            ...prepararPayloadContactosNiveles(contactosNivelesStateFromContrato(contrato)),
            ...prepararSuplementosPayload(getSuplementosContrato(contrato.numero_contrato)),
            ...prepararAnexosPayload(parseAnexosFromContrato(contrato)),
            vigencia: contrato.vigencia,
            tipo_contrato: contrato.tipo_contrato,
            prioridad: contrato.prioridad || 'media',
            fecha_inicio: inicioRenovacion,
            fecha_fin: nuevaFechaFinSeleccionada,
            vencido: 0,
          });
        })
      );

      const ok = resultados.filter((r) => r.status === 'fulfilled').length;
      const fail = resultados.length - ok;

      getContratos();
      if (fail === 0) {
        Swal.fire('Renovación completada', `Se renovaron ${ok} contrato(s) vencido(s).`, 'success');
      } else {
        Swal.fire('Renovación parcial', `Renovados: ${ok}. Con error: ${fail}.`, 'warning');
      }
    });
  };

  const verDetalleContrato = (contrato) => {
    Swal.fire({
      title: `Contrato ${contrato.numero_contrato}`,
      html: `
        <div style="text-align:left">
          <p><strong>Empresa:</strong> ${contrato.empresa || '-'}</p>
          <p><strong>Correo notificación:</strong> ${resumenTodosCorreosNivel(contrato) || '-'}</p>
          <p><strong>Tipo:</strong> ${contrato.tipo_contrato || '-'}</p>
          <p><strong>Vigencia:</strong> ${vigenciaLegibleOGuion(contrato.vigencia)}</p>
          <p><strong>Inicio:</strong> ${toISODate(contrato.fecha_inicio) || '-'}</p>
          <p><strong>Fin:</strong> ${toISODate(contrato.fecha_fin) || '-'}</p>
          <p><strong>Estado:</strong> ${contrato.estado}</p>
          <p><strong>${formatDiferenciaDias(contrato.diasRestantes)}</strong></p>
        </div>
      `,
      icon: 'info',
    });
  };

  const fechaParaExportEs = (value) => {
    const iso = toISODate(value);
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const construirFilasExportacionExcel = () =>
    contratosFiltradosReporte.map((c) => {
      const etiquetaPdf = getEtiquetaPdfsContrato(c.numero_contrato);
      return [
        c.numero_contrato,
        c.proveedor_cliente ? 'Proveedor' : 'Cliente',
        String(c.empresa || '').trim(),
        resumenTodosCorreosNivel(c),
        etiquetaTipoContratoLegible(c.tipo_contrato),
        convertirVigenciaLegible(c.vigencia),
        resumenSuplementos(c),
        fechaParaExportEs(c.fecha_inicio),
        fechaParaExportEs(c.fecha_fin),
        c.estado || '',
        c.diasRestantes ?? '',
        c.vencido === 1 || c.vencido === true ? 'Sí' : 'No',
        etiquetaPdf,
      ];
    });

  const exportarReporteExcel = async () => {
    const dataRows = construirFilasExportacionExcel();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Contratos', {
      views: [{ state: 'frozen', ySplit: 3 }],
    });

    const totalCols = REPORTE_EXCEL_HEADERS.length;
    const lastColLetter = ws.getColumn(totalCols).letter;
    const fechaTxt = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

    ws.mergeCells(`A1:${lastColLetter}1`);
    ws.getCell('A1').value = 'Reporte de contratacion';
    ws.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
    ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14532D' } };
    ws.getRow(1).height = 24;

    ws.mergeCells(`A2:${lastColLetter}2`);
    ws.getCell('A2').value = `Generado: ${fechaTxt} | Registros: ${dataRows.length}`;
    ws.getCell('A2').font = { color: { argb: 'FF334155' }, size: 10 };
    ws.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    ws.getRow(2).height = 20;

    ws.addRow(REPORTE_EXCEL_HEADERS);
    ws.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    ws.getRow(3).alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
    ws.getRow(3).height = 22;

    dataRows.forEach((row) => ws.addRow(row));
    ws.autoFilter = { from: 'A3', to: `${lastColLetter}3` };

    ws.columns = [12, 11, 26, 30, 18, 11, 36, 12, 12, 14, 14, 18, 28].map((w) => ({ width: w }));

    for (let r = 4; r <= ws.rowCount; r += 1) {
      const row = ws.getRow(r);
      if (r % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAF9' } };
        });
      }
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    }

    ws.getRow(3).eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F3D24' } },
        left: { style: 'thin', color: { argb: 'FF0F3D24' } },
        bottom: { style: 'thin', color: { argb: 'FF0F3D24' } },
        right: { style: 'thin', color: { argb: 'FF0F3D24' } },
      };
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_contratos_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /** CSV UTF-8 (Excel) con mismas columnas que el Excel; menos formato que .xlsx */
  const exportarReporteCsvUtf8 = () => {
    const dataRows = construirFilasExportacionExcel();
    const sep = ';';
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lineas = [REPORTE_EXCEL_HEADERS, ...dataRows].map((row) => row.map(esc).join(sep));
    const csv = `\uFEFF${lineas.join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_contratos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportarReportePdf = () => {
    const dataRows = construirFilasExportacionExcel();
    if (dataRows.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin datos',
        text: 'No hay contratos que coincidan con los filtros actuales.',
      });
      return;
    }
    try {
      const fechaTxt = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
      descargarPdfTablaVerde({
        titulo: 'Reporte de contratación',
        metaLinea: `Generado: ${fechaTxt}  |  Registros: ${dataRows.length}`,
        headers: REPORTE_EXCEL_HEADERS,
        dataRows,
        nombreArchivo: `reporte_contratos_${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'Error al generar PDF',
        text: String(e?.message || e),
      });
    }
  };

  const seccionLabels = useMemo(() => {
    const labels = Object.fromEntries(CONTRATOS_MENU_SECTIONS.map((section) => [section.id, section.label]));
    labels.pendientes = contratosPendientes.length
      ? `Pendientes (${contratosPendientes.length})`
      : 'Pendientes';
    return labels;
  }, [contratosPendientes.length]);

  const AvatarEmpresaClic = ({ empresa }) => {
    const src = getIconoEmpresa(empresa);
    const nombre = String(empresa || 'Sin empresa').trim() || 'Sin empresa';
    return (
      <button
        type="button"
        className="renov-empresa-avatar renov-empresa-avatar--clic"
        onClick={(e) => {
          e.stopPropagation();
          setEmpresaVistaPrevia(empresa);
        }}
        title="Ampliar icono de la empresa"
        aria-label={`Ampliar icono de ${nombre}`}
      >
        {src ? <img src={src} alt="" className="renov-empresa-avatar__img" /> : inicialEmpresa(empresa)}
      </button>
    );
  };

  return (
    <div className="contratos-page">
      <div className="contratos-topbar">
        <div className="contratos-topbar__left">
          <h2 className="contratos-page__title mb-0">Contratos</h2>
        </div>
        {activeSection === 'contratos' && puedeCrearContratos && (
          <div className="contratos-topbar__actions">
            <button
              type="button"
              className={BTN_ANADIR_MD}
              onClick={abrirModalNuevoContrato}
            >
              <i className="bi bi-plus-lg me-2" aria-hidden="true" />
              Agregar contrato
            </button>
          </div>
        )}
        {activeSection === 'reportes' && puedeExportarContratos && (
          <div className="contratos-topbar__actions reportes-top-actions">
            <button type="button" className="btn btn-sm reportes-export-btn-pdf d-inline-flex align-items-center" onClick={exportarReportePdf} title="Tabla con los mismos datos que Excel">
              <i className="bi bi-file-earmark-pdf me-1" aria-hidden="true" />
              PDF
            </button>
              <button type="button" className="btn btn-sm reportes-export-btn-csv d-inline-flex align-items-center" onClick={exportarReporteCsvUtf8} title="Mismas columnas que Excel; separador ; y UTF-8">
              <i className="bi bi-filetype-csv me-1" aria-hidden="true" />
              CSV
            </button>
            <button type="button" className={BTN_EXPORTAR} onClick={exportarReporteExcel}>
              <i className="bi bi-file-earmark-spreadsheet me-2" aria-hidden="true" />
              Exportar Excel
            </button>
          </div>
        )}
        {activeSection === 'archivo' && puedeExportarContratos && (
          <div className="contratos-topbar__actions reportes-top-actions">
            <button type="button" className="btn btn-sm reportes-export-btn-pdf d-inline-flex align-items-center" onClick={exportarArchivoPdf} title="Tabla con los mismos datos que Excel">
              <i className="bi bi-file-earmark-pdf me-1" aria-hidden="true" />
              PDF
            </button>
            <button type="button" className="btn btn-sm reportes-export-btn-csv d-inline-flex align-items-center" onClick={exportarArchivoCsvUtf8}>
              <i className="bi bi-filetype-csv me-1" aria-hidden="true" />
              CSV
            </button>
            <button type="button" className={BTN_EXPORTAR} onClick={exportarArchivoExcel}>
              <i className="bi bi-file-earmark-spreadsheet me-2" aria-hidden="true" />
              Exportar Excel
            </button>
          </div>
        )}
      </div>

      {/* Tabs de secciones */}
      <div className="contratos-tabs-card mb-3">
        <div className="contratos-tabs-row">
          {tabSectionIds.map((id) => (
              <button
                key={id}
                type="button"
                className={`btn btn-sm contratos-tab ${activeSection === id ? 'contratos-tab--active' : ''}`}
                onClick={() => irASeccion(id)}
              >
                {seccionLabels[id]}
              </button>
            ))}
        </div>
      </div>

        <FormModal
          show={showContratoModal}
          onHide={cerrarModalContrato}
          title={editarContrato ? 'Editar contrato' : '+ Contrato'}
          subtitle=""
          onPrimary={guardarContratoModal}
          primaryLabel={editarContrato ? 'Actualizar' : 'Guardar'}
        >
          <div className="minimal-form-stack">
            <div
              className={`minimal-field${contratoFormErrors.numero_contrato ? ' minimal-field--invalid' : ''}`}
              data-contrato-field="numero_contrato"
            >
              <label className="minimal-label">No. Contrato:</label>
              <input
                type="text"
                className={`minimal-input${contratoFormErrors.numero_contrato ? ' is-invalid' : ''}`}
                placeholder="------------------------"
                value={contratoNumero}
                onChange={(e) => {
                  setContratoNumero(e.target.value);
                  limpiarErrorContrato('numero_contrato');
                }}
              />
              {contratoFormErrors.numero_contrato ? (
                <small className="minimal-field__error">{contratoFormErrors.numero_contrato}</small>
              ) : null}
            </div>

            <div className="minimal-divider" />

            <div className="minimal-inline-group">
              <label className="minimal-radio">
                <input
                  type="radio"
                  checked={contratoProveedorCliente}
                  onChange={() => setContratoProveedorCliente(true)}
                />
                Proveedor
              </label>
              <label className="minimal-radio">
                <input
                  type="radio"
                  checked={!contratoProveedorCliente}
                  onChange={() => setContratoProveedorCliente(false)}
                />
                Cliente
              </label>
            </div>

            <div
              className={`minimal-field${contratoFormErrors.empresa ? ' minimal-field--invalid' : ''}`}
              data-contrato-field="empresa"
            >
              <label className="minimal-label">Empresa:</label>
              <input
                type="text"
                className={`minimal-input${contratoFormErrors.empresa ? ' is-invalid' : ''}`}
                placeholder="------------------------"
                value={contratoEmpresa}
                onChange={(e) => {
                  setContratoEmpresa(e.target.value);
                  limpiarErrorContrato('empresa');
                }}
              />
              {contratoFormErrors.empresa ? (
                <small className="minimal-field__error">{contratoFormErrors.empresa}</small>
              ) : null}
            </div>

            <ContratosCorreosNivelesField
              niveles={contratoContactosNiveles}
              onChange={actualizarContactosNiveles}
              disabled={false}
              esProveedor={contratoProveedorCliente}
              errores={contratoFormErrors}
            />

            <div className="minimal-field">
              <label
                className="minimal-label contrato-anexos-label-tip"
                title="Selecciona una imagen (max 1 MB)."
              >
                Icono empresa:
              </label>
              <input
                ref={inputIconoEmpresaRef}
                type="file"
                accept="image/*"
                className="d-none"
                onChange={manejarIconoEmpresaChange}
              />
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm contratos-btn-add"
                  onClick={() => inputIconoEmpresaRef.current?.click()}
                >
                  Elegir archivo
                </button>
                {!getIconoEmpresa(contratoEmpresa) && nombreArchivoIcono && (
                  <small className="text-muted text-truncate">{nombreArchivoIcono}</small>
                )}
              </div>
              {getIconoEmpresa(contratoEmpresa) && (
                <div className="d-flex align-items-center gap-2 mt-2">
                  <img src={getIconoEmpresa(contratoEmpresa)} alt="" className="contrato-empresa-icon-preview" />
                  <button
                    type="button"
                    className="btn btn-sm contratos-btn-remove"
                    onClick={() => eliminarIconoEmpresa(contratoEmpresa)}
                  >
                    Quitar icono
                  </button>
                </div>
              )}
            </div>

            <div
              className={`minimal-field${contratoFormErrors.contrato_pdf ? ' minimal-field--invalid' : ''}`}
              data-contrato-field={!editarContrato ? 'contrato_pdf' : undefined}
            >
              <label
                className="minimal-label contrato-anexos-label-tip"
                title="Puedes seleccionar uno o varios PDF (max 5 MB cada uno)."
              >
                Archivos PDF del contrato{!editarContrato ? ' (obligatorio)' : ''}:
              </label>
              <input
                ref={inputPdfContratoRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="d-none"
                onChange={manejarPdfContratoChange}
              />
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-sm contratos-btn-add"
                  onClick={() => inputPdfContratoRef.current?.click()}
                >
                  Agregar PDF(s)
                </button>
              </div>
              {getPdfsContrato(contratoNumero).length > 0 && (
                <ul className="list-unstyled mb-0 mt-2 contratos-pdf-modal-list">
                  {getPdfsContrato(contratoNumero).map((pdf) => (
                    <li key={pdf.id} className="contratos-pdf-modal-list__item">
                      <small className="text-muted text-truncate flex-grow-1" title={pdf.nombre}>
                        {pdf.nombre}
                      </small>
                      <div className="d-flex align-items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          className="btn btn-sm contratos-btn-view"
                          onClick={() => abrirPdfContrato(contratoNumero, pdf)}
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm contratos-btn-remove"
                          onClick={() => eliminarPdfContrato(contratoNumero, pdf.id)}
                        >
                          Quitar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {contratoFormErrors.contrato_pdf ? (
                <small className="minimal-field__error d-block mt-1">{contratoFormErrors.contrato_pdf}</small>
              ) : null}
            </div>

            <ContratosSuplementosField
              numeroContrato={contratoNumero}
              suplementos={getSuplementosContrato(contratoNumero)}
              onChange={(lista) => guardarSuplementosListaContrato(contratoNumero, lista)}
              onVerDocumento={abrirSuplementoContrato}
              onEliminarServidor={(sup) =>
                Axios.delete(
                  `${API_BASE}/contratos/${encodeURIComponent(contratoNumero)}/documentos/${sup.serverId}`
                )
              }
              disabled={false}
            />

            <ContratosAnexosField
              numeroContrato={contratoNumero}
              activo={getAnexosEstadoContrato(contratoNumero).activo}
              items={getAnexosEstadoContrato(contratoNumero).items}
              onChange={(estado) => guardarAnexosEstadoContrato(contratoNumero, estado)}
              onVerDocumento={abrirAnexoContrato}
              onEliminarServidor={(anx) =>
                Axios.delete(
                  `${API_BASE}/contratos/${encodeURIComponent(contratoNumero)}/documentos/${anx.serverId}`
                )
              }
              disabled={false}
            />

            <ContratosVigenciaField
              partes={contratoVigenciaPartes}
              onChange={(partes) => {
                setContratoVigenciaPartes(partes);
                limpiarErrorContrato('vigencia');
              }}
              disabled={false}
              invalid={Boolean(contratoFormErrors.vigencia)}
              error={contratoFormErrors.vigencia}
            />

            <div
              className={`minimal-field${contratoFormErrors.tipo_contrato ? ' minimal-field--invalid' : ''}`}
              data-contrato-field="tipo_contrato"
            >
              <label className="minimal-label">Tipo de contrato:</label>
              <AppSelect
                variant="modal"
                className={`minimal-select ${contratoTipo ? 'is-selected' : ''}${contratoFormErrors.tipo_contrato ? ' is-invalid' : ''}`}
                value={contratoTipo}
                onChange={(e) => {
                  setContratoTipo(e.target.value);
                  limpiarErrorContrato('tipo_contrato');
                }}
              >
                <option value="" disabled hidden>--- Seleccione ---</option>
                {tiposCatalogoActivos.length > 0 ? (
                  tiposCatalogoActivos.map((t) => (
                    <option key={t.id_tipo_contrato} value={t.nombre}>
                      {t.nombre}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Alimento">Alimento</option>
                    <option value="Servicio">Servicio</option>
                    <option value="Compra">Compra</option>
                    <option value="Otro">Otro</option>
                  </>
                )}
              </AppSelect>
              {contratoFormErrors.tipo_contrato ? (
                <small className="minimal-field__error">{contratoFormErrors.tipo_contrato}</small>
              ) : null}
            </div>

            <div className="minimal-field">
              <label className="minimal-label">Prioridad (recordatorios):</label>
              <AppSelect
                variant="modal"
                className={`minimal-select ${contratoPrioridad ? 'is-selected' : ''}`}
                value={contratoPrioridad}
                onChange={(e) => setContratoPrioridad(e.target.value)}
              >
                <option value="alta">Alta — avisos 60, 30, 15, 7 y 1 día</option>
                <option value="media">Media — avisos 30, 15 y 7 días</option>
                <option value="baja">Baja — avisos 15 y 7 días</option>
              </AppSelect>
            </div>

            <div
              className={`minimal-field${contratoFormErrors.fecha_inicio ? ' minimal-field--invalid' : ''}`}
              data-contrato-field="fecha_inicio"
            >
              <label className="minimal-label">Fecha de inicio:</label>
              <input
                type="date"
                className={`minimal-input${contratoFormErrors.fecha_inicio ? ' is-invalid' : ''}`}
                value={contratoFechaInicio}
                onChange={(e) => {
                  setContratoFechaInicio(e.target.value);
                  limpiarErrorContrato('fecha_inicio');
                }}
              />
              {contratoFormErrors.fecha_inicio ? (
                <small className="minimal-field__error">{contratoFormErrors.fecha_inicio}</small>
              ) : null}
            </div>
          </div>
        </FormModal>

        {activeSection === 'resumen' && (
          <div className="resumen-cockpit">
            <div className="row g-3 mb-3">
              <div className="col-12 col-xl-4">
                <div className="card resumen-salud-card p-3 h-100 border-0 shadow-sm">
                  <h6 className="fw-bold mb-3 resumen-cockpit__title" title={TIP.saludCartera}>
                    Salud de cartera
                  </h6>
                  <div className={`resumen-semaforo resumen-semaforo--${cockpitSalud.nivel}`}>
                    <span className="resumen-semaforo__score">{cockpitSalud.score}</span>
                    <span className="resumen-semaforo__label">{cockpitSalud.label}</span>
                  </div>
                  <div className="row g-2 mt-3 resumen-kpi-mini">
                    <div className="col-6">
                      <small className="text-muted d-block" title={TIP.totalCartera}>
                        Total
                      </small>
                      <strong>{resumen.total}</strong>
                    </div>
                    <div className="col-6">
                      <small className="text-muted d-block">Activos</small>
                      <strong className="text-success">{resumen.activos}</strong>
                    </div>
                    <div className="col-6">
                      <small className="text-muted d-block">Por vencer</small>
                      <strong className="text-warning">{resumen.porVencer}</strong>
                    </div>
                    <div className="col-6">
                      <small className="text-muted d-block">Vencidos</small>
                      <strong className="text-danger">{resumen.vencidos}</strong>
                    </div>
                    <div className="col-12">
                      <small className="text-muted d-block" title={TIP.pendientesAprobacion}>
                        Pend. aprobación
                      </small>
                      <strong className={resumen.pendientesAprobacion > 0 ? 'text-warning' : ''}>
                        {resumen.pendientesAprobacion}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-xl-4">
                <div className="card p-3 h-100 border-0 shadow-sm">
                  <h6 className="fw-bold mb-3 resumen-cockpit__title">Cumplimiento documental</h6>
                  <div className="resumen-doc-progress mb-2">
                    <div className="d-flex justify-content-between small mb-1">
                      <span>Expedientes completos</span>
                      <strong>{cockpitCalidadGlobal.pctDocumental}%</strong>
                    </div>
                    <div className="progress resumen-doc-progress__bar" style={{ height: '8px' }}>
                      <div
                        className="progress-bar bg-success"
                        style={{ width: `${cockpitCalidadGlobal.pctDocumental}%` }}
                        role="progressbar"
                        aria-valuenow={cockpitCalidadGlobal.pctDocumental}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                  <p className="small mb-1">
                    Sin correo: <strong>{cockpitCalidadGlobal.sinCorreo}</strong>
                  </p>
                  <p className="small mb-0">
                    Sin PDF: <strong>{cockpitCalidadGlobal.sinPdf}</strong>
                  </p>
                  <p className="small mb-1 mt-1">
                    Sin suplementos: <strong>{cockpitCalidadGlobal.sinSuplementos}</strong>
                  </p>
                  <p className="small mb-0">
                    Sin anexos: <strong>{cockpitCalidadGlobal.sinAnexos}</strong>
                  </p>
                  {(cockpitCalidadGlobal.sinCorreo > 0 ||
                    cockpitCalidadGlobal.sinPdf > 0 ||
                    cockpitCalidadGlobal.sinSuplementos > 0 ||
                    cockpitCalidadGlobal.sinAnexos > 0) && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary mt-2"
                      onClick={() => irASeccion('reportes')}
                    >
                      Ver calidad en Reportes
                    </button>
                  )}
                </div>
              </div>
              <div className="col-12 col-xl-4">
                <div className="card p-3 h-100 border-0 shadow-sm">
                  <h6 className="fw-bold mb-3 resumen-cockpit__title">Cartera comercial</h6>
                  {resumen.total === 0 ? (
                    <p className="text-muted small mb-0">Sin contratos registrados.</p>
                  ) : (
                    <>
                      <div className="reportes-split-bar mb-2">
                        {cockpitBalanceParte.proveedor > 0 && (
                          <div
                            className="reportes-split-bar__seg reportes-split-bar__seg--prov"
                            style={{ flex: cockpitBalanceParte.proveedor }}
                            title={`Proveedor: ${cockpitBalanceParte.proveedor}`}
                          />
                        )}
                        {cockpitBalanceParte.cliente > 0 && (
                          <div
                            className="reportes-split-bar__seg reportes-split-bar__seg--cli"
                            style={{ flex: cockpitBalanceParte.cliente }}
                            title={`Cliente: ${cockpitBalanceParte.cliente}`}
                          />
                        )}
                      </div>
                      <div className="d-flex flex-wrap gap-3 small">
                        <span>
                          Proveedor <strong>{cockpitBalanceParte.proveedor}</strong> ({cockpitBalanceParte.pctProv}%)
                        </span>
                        <span>
                          Cliente <strong>{cockpitBalanceParte.cliente}</strong> ({cockpitBalanceParte.pctCli}%)
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {cockpitConcentracion && (
              <div className="alert alert-warning d-flex align-items-start gap-2 mb-3 resumen-concentracion-alert" role="alert">
                <i className="bi bi-exclamation-triangle-fill flex-shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <strong>Concentración de riesgo:</strong>{' '}
                  {cockpitConcentracion.pct}% de la cartera ({cockpitConcentracion.cantidad} contrato(s)) está con{' '}
                  <strong>{cockpitConcentracion.empresa}</strong>.
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 ms-1 align-baseline"
                    onClick={() => irASeccion('reportes')}
                  >
                    Ver ranking completo
                  </button>
                </div>
              </div>
            )}

            <div className="row g-3 mb-3">
              <div className="col-12 col-lg-5">
                <div className="card p-3 h-100 border-0 shadow-sm">
                  <h6 className="fw-bold mb-3 resumen-cockpit__title">Acciones pendientes</h6>
                  {cockpitAcciones.length === 0 ? (
                    <p className="text-muted small mb-0">No hay acciones urgentes. Cartera al día.</p>
                  ) : (
                    <ul className="list-unstyled mb-0 resumen-acciones-list">
                      {cockpitAcciones.map((acc) => (
                        <li key={acc.key} className="resumen-accion-item">
                          <button
                            type="button"
                            className={`resumen-accion-btn resumen-accion-btn--${acc.severity}`}
                            onClick={() => ejecutarAccionCockpit(acc.key)}
                          >
                            <span className="resumen-accion-btn__count">{acc.count}</span>
                            <span className="resumen-accion-btn__label">{acc.label}</span>
                            <i className="bi bi-chevron-right ms-auto" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="col-12 col-lg-7">
                <div className="card p-3 h-100 border-0 shadow-sm">
                  <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                    <h6 className="fw-bold mb-0 resumen-cockpit__title">Próximos vencimientos (90 días)</h6>
                    <button type="button" className={BTN_CONSULTAR} onClick={() => irASeccion('renovaciones')}>
                      Cola de renovación
                    </button>
                  </div>
                  {cockpitTimeline.length === 0 ? (
                    <p className="text-muted small mb-0">Ningún contrato vence en los próximos 90 días.</p>
                  ) : (
                    <ul className="list-unstyled mb-0 resumen-timeline">
                      {cockpitTimeline.map((c) => (
                        <li key={c.numero_contrato} className="resumen-timeline__item">
                          <span
                            className={`resumen-timeline__dot ${c.diasRestantes <= 30 ? 'is-urgent' : ''}`}
                            aria-hidden="true"
                          />
                          <div className="resumen-timeline__body">
                            <span className="fw-semibold">{c.numero_contrato}</span>
                            <span className="text-muted mx-1">·</span>
                            <span>{c.empresa || 'Sin empresa'}</span>
                          </div>
                          <span className="resumen-timeline__days">{formatDiferenciaDias(c.diasRestantes)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'contratos' && (
          <>
            <div className="card p-3 mb-3 contratos-filter-card">
              <div className="row g-2">
                <div className="col-12 col-md-3">
                  <div className="contratos-search-input-wrap">
                    <i className="bi bi-search contratos-search-input-icon" aria-hidden="true" />
                    <input
                      type="text"
                      className="form-control contratos-search-input"
                      placeholder="Buscar por número, empresa, tipo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-6 col-md-2">
                  <AppSelect variant="contratos" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value || 'todos')}>
                    <option value="todos">Tipo: todos</option>
                    {tiposDisponibles.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </AppSelect>
                </div>
                <div className="col-6 col-md-2">
                  <AppSelect variant="contratos" value={filtroParte} onChange={(e) => setFiltroParte(e.target.value || 'todos')}>
                    <option value="todos">Parte: todos</option>
                    <option value="proveedor">Proveedor</option>
                    <option value="cliente">Cliente</option>
                  </AppSelect>
                </div>
                <div className="col-6 col-md-2">
                  <AppSelect variant="contratos" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value || 'todos')}>
                    <option value="todos">Estado: todos</option>
                    <option value="Activo">Activo</option>
                    <option value="En seguimiento">En seguimiento</option>
                    <option value="Por vencer">Por vencer</option>
                    <option value="Vencido">Vencido</option>
                    <option value="Cancelado">Cancelado</option>
                  </AppSelect>
                </div>
                <div className="col-6 col-md-2">
                  <AppSelect variant="contratos" value={filtroVencimiento} onChange={(e) => setFiltroVencimiento(e.target.value || 'todos')}>
                    <option value="todos">Ventana</option>
                    <option value="7">Hasta 7 días</option>
                    <option value="30">Hasta 30 días</option>
                    <option value="90">Hasta 90 días</option>
                  </AppSelect>
                </div>
                <div className="col-12 col-md-1 d-grid">
                  <button
                    type="button"
                    className="btn btn-contratos-limpiar-filtros"
                    onClick={() => { setSearchTerm(''); setFiltroTipo('todos'); setFiltroParte('todos'); setFiltroEstado('todos'); setFiltroVencimiento('todos'); }}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>

            <div className="card p-3 contratos-table-card">
              <div className="table-responsive">
                <table className="table table-data-compact table-bordered table-striped">
                  <thead>
                    <tr>
                      {showCol('numero') ? <th>N° Contrato</th> : null}
                      {showCol('tipo') ? <th>Tipo</th> : null}
                      {showCol('empresa') ? <th>Empresa</th> : null}
                      {showCol('vigencia') ? <th>Vigencia</th> : null}
                      {showCol('suplemento') ? <th>Suplemento</th> : null}
                      {showCol('fechaInicio') ? <th>Fecha Inicio</th> : null}
                      {showCol('fechaFin') ? <th>Fecha Fin</th> : null}
                      {showCol('estado') ? <th>Estado</th> : null}
                      {showCol('dias') ? <th>Días</th> : null}
                      {showCol('documento') ? <th>Documento</th> : null}
                      {showCol('acciones') ? <th className="contratos-th-actions">Acciones</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {contratosFiltrados.map((con, index) => {
                      const rowId = buildContratoRowId(con, index);
                      const isSelected = contratoSeleccionado === rowId;
                      return (
                      <tr key={rowId} className={isSelected ? 'contratos-row-selected' : ''}>
                        {showCol('numero') ? (
                        <td>
                          <span className="contratos-numero-wrap">
                            <button
                              type="button"
                              className={`contratos-row-check${isSelected ? ' is-selected' : ''}`}
                              onClick={() => toggleContratoSeleccionado(rowId)}
                              aria-label={`Seleccionar contrato ${con.numero_contrato}`}
                              title={`Seleccionar contrato ${con.numero_contrato}`}
                            >
                              <i className="bi bi-check-lg" aria-hidden="true" />
                            </button>
                            <span className="contratos-numero-wrap__num">{con.numero_contrato}</span>
                          </span>
                        </td>
                        ) : null}
                        {showCol('tipo') ? <td>{con.proveedor_cliente ? 'Proveedor' : 'Cliente'}</td> : null}
                        {showCol('empresa') ? (
                        <td>
                          <div className="d-inline-flex align-items-center gap-2">
                            <AvatarEmpresaClic empresa={con.empresa} />
                            <span>{con.empresa || 'Sin empresa'}</span>
                          </div>
                        </td>
                        ) : null}
                        {showCol('vigencia') ? <td>{vigenciaLegibleOGuion(con.vigencia)}</td> : null}
                        {showCol('suplemento') ? (
                          <td className="text-center">
                            {(() => {
                              const cel = celdaSuplementosTabla(
                                con,
                                getSuplementosContrato(con.numero_contrato)
                              );
                              return (
                                <span title={cel.title}>{cel.display}</span>
                              );
                            })()}
                          </td>
                        ) : null}
                        {showCol('fechaInicio') ? <td>{fmtDisplayDate(con.fecha_inicio)}</td> : null}
                        {showCol('fechaFin') ? <td>{fmtDisplayDate(con.fecha_fin)}</td> : null}
                        {showCol('estado') ? (
                        <td>
                          <div className="contratos-estado-cell">
                            <span className={`badge ${getBadgeClass(con.estado)}`}>{con.estado}</span>
                            {badgeAprobacionPendiente(con) ? (
                              <span className="badge bg-warning text-dark contratos-estado-cell__pendiente">
                                {badgeAprobacionPendiente(con)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        ) : null}
                        {showCol('dias') ? <td>{con.diasRestantes == null ? '-' : con.diasRestantes < 0 ? `-${Math.abs(con.diasRestantes)}` : con.diasRestantes}</td> : null}
                        {showCol('documento') ? (
                          <td className="text-center">{renderCeldaDocumentoPdf(con.numero_contrato, con)}</td>
                        ) : null}
                        {showCol('acciones') ? (
                        <td className="contratos-td-actions">
                          <div className="d-inline-flex align-items-center gap-1 flex-nowrap">
                            <InfoTableActionButton onClick={() => abrirInfoContrato(con)} />
                            <EditTableActionButton onClick={() => editarContratoTabla(con)} />
                            <RenewTableActionButton onClick={() => renovarContrato(con)} />
                            {muestraBotonEliminar(con) ? (
                              <DeleteTableActionButton onClick={() => eliminarContrato(con)} />
                            ) : !esContratoConSolicitudPendiente(con) ? (
                              <CancelTableActionButton onClick={() => cancelarContrato(con)} />
                            ) : null}
                          </div>
                        </td>
                        ) : null}
                      </tr>
                    );})}
                    {contratosFiltrados.length === 0 && (
                      <tr><td colSpan={visibleContratoColCount} className="text-center text-muted py-3">No se encontraron contratos con los filtros aplicados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeSection === 'pendientes' && (
          <div className="card p-3 contratos-table-card">
            <p className="text-muted small mb-3">
              Contratos, modificaciones y cancelaciones que esperan aprobación. Quien tenga permiso de aprobar puede resolver cada solicitud.
            </p>
            <div className="table-responsive">
              <table className="table table-data-compact table-bordered table-striped">
                <thead>
                  <tr>
                    <th>N° Contrato</th>
                    <th>Empresa</th>
                    <th>Acción</th>
                    <th>Solicitado por</th>
                    <th>Fecha solicitud</th>
                    <th>Cambios / detalle</th>
                    <th>Estado actual</th>
                    <th className="contratos-th-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {contratosPendientes.map((con) => (
                    <tr key={con.numero_contrato}>
                      <td>{renderNumeroContrato(con.numero_contrato)}</td>
                      <td>
                        <div className="d-inline-flex align-items-center gap-2">
                          <AvatarEmpresaClic empresa={con.empresa} />
                          <span>{con.empresa || 'Sin empresa'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={claseBadgeAccionPendiente(con.aprobacion_accion)}>
                          {etiquetaAccionPendiente(con.aprobacion_accion)}
                        </span>
                      </td>
                      <td>{con.aprobacion_solicitado_por || '—'}</td>
                      <td>{con.aprobacion_solicitado_en ? formatAppDate(con.aprobacion_solicitado_en) : '—'}</td>
                      <td className="contratos-pendientes-detalle-td">
                        <ContratosPendientesDetalle
                          contrato={con}
                          fmtDisplayDate={fmtDisplayDate}
                          tipoLegible={etiquetaTipoContratoLegible}
                          onVerCambios={abrirCambiosPendientes}
                        />
                      </td>
                      <td>
                        {String(con.aprobacion_accion || '').toLowerCase() === 'alta' ? (
                          <span className="badge bg-warning text-dark">Pendiente de alta</span>
                        ) : (
                          <span className={`badge ${getBadgeClass(con.estado)}`}>{con.estado}</span>
                        )}
                      </td>
                      <td className="contratos-td-actions">
                        <div className="d-inline-flex align-items-center gap-1 flex-nowrap">
                          <InfoTableActionButton onClick={() => abrirInfoContrato(con)} />
                          {puedeAprobarContratos ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm contratos-btn-add"
                                onClick={() => aprobarContratoPendiente(con)}
                                title="Aprobar"
                              >
                                <i className="bi bi-check-lg" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className={BTN_ELIMINAR_ICON}
                                onClick={() => rechazarContratoPendiente(con)}
                                title="Rechazar"
                              >
                                <i className="bi bi-x-lg" aria-hidden="true" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {contratosPendientes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-3">
                        No hay solicitudes pendientes de aprobación.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'vencimientos' && (
          <div className="card p-3 contratos-table-card">
            <h6 className="mb-3">{tituloBandejaVencimientos}</h6>
            <div className="table-responsive">
              <table className="table table-data-compact table-bordered">
                <thead>
                  <tr>
                    <th>N° Contrato</th><th>Empresa</th><th>Tipo</th><th>Fecha Fin</th><th>Días</th><th>Estado</th><th>Documento</th><th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {contratosBandejaVencimientos.map((c) => (
                    <tr key={c.numero_contrato}>
                      <td>{renderNumeroContrato(c.numero_contrato)}</td>
                      <td>
                        <div className="d-inline-flex align-items-center gap-2">
                          <AvatarEmpresaClic empresa={c.empresa} />
                          <span>{c.empresa || 'Sin empresa'}</span>
                        </div>
                      </td>
                      <td>{c.tipo_contrato}</td>
                      <td>{toISODate(c.fecha_fin)}</td>
                      <td>{c.diasRestantes}</td>
                      <td><span className={`badge ${getBadgeClass(c.estado)}`}>{c.estado}</span></td>
                      <td className="text-center">{renderCeldaDocumentoPdf(c.numero_contrato, c)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-contrato-renovar-text"
                          onClick={() => renovarContrato(c)}
                        >
                          Renovar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {contratosBandejaVencimientos.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-muted py-3">{mensajeVacioBandejaVencimientos}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'correo' && <ContratosCorreoConfig />}

        {activeSection === 'renovaciones' && (
          <div className="renovaciones-dashboard">
            <div className="card renov-search-card mb-2">
              <div className="row g-2 align-items-center renov-search-card__row">
                <div className="col-12 col-lg-6">
                  <div className="input-group renov-search-card__main">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="bi bi-search text-muted" aria-hidden="true" />
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Contextual Search and Date Range"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">Desde</span>
                    <input type="date" className="form-control" value={renovFechaDesde} onChange={(e) => setRenovFechaDesde(e.target.value)} />
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">Hasta</span>
                    <input type="date" className="form-control" value={renovFechaHasta} onChange={(e) => setRenovFechaHasta(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-2 renovaciones-dashboard__grid">
              <div className="col-12 col-md-5 col-xl-4 renov-kpi-column align-self-start">
                <div className="card renov-kpi-card">
                  <div className="card-body renov-kpi-card__body">
                    <div className="renov-kpi-panel-title-bar mb-2">
                      <h6 className="fw-bold mb-0 renov-card-title renov-kpi-panel-title-bar__title">Panel de renovaciones</h6>
                      <div className="renov-kpi-subcard__bar-row renov-kpi-panel-title-bar__actions">
                        <div className="renov-progress-track-wrap" aria-hidden="true" />
                        <button
                          type="button"
                          className="btn btn-sm renov-kpi-btn-todos flex-shrink-0"
                          onClick={verTodosPorVencerYVencidos}
                        >
                          Ver todos
                        </button>
                      </div>
                    </div>

                    <div className="renov-kpi-subcard">
                      <div className="renov-kpi-subcard__head">
                        <div className="renov-kpi-item__title">Vencimientos Inmediatos</div>
                        <small className="text-muted">(&lt;30 días)</small>
                      </div>
                      <div className="renov-kpi-subcard__bar-row">
                        <div className="renov-progress-track-wrap">
                          <div className="renov-progress__pct-row">
                            <span className="renov-progress__pct">{porcentajePanel.inmediatos}%</span>
                          </div>
                          <div className="renov-progress renov-progress--panel">
                            <div className="renov-progress__bar renov-progress__bar--teal" style={{ width: `${porcentajePanel.inmediatos}%` }} />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm renov-kpi-btn-todos flex-shrink-0"
                          onClick={verTodosPorVencer}
                        >
                          Ver todos
                        </button>
                      </div>
                    </div>

                    <div className="renov-kpi-subcard">
                      <div className="renov-kpi-subcard__head">
                        <div className="renov-kpi-item__title">Vencidos Pendientes</div>
                        <small className="text-muted">requieren acción inmediata</small>
                      </div>
                      <div className="renov-kpi-subcard__bar-row">
                        <div className="renov-progress-track-wrap">
                          <div className="renov-progress__pct-row">
                            <span className="renov-progress__pct">{porcentajePanel.vencidos}%</span>
                          </div>
                          <div className="renov-progress renov-progress--panel">
                            <div className="renov-progress__bar renov-progress__bar--vencidos" style={{ width: `${porcentajePanel.vencidos}%` }} />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm renov-kpi-btn-todos flex-shrink-0"
                          onClick={verTodosVencidos}
                        >
                          Ver todos
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card renov-alerts-card mt-2">
                  <div className="card-body">
                    <h6 className="fw-bold mb-2 renov-card-title">Alertas Críticas</h6>
                    <div className="renov-alerts-list">
                      {contratosCriticos.map((c) => (
                        <div key={c.numero_contrato} className="renov-alert-item">
                          <i className="bi bi-exclamation-triangle-fill renov-alert-item__icon" aria-hidden="true" />
                          <div className="renov-alert-item__body">
                            <div className="renov-alert-item__title">
                              Contrato {c.numero_contrato}
                              {c.empresa ? ` — ${c.empresa}` : ''}
                            </div>
                            <small className="renov-alert-item__sub">requiere atención inmediata · {formatDiferenciaDias(c.diasRestantes)}</small>
                          </div>
                        </div>
                      ))}
                      {contratosCriticos.length === 0 && (
                        <small className="text-muted">No hay alertas críticas en este momento.</small>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-7 col-xl-8 renov-cola-column">
                <div className="card renov-cola-card h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                      <h6 className="fw-bold mb-0 renov-card-title">Cola de renovación priorizada</h6>
                      {puedeEditarContratos ? (
                        <button
                          type="button"
                          className={`${BTN_ANADIR_MD} btn-sm`}
                          onClick={renovarVencidosMasivo}
                        >
                          Renovar vencidos
                        </button>
                      ) : null}
                    </div>
                    <div className="renov-cola-table-wrap">
                      <table className="table align-middle renov-cola-table mb-0">
                        <thead>
                          <tr>
                            <th className="renov-cola-th-num">N°</th>
                            <th className="text-center">Documento</th>
                            <th>Empresa</th>
                            <th>Estado de Tiempo</th>
                            <th className="renov-cola-th-estado">Estado</th>
                            <th className="renov-cola-th-accion">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {colaRenovacion.map((c) => {
                            const pos = calcularPosicionTiempo(c.diasRestantes);
                            const estado = getEstadoRenovacion(c.estado);
                            const vencido = c.diasRestantes != null && c.diasRestantes < 0;
                            return (
                              <tr key={c.numero_contrato}>
                                <td className="fw-semibold text-nowrap renov-cola-td-num">{renderNumeroContrato(c.numero_contrato)}</td>
                                <td className="text-center align-middle">
                                  {renderCeldaDocumentoPdf(c.numero_contrato, c)}
                                </td>
                                <td>
                                  <div className="d-inline-flex align-items-center gap-2">
                                    <AvatarEmpresaClic empresa={c.empresa} />
                                    <span className="renov-empresa-name">{c.empresa || 'Sin empresa'}</span>
                                  </div>
                                </td>
                                <td>
                                  <div className="renov-time-wrap">
                                    <div className="renov-time-bar">
                                      <span className="renov-time-bar__marker" style={{ left: `${pos}%` }} aria-hidden="true" />
                                    </div>
                                    <small className={`renov-time-label ${vencido ? 'is-danger' : 'is-ok'}`}>
                                      {formatDiferenciaDias(c.diasRestantes)}
                                    </small>
                                  </div>
                                </td>
                                <td>
                                  <span className={`renov-badge renov-badge--${estado.mod}`}>{estado.label}</span>
                                </td>
                                <td>
                                  <div className="d-flex flex-column gap-1 renov-actions">
                                    <div className="d-flex align-items-stretch gap-1 renov-actions__row-renovar">
                                      {puedeEditarContratos ? (
                                        <button
                                          type="button"
                                          className={`${BTN_ANADIR_MD} btn-sm justify-content-center`}
                                          onClick={() => renovarContrato(c)}
                                        >
                                          Renovar
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        className="btn btn-sm renov-actions__eye"
                                        onClick={() => verDetalleContrato(c)}
                                        title="Ver detalles"
                                        aria-label={`Ver detalles del contrato ${c.numero_contrato}`}
                                      >
                                        <i className="bi bi-eye-fill" aria-hidden="true" />
                                      </button>
                                    </div>
                                    {puedeEditarContratos ? (
                                      <button
                                        type="button"
                                        className={`${BTN_SECUNDARIO} renov-actions__row-reminder`}
                                        onClick={() => enviarRecordatorioContrato(c)}
                                        title="Enviar recordatorio por correo"
                                      >
                                        <i className="bi bi-envelope-fill me-1" aria-hidden="true" />
                                        Enviar Rec
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {colaRenovacion.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center text-muted py-3">Sin contratos en cola de renovación.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeSection === 'reportes' && (
          <div className="reportes-dashboard">
            <div className="reportes-hero card border-0 shadow-sm mb-3">
              <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-column flex-lg-row align-items-start justify-content-between gap-3 mb-3">
                  <div>
                    <h5 className="reportes-hero__title mb-1">Reportes de contratación</h5>
                    <p className="reportes-hero__subtitle mb-0 text-muted small">
                      Extractos para auditoría y exportación: composición por tipo, balance proveedor/cliente, calidad de expediente, ranking por empresa y gráficos de vencimiento por mes y estado de cartera.
                    </p>
                  </div>
                  <div className="reportes-kpi-inline d-flex flex-wrap gap-2">
                    <span className="reportes-kpi-pill">
                      <span className="reportes-kpi-pill__label">Contratos (filtro)</span>
                      <strong>{contratosFiltradosReporte.length}</strong>
                    </span>
                    <span className="reportes-kpi-pill reportes-kpi-pill--warn">
                      <span className="reportes-kpi-pill__label">Pendientes datos</span>
                      <strong>
                        {reporteCalidadDatos.sinCorreo +
                          reporteCalidadDatos.sinPdf +
                          reporteCalidadDatos.sinSuplementos +
                          reporteCalidadDatos.sinAnexos}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="reportes-filters row g-2 align-items-end mb-3">
                  <div className="col-12 col-sm-6 col-lg">
                    <label className="reportes-filter-label">Fin vigencia desde</label>
                    <input type="date" className="form-control form-control-sm" value={reporteFechaDesde} onChange={(e) => setReporteFechaDesde(e.target.value)} />
                  </div>
                  <div className="col-12 col-sm-6 col-lg">
                    <label className="reportes-filter-label">Fin vigencia hasta</label>
                    <input type="date" className="form-control form-control-sm" value={reporteFechaHasta} onChange={(e) => setReporteFechaHasta(e.target.value)} />
                  </div>
                  <div className="col-12 col-sm-6 col-lg">
                    <label className="reportes-filter-label">Tipo</label>
                    <AppSelect
                      variant="filter"
                      className="reportes-app-select"
                      value={reporteTipo}
                      onChange={(e) => setReporteTipo(e.target.value)}
                    >
                      <option value="todos">Todos los tipos</option>
                      {tiposDisponibles.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </AppSelect>
                  </div>
                  <div className="col-12 col-sm-6 col-lg">
                    <label className="reportes-filter-label">Empresa</label>
                    <AppSelect
                      variant="filter"
                      className="reportes-app-select"
                      value={reporteEmpresa}
                      onChange={(e) => setReporteEmpresa(e.target.value)}
                    >
                      <option value="todas">Todas</option>
                      {empresasReporteOpciones.map((emp) => (
                        <option key={emp} value={emp}>{emp}</option>
                      ))}
                    </AppSelect>
                  </div>
                  <div className="col-12 col-lg-auto">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary w-100 text-nowrap"
                      onClick={() => {
                        setReporteFechaDesde('');
                        setReporteFechaHasta('');
                        setReporteTipo('todos');
                        setReporteEmpresa('todas');
                      }}
                    >
                      Limpiar filtros
                    </button>
                  </div>
                </div>

                <div className="reportes-note mb-4">
                  <i className="bi bi-info-circle me-2 flex-shrink-0" aria-hidden="true" />
                  <span>
                    <strong>Resumen</strong> es el cockpit de salud y acciones pendientes; <strong>Renovaciones</strong> concentra la cola operativa (renovar, recordatorios). <strong>Reportes</strong> incluye analítica, gráficos por mes y estado, calidad de archivo, ranking filtrado y exportación.
                  </span>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-12 col-lg-6">
                    <div className="card reportes-side-card h-100 border-0 shadow-sm">
                      <div className="card-body">
                        <h6 className="reportes-card-title mb-3">Composición por tipo de contrato</h6>
                        {reportePorTipoRows.length === 0 ? (
                          <p className="text-muted small mb-0">Sin datos con los filtros aplicados.</p>
                        ) : (
                          <div className="reportes-hbar-list">
                            {reportePorTipoRows.map(({ tipo, cantidad }) => (
                              <div key={tipo} className="reportes-hbar-row">
                                <span className="reportes-hbar-label text-truncate" title={tipo}>{tipo}</span>
                                <div className="reportes-hbar-track">
                                  <div
                                    className="reportes-hbar-fill"
                                    style={{ width: `${Math.max(6, (cantidad / reporteMaxTipoCount) * 100)}%` }}
                                  />
                                </div>
                                <span className="reportes-hbar-val">{cantidad}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-lg-6">
                    <div className="card reportes-side-card h-100 border-0 shadow-sm">
                      <div className="card-body">
                        <h6 className="reportes-card-title mb-3">Proveedor vs cliente</h6>
                        {contratosFiltradosReporte.length === 0 ? (
                          <p className="text-muted small mb-0">Sin datos con los filtros aplicados.</p>
                        ) : (
                          <>
                            <div className="reportes-split-bar">
                              {reportePorParte.proveedor > 0 && (
                                <div
                                  className="reportes-split-bar__seg reportes-split-bar__seg--prov"
                                  style={{ flex: reportePorParte.proveedor }}
                                  title={`Proveedor: ${reportePorParte.proveedor}`}
                                />
                              )}
                              {reportePorParte.cliente > 0 && (
                                <div
                                  className="reportes-split-bar__seg reportes-split-bar__seg--cli"
                                  style={{ flex: reportePorParte.cliente }}
                                  title={`Cliente: ${reportePorParte.cliente}`}
                                />
                              )}
                            </div>
                            <div className="reportes-split-legend d-flex flex-wrap gap-3 mt-3 small">
                              <span className="d-inline-flex align-items-center gap-2">
                                <span className="reportes-split-dot reportes-split-dot--prov" aria-hidden="true" />
                                Proveedor <strong>{reportePorParte.proveedor}</strong>
                              </span>
                              <span className="d-inline-flex align-items-center gap-2">
                                <span className="reportes-split-dot reportes-split-dot--cli" aria-hidden="true" />
                                Cliente <strong>{reportePorParte.cliente}</strong>
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-12 col-lg-7">
                    <div className="card reportes-side-card border-0 shadow-sm mb-3">
                      <div className="card-body">
                        <h6 className="reportes-card-title mb-3">Calidad de datos (muestra filtrada)</h6>
                        <div className="reportes-quality-grid">
                          <div className="reportes-quality-item">
                            <span className="reportes-quality-item__val">{reporteCalidadDatos.sinCorreo}</span>
                            <span className="reportes-quality-item__lab">Sin correo de notificación</span>
                          </div>
                          <div className="reportes-quality-item">
                            <span className="reportes-quality-item__val">{reporteCalidadDatos.sinPdf}</span>
                            <span className="reportes-quality-item__lab">Sin PDF adjunto</span>
                          </div>
                          <div className="reportes-quality-item">
                            <span className="reportes-quality-item__val">{reporteCalidadDatos.sinSuplementos}</span>
                            <span className="reportes-quality-item__lab">Sin suplementos</span>
                          </div>
                          <div className="reportes-quality-item">
                            <span className="reportes-quality-item__val">{reporteCalidadDatos.sinAnexos}</span>
                            <span className="reportes-quality-item__lab">Sin anexos</span>
                          </div>
                        </div>
                        <p className="text-muted small mb-0 mt-2">
                          El archivo Excel o CSV usa estos mismos filtros ({contratosFiltradosReporte.length} fila(s)).
                        </p>
                      </div>
                    </div>

                    <div className="card renov-stats-card border-0 shadow-sm">
                      <div className="card-body">
                        <h6 className="fw-bold mb-2 renov-card-title">Estadísticas Rápidas</h6>
                        <div className="row g-2 g-md-3 align-items-stretch renov-stats-row">
                          <div className="col-12 col-md-7">
                            <span className="renov-chart-caption">Contratos por Mes de Vencimiento</span>
                            <div className="renov-bar-legend">
                              <span className="renov-bar-legend__item"><i className="renov-bar-legend__dot renov-bar-legend__dot--red" />Vencidos</span>
                              <span className="renov-bar-legend__item"><i className="renov-bar-legend__dot renov-bar-legend__dot--green" />Activos</span>
                            </div>
                            <div className="renov-bar-chart">
                              {vencimientosPorMes.map((b) => (
                                <div key={b.mes} className="renov-bar-col" title={`${b.mes} · Vencidos: ${b.vencidos} · Activos: ${b.activos}`}>
                                  <div className="renov-bar-pair">
                                    <div className="renov-bar renov-bar--red" style={{ height: `${Math.max(b.alturaVencidos, b.vencidos > 0 ? 8 : 0)}%` }} />
                                    <div className="renov-bar renov-bar--green" style={{ height: `${Math.max(b.alturaActivos, b.activos > 0 ? 8 : 0)}%` }} />
                                  </div>
                                  <small className="renov-bar-label">{b.mes}</small>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="col-12 col-md-5 d-flex flex-column align-items-center justify-content-start">
                            <span className="renov-chart-caption">Total de Contratos por Estado</span>
                            <RenovDonut
                              segments={[
                                { value: resumen.activos, color: themeAccent, label: 'Activos' },
                                { value: resumen.porVencer + resumen.seguimiento, color: '#ffc107', label: 'Seguimiento / próx.' },
                                { value: resumen.vencidos, color: '#dc3545', label: 'Vencidos' },
                              ]}
                              total={resumen.totalOperativos}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-lg-5">
                    <div className="card reportes-side-card h-100 border-0 shadow-sm">
                      <div className="card-body">
                        <h6 className="reportes-card-title mb-3">Concentración por empresa (filtro)</h6>
                        <div className="reportes-ranking">
                          {topEmpresasReporte.map((e, idx) => (
                            <div key={e.empresa} className="reportes-ranking-row">
                              <span className="reportes-ranking-rank">{idx + 1}</span>
                              <span className="d-inline-flex align-items-center gap-2 text-truncate flex-grow-1 min-w-0">
                                <AvatarEmpresaClic empresa={e.empresa} />
                                <span className="text-truncate">{e.empresa}</span>
                              </span>
                              <span className="reportes-ranking-count">{e.cantidad}</span>
                            </div>
                          ))}
                          {topEmpresasReporte.length === 0 && <p className="text-muted mb-0 small">Sin datos con los filtros aplicados.</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card reportes-side-card border-0 shadow-sm mb-0">
                  <div className="card-body">
                    <h6 className="reportes-card-title mb-2">Vista previa del export (primeras 25 filas)</h6>
                    <p className="text-muted small mb-3">
                      Mismas columnas que Excel/CSV (correo, suplementos, tipo normalizado, fechas DD/MM/AAAA). Los gráficos de vencimiento por mes y por estado están en la sección anterior de esta misma pestaña.
                    </p>
                    <div className="table-responsive reportes-preview-table-wrap">
                      <table className="table table-sm table-bordered table-data-compact mb-0">
                        <thead>
                          <tr>
                            <th>N°</th>
                            <th>Empresa</th>
                            <th>Correo</th>
                            <th>Tipo</th>
                            <th>Parte</th>
                            <th>Estado</th>
                            <th>Fin vigencia</th>
                            <th>PDF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewExportContratos.map((c) => {
                            const pdfs = getPdfsContrato(c.numero_contrato);
                            const finEs = fechaParaExportEs(c.fecha_fin);
                            return (
                              <tr key={c.numero_contrato}>
                                <td className="text-nowrap fw-semibold">{c.numero_contrato}</td>
                                <td className="text-truncate" style={{ maxWidth: '8rem' }} title={c.empresa || ''}>{c.empresa || '—'}</td>
                                <td className="text-truncate small" style={{ maxWidth: '9rem' }} title={resumenTodosCorreosNivel(c)}>{resumenTodosCorreosNivel(c) || '—'}</td>
                                <td className="small">{etiquetaTipoContratoLegible(c.tipo_contrato) || '—'}</td>
                                <td>{c.proveedor_cliente ? 'Prov.' : 'Cli.'}</td>
                                <td>{c.estado}</td>
                                <td className="text-nowrap">{finEs || '—'}</td>
                                <td className="text-center small">
                                  {pdfs.length === 0 ? '—' : pdfs.length === 1 ? 'Sí' : `${pdfs.length}`}
                                </td>
                              </tr>
                            );
                          })}
                          {previewExportContratos.length === 0 && (
                            <tr>
                              <td colSpan={8} className="text-center text-muted py-3">Sin filas con los filtros actuales.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'tipos' && (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-3 p-md-4">
              <h5 className="mb-3">Catálogo de tipos de contrato</h5>
              <CatalogoTiposContrato onCatalogChange={cargarTiposCatalogo} />
            </div>
          </div>
        )}

        {activeSection === 'auditoria' && <ContratosAuditoria />}

        {activeSection === 'archivo' && (
          <div className="reportes-dashboard">
            <div className="reportes-hero card border-0 shadow-sm mb-3">
              <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-column flex-lg-row align-items-start justify-content-between gap-3 mb-3">
                  <div>
                    <h5 className="reportes-hero__title mb-1">Archivo histórico</h5>
                    <p className="reportes-hero__subtitle mb-0 text-muted small">
                      Expedientes dados de baja con retención legal de 5 años. Solo consulta: datos completos, PDFs en servidor y exportación para auditoría.
                    </p>
                  </div>
                  <div className="reportes-kpi-inline d-flex flex-wrap gap-2">
                    <span className="reportes-kpi-pill">
                      <span className="reportes-kpi-pill__label">Expedientes</span>
                      <strong>{archivoList.length}</strong>
                    </span>
                  </div>
                </div>

                <div className="reportes-filters row g-2 align-items-end mb-3">
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="reportes-filter-label">Buscar (nº, empresa, tipo)</label>
                    <input
                      type="search"
                      className="form-control form-control-sm"
                      value={archivoBusqueda}
                      onChange={(e) => setArchivoBusqueda(e.target.value)}
                      placeholder="Ej. 5555, Empresa..."
                    />
                  </div>
                  <div className="col-12 col-sm-6 col-lg-3">
                    <label className="reportes-filter-label">Año de baja</label>
                    <AppSelect
                      variant="filter"
                      className="reportes-app-select"
                      value={archivoAnio}
                      onChange={(e) => setArchivoAnio(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {aniosArchivoOpciones.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </AppSelect>
                  </div>
                  <div className="col-12 col-lg-auto">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary w-100 text-nowrap"
                      onClick={() => {
                        setArchivoBusqueda('');
                        setArchivoAnio('');
                      }}
                    >
                      Limpiar filtros
                    </button>
                  </div>
                </div>

                <div className="reportes-note mb-3">
                  <i className="bi bi-shield-check me-2 flex-shrink-0" aria-hidden="true" />
                  <span>
                    Al eliminar un contrato activo, el sistema archiva automáticamente snapshot + PDFs. La retención se calcula en servidor (<strong>5 años</strong> desde la fecha de baja).
                  </span>
                </div>

                <div className="table-responsive reportes-preview-table-wrap">
                  <table className="table table-sm table-hover align-middle mb-0 reportes-preview-table">
                    <thead>
                      <tr>
                        <th>Nº contrato</th>
                        <th>Empresa</th>
                        <th>Tipo</th>
                        <th>Fin vigencia</th>
                        <th>Eliminado por</th>
                        <th>Fecha baja</th>
                        <th>Retención hasta</th>
                        <th>PDFs</th>
                        <th className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archivoLoading && (
                        <tr>
                          <td colSpan={9} className="text-center text-muted py-4">Cargando archivo histórico…</td>
                        </tr>
                      )}
                      {!archivoLoading && archivoList.length === 0 && (
                        <tr>
                          <td colSpan={9} className="text-center text-muted py-4">No hay expedientes archivados con los filtros actuales.</td>
                        </tr>
                      )}
                      {!archivoLoading &&
                        archivoList.map((a) => {
                          const dias = a.dias_restantes_retencion;
                          let retencionClass = '';
                          if (dias != null && dias <= 90 && dias >= 0) retencionClass = 'text-warning fw-semibold';
                          if (dias != null && dias < 0) retencionClass = 'text-danger fw-semibold';
                          return (
                            <tr key={a.id_archivo}>
                              <td>{a.numero_contrato}</td>
                              <td>{a.empresa || '—'}</td>
                              <td>{etiquetaTipoContratoLegible(a.tipo_contrato) || '—'}</td>
                              <td>{fechaParaExportEs(a.fecha_fin) || '—'}</td>
                              <td>{a.eliminado_por || '—'}</td>
                              <td>{a.eliminado_en ? new Date(a.eliminado_en).toLocaleDateString('es-ES') : '—'}</td>
                              <td className={retencionClass}>
                                {fechaParaExportEs(a.retencion_hasta) || '—'}
                                {dias != null && dias >= 0 && dias <= 90 ? (
                                  <small className="d-block text-muted">{dias} días</small>
                                ) : null}
                              </td>
                              <td>{a.num_documentos ?? 0}</td>
                              <td className="text-end text-nowrap">
                                <button
                                  type="button"
                                  className={BTN_CONSULTAR}
                                  onClick={() => verDetalleArchivo(a)}
                                >
                                  Ver detalle
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      {hasDocument && docPicker && docPickerPos && createPortal(
        (() => {
          const categorias = getCategoriasDocumentos(docPicker.numero, docPicker.contratoRow);
          const catActiva = categorias.find((c) => c.id === docPickerCategoria);
          return (
            <div
              className="contratos-doc-picker contratos-pdf-picker__menu contratos-pdf-picker__menu--fixed"
              style={{ top: docPickerPos.top, left: docPickerPos.left }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <p className="contratos-doc-picker__title mb-1">Tipo de documento</p>
              <div className="contratos-doc-picker__cats">
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`contratos-doc-picker__cat${docPickerCategoria === cat.id ? ' is-active' : ''}`}
                    onClick={() =>
                      setDocPickerCategoria((prev) => (prev === cat.id ? null : cat.id))
                    }
                  >
                    {cat.label}
                    <span className="contratos-doc-picker__cat-count">{cat.items.length}</span>
                  </button>
                ))}
              </div>
              {catActiva ? (
                <>
                  <p className="contratos-doc-picker__subtitle mb-1 mt-2">
                    Archivos — {catActiva.label}
                  </p>
                  <ul className="contratos-doc-picker__files list-unstyled mb-0">
                    {catActiva.items.map((doc) => {
                      const esWord =
                        doc.tipo === 'word' || /\.docx?$/i.test(String(doc.nombre || ''));
                      return (
                        <li key={doc.id || `${catActiva.id}-${doc.numero}-${doc.nombre}`}>
                          <button
                            type="button"
                            className="contratos-pdf-picker__item"
                            onClick={() =>
                              abrirDocumentoTabla(docPicker.numero, doc, catActiva.id)
                            }
                          >
                            <i
                              className={`bi ${esWord ? 'bi-file-earmark-word' : 'bi-file-earmark-pdf'} me-1 flex-shrink-0`}
                              aria-hidden="true"
                            />
                            <span className="text-truncate">{doc.etiqueta || doc.nombre}</span>
                            <span className="contratos-doc-picker__tipo-badge ms-1">
                              {esWord ? 'Word' : 'PDF'}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}
            </div>
          );
        })(),
        document.body
      )}

      {hasDocument && pdfVistaPrevia != null && createPortal(
        <div
          className="contrato-pdf-preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Vista previa del documento del contrato ${pdfVistaPrevia.numero}`}
          onClick={() => {
            setPdfVistaPrevia(null);
            setPdfVistaMaximizada(false);
            setPdfHasCustomPos(false);
            setPdfDragging(false);
          }}
        >
          <div
            ref={pdfModalRef}
            className={`contrato-pdf-preview-modal${pdfVistaMaximizada ? ' is-maximized' : ''}${pdfDragging ? ' is-dragging' : ''}`}
            style={
              pdfVistaMaximizada || !pdfHasCustomPos
                ? undefined
                : {
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    transform: `translate(${pdfDragPos.x}px, ${pdfDragPos.y}px)`,
                  }
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="contrato-pdf-preview-header"
              onMouseDown={(e) => {
                if (pdfVistaMaximizada) return;
                const modal = pdfModalRef.current || e.currentTarget.parentElement;
                if (!modal) return;
                const rect = modal.getBoundingClientRect();
                setPdfHasCustomPos(true);
                setPdfDragPos({ x: rect.left, y: rect.top });
                setPdfDragOffset({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
                setPdfDragging(true);
              }}
            >
              <div className="contrato-pdf-preview-title-wrap">
                <strong className="contrato-pdf-preview-title">
                  {pdfVistaPrevia.tituloTipo || 'Contrato'} {pdfVistaPrevia.numero}
                </strong>
                <small className="contrato-pdf-preview-name">{pdfVistaPrevia.nombre}</small>
              </div>
              <div className="contrato-pdf-preview-actions">
                <button
                  type="button"
                  className="contrato-pdf-preview-maximize"
                  onClick={() => {
                    setPdfVistaMaximizada((v) => !v);
                    setPdfDragging(false);
                    if (pdfVistaMaximizada) setPdfHasCustomPos(false);
                    setPdfRenderNonce((n) => n + 1);
                  }}
                  aria-label={pdfVistaMaximizada ? 'Restaurar tamaño del visor' : 'Maximizar visor'}
                  title={pdfVistaMaximizada ? 'Restaurar' : 'Maximizar'}
                >
                  <i className={`bi ${pdfVistaMaximizada ? 'bi-fullscreen-exit' : 'bi-fullscreen'}`} aria-hidden="true" />
                </button>
                {pdfVistaPrevia.tipo === 'word' && (
                  <button
                    type="button"
                    className="contrato-pdf-preview-maximize"
                    onClick={() =>
                      descargarDocumentoDataUrl(pdfVistaPrevia.dataUrl, pdfVistaPrevia.nombre)
                    }
                    aria-label="Descargar documento Word"
                    title="Descargar"
                  >
                    <i className="bi bi-download" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  className="contrato-pdf-preview-close"
                  onClick={() => {
                    setPdfVistaPrevia(null);
                    setPdfVistaMaximizada(false);
                    setPdfHasCustomPos(false);
                    setPdfDragging(false);
                  }}
                  aria-label="Cerrar visor de documento"
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="contrato-pdf-preview-body">
              {pdfVistaPrevia.tipo === 'word' ? (
                <ContratoWordPreviewPane
                  key={`word-${pdfVistaPrevia.numero}-${pdfVistaPrevia.nombre}`}
                  dataUrl={pdfVistaPrevia.dataUrl}
                  nombre={pdfVistaPrevia.nombre}
                  maximizado={pdfVistaMaximizada}
                  onDescargar={() =>
                    descargarDocumentoDataUrl(pdfVistaPrevia.dataUrl, pdfVistaPrevia.nombre)
                  }
                />
              ) : (
                <iframe
                  key={`${pdfVistaPrevia.numero}-${pdfVistaMaximizada ? 'max' : 'min'}-${pdfRenderNonce}`}
                  src={buildPdfViewerSrc(pdfVistaPrevia, pdfVistaMaximizada, pdfRenderNonce)}
                  title={`PDF del contrato ${pdfVistaPrevia.numero}`}
                  className="contrato-pdf-preview-iframe"
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <ContratosInfoModal
        show={showInfoModal}
        onHide={() => {
          setShowInfoModal(false);
          setContratoInfo(null);
        }}
        numeroContrato={contratoInfo?.numero_contrato}
        fmtDisplayDate={fmtDisplayDate}
        getIconoEmpresa={getIconoEmpresa}
        getPdfsContrato={getPdfsContrato}
        onVerPdf={abrirPdfContrato}
      />

      <ContratosCambiosPendientesModal
        show={showCambiosModal}
        onHide={() => {
          setShowCambiosModal(false);
          setContratoCambios(null);
        }}
        contratoActual={contratoCambios}
        fmtDisplayDate={fmtDisplayDate}
        tipoLegible={etiquetaTipoContratoLegible}
        getIconoEmpresa={getIconoEmpresa}
        getPdfsContrato={getPdfsContrato}
        onVerPdf={abrirPdfContrato}
      />

      {empresaVistaPrevia != null && (
        <div
          className="renov-empresa-preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada del icono de empresa"
          onClick={() => setEmpresaVistaPrevia(null)}
        >
          <div className="renov-empresa-preview-stack" onClick={(e) => e.stopPropagation()}>
            <div className="renov-empresa-preview-bubble">
              <button
                type="button"
                className="renov-empresa-preview-close"
                onClick={() => setEmpresaVistaPrevia(null)}
                aria-label="Cerrar"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
              <div className="renov-empresa-preview-inner">
                {getIconoEmpresa(empresaVistaPrevia) ? (
                  <img
                    src={getIconoEmpresa(empresaVistaPrevia)}
                    alt=""
                    className="renov-empresa-preview-img"
                  />
                ) : (
                  <span className="renov-empresa-preview-initial" aria-hidden="true">
                    {inicialEmpresa(empresaVistaPrevia)}
                  </span>
                )}
              </div>
            </div>
            <p className="renov-empresa-preview-nombre">
              {String(empresaVistaPrevia || '').trim() || 'Sin empresa'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/*
 * Gráfico de dona (SVG puro) para "Total de Contratos por Estado".
 * - `segments`: [{ value, color, label }]; ignora valores cero en la leyenda visual.
 * - Muestra el total en el centro y una leyenda a la derecha/abajo.
 */
function RenovDonut({ segments = [], total = 0, size = 140, stroke = 22 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const sum = segments.reduce((acc, s) => acc + (Number(s.value) || 0), 0) || 1;
  let offset = 0;

  return (
    <div className="renov-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Total de contratos por estado">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e9ecef" strokeWidth={stroke} />
        {segments.map((seg) => {
          const value = Number(seg.value) || 0;
          if (value <= 0) return null;
          const length = (value / sum) * circumference;
          const dashArray = `${length} ${circumference - length}`;
          const dashOffset = -offset;
          offset += length;
          return (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
        <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="700" fill="currentColor">
          {total}
        </text>
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="10"
          fill="currentColor"
          className="renov-donut__text-muted"
        >
          Contratos
        </text>
      </svg>
      <ul className="renov-donut__legend">
        {segments.map((seg) => (
          <li key={seg.label}>
            <span className="renov-donut__chip" style={{ background: seg.color }} aria-hidden="true" />
            <span className="renov-donut__label">{seg.label}</span>
            <span className="renov-donut__val">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default GestionContratos;
