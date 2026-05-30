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
  'Vigencia (años)',
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
  'Vigencia (años)',
  'Fecha inicio',
  'Fecha fin',
  'Eliminado por',
  'Fecha baja',
  'Retención hasta',
  'Días restantes retención',
  'Nº PDFs',
  'Motivo',
];

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');

function GestionContratos({ vistaInicial = 'contratos', onSectionChange }) {
  const EMPRESA_ICONOS_STORAGE_KEY = 'contratos_empresa_iconos_v1';
  const CONTRATOS_PDF_STORAGE_KEY = 'contratos_pdf_archivos_v1';
  const [contratoNumero, setContratoNumero] = useState('');
  const [contratoNumeroOriginal, setContratoNumeroOriginal] = useState('');
  const [contratoProveedorCliente, setContratoProveedorCliente] = useState(false);
  const [contratoEmpresa, setContratoEmpresa] = useState('');
  const [contratoCorreoNotificacion, setContratoCorreoNotificacion] = useState('');
  const [contratoSuplementos, setContratoSuplementos] = useState('');
  const [contratoVigencia, setContratoVigencia] = useState('');
  const [contratoTipo, setContratoTipo] = useState('');
  const [contratoFechaInicio, setContratoFechaInicio] = useState('');
  const [contratoFechaFin, setContratoFechaFin] = useState('');
  const [contratoVencido, setContratoVencido] = useState(false);
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
  const [archivoList, setArchivoList] = useState([]);
  const [archivoLoading, setArchivoLoading] = useState(false);
  const [archivoBusqueda, setArchivoBusqueda] = useState('');
  const [archivoAnio, setArchivoAnio] = useState('');
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
  const [pdfMenuContrato, setPdfMenuContrato] = useState(null);
  const [pdfMenuPos, setPdfMenuPos] = useState(null);
  const inputPdfContratoRef = useRef(null);
  const pdfModalRef = useRef(null);
  const hasDocument = typeof document !== 'undefined';

  const getContratos = () => {
    Axios.get(`${API_BASE}/contratos`)
      .then((response) => setContratos(response.data))
      .catch((error) => console.error('Error al cargar contratos:', error));
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

  const syncPdfsServidor = async (numeroContrato) => {
    const pdfs = getPdfsContrato(numeroContrato);
    if (!pdfs.length) return;
    await Axios.post(`${API_BASE}/contratos/${encodeURIComponent(numeroContrato)}/documentos`, {
      documentos: pdfs.map((p) => ({
        nombre: p.nombre,
        dataUrl: p.dataUrl,
        clienteId: p.id,
      })),
    });
  };

  useEffect(() => {
    getContratos();
  }, []);

  useEffect(() => {
    if (activeSection !== 'archivo') return;
    cargarArchivo();
  }, [activeSection, archivoBusqueda, archivoAnio]);

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

  const generarPdfId = () => `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const normalizarListaPdfs = (entry) => {
    if (!entry) return [];
    if (Array.isArray(entry)) {
      return entry
        .map((p, idx) => ({
          id: String(p?.id || `legacy_${idx}`),
          dataUrl: String(p?.dataUrl || ''),
          nombre: String(p?.nombre || `Contrato_${idx + 1}.pdf`),
        }))
        .filter((p) => p.dataUrl);
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

  const getPdfsContrato = (numeroContrato) => {
    const key = normalizarNumeroContratoKey(numeroContrato);
    if (!key) return [];
    return normalizarListaPdfs(contratoPdfs[key]);
  };

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
      [key]: pdfs,
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

  const eliminarPdfContrato = (numeroContrato, pdfId = null) => {
    const key = normalizarNumeroContratoKey(numeroContrato);
    if (!key || !contratoPdfs[key]) return;
    if (!pdfId) {
      const nextPdfs = { ...contratoPdfs };
      delete nextPdfs[key];
      persistirPdfsContrato(nextPdfs);
      setNombreArchivoPdf('');
      return;
    }
    const filtrados = getPdfsContrato(numeroContrato).filter((p) => p.id !== pdfId);
    guardarPdfsListaContrato(numeroContrato, filtrados);
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

  const abrirPdfContrato = (numeroContrato, pdfItem = null) => {
    const pdf = pdfItem || getPdfContrato(numeroContrato);
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
    setPdfMenuContrato(null);
    setPdfMenuPos(null);
  };

  useEffect(() => {
    if (!pdfMenuContrato) return undefined;
    const onDocClick = () => {
      setPdfMenuContrato(null);
      setPdfMenuPos(null);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [pdfMenuContrato]);

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
    const pdfs = getPdfsContrato(numeroContrato);
    const numeroNorm = String(numeroContrato || '').trim();
    const isPdfAbierto = pdfVistaPrevia != null && String(pdfVistaPrevia.numero || '').trim() === numeroNorm;
    if (!pdfs.length) {
      return <span className="text-muted">—</span>;
    }
    if (pdfs.length === 1) {
      const pdf = pdfs[0];
      return (
        <div className="d-flex align-items-center justify-content-center">
          <button
            type="button"
            className={`btn btn-link p-0 contratos-pdf-inline${isPdfAbierto ? ' contratos-pdf-inline--active' : ''}`}
            title={pdf.nombre || `Ver PDF del contrato ${numeroContrato}`}
            aria-label={`Ver PDF del contrato ${numeroContrato}`}
            onClick={() => abrirPdfContrato(numeroContrato, pdf)}
          >
            <i className="bi bi-file-earmark-pdf-fill" aria-hidden="true" />
          </button>
          <span className="ms-1">Pdf</span>
        </div>
      );
    }
    const menuAbierto = pdfMenuContrato === numeroNorm;
    return (
      <div
        className="contratos-pdf-picker position-relative d-inline-flex align-items-center justify-content-center"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={`btn btn-link p-0 contratos-pdf-inline contratos-pdf-inline--multi${isPdfAbierto ? ' contratos-pdf-inline--active' : ''}`}
          title={`${pdfs.length} PDFs — elegir cuál abrir`}
          aria-label={`Ver PDFs del contrato ${numeroContrato}`}
          aria-expanded={menuAbierto}
          onClick={(e) => {
            if (menuAbierto) {
              setPdfMenuContrato(null);
              setPdfMenuPos(null);
              return;
            }
            const rect = e.currentTarget.getBoundingClientRect();
            setPdfMenuPos({ top: rect.bottom + 4, left: rect.left });
            setPdfMenuContrato(numeroNorm);
          }}
        >
          <i className="bi bi-file-earmark-pdf-fill" aria-hidden="true" />
          <span className="contratos-pdf-picker__count">{pdfs.length}</span>
        </button>
        <span className="ms-1">{pdfs.length} PDFs</span>
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
          setNombreArchivoPdf(
            files.length === 1 ? files[0].name : `${files.length} archivos agregados`
          );
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const sumarTiempoConVigencia = (fechaStr, vigenciaValor) => {
    if (!fechaStr) return fechaStr;
    const fecha = new Date(fechaStr + 'T00:00:00');

    let vigencia = parseFloat(vigenciaValor);
    if (Number.isNaN(vigencia)) return '';
    let entero = Math.trunc(vigencia);
    let decimal = vigencia - Math.trunc(vigencia);

    fecha.setFullYear(fecha.getFullYear() + entero);

    let diasDecimal = decimal * 365.25;
    let ParteEnteraDe_diasDecimal = Math.trunc(diasDecimal);
    console.log('cantidad de dias' + diasDecimal);

    fecha.setDate(fecha.getDate() + ParteEnteraDe_diasDecimal);

    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const sumarTiempo = (fechaStr) => sumarTiempoConVigencia(fechaStr, contratoVigencia);

  const toISODate = (value) => {
    if (!value) return '';
    return String(value).slice(0, 10);
  };

  const diasParaVencer = (fechaFin) => {
    if (!fechaFin) return null;
    const fin = new Date(`${toISODate(fechaFin)}T00:00:00`);
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
    const pdfs = getPdfsContrato(contratoNumero);
    setNombreArchivoPdf(
      pdfs.length === 0 ? '' : pdfs.length === 1 ? pdfs[0].nombre : `${pdfs.length} PDFs adjuntos`
    );
  }, [contratoNumero, contratoPdfs]);

  const limpiarContrato = () => {
    setContratoNumero('');
    setContratoNumeroOriginal('');
    setContratoProveedorCliente(false);
    setContratoEmpresa('');
    setContratoCorreoNotificacion('');
    setContratoSuplementos('');
    setContratoVigencia('');
    setContratoTipo('');
    setContratoFechaInicio('');
    setContratoFechaFin('');
    setContratoVencido(false);
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
  };

  const guardarContratoModal = () => {
    if (editarContrato) updateContrato();
    else addContrato();
  };

  const addContrato = () => {
    const nuevaFechaFin = sumarTiempo(contratoFechaInicio);
    const vencidoCalc = diasParaVencer(nuevaFechaFin) != null && diasParaVencer(nuevaFechaFin) < 0 ? 1 : 0;

    const bodyCreate = {
      numero_contrato: contratoNumero,
      proveedor_cliente: contratoProveedorCliente ? 1 : 0,
      empresa: contratoEmpresa,
      correo_notificacion: contratoCorreoNotificacion ? String(contratoCorreoNotificacion).trim() : null,
      suplementos: contratoSuplementos,
      vigencia: contratoVigencia,
      tipo_contrato: contratoTipo,
      fecha_inicio: contratoFechaInicio,
      fecha_fin: nuevaFechaFin,
      vencido: vencidoCalc,
    };
    Axios.post(`${API_BASE}/create-contrato`, bodyCreate)
      .then(async () => {
        try {
          await syncPdfsServidor(contratoNumero);
        } catch (syncErr) {
          console.warn('PDFs no sincronizados al servidor:', syncErr);
        }
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

  const updateContrato = () => {
    const nuevaFechaFin = sumarTiempo(contratoFechaInicio);
    const vencidoCalc = diasParaVencer(nuevaFechaFin) != null && diasParaVencer(nuevaFechaFin) < 0 ? 1 : 0;
    const numeroNuevo = String(contratoNumero || '').trim();
    const numeroOriginalRaw = contratoNumeroOriginal ?? '';
    const numeroOriginal = String(numeroOriginalRaw).trim();

    if (!numeroNuevo) {
      Swal.fire('Número requerido', 'El N° de contrato no puede quedar vacío.', 'warning');
      return;
    }

    const numOriginalSeguro = String(contratoNumeroOriginal ?? numeroNuevo ?? '').trim() || numeroNuevo;
    const bodyUpdate = {
      numero_contrato: numeroNuevo,
      numero_contrato_original: numOriginalSeguro,
      proveedor_cliente: contratoProveedorCliente ? 1 : 0,
      empresa: contratoEmpresa,
      correo_notificacion: contratoCorreoNotificacion ? String(contratoCorreoNotificacion).trim() : null,
      suplementos: contratoSuplementos,
      vigencia: contratoVigencia,
      tipo_contrato: contratoTipo,
      fecha_inicio: contratoFechaInicio,
      fecha_fin: nuevaFechaFin,
      vencido: vencidoCalc,
    };
    Axios.put(`${API_BASE}/update-contrato`, bodyUpdate)
      .then(async () => {
        try {
          await syncPdfsServidor(numeroNuevo);
        } catch (syncErr) {
          console.warn('PDFs no sincronizados al servidor:', syncErr);
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

  const archivarContrato = (val) => {
    Swal.fire({
      title: '¿Archivar contrato?',
      html: 'El contrato se archivará por <strong>5 años</strong> (datos y PDFs en servidor) y dejará de aparecer en la lista activa.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, archivar',
      cancelButtonText: 'Cancelar',
      input: 'text',
      inputPlaceholder: 'Motivo de baja (opcional)',
      inputAttributes: { maxlength: 500 },
    }).then((result) => {
      if (!result.isConfirmed) return;
      const pdfs = getPdfsContrato(val.numero_contrato);
      Axios.post(`${API_BASE}/contratos/${encodeURIComponent(val.numero_contrato)}/archivar`, {
        motivo: result.value ? String(result.value).trim() : null,
        documentos: pdfs.map((p) => ({ id: p.id, nombre: p.nombre, dataUrl: p.dataUrl })),
      })
        .then(() => {
          eliminarPdfContrato(val.numero_contrato);
          getContratos();
          Swal.fire('Archivado', 'Contrato archivado por 5 años.', 'success');
        })
        .catch((error) => {
          Swal.fire('Error', error.response?.data?.message || error.message, 'error');
        });
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
            <p><strong>Vigencia:</strong> ${det.vigencia ?? '-'} año(s)</p>
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
      const vig = a.vigencia;
      const vigCell = vig === '' || vig == null ? '' : Number(vig);
      const dias = a.dias_restantes_retencion;
      return [
        a.numero_contrato,
        Number(a.proveedor_cliente) === 1 ? 'Proveedor' : 'Cliente',
        String(a.empresa || '').trim(),
        etiquetaTipoContratoLegible(a.tipo_contrato),
        vigCell === '' || Number.isNaN(vigCell) ? '' : vigCell,
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

  const aniosArchivoOpciones = useMemo(() => {
    const set = new Set();
    archivoList.forEach((a) => {
      if (a.eliminado_en) set.add(String(new Date(a.eliminado_en).getFullYear()));
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [archivoList]);

  const editarContratoTabla = (val) => {
    setEditarContrato(true);
    setContratoNumero(val.numero_contrato);
    setContratoNumeroOriginal(val.numero_contrato);
    setContratoProveedorCliente(val.proveedor_cliente === 1);
    setContratoEmpresa(val.empresa);
    setContratoCorreoNotificacion(val.correo_notificacion || '');
    setContratoSuplementos(val.suplementos || '');
    setContratoVigencia(val.vigencia);
    setContratoTipo(val.tipo_contrato);
    const fechaInicio = val.fecha_inicio ? val.fecha_inicio.substring(0, 10) : '';
    setContratoFechaInicio(fechaInicio);
    setContratoFechaFin(val.fecha_fin ? val.fecha_fin.substring(0, 10) : '');
    setContratoVencido(val.vencido === 1);
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

      Axios.put('http://localhost:3001/update-contrato', {
        numero_contrato: contrato.numero_contrato,
        proveedor_cliente: contrato.proveedor_cliente ? 1 : 0,
        empresa: contrato.empresa,
        correo_notificacion: contrato.correo_notificacion || null,
        suplementos: contrato.suplementos || '',
        vigencia: contrato.vigencia,
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
    contratosEnriquecidos.forEach((c) => {
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

  const cockpitCalidadGlobal = useMemo(() => {
    const total = contratosEnriquecidos.length;
    if (total === 0) {
      return { sinCorreo: 0, sinPdf: 0, pctDocumental: 100, total: 0 };
    }
    const sinCorreo = contratosEnriquecidos.filter((c) => !String(c.correo_notificacion || '').trim()).length;
    const sinPdf = contratosEnriquecidos.filter((c) => getPdfsContrato(c.numero_contrato).length === 0).length;
    const pctDocumental = Math.round(((total - sinCorreo + total - sinPdf) / (total * 2)) * 100);
    return { sinCorreo, sinPdf, pctDocumental, total };
  }, [contratosEnriquecidos, contratoPdfs]);

  const cockpitSalud = useMemo(() => {
    const total = resumen.total || 1;
    const pctVencidos = (resumen.vencidos / total) * 100;
    const pctPorVencer = (resumen.porVencer / total) * 100;
    const gapDoc = 100 - cockpitCalidadGlobal.pctDocumental;
    const penalty = pctVencidos * 2 + pctPorVencer * 0.8 + gapDoc * 0.5;
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
    contratosEnriquecidos.forEach((c) => {
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
  }, [contratosEnriquecidos]);

  const cockpitConcentracion = useMemo(() => {
    if (resumen.total === 0 || topEmpresas.length === 0) return null;
    const top = topEmpresas[0];
    const pct = Math.round((top.cantidad / resumen.total) * 100);
    if (pct < 35) return null;
    return { empresa: top.empresa, cantidad: top.cantidad, pct };
  }, [topEmpresas, resumen.total]);

  const cockpitTimeline = useMemo(() => {
    return contratosEnriquecidos
      .filter((c) => c.diasRestantes != null && c.diasRestantes >= 0 && c.diasRestantes <= 90)
      .sort((a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999))
      .slice(0, 10);
  }, [contratosEnriquecidos]);

  const cockpitAcciones = useMemo(() => {
    const items = [];
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
  }, [resumen, contratosVencidos, contratosCriticos, cockpitCalidadGlobal]);

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
    const sinPdf = list.filter((c) => getPdfsContrato(c.numero_contrato).length === 0).length;
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
            const nuevaFechaFin = sumarTiempoConVigencia(baseInicio, contrato.vigencia);
            return Axios.put('http://localhost:3001/update-contrato', {
              numero_contrato: contrato.numero_contrato,
              proveedor_cliente: contrato.proveedor_cliente ? 1 : 0,
              empresa: contrato.empresa,
              correo_notificacion: contrato.correo_notificacion || null,
              suplementos: contrato.suplementos || '',
              vigencia: contrato.vigencia,
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

  const ejecutarAccionCockpit = (key) => {
    switch (key) {
      case 'vencidos':
      case 'vencidos-antiguos':
        verTodosVencidos();
        break;
      case 'por-vencer':
        verTodosPorVencer();
        break;
      case 'sin-pdf':
      case 'sin-correo':
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
    Swal.fire({
      title: `Contrato ${contrato.numero_contrato}`,
      html: `
        <div style="text-align:left">
          <p><strong>Empresa:</strong> ${contrato.empresa || '-'}</p>
          <p><strong>Correo notificación:</strong> ${contrato.correo_notificacion || '-'}</p>
          <p><strong>Tipo:</strong> ${contrato.tipo_contrato || '-'}</p>
          <p><strong>Vigencia:</strong> ${contrato.vigencia || '-'} año(s)</p>
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
      const vig = c.vigencia;
      const vigCell = vig === '' || vig == null ? '' : Number(vig);
      return [
        c.numero_contrato,
        c.proveedor_cliente ? 'Proveedor' : 'Cliente',
        String(c.empresa || '').trim(),
        String(c.correo_notificacion || '').trim(),
        etiquetaTipoContratoLegible(c.tipo_contrato),
        vigCell === '' || Number.isNaN(vigCell) ? '' : vigCell,
        String(c.suplementos || '').replace(/\s+/g, ' ').trim(),
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
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const fechaTxt = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(20, 83, 45);
      doc.text('Reporte de contratacion', 14, 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(66, 66, 66);
      doc.text(`Generado: ${fechaTxt}  |  Registros: ${dataRows.length}`, 14, 20);

      const truncar = (val, max = 420) => {
        const s = val === null || val === undefined ? '' : String(val);
        return s.length > max ? `${s.slice(0, max - 3)}...` : s;
      };

      const body = dataRows.map((row) => row.map((cell) => truncar(cell)));

      autoTable(doc, {
        head: [REPORTE_EXCEL_HEADERS.map((h) => truncar(h, 80))],
        body,
        startY: 24,
        styles: {
          fontSize: 6,
          cellPadding: 0.8,
          overflow: 'linebreak',
          valign: 'middle',
          lineColor: [220, 226, 232],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [20, 83, 45],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 6.5,
        },
        alternateRowStyles: { fillColor: [248, 250, 249] },
        margin: { left: 10, right: 10 },
        tableWidth: 'auto',
        horizontalPageBreak: true,
        showHead: 'everyPage',
        theme: 'grid',
      });

      doc.save(`reporte_contratos_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'Error al generar PDF',
        text: String(e?.message || e),
      });
    }
  };

  const seccionLabel = {
    resumen: 'Resumen',
    contratos: 'Contratos',
    vencimientos: 'Vencimientos',
    renovaciones: 'Renovaciones',
    reportes: 'Reportes',
    archivo: 'Archivo histórico',
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
            >
              <i className="bi bi-plus-lg me-2" aria-hidden="true" />
              Agregar contrato
            </button>
          )}
          {activeSection === 'reportes' && (
            <div className="d-flex flex-wrap align-items-center gap-2 justify-content-end reportes-top-actions">
              <button type="button" className="btn btn-danger btn-sm d-inline-flex align-items-center text-white" onClick={exportarReportePdf} title="Tabla con los mismos datos que Excel">
                <i className="bi bi-file-earmark-pdf me-1" aria-hidden="true" />
                PDF
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center" onClick={() => Swal.fire({ icon: 'info', title: 'Programar envío', text: 'Podrás programar el envío del reporte por correo en una próxima versión.' })}>
                <i className="bi bi-calendar-event me-1" aria-hidden="true" />
                Programar
              </button>
              <button type="button" className="btn btn-sm reportes-export-btn-csv d-inline-flex align-items-center text-white" onClick={exportarReporteCsvUtf8} title="Mismas columnas que Excel; separador ; y UTF-8">
                <i className="bi bi-filetype-csv me-1" aria-hidden="true" />
                CSV
              </button>
              <button type="button" className="btn btn-primary contratos-btn-primary d-inline-flex align-items-center" onClick={exportarReporteExcel}>
                <i className="bi bi-file-earmark-spreadsheet me-2" aria-hidden="true" />
                Exportar Excel
              </button>
            </div>
          )}
          {activeSection === 'archivo' && (
            <div className="d-flex flex-wrap align-items-center gap-2 justify-content-end reportes-top-actions">
              <button type="button" className="btn btn-sm reportes-export-btn-csv d-inline-flex align-items-center text-white" onClick={exportarArchivoCsvUtf8}>
                <i className="bi bi-filetype-csv me-1" aria-hidden="true" />
                CSV
              </button>
              <button type="button" className="btn btn-primary contratos-btn-primary d-inline-flex align-items-center" onClick={exportarArchivoExcel}>
                <i className="bi bi-file-earmark-spreadsheet me-2" aria-hidden="true" />
                Exportar Excel
              </button>
            </div>
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
        >
          <div className="minimal-form-stack">
            <div className="minimal-field">
              <label className="minimal-label">No. Contrato:</label>
              <input
                type="text"
                className="minimal-input"
                placeholder="------------------------"
                value={contratoNumero}
                onChange={(e) => setContratoNumero(e.target.value)}
              />
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

            <div className="minimal-field">
              <label className="minimal-label">Empresa:</label>
              <input
                type="text"
                className="minimal-input"
                placeholder="------------------------"
                value={contratoEmpresa}
                onChange={(e) => setContratoEmpresa(e.target.value)}
              />
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
                >
                  Elegir archivo
                </button>
                {!getIconoEmpresa(contratoEmpresa) && nombreArchivoIcono && (
                  <small className="text-muted text-truncate">{nombreArchivoIcono}</small>
                )}
              </div>
              <small className="text-muted d-block mt-1">
                Selecciona una imagen (max 1 MB).
              </small>
              {getIconoEmpresa(contratoEmpresa) && (
                <div className="d-flex align-items-center gap-2 mt-2">
                  <img src={getIconoEmpresa(contratoEmpresa)} alt="" className="contrato-empresa-icon-preview" />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => eliminarIconoEmpresa(contratoEmpresa)}
                  >
                    Quitar icono
                  </button>
                </div>
              )}
            </div>

            <div className="minimal-field">
              <label className="minimal-label">Archivos PDF del contrato:</label>
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
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => inputPdfContratoRef.current?.click()}
                >
                  Agregar PDF(s)
                </button>
                {nombreArchivoPdf && (
                  <small className="text-muted text-truncate">{nombreArchivoPdf}</small>
                )}
              </div>
              <small className="text-muted d-block mt-1">
                Puedes seleccionar uno o varios PDF (max 5 MB cada uno).
              </small>
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
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => abrirPdfContrato(contratoNumero, pdf)}
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => eliminarPdfContrato(contratoNumero, pdf.id)}
                        >
                          Quitar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="minimal-field">
              <label className="minimal-label">Suplementos:</label>
              <input
                type="text"
                className="minimal-input"
                placeholder="------------------------"
                value={contratoSuplementos}
                onChange={(e) => setContratoSuplementos(e.target.value)}
              />
            </div>

            <div className="minimal-field">
              <label className="minimal-label">Vigencia:</label>
              <input
                type="number"
                step="0.01"
                className="minimal-input"
                placeholder="--- años ---"
                value={contratoVigencia}
                onChange={(e) => setContratoVigencia(e.target.value)}
              />
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
              <label className="minimal-label">Fecha de inicio:</label>
              <input
                type="date"
                className="minimal-input"
                value={contratoFechaInicio}
                onChange={(e) => setContratoFechaInicio(e.target.value)}
              />
            </div>
          </div>
        </FormModal>

        {activeSection === 'resumen' && (
          <div className="resumen-cockpit">
            <div className="row g-3 mb-3">
              <div className="col-12 col-xl-4">
                <div className="card resumen-salud-card p-3 h-100 border-0 shadow-sm">
                  <h6 className="fw-bold mb-3 resumen-cockpit__title">Salud de cartera</h6>
                  <div className={`resumen-semaforo resumen-semaforo--${cockpitSalud.nivel}`}>
                    <span className="resumen-semaforo__score">{cockpitSalud.score}</span>
                    <span className="resumen-semaforo__label">{cockpitSalud.label}</span>
                  </div>
                  <div className="row g-2 mt-3 resumen-kpi-mini">
                    <div className="col-6">
                      <small className="text-muted d-block">Total</small>
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
                  {(cockpitCalidadGlobal.sinCorreo > 0 || cockpitCalidadGlobal.sinPdf > 0) && (
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
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => irASeccion('renovaciones')}>
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
                            <DeleteTableActionButton onClick={() => archivarContrato(con)} />
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
                                <td>
                                  <div className="d-flex flex-column gap-1 renov-actions">
                                    <div className="d-flex align-items-stretch gap-1 renov-actions__row-renovar">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-primary d-inline-flex align-items-center justify-content-center"
                                        onClick={() => renovarContrato(c)}
                                      >
                                        Renovar
                                      </button>
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
                                <td className="text-truncate small" style={{ maxWidth: '9rem' }} title={String(c.correo_notificacion || '')}>{c.correo_notificacion?.trim() || '—'}</td>
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
                                  className="btn btn-outline-primary btn-sm"
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

      {hasDocument && pdfMenuContrato && pdfMenuPos && createPortal(
        <ul
          className="contratos-pdf-picker__menu contratos-pdf-picker__menu--fixed list-unstyled mb-0"
          style={{ top: pdfMenuPos.top, left: pdfMenuPos.left }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {getPdfsContrato(pdfMenuContrato).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="contratos-pdf-picker__item"
                onClick={() => abrirPdfContrato(pdfMenuContrato, p)}
              >
                <i className="bi bi-file-earmark-pdf me-1 flex-shrink-0" aria-hidden="true" />
                <span className="text-truncate">{p.nombre}</span>
              </button>
            </li>
          ))}
        </ul>,
        document.body
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
