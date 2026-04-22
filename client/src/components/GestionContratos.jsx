import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import { FormModal } from './FormModal';

function GestionContratos({ vistaInicial = 'contratos' }) {
  const EMPRESA_ICONOS_STORAGE_KEY = 'contratos_empresa_iconos_v1';
  const [contratoNumero, setContratoNumero] = useState('');
  const [contratoProveedorCliente, setContratoProveedorCliente] = useState(false);
  const [contratoEmpresa, setContratoEmpresa] = useState('');
  const [contratoSuplementos, setContratoSuplementos] = useState('');
  const [contratoVigencia, setContratoVigencia] = useState('');
  const [contratoTipo, setContratoTipo] = useState('');
  const [contratoFechaInicio, setContratoFechaInicio] = useState('');
  const [contratoDia, setContratoDia] = useState('');
  const [contratoMes, setContratoMes] = useState('');
  const [contratoAnio, setContratoAnio] = useState('');
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
  const [activeSection, setActiveSection] = useState(vistaInicial);
  const [renovFechaDesde, setRenovFechaDesde] = useState('');
  const [renovFechaHasta, setRenovFechaHasta] = useState('');
  const [pasoRenovacion, setPasoRenovacion] = useState(1);
  const [empresaIconos, setEmpresaIconos] = useState({});
  const [empresaVistaPrevia, setEmpresaVistaPrevia] = useState(null);

  const getContratos = () => {
    Axios.get('http://localhost:3001/contratos')
      .then((response) => setContratos(response.data))
      .catch((error) => console.error('Error al cargar contratos:', error));
  };

  useEffect(() => {
    getContratos();
  }, []);

  useEffect(() => {
    if (contratoDia && contratoMes && contratoAnio) {
      setContratoFechaInicio(`${contratoAnio}-${String(contratoMes).padStart(2, '0')}-${String(contratoDia).padStart(2, '0')}`);
    } else {
      setContratoFechaInicio('');
    }
  }, [contratoDia, contratoMes, contratoAnio]);

  useEffect(() => {
    setActiveSection(vistaInicial || 'contratos');
  }, [vistaInicial]);

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

  const eliminarIconoEmpresa = (empresa) => {
    const key = normalizarEmpresaKey(empresa);
    if (!key || !empresaIconos[key]) return;
    const nextIconos = { ...empresaIconos };
    delete nextIconos[key];
    persistirIconosEmpresa(nextIconos);
  };

  const manejarIconoEmpresaChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
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
    if (empresaVistaPrevia == null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setEmpresaVistaPrevia(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [empresaVistaPrevia]);

  const limpiarContrato = () => {
    setContratoNumero('');
    setContratoProveedorCliente(false);
    setContratoEmpresa('');
    setContratoSuplementos('');
    setContratoVigencia('');
    setContratoTipo('');
    setContratoFechaInicio('');
    setContratoDia('');
    setContratoMes('');
    setContratoAnio('');
    setContratoFechaFin('');
    setContratoVencido(false);
    setEditarContrato(false);
  };

  const cerrarModalContrato = () => {
    limpiarContrato();
    setShowContratoModal(false);
  };

  const abrirModalNuevoContrato = () => {
    limpiarContrato();
    setShowContratoModal(true);
  };

  const guardarContratoModal = () => {
    if (editarContrato) updateContrato();
    else addContrato();
  };

  const addContrato = () => {
    const nuevaFechaFin = sumarTiempo(contratoFechaInicio);
    const vencidoCalc = diasParaVencer(nuevaFechaFin) != null && diasParaVencer(nuevaFechaFin) < 0 ? 1 : 0;

    Axios.post('http://localhost:3001/create-contrato', {
      numero_contrato: contratoNumero,
      proveedor_cliente: contratoProveedorCliente ? 1 : 0,
      empresa: contratoEmpresa,
      suplementos: contratoSuplementos,
      vigencia: contratoVigencia,
      tipo_contrato: contratoTipo,
      fecha_inicio: contratoFechaInicio,
      fecha_fin: nuevaFechaFin,
      vencido: vencidoCalc,
    })
      .then(() => {
        getContratos();
        cerrarModalContrato();
        Swal.fire('Registro exitoso', 'Contrato agregado', 'success');
      })
      .catch((error) => {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
      });
  };

  const updateContrato = () => {
    const nuevaFechaFin = sumarTiempo(contratoFechaInicio);
    const vencidoCalc = diasParaVencer(nuevaFechaFin) != null && diasParaVencer(nuevaFechaFin) < 0 ? 1 : 0;

    Axios.put('http://localhost:3001/update-contrato', {
      numero_contrato: contratoNumero,
      proveedor_cliente: contratoProveedorCliente ? 1 : 0,
      empresa: contratoEmpresa,
      suplementos: contratoSuplementos,
      vigencia: contratoVigencia,
      tipo_contrato: contratoTipo,
      fecha_inicio: contratoFechaInicio,
      fecha_fin: nuevaFechaFin,
      vencido: vencidoCalc,
    })
      .then(() => {
        getContratos();
        cerrarModalContrato();
        Swal.fire('Actualización exitosa', 'Contrato actualizado', 'success');
      })
      .catch((error) => {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
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
        Axios.delete(`http://localhost:3001/delete-contrato/${val.numero_contrato}`)
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
    setContratoProveedorCliente(val.proveedor_cliente === 1);
    setContratoEmpresa(val.empresa);
    setContratoSuplementos(val.suplementos || '');
    setContratoVigencia(val.vigencia);
    setContratoTipo(val.tipo_contrato);
    const fechaInicio = val.fecha_inicio ? val.fecha_inicio.substring(0, 10) : '';
    setContratoFechaInicio(fechaInicio);
    if (fechaInicio) {
      const [anio, mes, dia] = fechaInicio.split('-');
      setContratoDia(dia || '');
      setContratoMes(mes || '');
      setContratoAnio(anio || '');
    }
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

  const contratosCriticos = useMemo(() => contratosPrioritarios.filter((c) => c.diasRestantes <= 30), [contratosPrioritarios]);
  const contratosVencidos = useMemo(() => contratosEnriquecidos.filter((c) => c.estado === 'Vencido'), [contratosEnriquecidos]);

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
    const counts = Array(12).fill(0);
    contratosEnriquecidos.forEach((c) => {
      if (c.fecha_fin) {
        const m = new Date(`${toISODate(c.fecha_fin)}T00:00:00`).getMonth();
        counts[m] += 1;
      }
    });
    const max = Math.max(...counts, 1);
    return counts.map((valor, i) => ({ mes: meses[i], valor, altura: Math.round((valor / max) * 100) }));
  }, [contratosEnriquecidos]);

  /* Porcentaje (sobre el total) de inmediatos y vencidos para barras de progreso del panel */
  const porcentajePanel = useMemo(() => {
    const total = contratosEnriquecidos.length || 1;
    return {
      inmediatos: Math.round((contratosCriticos.length / total) * 100),
      vencidos: Math.round((contratosVencidos.length / total) * 100),
    };
  }, [contratosEnriquecidos, contratosCriticos, contratosVencidos]);

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

  /* Avanza un paso en el stepper de Renovación Masiva (Selección -> Revisión -> Confirmación -> Ejecución) */
  const avanzarPasoRenovacion = () => {
    setPasoRenovacion((p) => {
      if (p >= 4) {
        renovarMasivos();
        return 1;
      }
      if (p === 3) {
        renovarMasivos();
        return 4;
      }
      return p + 1;
    });
  };

  const reiniciarStepper = () => setPasoRenovacion(1);

  const enviarRecordatorio = (contrato) => {
    Swal.fire(
      'Recordatorio enviado',
      `Se envió un correo de recordatorio para el contrato ${contrato.numero_contrato} (${contrato.empresa || 'sin empresa'}).`,
      'success'
    );
  };

  const verDetalleContrato = (contrato) => {
    Swal.fire({
      title: `Contrato ${contrato.numero_contrato}`,
      html: `
        <div style="text-align:left">
          <p><strong>Empresa:</strong> ${contrato.empresa || '-'}</p>
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

  const exportarReporteCSV = () => {
    const headers = ['numero_contrato', 'parte', 'empresa', 'tipo_contrato', 'vigencia', 'fecha_inicio', 'fecha_fin', 'estado', 'dias_restantes', 'alerta'];
    const rows = contratosEnriquecidos.map((c) => [
      c.numero_contrato,
      c.proveedor_cliente ? 'Proveedor' : 'Cliente',
      c.empresa || '',
      c.tipo_contrato || '',
      c.vigencia || '',
      toISODate(c.fecha_inicio),
      toISODate(c.fecha_fin),
      c.estado,
      c.diasRestantes ?? '',
      c.alerta,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_contratos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const seccionLabel = {
    resumen: 'Resumen',
    contratos: 'Contratos',
    vencimientos: 'Vencimientos',
    renovaciones: 'Renovaciones',
    reportes: 'Reportes',
  };

  const pasosRenovacion = [
    { id: 1, label: 'Selección' },
    { id: 2, label: 'Revisión' },
    { id: 3, label: 'Confirmación' },
    { id: 4, label: 'Ejecución' },
  ];

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
      {/* Encabezado: título + acciones (sin breadcrumbs) */}
      <header className="contratos-page__header">
        <div className="contratos-page__title-row">
          <div>
            <h1 className="contratos-page__title">Gestión de Contratos</h1>
          </div>

          <div className="contratos-page__actions">
            <button
              type="button"
              className="btn btn-primary contratos-btn-primary d-inline-flex align-items-center"
              onClick={abrirModalNuevoContrato}
            >
              <i className="bi bi-plus-lg me-2" aria-hidden="true" />
              Agregar contrato
            </button>

            <div className="contratos-masiva">
              <button
                type="button"
                className="btn contratos-btn-secondary d-inline-flex align-items-center"
                onClick={() => { setActiveSection('renovaciones'); avanzarPasoRenovacion(); }}
                title="Avanza un paso del flujo de renovación masiva"
              >
                <i className="bi bi-lightning-charge me-2" aria-hidden="true" />
                Renovación Masiva
              </button>

              <ol className="contratos-masiva__stepper" aria-label="Progreso de renovación masiva">
                {pasosRenovacion.map((paso, idx) => {
                  const completed = paso.id < pasoRenovacion;
                  const active = paso.id === pasoRenovacion;
                  return (
                    <li
                      key={paso.id}
                      className={`contratos-masiva__step ${active ? 'is-active' : ''} ${completed ? 'is-done' : ''}`}
                    >
                      <button
                        type="button"
                        className="contratos-masiva__dot"
                        onClick={() => { setActiveSection('renovaciones'); setPasoRenovacion(paso.id); }}
                        aria-label={`Ir al paso ${paso.label}`}
                      >
                        {completed ? <i className="bi bi-check-lg" aria-hidden="true" /> : paso.id}
                      </button>
                      <span className="contratos-masiva__label">{paso.label}</span>
                      {idx < pasosRenovacion.length - 1 && (
                        <span className="contratos-masiva__link" aria-hidden="true" />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            {activeSection === 'reportes' && (
              <button type="button" className="btn btn-outline-primary d-inline-flex align-items-center" onClick={exportarReporteCSV}>
                <i className="bi bi-filetype-csv me-2" aria-hidden="true" />
                Exportar CSV
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tabs de secciones */}
      <div className="contratos-tabs-card mb-3">
        <div className="d-flex flex-wrap align-items-end gap-2 contratos-tabs-row">
          {Object.entries(seccionLabel).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn btn-sm contratos-tab ${activeSection === id ? 'contratos-tab--active' : ''}`}
              onClick={() => setActiveSection(id)}
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
                disabled={editarContrato}
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
              <label className="minimal-label">Icono empresa:</label>
              <input
                type="file"
                accept="image/*"
                className="minimal-input"
                onChange={manejarIconoEmpresaChange}
              />
              <small className="text-muted d-block mt-1">
                Selecciona una imagen (max 1 MB) para mostrarla como icono en la cola de renovación.
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
              <select
                className={`minimal-select ${contratoTipo ? 'is-selected' : ''}`}
                value={contratoTipo}
                onChange={(e) => setContratoTipo(e.target.value)}
              >
                <option value="" disabled hidden>--- Seleccione ---</option>
                <option value="Alimento">Alimento</option>
                <option value="Servicio">Servicio</option>
                <option value="Compra">Compra</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div className="minimal-date-row">
              <div className="minimal-field">
                <label className="minimal-label">Día:</label>
                <select
                  className={`minimal-select ${contratoDia ? 'is-selected' : ''}`}
                  value={contratoDia}
                  onChange={(e) => setContratoDia(e.target.value)}
                >
                  <option value="" disabled hidden>--- Seleccione ---</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                      {String(i + 1).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="minimal-field">
                <label className="minimal-label">Mes:</label>
                <select
                  className={`minimal-select ${contratoMes ? 'is-selected' : ''}`}
                  value={contratoMes}
                  onChange={(e) => setContratoMes(e.target.value)}
                >
                  <option value="" disabled hidden>--- Seleccione ---</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                      {String(i + 1).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="minimal-field">
                <label className="minimal-label">Año:</label>
                <select
                  className={`minimal-select ${contratoAnio ? 'is-selected' : ''}`}
                  value={contratoAnio}
                  onChange={(e) => setContratoAnio(e.target.value)}
                >
                  <option value="" disabled hidden>--- Seleccione ---</option>
                  {Array.from({ length: 50 }, (_, i) => {
                    const anio = String(new Date().getFullYear() - 35 + i);
                    return (
                      <option key={anio} value={anio}>
                        {anio}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
        </FormModal>

        {(activeSection === 'resumen' || activeSection === 'reportes') && (
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
                        <th>Empresa</th>
                        <th>Estado</th>
                        <th>Días</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contratosCriticos.slice(0, 8).map((c) => (
                        <tr key={c.numero_contrato}>
                          <td>{c.numero_contrato}</td>
                          <td>
                            <div className="d-inline-flex align-items-center gap-2">
                              <AvatarEmpresaClic empresa={c.empresa} />
                              <span>{c.empresa || 'Sin empresa'}</span>
                            </div>
                          </td>
                          <td><span className={`badge ${getBadgeClass(c.estado)}`}>{c.estado}</span></td>
                          <td>{c.diasRestantes}</td>
                          <td><button type="button" className="btn btn-sm btn-outline-success" onClick={() => renovarContrato(c)}>Renovar</button></td>
                        </tr>
                      ))}
                      {contratosCriticos.length === 0 && (
                        <tr><td colSpan={5} className="text-center text-muted">Sin alertas críticas.</td></tr>
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
            <div className="card p-3 mb-3">
              <div className="row g-2">
                <div className="col-12 col-md-3">
                  <input type="text" className="form-control" placeholder="Buscar por número, empresa, tipo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="col-6 col-md-2">
                  <select className="form-select" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                    <option value="todos">Tipo: todos</option>
                    {tiposDisponibles.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <select className="form-select" value={filtroParte} onChange={(e) => setFiltroParte(e.target.value)}>
                    <option value="todos">Parte: todos</option>
                    <option value="proveedor">Proveedor</option>
                    <option value="cliente">Cliente</option>
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <select className="form-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                    <option value="todos">Estado: todos</option>
                    <option value="Activo">Activo</option>
                    <option value="En seguimiento">En seguimiento</option>
                    <option value="Por vencer">Por vencer</option>
                    <option value="Vencido">Vencido</option>
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <select className="form-select" value={filtroVencimiento} onChange={(e) => setFiltroVencimiento(e.target.value)}>
                    <option value="todos">Ventana</option>
                    <option value="7">Hasta 7 días</option>
                    <option value="30">Hasta 30 días</option>
                    <option value="90">Hasta 90 días</option>
                  </select>
                </div>
                <div className="col-12 col-md-1 d-grid">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => { setSearchTerm(''); setFiltroTipo('todos'); setFiltroParte('todos'); setFiltroEstado('todos'); setFiltroVencimiento('todos'); }}>
                    Limpiar
                  </button>
                </div>
              </div>
            </div>

            <div className="card p-3">
              <div className="table-responsive">
                <table className="table table-data-compact table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>N° Contrato</th><th>Tipo</th><th>Empresa</th><th>Vigencia</th><th>Fecha Inicio</th><th>Fecha Fin</th><th>Estado</th><th>Días</th><th>Alerta</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contratosFiltrados.map((con) => (
                      <tr key={con.numero_contrato}>
                        <td>{con.numero_contrato}</td>
                        <td>{con.proveedor_cliente ? 'Proveedor' : 'Cliente'}</td>
                        <td>
                          <div className="d-inline-flex align-items-center gap-2">
                            <AvatarEmpresaClic empresa={con.empresa} />
                            <span>{con.empresa || 'Sin empresa'}</span>
                          </div>
                        </td>
                        <td>{con.vigencia}</td>
                        <td>{toISODate(con.fecha_inicio)}</td>
                        <td>{toISODate(con.fecha_fin)}</td>
                        <td><span className={`badge ${getBadgeClass(con.estado)}`}>{con.estado}</span></td>
                        <td>{con.diasRestantes == null ? '-' : con.diasRestantes < 0 ? `-${Math.abs(con.diasRestantes)}` : con.diasRestantes}</td>
                        <td>{con.alerta}</td>
                        <td>
                          <EditTableActionButton onClick={() => editarContratoTabla(con)} className="me-2" />
                          <button type="button" className="btn btn-sm btn-outline-success me-2" title="Renovar contrato" onClick={() => renovarContrato(con)}>
                            <i className="bi bi-arrow-repeat" />
                          </button>
                          <DeleteTableActionButton onClick={() => deleteContrato(con)} />
                        </td>
                      </tr>
                    ))}
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
          <div className="card p-3">
            <h6 className="mb-3">Bandeja de vencimientos y seguimiento (&lt;= 90 días)</h6>
            <div className="table-responsive">
              <table className="table table-data-compact table-bordered">
                <thead>
                  <tr>
                    <th>N° Contrato</th><th>Empresa</th><th>Tipo</th><th>Fecha Fin</th><th>Días</th><th>Estado</th><th>Alerta</th><th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {contratosPrioritarios.map((c) => (
                    <tr key={c.numero_contrato}>
                      <td>{c.numero_contrato}</td>
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
                      <td>{c.alerta}</td>
                      <td><button type="button" className="btn btn-sm btn-outline-success" onClick={() => renovarContrato(c)}>Renovar</button></td>
                    </tr>
                  ))}
                  {contratosPrioritarios.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-muted py-3">No hay contratos próximos a vencer.</td></tr>
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
                    <h6 className="fw-bold mb-2 renov-card-title">Panel de renovaciones</h6>

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
                          onClick={() => { setSearchTerm(''); setRenovFechaDesde(''); setRenovFechaHasta(''); }}
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
                          onClick={() => setActiveSection('vencimientos')}
                        >
                          Ver todos
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-7 col-xl-8 renov-cola-column">
                <div className="card renov-cola-card h-100">
                  <div className="card-body">
                    <h6 className="fw-bold mb-2 renov-card-title">Cola de renovación priorizada</h6>
                    <div className="renov-cola-table-wrap">
                      <table className="table align-middle renov-cola-table mb-0">
                        <thead>
                          <tr>
                            <th className="renov-cola-th-num">N°</th>
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
                                <td className="fw-semibold text-nowrap renov-cola-td-num">{c.numero_contrato}</td>
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
                                        className="btn btn-sm btn-primary flex-grow-1 d-inline-flex align-items-center justify-content-center"
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
                                      className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center gap-1 text-truncate"
                                      title="Enviar recordatorio"
                                      onClick={() => enviarRecordatorio(c)}
                                    >
                                      <i className="bi bi-envelope-fill" aria-hidden="true" />
                                      Enviar Rec…
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {colaRenovacion.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center text-muted py-3">Sin contratos en cola de renovación.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-5">
                <div className="card renov-alerts-card h-100">
                  <div className="card-body">
                    <h6 className="fw-bold mb-2 renov-card-title">Alertas Críticas</h6>
                    {contratosCriticos.slice(0, 5).map((c) => (
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

              <div className="col-12 col-md-7">
                <div className="card renov-stats-card h-100">
                  <div className="card-body">
                    <h6 className="fw-bold mb-2 renov-card-title">Estadísticas Rápidas</h6>
                    <div className="row g-2 g-md-3 align-items-stretch renov-stats-row">
                      <div className="col-12 col-md-7">
                        <span className="renov-chart-caption">Contratos por Mes de Vencimiento</span>
                        <div className="renov-bar-chart">
                          {vencimientosPorMes.map((b) => (
                            <div key={b.mes} className="renov-bar-col" title={`${b.mes}: ${b.valor}`}>
                              <div className="renov-bar" style={{ height: `${Math.max(b.altura, 4)}%` }} />
                              <small className="renov-bar-label">{b.mes}</small>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="col-12 col-md-5 d-flex flex-column align-items-center justify-content-start">
                        <span className="renov-chart-caption">Total de Contratos por Estado</span>
                        <RenovDonut
                          segments={[
                            { value: resumen.activos, color: '#1e3a5f', label: 'Activos' },
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
            </div>
          </div>
        )}

        {activeSection === 'reportes' && (
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <div className="card p-3 h-100">
                <h6 className="mb-3">Distribución por estado</h6>
                <ul className="list-group">
                  <li className="list-group-item d-flex justify-content-between"><span>Activos</span><strong>{resumen.activos}</strong></li>
                  <li className="list-group-item d-flex justify-content-between"><span>En seguimiento</span><strong>{resumen.seguimiento}</strong></li>
                  <li className="list-group-item d-flex justify-content-between"><span>Por vencer</span><strong>{resumen.porVencer}</strong></li>
                  <li className="list-group-item d-flex justify-content-between"><span>Vencidos</span><strong>{resumen.vencidos}</strong></li>
                </ul>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="card p-3 h-100">
                <h6 className="mb-3">Top empresas</h6>
                <ul className="list-group">
                  {topEmpresas.map((e) => (
                    <li key={e.empresa} className="list-group-item d-flex justify-content-between">
                      <span className="d-inline-flex align-items-center gap-2">
                        <AvatarEmpresaClic empresa={e.empresa} />
                        <span>{e.empresa}</span>
                      </span>
                      <strong>{e.cantidad}</strong>
                    </li>
                  ))}
                  {topEmpresas.length === 0 && <li className="list-group-item text-muted">Sin datos</li>}
                </ul>
              </div>
            </div>
          </div>
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
