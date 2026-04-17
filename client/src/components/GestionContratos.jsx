import { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import { FormModal } from './FormModal';

function GestionContratos({ vistaInicial = 'contratos' }) {
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
    const baseInicio = toISODate(contrato.fecha_fin) || toISODate(contrato.fecha_inicio);
    const nuevaFechaFin = sumarTiempoConVigencia(baseInicio, contrato.vigencia);
    if (!baseInicio || !nuevaFechaFin) {
      Swal.fire('Datos incompletos', 'El contrato no tiene fechas suficientes para renovar.', 'warning');
      return;
    }
    Swal.fire({
      title: 'Renovar contrato',
      text: `Se extenderá la vigencia y nueva fecha fin será ${nuevaFechaFin}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, renovar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      Axios.put('http://localhost:3001/update-contrato', {
        numero_contrato: contrato.numero_contrato,
        proveedor_cliente: contrato.proveedor_cliente ? 1 : 0,
        empresa: contrato.empresa,
        suplementos: contrato.suplementos || '',
        vigencia: contrato.vigencia,
        tipo_contrato: contrato.tipo_contrato,
        fecha_inicio: toISODate(contrato.fecha_inicio),
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

  return (
    <div className="row">
      <div className="col-12">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h4 className="mb-1">Gestión de Contratos</h4>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <button type="button" className="btn btn-primary btn-form-nowrap d-inline-flex align-items-center" onClick={abrirModalNuevoContrato}>
              <i className="bi bi-file-earmark-plus me-2" aria-hidden="true" />
              Agregar contrato
            </button>
            {activeSection === 'renovaciones' && (
              <button type="button" className="btn btn-success btn-form-nowrap" onClick={renovarMasivos}>
                <i className="bi bi-arrow-repeat me-2" aria-hidden="true" />
                Renovar masivo
              </button>
            )}
            {activeSection === 'reportes' && (
              <button type="button" className="btn btn-outline-primary btn-form-nowrap" onClick={exportarReporteCSV}>
                <i className="bi bi-filetype-csv me-2" aria-hidden="true" />
                Exportar CSV
              </button>
            )}
          </div>
        </div>

        <div className="card p-2 mb-3">
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className={`btn btn-sm ${activeSection === 'resumen' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setActiveSection('resumen')}>
              Resumen
            </button>
            <button type="button" className={`btn btn-sm ${activeSection === 'contratos' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setActiveSection('contratos')}>
              Contratos
            </button>
            <button type="button" className={`btn btn-sm ${activeSection === 'vencimientos' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setActiveSection('vencimientos')}>
              Vencimientos
            </button>
            <button type="button" className={`btn btn-sm ${activeSection === 'renovaciones' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setActiveSection('renovaciones')}>
              Renovaciones
            </button>
            <button type="button" className={`btn btn-sm ${activeSection === 'reportes' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setActiveSection('reportes')}>
              Reportes
            </button>
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
                          <td>{c.empresa}</td>
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
                    <span>{e.empresa}</span>
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
                        <td>{con.empresa}</td>
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
                      <td>{c.empresa}</td>
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
          <div className="row g-3">
            <div className="col-12 col-lg-4">
              <div className="card p-3 h-100">
                <h6>Panel de renovaciones</h6>
                <p className="mb-2">Candidatos inmediatos (&lt;= 30 días): <strong>{contratosCriticos.length}</strong></p>
                <p className="mb-2">Vencidos pendientes: <strong>{contratosVencidos.length}</strong></p>
              </div>
            </div>
            <div className="col-12 col-lg-8">
              <div className="card p-3">
                <h6 className="mb-3">Cola de renovación priorizada</h6>
                <div className="table-responsive">
                  <table className="table table-data-compact table-sm table-bordered">
                    <thead>
                      <tr><th>N° Contrato</th><th>Empresa</th><th>Días</th><th>Estado</th><th>Acción</th></tr>
                    </thead>
                    <tbody>
                      {contratosPrioritarios.map((c) => (
                        <tr key={c.numero_contrato}>
                          <td>{c.numero_contrato}</td>
                          <td>{c.empresa}</td>
                          <td>{c.diasRestantes}</td>
                          <td><span className={`badge ${getBadgeClass(c.estado)}`}>{c.estado}</span></td>
                          <td><button type="button" className="btn btn-sm btn-outline-success" onClick={() => renovarContrato(c)}>Renovar</button></td>
                        </tr>
                      ))}
                      {contratosPrioritarios.length === 0 && (
                        <tr><td colSpan={5} className="text-center text-muted">Sin contratos en cola de renovación.</td></tr>
                      )}
                    </tbody>
                  </table>
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
                      <span>{e.empresa}</span><strong>{e.cantidad}</strong>
                    </li>
                  ))}
                  {topEmpresas.length === 0 && <li className="list-group-item text-muted">Sin datos</li>}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GestionContratos;
