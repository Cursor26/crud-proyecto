import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Axios from 'axios';
import Swal from 'sweetalert2';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EditTableActionButton, DeleteTableActionButton, RenewTableActionButton } from './TableActionIconButtons';
import { FormModal } from './FormModal';
import AppSelect from './AppSelect';
import { usePuedeEscribir } from '../context/PuedeEscribirContext';
import {
  EMPRESA_ORGANIZACION,
  getParametrosAepgTablaContratos,
} from '../utils/exportReporteContratos';
import ExportacionAepgGrupo from './ExportacionAepgGrupo';
import {
  razonesSugerirRevisarTextoEmpresaOsuplemento,
  normalizarMientrasEscribeSoloLetras,
  normalizarTextoEmpresaOSuplemento,
  esSoloBlancosOVacio,
  MSJ_OBLIGATORIO_NO_SOLO_BLANCOS,
} from '../utils/validation';

/** Fecha calendario local (YYYY-MM-DD) para inicio de contrato si el usuario no elige. */
function hoyCivilYMD() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function escapeForSwalHtml(s) {
  if (s == null || s === '') return '—';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function GestionContratos({ vistaInicial = 'contratos', user: usuarioAuth, onSectionChange }) {
  const puedeEscribir = usePuedeEscribir();
  const nombreEmpresaReporte = process.env.REACT_APP_EMPRESA_NOMBRE || EMPRESA_ORGANIZACION;
  const EMPRESA_ICONOS_STORAGE_KEY = 'contratos_empresa_iconos_v1';
  const CONTRATOS_PDF_STORAGE_KEY = 'contratos_pdf_archivos_v1';
  const [contratoNumero, setContratoNumero] = useState('');
  const [contratoNumeroOriginal, setContratoNumeroOriginal] = useState('');
  const [contratoProveedorCliente, setContratoProveedorCliente] = useState(false);
  const [contratoEmpresa, setContratoEmpresa] = useState('');
  const [contratoEmpresaCombo, setContratoEmpresaCombo] = useState('');
  const [contratoSuplementos, setContratoSuplementos] = useState('');
  const [contratoSuplementosCombo, setContratoSuplementosCombo] = useState('');
  const [contratoVigencia, setContratoVigencia] = useState('');
  const [contratoTipo, setContratoTipo] = useState('');
  const [contratoFechaInicio, setContratoFechaInicio] = useState('');
  const [contratoFechaFin, setContratoFechaFin] = useState('');
  const [contratoVencido, setContratoVencido] = useState(false);
  const [contratoCorreoNotificacion, setContratoCorreoNotificacion] = useState('');
  const [editarContrato, setEditarContrato] = useState(false);
  const [contratosList, setContratos] = useState([]);
  const [showContratoModal, setShowContratoModal] = useState(false);
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
  const [empresaIconos, setEmpresaIconos] = useState({});
  const [contratoPdfs, setContratoPdfs] = useState({});
  const [empresaVistaPrevia, setEmpresaVistaPrevia] = useState(null);
  const [pdfVistaPrevia, setPdfVistaPrevia] = useState(null);
  const [pdfVistaMaximizada, setPdfVistaMaximizada] = useState(false);
  const [pdfRenderNonce, setPdfRenderNonce] = useState(0);
  const [pdfHasCustomPos, setPdfHasCustomPos] = useState(false);
  const [pdfDragPos, setPdfDragPos] = useState({ x: 0, y: 0 });
  const [pdfDragging, setPdfDragging] = useState(false);
  const [pdfDragOffset, setPdfDragOffset] = useState({ x: 0, y: 0 });
  const [nombreArchivoIcono, setNombreArchivoIcono] = useState('');
  const inputIconoEmpresaRef = useRef(null);
  const [nombreArchivoPdf, setNombreArchivoPdf] = useState('');
  const inputPdfContratoRef = useRef(null);
  const pdfModalRef = useRef(null);
  const hasDocument = typeof document !== 'undefined';

  const getContratos = () => {
    Axios.get('/contratos')
      .then((response) => setContratos(response.data))
      .catch((error) => console.error('Error al cargar contratos:', error));
  };

  useEffect(() => {
    getContratos();
  }, []);

  useEffect(() => {
    const nextSection = vistaInicial || 'contratos';
    // Si se entra a Vencimientos desde navegación externa (menú lateral),
    // reinicia la bandeja a modo general. Si ya estamos en Vencimientos
    // (caso "Ver todos" interno), conserva el modo específico seleccionado.
    if (nextSection === 'vencimientos' && activeSection !== 'vencimientos') {
      setBandejaVencimientosModo('todos');
    }
    setActiveSection(nextSection);
  }, [vistaInicial, activeSection]);

  const irASeccion = (seccion) => {
    setActiveSection(seccion);
    if (typeof onSectionChange === 'function') onSectionChange(seccion);
  };

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

  const getPdfContrato = (numeroContrato) => {
    const key = normalizarNumeroContratoKey(numeroContrato);
    if (!key) return null;
    const entry = contratoPdfs[key];
    if (!entry) return null;
    if (typeof entry === 'string') return { dataUrl: entry, nombre: 'Contrato.pdf' };
    return {
      dataUrl: String(entry.dataUrl || ''),
      nombre: String(entry.nombre || 'Contrato.pdf'),
    };
  };

  const guardarPdfContrato = (numeroContrato, dataUrl, nombre) => {
    const key = normalizarNumeroContratoKey(numeroContrato);
    if (!key || !dataUrl) return;
    persistirPdfsContrato({
      ...contratoPdfs,
      [key]: { dataUrl, nombre: nombre || 'Contrato.pdf' },
    });
  };

  const eliminarPdfContrato = (numeroContrato) => {
    const key = normalizarNumeroContratoKey(numeroContrato);
    if (!key || !contratoPdfs[key]) return;
    const nextPdfs = { ...contratoPdfs };
    delete nextPdfs[key];
    persistirPdfsContrato(nextPdfs);
    setNombreArchivoPdf('');
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

  const abrirPdfContrato = (numeroContrato) => {
    const pdf = getPdfContrato(numeroContrato);
    if (!pdf?.dataUrl) {
      Swal.fire('Sin PDF', 'Este contrato no tiene PDF asociado.', 'info');
      return;
    }
    let objectUrl = null;
    try {
      objectUrl = dataUrlToObjectUrl(pdf.dataUrl);
    } catch (error) {
      console.error('No se pudo preparar el PDF para el visor:', error);
    }
    setPdfVistaPrevia({
      numero: String(numeroContrato || '').trim() || '—',
      nombre: pdf.nombre || 'Contrato.pdf',
      dataUrl: String(pdf.dataUrl),
      objectUrl,
    });
    setPdfVistaMaximizada(false);
    setPdfHasCustomPos(false);
    setPdfDragPos({ x: 0, y: 0 });
    setPdfRenderNonce((n) => n + 1);
  };

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

  const renderCeldaDocumentoPdf = (numeroContrato) => {
    const pdf = getPdfContrato(numeroContrato);
    const numeroNorm = String(numeroContrato || '').trim();
    const isPdfAbierto = pdfVistaPrevia != null && String(pdfVistaPrevia.numero || '').trim() === numeroNorm;
    if (!pdf?.dataUrl) {
      return <span className="text-muted">—</span>;
    }
    return (
      <div className="d-flex align-items-center justify-content-center">
        <button
          type="button"
          className={`btn btn-link p-0 contratos-pdf-inline${isPdfAbierto ? ' contratos-pdf-inline--active' : ''}`}
          title={pdf.nombre || `Ver PDF del contrato ${numeroContrato}`}
          aria-label={`Ver PDF del contrato ${numeroContrato}`}
          onClick={() => abrirPdfContrato(numeroContrato)}
        >
          <i className="bi bi-file-earmark-pdf-fill" aria-hidden="true" />
        </button>
        <span className="ms-1">Pdf</span>
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

    const empresaNombre = normalizarTextoEmpresaOSuplemento(
      String(contratoEmpresa || '').trim() || String(contratoEmpresaCombo || '').trim()
    );
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
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (esSoloBlancosOVacio(contratoNumero) || !String(contratoNumero || '').trim()) {
      Swal.fire('N° de contrato', `${MSJ_OBLIGATORIO_NO_SOLO_BLANCOS} Indique un número de contrato para asociar el PDF.`, 'info');
      return;
    }
    const numero = String(contratoNumero || '').trim();
    const esPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!esPdf) {
      Swal.fire('Archivo inválido', 'Selecciona un archivo PDF válido.', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Archivo muy pesado', 'Usa un PDF de hasta 5 MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      guardarPdfContrato(numero, dataUrl, file.name);
      setNombreArchivoPdf(file.name);
    };
    reader.readAsDataURL(file);
  };

  /** null si la vigencia es aceptable; string con mensaje si no. Debe ser un número mayor que cero. */
  const getMensajeErrorVigencia = (raw) => {
    const s = String(raw ?? '').trim();
    if (s === '') {
      return 'Indique la vigencia en años (debe ser mayor que cero). No basta con dejar en blanco o con solo espacios o tabulaciones.';
    }
    const n = parseFloat(s.replace(',', '.'));
    if (Number.isNaN(n)) {
      return 'Indique un número válido para la vigencia (años; se permiten decimales).';
    }
    if (n <= 0) {
      return 'La vigencia debe ser mayor que cero (años; p. ej. 0,1 o 1).';
    }
    return null;
  };

  const sumarTiempoConVigencia = (fechaStr, vigenciaValor) => {
    if (!fechaStr) return fechaStr;
    const s = String(fechaStr);
    const p = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const fecha = p
      ? new Date(parseInt(p[1], 10), parseInt(p[2], 10) - 1, parseInt(p[3], 10))
      : new Date(s.includes('T') ? s : `${s}T00:00:00`);

    let vigencia = parseFloat(String(vigenciaValor ?? '').replace(',', '.'));
    if (Number.isNaN(vigencia) || vigencia <= 0) return '';
    let entero = Math.trunc(vigencia);
    let decimal = vigencia - Math.trunc(vigencia);

    fecha.setFullYear(fecha.getFullYear() + entero);

    let diasDecimal = decimal * 365.25;
    let ParteEnteraDe_diasDecimal = Math.trunc(diasDecimal);

    fecha.setDate(fecha.getDate() + ParteEnteraDe_diasDecimal);

    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  /** Fecha de contrato como calendario (YYYY-MM-DD), sin perder un día por UTC. */
  const toISODate = (value) => {
    if (value == null || value === '') return '';
    const s = String(value).trim();
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return '';
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
  };

  const parseFechaCivilYMDaDate = (value) => {
    const ymd = toISODate(value);
    if (!ymd) return null;
    const p = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!p) return null;
    return new Date(parseInt(p[1], 10), parseInt(p[2], 10) - 1, parseInt(p[3], 10));
  };

  /** Fecha fin para vista previa export (DD/MM/AAAA), mismo criterio que columnas de reporte. */
  const fechaParaExportEs = (value) => {
    const d = parseFechaCivilYMDaDate(value);
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const etiquetaTipoContratoLegible = (tipo) => String(tipo ?? '').trim();

  /**
   * Inversa de sumarTiempoConVigencia: vigencia en años (1 = un año) según inicio y fin.
   * Usar al renovar para que el valor guardado coincida con el periodo inicio–fin.
   */
  const calcularVigenciaDesdeFechas = (fechaInicio, fechaFin) => {
    const iniE = toISODate(fechaInicio);
    const finE = toISODate(fechaFin);
    if (!iniE || !finE || finE <= iniE) return 0.01;
    const finSumada = (v) => {
      const s = sumarTiempoConVigencia(iniE, v);
      return s || '';
    };
    if (finSumada(0.01) === finE) {
      return 0.01;
    }
    const antesQueFinE = (r) => (r && r < finE) || !r;
    let lo = 0.01;
    let hi = 0.1;
    let guard = 0;
    while (antesQueFinE(finSumada(hi))) {
      hi *= 2;
      guard += 1;
      if (guard > 50 || hi > 1e6) {
        const d0 = parseFechaCivilYMDaDate(iniE);
        const d1 = parseFechaCivilYMDaDate(finE);
        if (!d0 || !d1) return 1;
        const dias = (d1 - d0) / 864e5;
        return Math.max(0.01, Math.round((dias / 365.25) * 10000) / 10000);
      }
    }
    for (let i = 0; i < 100; i += 1) {
      const m = (lo + hi) / 2;
      const r = finSumada(m);
      if (r === finE) {
        return Math.max(0.01, Math.round(m * 10000) / 10000);
      }
      if (antesQueFinE(r)) {
        lo = m;
      } else {
        hi = m;
      }
    }
    return Math.max(0.01, Math.round(((lo + hi) / 2) * 10000) / 10000);
  };

  const diasParaVencer = (fechaFin) => {
    if (!fechaFin) return null;
    const fin = parseFechaCivilYMDaDate(fechaFin);
    if (!fin || Number.isNaN(fin.getTime())) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ms = fin.getTime() - hoy.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  const getEstadoContrato = (contrato) => {
    const dias = diasParaVencer(contrato.fecha_fin);
    if (dias == null) return 'Sin fecha';
    if (dias < 0) return 'Vencido';
    if (dias <= 30) return 'Por vencer';
    if (dias <= 90) return 'En seguimiento';
    return 'Activo';
  };

  const getAlertaContrato = (contrato) => {
    const dias = diasParaVencer(contrato.fecha_fin);
    if (dias == null) return 'Sin fecha fin';
    if (dias < 0) return `Venció hace ${Math.abs(dias)} día(s)`;
    if (dias <= 7) return `Crítico: ${dias} día(s)`;
    if (dias <= 30) return `Atención: ${dias} día(s)`;
    if (dias <= 90) return `Seguimiento: ${dias} día(s)`;
    return `Vigente: ${dias} día(s)`;
  };

  const getBadgeClass = (estado) => {
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

  useEffect(() => {
    const actual = getPdfContrato(contratoNumero);
    setNombreArchivoPdf(actual?.nombre || '');
  }, [contratoNumero, contratoPdfs]);

  const limpiarContrato = () => {
    setContratoNumero('');
    setContratoNumeroOriginal('');
    setContratoProveedorCliente(false);
    setContratoEmpresa('');
    setContratoEmpresaCombo('');
    setContratoSuplementos('');
    setContratoSuplementosCombo('');
    setContratoVigencia('');
    setContratoTipo('');
    setContratoFechaInicio('');
    setContratoFechaFin('');
    setContratoVencido(false);
    setContratoCorreoNotificacion('');
    setEditarContrato(false);
    setNombreArchivoIcono('');
    setNombreArchivoPdf('');
  };

  const cerrarModalContrato = () => {
    limpiarContrato();
    setShowContratoModal(false);
  };

  const abrirModalNuevoContrato = () => {
    limpiarContrato();
    setContratoNumeroOriginal('');
    setShowContratoModal(true);
    setContratoFechaInicio(hoyCivilYMD());
  };

  const confirmarNombresIrregulares = async (empresaGuardar, suplementosGuardar) => {
    const reEmp = razonesSugerirRevisarTextoEmpresaOsuplemento(empresaGuardar);
    const reSup = razonesSugerirRevisarTextoEmpresaOsuplemento(suplementosGuardar);
    if (reEmp.length === 0 && reSup.length === 0) return true;
    const bloques = [];
    if (reEmp.length) {
      bloques.push(`— Empresa: ${reEmp.join(' · ')}.`);
    }
    if (reSup.length) {
      bloques.push(`— Suplementos: ${reSup.join(' · ')}.`);
    }
    const { isConfirmed } = await Swal.fire({
      title: 'Revisar antes de guardar',
      html: `<p class="text-start mb-2">Esto no es un error: el sistema nota pautas poco habituales en un nombre (cifras, cualquier punto, signos raros, etc.). Conviene comprobar que el texto quede como en el documento original.</p><p class="text-start small mb-0">${bloques.join(
        '<br>',
      )}</p><p class="mt-3 mb-0">¿Deseas guardar de todos modos?</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Volver a revisar',
    });
    return isConfirmed;
  };

  const guardarContratoModal = () => {
    if (editarContrato) void updateContrato();
    else void addContrato();
  };

  const addContrato = async () => {
    const numeroNuevo = String(contratoNumero || '').trim();
    if (esSoloBlancosOVacio(contratoNumero) || !numeroNuevo) {
      Swal.fire('N° de contrato', MSJ_OBLIGATORIO_NO_SOLO_BLANCOS, 'warning');
      return;
    }
    const errV = getMensajeErrorVigencia(contratoVigencia);
    if (errV) {
      Swal.fire('Vigencia no válida', errV, 'error');
      return;
    }
    const empresaRaw =
      String(contratoEmpresa || '').trim() || String(contratoEmpresaCombo || '').trim();
    const suplementosRaw =
      String(contratoSuplementos || '').trim() || String(contratoSuplementosCombo || '').trim();
    const empresaGuardar = normalizarTextoEmpresaOSuplemento(empresaRaw);
    if (!empresaGuardar) {
      Swal.fire('Empresa requerida', `Empresa: ${MSJ_OBLIGATORIO_NO_SOLO_BLANCOS}`, 'warning');
      return;
    }
    const suplementosGuardar = normalizarTextoEmpresaOSuplemento(suplementosRaw);
    const fechaInicioEfectiva = toISODate(contratoFechaInicio) || hoyCivilYMD();
    const nuevaFechaFin = sumarTiempoConVigencia(fechaInicioEfectiva, contratoVigencia);
    const vencidoCalc = diasParaVencer(nuevaFechaFin) != null && diasParaVencer(nuevaFechaFin) < 0 ? 1 : 0;
    const okNombres = await confirmarNombresIrregulares(empresaGuardar, suplementosGuardar);
    if (!okNombres) return;
    const bodyCreate = {
      numero_contrato: numeroNuevo,
      proveedor_cliente: contratoProveedorCliente ? 1 : 0,
      empresa: empresaGuardar,
      suplementos: suplementosGuardar,
      vigencia: contratoVigencia,
      tipo_contrato: contratoTipo,
      fecha_inicio: fechaInicioEfectiva,
      fecha_fin: nuevaFechaFin,
      vencido: vencidoCalc,
      correo_notificacion: String(contratoCorreoNotificacion || '').trim() || null,
    };
    Axios.post('/create-contrato', bodyCreate)
      .then(() => {
        getContratos();
        cerrarModalContrato();
        Swal.fire('Registro exitoso', 'Contrato agregado', 'success');
      })
      .catch((error) => {
        const msg =
          error.response?.data?.message ||
          (typeof error.response?.data === 'string' ? error.response.data : null) ||
          error.message;
        Swal.fire('Error', msg, 'error');
      });
  };

  const updateContrato = async () => {
    const errV = getMensajeErrorVigencia(contratoVigencia);
    if (errV) {
      Swal.fire('Vigencia no válida', errV, 'error');
      return;
    }
    const numeroNuevo = String(contratoNumero || '').trim();
    const numeroOriginalRaw = contratoNumeroOriginal ?? '';
    const numeroOriginal = String(numeroOriginalRaw).trim();

    if (esSoloBlancosOVacio(contratoNumero) || !numeroNuevo) {
      Swal.fire('N° de contrato', MSJ_OBLIGATORIO_NO_SOLO_BLANCOS, 'warning');
      return;
    }

    const numOriginalSeguro = String(contratoNumeroOriginal ?? numeroNuevo ?? '').trim() || numeroNuevo;
    const empresaRawU =
      String(contratoEmpresa || '').trim() || String(contratoEmpresaCombo || '').trim();
    const suplementosRawU =
      String(contratoSuplementos || '').trim() || String(contratoSuplementosCombo || '').trim();
    const empresaGuardar = normalizarTextoEmpresaOSuplemento(empresaRawU);
    if (!empresaGuardar) {
      Swal.fire('Empresa requerida', `Empresa: ${MSJ_OBLIGATORIO_NO_SOLO_BLANCOS}`, 'warning');
      return;
    }
    const suplementosGuardar = normalizarTextoEmpresaOSuplemento(suplementosRawU);
    const fechaInicioEfectiva = toISODate(contratoFechaInicio) || hoyCivilYMD();
    const nuevaFechaFin = sumarTiempoConVigencia(fechaInicioEfectiva, contratoVigencia);
    const vencidoCalc = diasParaVencer(nuevaFechaFin) != null && diasParaVencer(nuevaFechaFin) < 0 ? 1 : 0;
    const okNombres = await confirmarNombresIrregulares(empresaGuardar, suplementosGuardar);
    if (!okNombres) return;
    const bodyUpdate = {
      numero_contrato: numeroNuevo,
      numero_contrato_original: numOriginalSeguro,
      proveedor_cliente: contratoProveedorCliente ? 1 : 0,
      empresa: empresaGuardar,
      suplementos: suplementosGuardar,
      vigencia: contratoVigencia,
      tipo_contrato: contratoTipo,
      fecha_inicio: fechaInicioEfectiva,
      fecha_fin: nuevaFechaFin,
      vencido: vencidoCalc,
      correo_notificacion: String(contratoCorreoNotificacion || '').trim() || null,
    };
    Axios.put('/update-contrato', bodyUpdate)
      .then(() => Axios.get('/contratos'))
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
        cerrarModalContrato();
        Swal.fire('Actualización exitosa', 'Contrato actualizado', 'success');
      })
      .catch((error) => {
        const msg =
          error.response?.data?.message ||
          (typeof error.response?.data === 'string' ? error.response.data : null) ||
          error.message;
        Swal.fire('Error', msg, 'error');
      });
  };

  const deleteContrato = (val) => {
    Swal.fire({
      title: '¿Eliminar contrato?',
      text: 'Se eliminará el contrato',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`/delete-contrato/${val.numero_contrato}`)
          .then(() => {
            getContratos();
            Swal.fire('Eliminado', 'Contrato eliminado', 'success');
          })
          .catch((error) => {
            Swal.fire('Error', error.response?.data?.message || error.message, 'error');
          });
      }
    });
  };

  const editarContratoTabla = (val) => {
    setEditarContrato(true);
    setContratoNumero(val.numero_contrato);
    setContratoNumeroOriginal(val.numero_contrato);
    setContratoProveedorCliente(val.proveedor_cliente === 1);
    setContratoEmpresa(
      val.empresa != null && String(val.empresa).trim() !== ''
        ? normalizarTextoEmpresaOSuplemento(String(val.empresa))
        : ''
    );
    setContratoEmpresaCombo('');
    setContratoSuplementos(
      val.suplementos != null && String(val.suplementos).trim() !== ''
        ? normalizarTextoEmpresaOSuplemento(String(val.suplementos))
        : ''
    );
    setContratoSuplementosCombo('');
    setContratoVigencia(val.vigencia);
    setContratoTipo(val.tipo_contrato);
    setContratoFechaInicio(toISODate(val.fecha_inicio));
    setContratoFechaFin(toISODate(val.fecha_fin));
    setContratoVencido(val.vencido === 1);
    setContratoCorreoNotificacion(val.correo_notificacion != null ? String(val.correo_notificacion) : '');
    setShowContratoModal(true);
  };

  const renovarContrato = (contrato) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioRenovacion = toISODate(hoy.toISOString());
    const sugeridaFin = sumarTiempoConVigencia(inicioRenovacion, contrato.vigencia) || inicioRenovacion;

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

      const nuevaVigencia = calcularVigenciaDesdeFechas(inicioRenovacion, nuevaFechaFin);

      Axios.put('/update-contrato', {
        numero_contrato: contrato.numero_contrato,
        proveedor_cliente: contrato.proveedor_cliente ? 1 : 0,
        empresa: normalizarTextoEmpresaOSuplemento(String(contrato.empresa || '')),
        suplementos: normalizarTextoEmpresaOSuplemento(String(contrato.suplementos || '')),
        vigencia: nuevaVigencia,
        tipo_contrato: contrato.tipo_contrato,
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
    const correoDestino = String(contrato.correo_notificacion || '').trim();
    if (!correoDestino) {
      Swal.fire(
        'Correo requerido',
        'Este contrato no tiene correo de notificación. Agrégalo en Editar contrato para poder enviar recordatorios.',
        'info'
      );
      return;
    }

    Swal.fire({
      title: '¿Enviar recordatorio?',
      html: `
        <div style="text-align:left">
          <p style="margin:0 0 0.35rem;"><strong>Contrato:</strong> ${contrato.numero_contrato}</p>
          <p style="margin:0;"><strong>Destino:</strong> ${correoDestino}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      Axios.post('http://localhost:3001/send-contrato-reminder', {
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

  const contratosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return contratosEnriquecidos.filter((con) => {
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
  }, [contratosEnriquecidos, searchTerm, filtroTipo, filtroParte, filtroEstado, filtroVencimiento]);

  const resumen = useMemo(() => {
    const total = contratosEnriquecidos.length;
    const activos = contratosEnriquecidos.filter((c) => c.estado === 'Activo').length;
    const porVencer = contratosEnriquecidos.filter((c) => c.estado === 'Por vencer').length;
    const vencidos = contratosEnriquecidos.filter((c) => c.estado === 'Vencido').length;
    const seguimiento = contratosEnriquecidos.filter((c) => c.estado === 'En seguimiento').length;
    return { total, activos, porVencer, vencidos, seguimiento };
  }, [contratosEnriquecidos]);

  const tiposDisponibles = useMemo(() => {
    const setTipos = new Set(contratosEnriquecidos.map((c) => c.tipo_contrato).filter(Boolean));
    return Array.from(setTipos);
  }, [contratosEnriquecidos]);

  const empresasDesdeContratos = useMemo(() => {
    const seen = new Set();
    const out = [];
    contratosList.forEach((c) => {
      const raw = String(c.empresa || '').trim();
      if (!raw) return;
      const v = normalizarTextoEmpresaOSuplemento(raw);
      if (!v) return;
      const k = v.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push(v);
    });
    return out.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [contratosList]);

  const suplementosDesdeContratos = useMemo(() => {
    const seen = new Set();
    const out = [];
    contratosList.forEach((c) => {
      const raw = String(c.suplementos || '').trim();
      if (!raw) return;
      const v = normalizarTextoEmpresaOSuplemento(raw);
      if (!v) return;
      const k = v.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push(v);
    });
    return out.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [contratosList]);

  const empresaEfectivaModal = useMemo(
    () =>
      normalizarTextoEmpresaOSuplemento(
        String(contratoEmpresa || '').trim() || String(contratoEmpresaCombo || '').trim()
      ),
    [contratoEmpresa, contratoEmpresaCombo]
  );

  /** N° contrato, empresa (tras normalizar) y vigencia sin error: el resto según reglas de negocio. */
  const faltanObligatoriosModalContrato =
    esSoloBlancosOVacio(contratoNumero) || !empresaEfectivaModal;

  const suplementosEfectivoModal = useMemo(
    () =>
      normalizarTextoEmpresaOSuplemento(
        String(contratoSuplementos || '').trim() || String(contratoSuplementosCombo || '').trim()
      ),
    [contratoSuplementos, contratoSuplementosCombo]
  );

  const contratosPrioritarios = useMemo(() => {
    return contratosEnriquecidos
      .filter((c) => c.diasRestantes != null && c.diasRestantes <= 90)
      .sort((a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999));
  }, [contratosEnriquecidos]);

  const contratosPorVencer = useMemo(() => contratosEnriquecidos.filter((c) => c.estado === 'Por vencer'), [contratosEnriquecidos]);
  const contratosVencidos = useMemo(() => contratosEnriquecidos.filter((c) => c.estado === 'Vencido'), [contratosEnriquecidos]);
  const contratosCriticos = useMemo(() => {
    return contratosEnriquecidos
      .filter((c) => c.estado === 'Por vencer' || c.estado === 'Vencido')
      .sort((a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999));
  }, [contratosEnriquecidos]);
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
      const fin = parseFechaCivilYMDaDate(c.fecha_fin);
      if (!fin) return true;
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
    contratosEnriquecidos.forEach((c) => {
      if (c.fecha_fin) {
        const fd = parseFechaCivilYMDaDate(c.fecha_fin);
        if (fd) {
          const m = fd.getMonth();
          if (c.estado === 'Vencido') vencidos[m] += 1;
          else activos[m] += 1;
        }
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
  }, [contratosEnriquecidos]);

  /* Porcentaje (sobre el total) de inmediatos y vencidos para barras de progreso del panel */
  const porcentajePanel = useMemo(() => {
    const total = contratosEnriquecidos.length || 1;
    return {
      inmediatos: Math.round((contratosPorVencer.length / total) * 100),
      vencidos: Math.round((contratosVencidos.length / total) * 100),
    };
  }, [contratosEnriquecidos, contratosPorVencer, contratosVencidos]);

  const topEmpresas = useMemo(() => {
    const mapa = new Map();
    contratosEnriquecidos.forEach((c) => {
      const key = c.empresa || 'Sin empresa';
      mapa.set(key, (mapa.get(key) || 0) + 1);
    });
    return Array.from(mapa.entries())
      .map(([empresa, cantidad]) => ({ empresa, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6);
  }, [contratosEnriquecidos]);

  const empresasReporteOpciones = useMemo(() => {
    const s = new Set(contratosEnriquecidos.map((c) => c.empresa || 'Sin empresa'));
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'es'));
  }, [contratosEnriquecidos]);

  const contratosFiltradosReporte = useMemo(() => {
    return contratosEnriquecidos.filter((c) => {
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
  }, [contratosEnriquecidos, reporteFechaDesde, reporteFechaHasta, reporteTipo, reporteEmpresa]);

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
    const sinCorreo = list.filter((c) => !String(c.correo_notificacion || '').trim()).length;
    const sinPdf = list.filter((c) => !getPdfContrato(c.numero_contrato)).length;
    return {
      sinCorreo,
      sinPdf,
    };
  }, [contratosFiltradosReporte, contratoPdfs]);

  const renovarMasivos = () => {
    const objetivo = contratosEnriquecidos.filter((c) => c.diasRestantes != null && c.diasRestantes <= 30);
    if (objetivo.length === 0) {
      Swal.fire('Sin pendientes', 'No hay contratos en ventana de renovación (<= 30 días).', 'info');
      return;
    }

    Swal.fire({
      title: 'Renovación masiva',
      text: `Se renovarán ${objetivo.length} contrato(s) críticos o por vencer.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, renovar todos',
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        await Promise.all(
          objetivo.map((contrato) => {
            const baseInicio = toISODate(contrato.fecha_fin) || toISODate(contrato.fecha_inicio);
            const nuevaFechaFin = sumarTiempoConVigencia(baseInicio, contrato.vigencia) || baseInicio;
            const nuevaVigencia = calcularVigenciaDesdeFechas(baseInicio, nuevaFechaFin);
            return Axios.put('/update-contrato', {
              numero_contrato: contrato.numero_contrato,
              proveedor_cliente: contrato.proveedor_cliente ? 1 : 0,
              empresa: normalizarTextoEmpresaOSuplemento(String(contrato.empresa || '')),
              suplementos: normalizarTextoEmpresaOSuplemento(String(contrato.suplementos || '')),
              vigencia: nuevaVigencia,
              tipo_contrato: contrato.tipo_contrato,
              fecha_inicio: toISODate(contrato.fecha_inicio),
              fecha_fin: nuevaFechaFin,
              vencido: 0,
            });
          })
        );
        getContratos();
        Swal.fire('Completado', 'Renovación masiva aplicada correctamente.', 'success');
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
      }
    });
  };

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

  const renovarVencidosMasivo = () => {
    if (contratosVencidos.length === 0) {
      Swal.fire('Sin vencidos', 'No hay contratos vencidos para renovar.', 'info');
      return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioRenovacion = toISODate(hoy.toISOString());
    const sugeridaFin = sumarTiempoConVigencia(inicioRenovacion, 1) || inicioRenovacion;

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
          return Axios.put('http://localhost:3001/update-contrato', {
            numero_contrato: contrato.numero_contrato,
            proveedor_cliente: contrato.proveedor_cliente ? 1 : 0,
            empresa: contrato.empresa,
            correo_notificacion: contrato.correo_notificacion || null,
            suplementos: contrato.suplementos || '',
            vigencia: contrato.vigencia,
            tipo_contrato: contrato.tipo_contrato,
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
    const pdf = getPdfContrato(contrato.numero_contrato);
    const documentoLinea = pdf
      ? `Sí: ${escapeForSwalHtml(pdf.nombre || 'PDF en este navegador')}`
      : 'No (no hay PDF asociado en este equipo o navegador).';
    const vig = contrato.vigencia != null && String(contrato.vigencia).trim() !== '' ? `${escapeForSwalHtml(contrato.vigencia)} año(s)` : '—';
    const parte = contrato.proveedor_cliente ? 'Proveedor' : 'Cliente';
    const sup = (contrato.suplementos && String(contrato.suplementos).trim()) ? escapeForSwalHtml(contrato.suplementos) : '—';
    const vencidoStr =
      contrato.vencido === 1 || contrato.vencido === true ? 'Sí' : contrato.vencido === 0 || contrato.vencido === false ? 'No' : '—';
    Swal.fire({
      title: `Contrato ${escapeForSwalHtml(String(contrato.numero_contrato ?? '—'))}`,
      width: 520,
      icon: 'info',
      showCloseButton: true,
      confirmButtonText: 'Cerrar',
      html: `
        <div style="text-align:left;font-size:0.95rem;max-width:100%">
          <p style="margin-bottom:0.4rem"><strong>Parte:</strong> ${escapeForSwalHtml(parte)}</p>
          <p style="margin-bottom:0.4rem"><strong>Empresa:</strong> ${escapeForSwalHtml(contrato.empresa)}</p>
          <p style="margin-bottom:0.4rem"><strong>Suplementos:</strong> ${sup}</p>
          <p style="margin-bottom:0.4rem"><strong>Tipo de contrato:</strong> ${escapeForSwalHtml(contrato.tipo_contrato)}</p>
          <p style="margin-bottom:0.4rem"><strong>Vigencia:</strong> ${vig}</p>
          <p style="margin-bottom:0.4rem"><strong>Fecha inicio:</strong> ${escapeForSwalHtml(toISODate(contrato.fecha_inicio) || '—')}</p>
          <p style="margin-bottom:0.4rem"><strong>Fecha fin:</strong> ${escapeForSwalHtml(toISODate(contrato.fecha_fin) || '—')}</p>
          <p style="margin-bottom:0.4rem"><strong>Estado (vigencia / alerta):</strong> ${escapeForSwalHtml(contrato.estado || '—')}</p>
          <p style="margin-bottom:0.4rem"><strong>Marcado vencido (BD):</strong> ${vencidoStr}</p>
          <p style="margin-bottom:0.4rem"><strong>Tiempo:</strong> ${escapeForSwalHtml(formatDiferenciaDias(contrato.diasRestantes))}</p>
          <p style="margin-bottom:0"><strong>Documento PDF:</strong> ${documentoLinea}</p>
        </div>
      `,
    });
  };

  const intentarRenovarDesdeCola = (c) => {
    if (!puedeEscribir) {
      void Swal.fire({
        title: 'Solo consulta',
        text: 'Su usuario no puede editar contratos (p. ej. rol director u otro de solo lectura). Para renovar, use un perfil con permiso de modificación.',
        icon: 'info',
      });
      return;
    }
    renovarContrato(c);
  };

  const aepgParametrosContratos = useMemo(
    () =>
      getParametrosAepgTablaContratos({
        user: usuarioAuth,
        empresaNombre: nombreEmpresaReporte,
        contratosEnriquecidos,
        getPdfContrato,
        toISODate,
      }),
    [usuarioAuth, nombreEmpresaReporte, contratosEnriquecidos, getPdfContrato, toISODate],
  );

  const seccionLabel = {
    resumen: 'Resumen',
    contratos: 'Contratos',
    vencimientos: 'Vencimientos',
    renovaciones: 'Renovaciones',
    reportes: 'Reportes',
  };

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

  const mensajeErrorVigencia = getMensajeErrorVigencia(contratoVigencia);

  return (
    <div className="contratos-page">
      <div className="contratos-topbar">
        <h2 className="contratos-page__title mb-0">Contratos</h2>
        <div className="d-flex align-items-center gap-2">
          {activeSection === 'contratos' && (
            <button
              type="button"
              className="btn btn-primary contratos-btn-primary d-inline-flex align-items-center"
              onClick={abrirModalNuevoContrato}
              disabled={!puedeEscribir}
            >
              <i className="bi bi-plus-lg me-2" aria-hidden="true" />
              Agregar contrato
            </button>
          )}
          {activeSection === 'reportes' && (
            <ExportacionAepgGrupo
              tituloSistema={aepgParametrosContratos.tituloSistema}
              subtitulo={aepgParametrosContratos.subtitulo}
              descripcion={aepgParametrosContratos.descripcion}
              nombreBaseArchivo={aepgParametrosContratos.nombreBaseArchivo}
              sheetName={aepgParametrosContratos.sheetName}
              headers={aepgParametrosContratos.headers}
              dataRows={aepgParametrosContratos.dataRows}
              empresaNombre={aepgParametrosContratos.empresaNombre}
              disabled={!contratosEnriquecidos || contratosEnriquecidos.length === 0}
            />
          )}
        </div>
      </div>

      {/* Tabs de secciones */}
      <div className="contratos-tabs-card mb-3">
        <div className="contratos-tabs-row d-flex flex-wrap align-items-end gap-2">
          {Object.entries(seccionLabel)
            .filter(([id]) => id !== 'vencimientos')
            .map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`btn btn-sm contratos-tab ${activeSection === id ? 'contratos-tab--active' : ''}`}
                onClick={() => irASeccion(id)}
              >
                {label}
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
          primaryDisabled={!puedeEscribir || Boolean(mensajeErrorVigencia) || faltanObligatoriosModalContrato}
        >
          <div className="minimal-form-stack">
            <div className="minimal-field">
              <label className="minimal-label">No. Contrato: <span className="text-danger">*</span></label>
              <input
                type="text"
                className="minimal-input"
                placeholder="Número obligatorio"
                value={contratoNumero}
                onChange={(e) => setContratoNumero(e.target.value)}
                required
                aria-required="true"
              />
            </div>

            <div className="minimal-divider" />

            <div className="minimal-inline-group">
              <p className="text-muted small mb-2 w-100">Parte: <span className="text-danger">*</span> (siempre elija una opción — Proveedor o Cliente.)</p>
              <label className="minimal-radio">
                <input
                  type="radio"
                  name="contrato-proveedor-cliente"
                  checked={contratoProveedorCliente}
                  onChange={() => setContratoProveedorCliente(true)}
                />
                Proveedor
              </label>
              <label className="minimal-radio">
                <input
                  type="radio"
                  name="contrato-proveedor-cliente"
                  checked={!contratoProveedorCliente}
                  onChange={() => setContratoProveedorCliente(false)}
                />
                Cliente
              </label>
            </div>

            <div className="minimal-field">
              <label className="minimal-label" htmlFor="contrato-empresa-texto">
                Empresa: <span className="text-danger">*</span>
              </label>
              <p className="text-muted small mb-2" style={{ maxWidth: 480 }}>
                <strong>Obligatorio.</strong> Puede escribir un nombre o elegir una existente. <strong>El texto del cuadro superior
                prevalece</strong> sobre la lista; si deja arriba vacío, se toma el elegido en el desplegable. El valor que se
                guarde nunca puede quedar en blanco.
              </p>
              <p className="text-muted small mb-2" style={{ maxWidth: 480 }}>
                Letras, cifras, punto y guiones (-, –, —). Un solo espacio entre tramos, sin espacios al inicio. Mayúscula
                inicial en cada tramo de letras. El N° de contrato es independiente y admite cualquier texto. Si al guardar
                el nombre parece poco habitual (p. ej. cifras, incluso un solo punto, signos raros o sin letras), se
                pedirá confirmación.
              </p>
              <input
                id="contrato-empresa-texto"
                type="text"
                className="minimal-input"
                placeholder="Escriba la empresa o deje vacío y use la lista"
                value={contratoEmpresa}
                onChange={(e) => setContratoEmpresa(normalizarMientrasEscribeSoloLetras(e.target.value))}
                onBlur={() => setContratoEmpresa((v) => normalizarTextoEmpresaOSuplemento(v))}
                autoComplete="off"
              />
              <label className="minimal-label mt-2 mb-1" htmlFor="contrato-empresa-combo">
                Elegir empresa existente
              </label>
              <AppSelect
                id="contrato-empresa-combo"
                variant="modal"
                className={`minimal-select ${contratoEmpresaCombo ? 'is-selected' : ''}`}
                value={contratoEmpresaCombo}
                onChange={(e) => {
                  const v = e.target.value;
                  setContratoEmpresaCombo(v ? normalizarTextoEmpresaOSuplemento(v) : '');
                }}
              >
                <option value="">— Ninguna (solo texto de arriba) —</option>
                {empresasDesdeContratos.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </AppSelect>
              <p className="text-muted small mt-1 mb-0">
                Valor que se guardará: <strong>{empresaEfectivaModal || '—'}</strong>
              </p>
            </div>

            <div className="minimal-field">
              <label className="minimal-label">Correo de notificación:</label>
              <input
                type="email"
                className="minimal-input"
                placeholder="empresa@dominio.com"
                value={contratoCorreoNotificacion}
                onChange={(e) => setContratoCorreoNotificacion(e.target.value)}
              />
              <small className="text-muted d-block mt-1">
                A este correo se enviará el recordatorio de vencimiento del contrato.
              </small>
            </div>

            <div className="minimal-field">
              <label className="minimal-label">Icono empresa:</label>
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
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => inputIconoEmpresaRef.current?.click()}
                  disabled={!puedeEscribir}
                >
                  Elegir archivo
                </button>
                {!getIconoEmpresa(empresaEfectivaModal) && nombreArchivoIcono && (
                  <small className="text-muted text-truncate">{nombreArchivoIcono}</small>
                )}
              </div>
              <small className="text-muted d-block mt-1">
                Selecciona una imagen (max 1 MB).
              </small>
              {getIconoEmpresa(empresaEfectivaModal) && (
                <div className="d-flex align-items-center gap-2 mt-2">
                  <img src={getIconoEmpresa(empresaEfectivaModal)} alt="" className="contrato-empresa-icon-preview" />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => eliminarIconoEmpresa(empresaEfectivaModal)}
                    disabled={!puedeEscribir}
                  >
                    Quitar icono
                  </button>
                </div>
              )}
            </div>

            <div className="minimal-field">
              <label className="minimal-label">Archivo PDF del contrato:</label>
              <input
                ref={inputPdfContratoRef}
                type="file"
                accept="application/pdf,.pdf"
                className="d-none"
                onChange={manejarPdfContratoChange}
              />
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => inputPdfContratoRef.current?.click()}
                  disabled={!puedeEscribir}
                >
                  {getPdfContrato(contratoNumero) ? 'Cambiar PDF' : 'Agregar PDF'}
                </button>
                {!getPdfContrato(contratoNumero) && nombreArchivoPdf && (
                  <small className="text-muted text-truncate">{nombreArchivoPdf}</small>
                )}
              </div>
              <small className="text-muted d-block mt-1">
                Selecciona un PDF (max 5 MB).
              </small>
              {getPdfContrato(contratoNumero) && (
                <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => abrirPdfContrato(contratoNumero)}
                  >
                    Ver PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => eliminarPdfContrato(contratoNumero)}
                    disabled={!puedeEscribir}
                  >
                    Quitar PDF
                  </button>
                  <small className="text-muted text-truncate">{getPdfContrato(contratoNumero)?.nombre}</small>
                </div>
              )}
            </div>

            <div className="minimal-field">
              <label className="minimal-label" htmlFor="contrato-suplementos-texto">
                Suplementos:
              </label>
              <p className="text-muted small mb-2" style={{ maxWidth: 480 }}>
                Misma regla: <strong>el texto de arriba manda</strong> sobre el desplegable; si el texto está vacío, se aplica
                la opción elegida.
              </p>
              <p className="text-muted small mb-2" style={{ maxWidth: 480 }}>
                Mismas reglas que empresa. Al guardar, si el texto no parece un nombre “puro” (p. ej. cifras, incluso un solo punto, signos raros), se pedirá confirmación.
              </p>
              <input
                id="contrato-suplementos-texto"
                type="text"
                className="minimal-input"
                placeholder="Escriba suplemento(s) o deje vacío y use la lista"
                value={contratoSuplementos}
                onChange={(e) => setContratoSuplementos(normalizarMientrasEscribeSoloLetras(e.target.value))}
                onBlur={() => setContratoSuplementos((v) => normalizarTextoEmpresaOSuplemento(v))}
                autoComplete="off"
              />
              <label className="minimal-label mt-2 mb-1" htmlFor="contrato-suplementos-combo">
                Elegir suplemento existente
              </label>
              <AppSelect
                id="contrato-suplementos-combo"
                variant="modal"
                className={`minimal-select ${contratoSuplementosCombo ? 'is-selected' : ''}`}
                value={contratoSuplementosCombo}
                onChange={(e) => {
                  const v = e.target.value;
                  setContratoSuplementosCombo(v ? normalizarTextoEmpresaOSuplemento(v) : '');
                }}
              >
                <option value="">— Ninguno (solo texto de arriba) —</option>
                {suplementosDesdeContratos.map((s) => (
                  <option key={s} value={s}>
                    {s.length > 120 ? `${s.slice(0, 117)}…` : s}
                  </option>
                ))}
              </AppSelect>
              <p className="text-muted small mt-1 mb-0 text-break">
                Valor que se guardará: <strong>{suplementosEfectivoModal || '—'}</strong>
              </p>
            </div>

            <div className="minimal-field">
              <label className="minimal-label" htmlFor="contrato-vigencia">
                Vigencia:
              </label>
              <input
                id="contrato-vigencia"
                type="number"
                step="0.01"
                className={`minimal-input${mensajeErrorVigencia ? ' border border-danger' : ''}`}
                placeholder="--- años ---"
                value={contratoVigencia}
                onChange={(e) => setContratoVigencia(e.target.value)}
                aria-invalid={mensajeErrorVigencia ? 'true' : 'false'}
                aria-describedby={
                  mensajeErrorVigencia ? 'contrato-vigencia-ayuda contrato-vigencia-error' : 'contrato-vigencia-ayuda'
                }
              />
              <p id="contrato-vigencia-ayuda" className="text-muted small mb-1 mt-1">
                Obligatorio. Duración en años (puede usar decimales, p. ej. 0,5). Debe ser estrictamente mayor que cero; no
                se admite 0 ni valores negativos.
              </p>
              {mensajeErrorVigencia && (
                <p id="contrato-vigencia-error" className="text-danger small mb-0" role="alert">
                  {mensajeErrorVigencia}
                </p>
              )}
            </div>

            <div className="minimal-field">
              <label className="minimal-label">Tipo de contrato:</label>
              <AppSelect
                variant="modal"
                className={`minimal-select ${contratoTipo ? 'is-selected' : ''}`}
                value={contratoTipo}
                onChange={(e) => setContratoTipo(e.target.value)}
              >
                <option value="" disabled hidden>--- Seleccione ---</option>
                <option value="Alimento">Alimento</option>
                <option value="Servicio">Servicio</option>
                <option value="Compra">Compra</option>
                <option value="Otro">Otro</option>
              </AppSelect>
            </div>

            <div className="minimal-field">
              <label className="minimal-label">Fecha de inicio: <span className="text-danger">*</span></label>
              <p className="text-muted small mb-2">
                Si deja el campo vacío, al <strong>guardar</strong> se usará la fecha de hoy. Además, en <strong>Agregar
                contrato</strong> se rellena por defecto con la fecha de hoy para su comodidad.
              </p>
              <input
                type="date"
                className="minimal-input"
                value={contratoFechaInicio}
                onChange={(e) => setContratoFechaInicio(e.target.value)}
                aria-label="Fecha de inicio del contrato; vacía equivale a hoy al guardar"
              />
            </div>
          </div>
        </FormModal>

        {activeSection === 'resumen' && (
          <div className="row g-2 mb-3">
            <div className="col-6 col-md-2">
              <div className="card p-2 h-100"><small className="text-muted">Total</small><h6 className="mb-0">{resumen.total}</h6></div>
            </div>
            <div className="col-6 col-md-2">
              <div className="card p-2 h-100"><small className="text-muted">Activos</small><h6 className="mb-0 text-success">{resumen.activos}</h6></div>
            </div>
            <div className="col-6 col-md-2">
              <div className="card p-2 h-100"><small className="text-muted">Seguimiento</small><h6 className="mb-0 text-primary">{resumen.seguimiento}</h6></div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card p-2 h-100"><small className="text-muted">Por vencer (30 días)</small><h6 className="mb-0 text-warning">{resumen.porVencer}</h6></div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card p-2 h-100"><small className="text-muted">Vencidos</small><h6 className="mb-0 text-danger">{resumen.vencidos}</h6></div>
            </div>
          </div>
        )}

        {activeSection === 'resumen' && (
          <div className="row g-3">
            <div className="col-12 col-lg-7">
              <div className="card p-3">
                <h6 className="mb-3">Alertas prioritarias (&lt;= 30 días)</h6>
                <div className="table-responsive">
                  <table className="table table-data-compact table-sm table-bordered">
                    <thead>
                      <tr>
                        <th>N° Contrato</th>
                        <th>Documento</th>
                        <th>Empresa</th>
                        <th>Estado</th>
                        <th>Días</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contratosCriticos.slice(0, 8).map((c) => (
                        <tr key={c.numero_contrato}>
                          <td>{renderNumeroContrato(c.numero_contrato)}</td>
                          <td className="text-center">{renderCeldaDocumentoPdf(c.numero_contrato)}</td>
                          <td>
                            <div className="d-inline-flex align-items-center gap-2">
                              <AvatarEmpresaClic empresa={c.empresa} />
                              <span>{c.empresa || 'Sin empresa'}</span>
                            </div>
                          </td>
                          <td><span className={`badge ${getBadgeClass(c.estado)}`}>{c.estado}</span></td>
                          <td>{c.diasRestantes}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-contrato-renovar-text"
                              onClick={() => renovarContrato(c)}
                              disabled={!puedeEscribir}
                            >
                              Renovar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {contratosCriticos.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-muted">Sin alertas críticas.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-5">
              <div className="card p-3 mb-3">
                <h6 className="mb-2">Top empresas por volumen contractual</h6>
                {topEmpresas.map((e) => (
                  <div key={e.empresa} className="d-flex justify-content-between border-bottom py-1">
                    <span className="d-inline-flex align-items-center gap-2">
                      <AvatarEmpresaClic empresa={e.empresa} />
                      <span>{e.empresa}</span>
                    </span>
                    <strong>{e.cantidad}</strong>
                  </div>
                ))}
                {topEmpresas.length === 0 && <small className="text-muted">Sin datos.</small>}
              </div>
              <div className="card p-3">
                <h6 className="mb-2">Riesgo operativo</h6>
                <p className="mb-1">Contratos vencidos: <strong className="text-danger">{resumen.vencidos}</strong></p>
                <p className="mb-1">Contratos por vencer: <strong className="text-warning">{resumen.porVencer}</strong></p>
                <p className="mb-0">Se recomienda seguimiento semanal de renovaciones.</p>
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
                      <th>N° Contrato</th><th>Tipo</th><th>Empresa</th><th>Vigencia</th><th>Fecha Inicio</th><th>Fecha Fin</th><th>Estado</th><th>Días</th><th>Documento</th><th className="contratos-th-actions">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contratosFiltrados.map((con, index) => {
                      const rowId = buildContratoRowId(con, index);
                      const isSelected = contratoSeleccionado === rowId;
                      return (
                      <tr key={rowId} className={isSelected ? 'contratos-row-selected' : ''}>
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
                        <td>{con.proveedor_cliente ? 'Proveedor' : 'Cliente'}</td>
                        <td>
                          <div className="d-inline-flex align-items-center gap-2">
                            <AvatarEmpresaClic empresa={con.empresa} />
                            <span>{con.empresa || 'Sin empresa'}</span>
                          </div>
                        </td>
                        <td>{con.vigencia != null && String(con.vigencia).trim() !== '' ? `${con.vigencia} años` : '—'}</td>
                        <td>{toISODate(con.fecha_inicio)}</td>
                        <td>{toISODate(con.fecha_fin)}</td>
                        <td><span className={`badge ${getBadgeClass(con.estado)}`}>{con.estado}</span></td>
                        <td>{con.diasRestantes == null ? '-' : con.diasRestantes < 0 ? `-${Math.abs(con.diasRestantes)}` : con.diasRestantes}</td>
                        <td className="text-center">{renderCeldaDocumentoPdf(con.numero_contrato)}</td>
                        <td className="contratos-td-actions">
                          <div className="d-inline-flex align-items-center gap-1 flex-nowrap">
                            <EditTableActionButton onClick={() => editarContratoTabla(con)} />
                            <RenewTableActionButton onClick={() => renovarContrato(con)} />
                            <DeleteTableActionButton onClick={() => deleteContrato(con)} />
                          </div>
                        </td>
                      </tr>
                    );})}
                    {contratosFiltrados.length === 0 && (
                      <tr><td colSpan={10} className="text-center text-muted py-3">No se encontraron contratos con los filtros aplicados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
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
                      <td className="text-center">{renderCeldaDocumentoPdf(c.numero_contrato)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-contrato-renovar-text"
                          onClick={() => renovarContrato(c)}
                          disabled={!puedeEscribir}
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
                          onClick={() => {
                            setSearchTerm('');
                            setRenovFechaDesde('');
                            setRenovFechaHasta('');
                            setActiveSection('contratos');
                          }}
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
                          onClick={() => {
                            setSearchTerm('');
                            setRenovFechaDesde('');
                            setRenovFechaHasta('');
                            setActiveSection('contratos');
                          }}
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
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={renovarVencidosMasivo}
                      >
                        Renovar vencidos
                      </button>
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
                                <td className="text-center align-middle">{renderCeldaDocumentoPdf(c.numero_contrato)}</td>
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
                                <td className="renov-cola-td-accion position-relative">
                                  <div className="d-flex flex-column gap-1 renov-actions">
                                    <div className="d-flex align-items-stretch gap-1 renov-actions__row-renovar">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-primary flex-grow-1 d-inline-flex align-items-center justify-content-center"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          intentarRenovarDesdeCola(c);
                                        }}
                                        title={!puedeEscribir ? 'Solo consulta' : 'Abrir asistente de renovación'}
                                        aria-label={`Renovar contrato ${c.numero_contrato}`}
                                        style={!puedeEscribir ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
                                      >
                                        Renovar
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm renov-actions__eye"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          verDetalleContrato(c);
                                        }}
                                        title="Ver datos del contrato"
                                        aria-label={`Ver detalles del contrato ${c.numero_contrato}`}
                                      >
                                        <i className="bi bi-eye-fill" aria-hidden="true" />
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary renov-actions__row-reminder"
                                      onClick={() => enviarRecordatorioContrato(c)}
                                      title="Enviar recordatorio por correo"
                                    >
                                      <i className="bi bi-envelope-fill me-1" aria-hidden="true" />
                                      Enviar Rec
                                    </button>
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
                      Extractos para auditoría y exportación: composición por tipo y rol comercial. Las tendencias por mes de vencimiento y el donut por estado están en{' '}
                      <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => irASeccion('renovaciones')}>
                        Renovaciones
                      </button>
                      {' '}— aquí no se duplican.
                    </p>
                  </div>
                  <div className="reportes-kpi-inline d-flex flex-wrap gap-2">
                    <span className="reportes-kpi-pill">
                      <span className="reportes-kpi-pill__label">Contratos (filtro)</span>
                      <strong>{contratosFiltradosReporte.length}</strong>
                    </span>
                    <span className="reportes-kpi-pill reportes-kpi-pill--warn">
                      <span className="reportes-kpi-pill__label">Pendientes datos</span>
                      <strong>{reporteCalidadDatos.sinCorreo + reporteCalidadDatos.sinPdf}</strong>
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
                      <option value="Alimento">Alimento</option>
                      <option value="Servicio">Servicio</option>
                      <option value="Compra">Compra</option>
                      <option value="Otro">Otro</option>
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
                    <strong>Resumen</strong> muestra KPI globales; <strong>Renovaciones</strong> muestra cola operativa y estadísticas por mes. <strong>Reportes</strong> se centra en tipo/parte comercial, calidad de archivo y vista previa del CSV.
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
                                { value: resumen.activos, color: '#14532d', label: 'Activos' },
                                { value: resumen.porVencer + resumen.seguimiento, color: '#ffc107', label: 'Seguimiento / próx.' },
                                { value: resumen.vencidos, color: '#dc3545', label: 'Vencidos' },
                              ]}
                              total={resumen.total}
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
                      Mismas columnas que Excel/CSV (correo, suplementos, tipo normalizado, fechas DD/MM/AAAA). Para gráficos por mes usa{' '}
                      <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => irASeccion('renovaciones')}>Renovaciones</button>.
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
                            const p = getPdfContrato(c.numero_contrato);
                            const finEs = fechaParaExportEs(c.fecha_fin);
                            return (
                              <tr key={c.numero_contrato}>
                                <td className="text-nowrap fw-semibold">{c.numero_contrato}</td>
                                <td className="text-truncate" style={{ maxWidth: '8rem' }} title={c.empresa || ''}>{c.empresa || '—'}</td>
                                <td className="text-truncate small" style={{ maxWidth: '9rem' }} title={String(c.correo_notificacion || '')}>{c.correo_notificacion?.trim() || '—'}</td>
                                <td className="small">{etiquetaTipoContratoLegible(c.tipo_contrato) || '—'}</td>
                                <td>{c.proveedor_cliente ? 'Prov.' : 'Cli.'}</td>
                                <td>{c.estado}</td>
                                <td className="text-nowrap">{finEs || '—'}</td>
                                <td className="text-center small">{p ? 'Sí' : '—'}</td>
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

      {hasDocument && pdfVistaPrevia != null && createPortal(
        <div
          className="contrato-pdf-preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Vista previa del PDF del contrato ${pdfVistaPrevia.numero}`}
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
                <strong className="contrato-pdf-preview-title">Contrato {pdfVistaPrevia.numero}</strong>
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
                  aria-label={pdfVistaMaximizada ? 'Restaurar tamaño visor PDF' : 'Maximizar visor PDF'}
                  title={pdfVistaMaximizada ? 'Restaurar' : 'Maximizar'}
                >
                  <i className={`bi ${pdfVistaMaximizada ? 'bi-fullscreen-exit' : 'bi-fullscreen'}`} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="contrato-pdf-preview-close"
                  onClick={() => {
                    setPdfVistaPrevia(null);
                    setPdfVistaMaximizada(false);
                    setPdfHasCustomPos(false);
                    setPdfDragging(false);
                  }}
                  aria-label="Cerrar visor PDF"
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="contrato-pdf-preview-body">
              <iframe
                key={`${pdfVistaPrevia.numero}-${pdfVistaMaximizada ? 'max' : 'min'}-${pdfRenderNonce}`}
                src={buildPdfViewerSrc(pdfVistaPrevia, pdfVistaMaximizada, pdfRenderNonce)}
                title={`PDF del contrato ${pdfVistaPrevia.numero}`}
                className="contrato-pdf-preview-iframe"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

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
        <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="700" fill="#000000">
          {total}
        </text>
        <text x="50%" y="62%" textAnchor="middle" dominantBaseline="central" fontSize="10" fill="#495057">
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
