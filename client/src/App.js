import { useState, useEffect } from 'react';
import Axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Nav, Navbar, NavDropdown } from 'react-bootstrap';

import SacrificioVacuno from './components/SacrificioVacuno';
import MataderoVivo from './components/MataderoVivo';
import Leche from './components/Leche';
import Asistencias from './components/Asistencias';
import Certificaciones from './components/Certificaciones';
import Cursos from './components/Cursos';
import Evalcapacitacion from './components/Evalcapacitacion';
import Evaluaciones from './components/Evaluaciones';
import Objetivos from './components/Objetivos';
import Salarios from './components/Salarios';
import SegSeguridad from './components/SegSeguridad';
import Seguridad from './components/Seguridad';
import Cargos from './components/Cargos';
import Departamentos from './components/Departamentos';
import CertificadosMedicos from './components/CertificadosMedicos';
import Vacaciones from './components/Vacaciones';
import TurnosTrabajo from './components/TurnosTrabajo';
import GruposTrabajo from './components/GruposTrabajo';
import Sanciones from './components/Sanciones';
import Reconocimientos from './components/Reconocimientos';
import Jubilaciones from './components/Jubilaciones';
import EvaluacionesMedicas from './components/EvaluacionesMedicas';
import Login from './components/Login';
import GestionContratos from './components/GestionContratos';
import GestionEmpleados from './components/GestionEmpleados';
import BajasEmpleados from './components/BajasEmpleados';
import ReportePersonal from './components/ReportePersonal';
import CambiosCargo from './components/CambiosCargo';
import ReporteConsolidado from './components/ReporteConsolidado';
import ProduccionHistorico from './components/ProduccionHistorico';
import GestionUsuarios from './components/GestionUsuarios';
import logoAepg from './images/logo-aepg.png';
import DnaThreeWidget from './components/DnaThreeWidget';

const TOKEN_KEY = 'token';

const SIDEBAR_RRHH_KEYS = new Set([
  'empleados',
  'bajas-empleados',
  'reporte-personal',
  'cambios-cargo',
  'reporte-consolidado',
  'vacaciones',
  'turnos-trabajo',
  'grupos-trabajo',
  'sanciones',
  'reconocimientos',
  'jubilaciones',
  'asistencias',
  'certificaciones',
  'cursos',
  'evalcapacitacion',
  'evaluaciones',
  'objetivos',
  'salarios',
  'segseguridad',
  'seguridad',
  'cargos',
  'departamentos',
  'cert-medicos',
  'eval-medicas',
]);

const SIDEBAR_PROD_KEYS = new Set(['sacrificio', 'matadero', 'leche', 'produccion-historico']);
const SIDEBAR_CONTRATOS_KEYS = new Set([
  'contratos-resumen',
  'contratos-lista',
  'contratos-vencimientos',
  'contratos-renovaciones',
  'contratos-reportes',
]);

const setAuthToken = (token) => {
  if (token) {
    Axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete Axios.defaults.headers.common['Authorization'];
  }
};

const tokenInicial = localStorage.getItem(TOKEN_KEY);
if (tokenInicial) {
  setAuthToken(tokenInicial);
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(tokenInicial);

  const [key, setKey] = useState('');
  const [sidebarRrhhOpen, setSidebarRrhhOpen] = useState(false);
  const [sidebarProdOpen, setSidebarProdOpen] = useState(false);
  const [sidebarContratosOpen, setSidebarContratosOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  const moduloLabel = {
    usuarios: 'Gestión de usuarios',
    contratos: 'Contratación',
    'contratos-resumen': 'Contratación · Resumen',
    'contratos-lista': 'Contratación · Contratos',
    'contratos-vencimientos': 'Contratación · Vencimientos',
    'contratos-renovaciones': 'Contratación · Renovaciones',
    'contratos-reportes': 'Contratación · Reportes',
    empleados: 'Gestión de empleados',
    'bajas-empleados': 'Bajas de empleado',
    'reporte-personal': 'Reporte de personal',
    'cambios-cargo': 'Cambios de cargo',
    'reporte-consolidado': 'Reporte consolidado',
    vacaciones: 'Vacaciones',
    'turnos-trabajo': 'Turnos de trabajo',
    'grupos-trabajo': 'Grupos de trabajo',
    sanciones: 'Sanciones',
    reconocimientos: 'Reconocimientos',
    jubilaciones: 'Jubilaciones y retiros',
    asistencias: 'Asistencias',
    certificaciones: 'Certificaciones',
    cursos: 'Cursos',
    evalcapacitacion: 'Eval. capacitación',
    evaluaciones: 'Evaluaciones',
    objetivos: 'Objetivos',
    salarios: 'Salarios',
    segseguridad: 'Seg. Seguridad',
    seguridad: 'Seguridad',
    cargos: 'Cargos',
    departamentos: 'Departamentos',
    'cert-medicos': 'Certificados médicos',
    'eval-medicas': 'Evaluaciones médicas',
    sacrificio: 'Sacrificio vacuno',
    matadero: 'Matadero vivo',
    leche: 'Leche',
    'produccion-historico': 'Histórico producción',
  };

  const handleSidebarRrhhToggle = (nextOpen) => {
    setSidebarRrhhOpen(nextOpen);
    if (nextOpen) setSidebarProdOpen(false);
  };

  const handleSidebarProdToggle = (nextOpen) => {
    setSidebarProdOpen(nextOpen);
    if (nextOpen) setSidebarRrhhOpen(false);
  };

  const handleSidebarContratosToggle = (nextOpen) => {
    setSidebarContratosOpen(nextOpen);
    if (nextOpen) {
      setSidebarRrhhOpen(false);
      setSidebarProdOpen(false);
    }
  };

  const handleNavSelect = (selectedKey) => {
    setKey(selectedKey);
    if (selectedKey === 'usuarios' || selectedKey === 'contratos') {
      setSidebarRrhhOpen(false);
      setSidebarProdOpen(false);
      setSidebarContratosOpen(false);
    } else if (SIDEBAR_RRHH_KEYS.has(selectedKey)) {
      setSidebarRrhhOpen(true);
      setSidebarProdOpen(false);
      setSidebarContratosOpen(false);
    } else if (SIDEBAR_CONTRATOS_KEYS.has(selectedKey)) {
      setSidebarContratosOpen(true);
      setSidebarRrhhOpen(false);
      setSidebarProdOpen(false);
    } else if (SIDEBAR_PROD_KEYS.has(selectedKey)) {
      setSidebarProdOpen(true);
      setSidebarRrhhOpen(false);
      setSidebarContratosOpen(false);
    }
  };

  const handleContratosSectionChange = (sectionId) => {
    const sectionToKey = {
      resumen: 'contratos-resumen',
      contratos: 'contratos-lista',
      vencimientos: 'contratos-vencimientos',
      renovaciones: 'contratos-renovaciones',
      reportes: 'contratos-reportes',
    };
    const nextKey = sectionToKey[sectionId];
    if (!nextKey || nextKey === key) return;
    handleNavSelect(nextKey);
  };

  useEffect(() => {
    if (token) {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await Axios.post('http://localhost:3001/login', { email, password });
      const { token: newToken, usuario } = response.data;
      const usuarioNormalizado = {
        ...usuario,
        rol: String(usuario?.rol || '').trim().toLowerCase(),
      };
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem('user', JSON.stringify(usuarioNormalizado));
      setAuthToken(newToken);
      setToken(newToken);
      setUser(usuarioNormalizado);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al conectar' };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user');
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  const rolDesdeToken = (() => {
    try {
      if (!token) return '';
      const parts = String(token).split('.');
      if (parts.length < 2) return '';
      const payload = JSON.parse(atob(parts[1]));
      return String(payload?.rol || '').trim().toLowerCase();
    } catch {
      return '';
    }
  })();

  const rolActual = String(user?.rol || rolDesdeToken || '').trim().toLowerCase();
  const rolNormalizado = rolActual.replace(/[^a-z]/g, '');
  const esAdminTotal = rolNormalizado === 'admin';
  const mostrarSacrificio = esAdminTotal || rolActual === 'produccion';
  const mostrarMatadero = esAdminTotal || rolActual === 'produccion';
  const mostrarLeche = esAdminTotal || rolActual === 'produccion';
  const mostrarAsistencias = esAdminTotal || rolActual === 'rrhh';
  const mostrarCertificaciones = esAdminTotal || rolActual === 'rrhh';
  const mostrarCursos = esAdminTotal || rolActual === 'rrhh';
  const mostrarEvalcapacitacion = esAdminTotal || rolActual === 'rrhh';
  const mostrarEvaluaciones = esAdminTotal || rolActual === 'rrhh';
  const mostrarObjetivos = esAdminTotal || rolActual === 'rrhh';
  const mostrarContratos = esAdminTotal || rolActual === 'contratacion';
  const mostrarEmpleados = esAdminTotal || rolActual === 'rrhh';
  const mostrarUsuarios = esAdminTotal;
  const mostrarRHum = esAdminTotal || rolActual === 'rrhh';
  const mostrarProduccion = esAdminTotal || rolActual === 'produccion';
  const mostrarSalarios = esAdminTotal || rolActual === 'rrhh';
  const mostrarVacaciones = esAdminTotal || rolActual === 'rrhh';
  const mostrarTurnosTrabajo = esAdminTotal || rolActual === 'rrhh';
  const mostrarGruposTrabajo = esAdminTotal || rolActual === 'rrhh';
  const mostrarSanciones = esAdminTotal || rolActual === 'rrhh';
  const mostrarReconocimientos = esAdminTotal || rolActual === 'rrhh';
  const mostrarJubilaciones = esAdminTotal || rolActual === 'rrhh';
  const mostrarSegSeguridad = esAdminTotal || rolActual === 'rrhh';
  const mostrarSeguridad = esAdminTotal || rolActual === 'rrhh';
  const mostrarCargos = esAdminTotal || rolActual === 'rrhh';
  const mostrarDepartamentos = esAdminTotal || rolActual === 'rrhh';
  const mostrarCertMedicos = esAdminTotal || rolActual === 'rrhh' || rolActual === 'produccion';
  const mostrarEvalMedicas = esAdminTotal || rolActual === 'rrhh' || rolActual === 'produccion';

  useEffect(() => {
    if (!user) return;
    if (key) return;
    if (esAdminTotal) {
      setKey('usuarios');
      setSidebarRrhhOpen(false);
      setSidebarProdOpen(false);
      setSidebarContratosOpen(false);
      return;
    }
    if (mostrarContratos) return setKey('contratos');
    if (mostrarRHum) return setKey('empleados');
    if (mostrarProduccion) return setKey('sacrificio');
  }, [user, key, esAdminTotal, mostrarContratos, mostrarRHum, mostrarProduccion]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="dashboard-shell d-flex vh-100" style={{ overflow: 'hidden' }}>
      <div className="dashboard-sidebar vh-100 p-4 d-flex flex-column shadow-lg" style={{ width: '280px', minWidth: '280px' }}>
        <div className="text-white mb-2 pb-4 border-bottom dashboard-sidebar-divider">
          <div className="dashboard-sidebar-brand mb-2">
            <img src={logoAepg} alt="Logo AEPG" className="dashboard-sidebar-brand-logo" />
            <h3 className="fw-bold mb-0">AEPG</h3>
          </div>
          <p className="mb-0 opacity-75">Bienvenido, {user.nombre} </p>
        </div>

        <Nav className="flex-column flex-grow-1" activeKey={key} onSelect={handleNavSelect}>
          {mostrarUsuarios && (
            <Nav.Item className="mb-2">
              <Nav.Link eventKey="usuarios" className="dashboard-nav-link rounded-3 p-1">
                <i className="bi bi-person-badge me-2" aria-hidden="true"></i>Usuarios
              </Nav.Link>
            </Nav.Item>
          )}

          {mostrarContratos && (
            <NavDropdown
              title={
                <span className="d-inline-flex align-items-center">
                  <i className="bi bi-file-earmark-ruled me-2" aria-hidden="true"></i>Contratación
                </span>
              }
              id="sidebar-dropdown-contratos"
              className="mi-dropdown-sidebar"
              autoClose={false}
              show={sidebarContratosOpen}
              onToggle={handleSidebarContratosToggle}
            >
              <NavDropdown.Item eventKey="contratos-resumen" active={key === 'contratos-resumen'}>
                <i className="bi bi-speedometer2 me-2" aria-hidden="true"></i>Resumen ejecutivo
              </NavDropdown.Item>
              <NavDropdown.Item eventKey="contratos-lista" active={key === 'contratos-lista'}>
                <i className="bi bi-table me-2" aria-hidden="true"></i>Contratos
              </NavDropdown.Item>
              <NavDropdown.Item
                eventKey="contratos-vencimientos"
                active={key === 'contratos-vencimientos'}
                className="contratos-menu-vencimientos--hidden-visual"
              >
                <i className="bi bi-calendar2-week me-2" aria-hidden="true"></i>Vencimientos
              </NavDropdown.Item>
              <NavDropdown.Item eventKey="contratos-renovaciones" active={key === 'contratos-renovaciones'}>
                <i className="bi bi-arrow-repeat me-2" aria-hidden="true"></i>Renovaciones
              </NavDropdown.Item>
              <NavDropdown.Item eventKey="contratos-reportes" active={key === 'contratos-reportes'}>
                <i className="bi bi-bar-chart-line me-2" aria-hidden="true"></i>Reportes
              </NavDropdown.Item>
            </NavDropdown>
          )}

          {mostrarRHum && (
            <NavDropdown
              title={
                <span className="d-inline-flex align-items-center">
                  <i className="bi bi-people-fill me-2" aria-hidden="true"></i>Rec. Humanos
                </span>
              }
              id="sidebar-dropdown-rrhh"
              className="mi-dropdown-sidebar"
              autoClose={false}
              show={sidebarRrhhOpen}
              onToggle={handleSidebarRrhhToggle}
            >
              {mostrarEmpleados && (
                <NavDropdown.Item eventKey="empleados" active={key === 'empleados'}>
                  <i className="bi bi-person-vcard me-2" aria-hidden="true"></i>Empleados
                </NavDropdown.Item>
              )}
              {mostrarEmpleados && (
                <NavDropdown.Item eventKey="bajas-empleados" active={key === 'bajas-empleados'}>
                  <i className="bi bi-person-fill-slash me-2" aria-hidden="true"></i>Bajas de empleado
                </NavDropdown.Item>
              )}
              {mostrarEmpleados && (
                <NavDropdown.Item eventKey="reporte-personal" active={key === 'reporte-personal'}>
                  <i className="bi bi-clipboard-data me-2" aria-hidden="true"></i>Reporte de personal
                </NavDropdown.Item>
              )}
              {mostrarEmpleados && (
                <NavDropdown.Item eventKey="cambios-cargo" active={key === 'cambios-cargo'}>
                  <i className="bi bi-arrow-left-right me-2" aria-hidden="true"></i>Cambios de cargo
                </NavDropdown.Item>
              )}
              {mostrarEmpleados && (
                <NavDropdown.Item eventKey="reporte-consolidado" active={key === 'reporte-consolidado'}>
                  <i className="bi bi-graph-up-arrow me-2" aria-hidden="true"></i>Reporte consolidado
                </NavDropdown.Item>
              )}
              {mostrarVacaciones && (
                <NavDropdown.Item eventKey="vacaciones" active={key === 'vacaciones'}>
                  <i className="bi bi-calendar-week me-2" aria-hidden="true"></i>Vacaciones
                </NavDropdown.Item>
              )}
              {mostrarTurnosTrabajo && (
                <NavDropdown.Item eventKey="turnos-trabajo" active={key === 'turnos-trabajo'}>
                  <i className="bi bi-calendar-day me-2" aria-hidden="true"></i>Turnos de trabajo
                </NavDropdown.Item>
              )}
              {mostrarGruposTrabajo && (
                <NavDropdown.Item eventKey="grupos-trabajo" active={key === 'grupos-trabajo'}>
                  <i className="bi bi-diagram-2 me-2" aria-hidden="true"></i>Grupos de trabajo
                </NavDropdown.Item>
              )}
              {mostrarSanciones && (
                <NavDropdown.Item eventKey="sanciones" active={key === 'sanciones'}>
                  <i className="bi bi-exclamation-octagon-fill me-2" aria-hidden="true"></i>Sanciones
                </NavDropdown.Item>
              )}
              {mostrarReconocimientos && (
                <NavDropdown.Item eventKey="reconocimientos" active={key === 'reconocimientos'}>
                  <i className="bi bi-trophy me-2" aria-hidden="true"></i>Reconocimientos
                </NavDropdown.Item>
              )}
              {mostrarJubilaciones && (
                <NavDropdown.Item eventKey="jubilaciones" active={key === 'jubilaciones'}>
                  <i className="bi bi-suitcase-lg me-2" aria-hidden="true"></i>Jubilaciones y retiros
                </NavDropdown.Item>
              )}
              {mostrarAsistencias && (
                <NavDropdown.Item eventKey="asistencias" active={key === 'asistencias'}>
                  <i className="bi bi-calendar-check me-2" aria-hidden="true"></i>Asistencias
                </NavDropdown.Item>
              )}
              {mostrarCertificaciones && (
                <NavDropdown.Item eventKey="certificaciones" active={key === 'certificaciones'}>
                  <i className="bi bi-patch-check-fill me-2" aria-hidden="true"></i>Certificaciones
                </NavDropdown.Item>
              )}
              {mostrarCursos && (
                <NavDropdown.Item eventKey="cursos" active={key === 'cursos'}>
                  <i className="bi bi-mortarboard me-2" aria-hidden="true"></i>Cursos
                </NavDropdown.Item>
              )}
              {mostrarEvalcapacitacion && (
                <NavDropdown.Item eventKey="evalcapacitacion" active={key === 'evalcapacitacion'}>
                  <i className="bi bi-journal-richtext me-2" aria-hidden="true"></i>Eval. capacitación
                </NavDropdown.Item>
              )}
              {mostrarEvaluaciones && (
                <NavDropdown.Item eventKey="evaluaciones" active={key === 'evaluaciones'}>
                  <i className="bi bi-clipboard2-check me-2" aria-hidden="true"></i>Evaluaciones
                </NavDropdown.Item>
              )}
              {mostrarObjetivos && (
                <NavDropdown.Item eventKey="objetivos" active={key === 'objetivos'}>
                  <i className="bi bi-bullseye me-2" aria-hidden="true"></i>Objetivos
                </NavDropdown.Item>
              )}
              {mostrarSalarios && (
                <NavDropdown.Item eventKey="salarios" active={key === 'salarios'}>
                  <i className="bi bi-cash-stack me-2" aria-hidden="true"></i>Salarios
                </NavDropdown.Item>
              )}
              {mostrarSegSeguridad && (
                <NavDropdown.Item eventKey="segseguridad" active={key === 'segseguridad'}>
                  <i className="bi bi-cone-striped me-2" aria-hidden="true"></i>Seg. Seguridad
                </NavDropdown.Item>
              )}
              {mostrarSeguridad && (
                <NavDropdown.Item eventKey="seguridad" active={key === 'seguridad'}>
                  <i className="bi bi-shield-lock me-2" aria-hidden="true"></i>Seguridad
                </NavDropdown.Item>
              )}
              {mostrarCargos && (
                <NavDropdown.Item eventKey="cargos" active={key === 'cargos'}>
                  <i className="bi bi-briefcase-fill me-2" aria-hidden="true"></i>Cargos
                </NavDropdown.Item>
              )}
              {mostrarDepartamentos && (
                <NavDropdown.Item eventKey="departamentos" active={key === 'departamentos'}>
                  <i className="bi bi-building me-2" aria-hidden="true"></i>Departamentos
                </NavDropdown.Item>
              )}
              {mostrarCertMedicos && (
                <NavDropdown.Item eventKey="cert-medicos" active={key === 'cert-medicos'}>
                  <i className="bi bi-file-earmark-medical me-2" aria-hidden="true"></i>Cert. Médicos
                </NavDropdown.Item>
              )}
              {mostrarEvalMedicas && (
                <NavDropdown.Item eventKey="eval-medicas" active={key === 'eval-medicas'}>
                  <i className="bi bi-heart-pulse me-2" aria-hidden="true"></i>Eval. médicas
                </NavDropdown.Item>
              )}
            </NavDropdown>
          )}

          {mostrarProduccion && (
            <NavDropdown
              title={
                <span className="d-inline-flex align-items-center">
                  <i className="bi bi-box-seam me-2" aria-hidden="true"></i>Producción
                </span>
              }
              id="sidebar-dropdown-prod"
              className="mi-dropdown-sidebar"
              autoClose={false}
              show={sidebarProdOpen}
              onToggle={handleSidebarProdToggle}
            >
              {mostrarSacrificio && (
                <NavDropdown.Item eventKey="sacrificio" active={key === 'sacrificio'}>
                  <i className="bi bi-scissors me-2" aria-hidden="true"></i>Sacrificio vacuno
                </NavDropdown.Item>
              )}
              {mostrarMatadero && (
                <NavDropdown.Item eventKey="matadero" active={key === 'matadero'}>
                  <i className="bi bi-activity me-2" aria-hidden="true"></i>Matadero vivo
                </NavDropdown.Item>
              )}
              {mostrarLeche && (
                <NavDropdown.Item eventKey="leche" active={key === 'leche'}>
                  <i className="bi bi-droplet-half me-2" aria-hidden="true"></i>Leche
                </NavDropdown.Item>
              )}
              {(mostrarSacrificio || mostrarMatadero || mostrarLeche) && (
                <NavDropdown.Item eventKey="produccion-historico" active={key === 'produccion-historico'}>
                  <i className="bi bi-archive me-2" aria-hidden="true"></i>Histórico producción
                </NavDropdown.Item>
              )}
            </NavDropdown>
          )}
        </Nav>
      </div>

      <div className="dashboard-main dashboard-main--contratos flex-grow-1 ps-4 pb-4 pe-0">
        <div className="dashboard-topbar-wave" aria-hidden="true" />
        <Navbar expand="lg" className="dashboard-topbar shadow-none mb-2 py-2 px-4">
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <div className="dashboard-topbar-avatar-wrap">
              <div className="dashboard-topbar-user-meta">
                <span className="dashboard-topbar-user-name">{user.nombre}</span>
                <span className="dashboard-topbar-user-role">{user.rol}</span>
              </div>
              <img src="/images/usuario.png" alt="" width="52" height="52" className="dashboard-user-avatar" />
            </div>
            <Nav className="ms-auto align-items-center gap-2 dashboard-topbar-actions">
              <button type="button" className="btn btn-cerrar mb-0" onClick={logout}>
                Cerrar sesión
              </button>
            </Nav>
          </Navbar.Collapse>
        </Navbar>

        <div className="dashboard-main-scroll">
          <div className="dashboard-content-layout">
          <div className="dashboard-content-main">
            {(key === 'contratos' ||
              key === 'contratos-lista' ||
              key === 'contratos-resumen' ||
              key === 'contratos-vencimientos' ||
              key === 'contratos-renovaciones' ||
              key === 'contratos-reportes') && (
              <GestionContratos
                vistaInicial={
                  key === 'contratos-resumen'
                    ? 'resumen'
                    : key === 'contratos-vencimientos'
                      ? 'vencimientos'
                      : key === 'contratos-renovaciones'
                        ? 'renovaciones'
                        : key === 'contratos-reportes'
                          ? 'reportes'
                          : 'contratos'
                }
                onSectionChange={handleContratosSectionChange}
              />
            )}
            {key === 'usuarios' && mostrarUsuarios && <GestionUsuarios />}
            {key === 'sacrificio' && mostrarSacrificio && <SacrificioVacuno />}
            {key === 'matadero' && mostrarMatadero && <MataderoVivo />}
            {key === 'leche' && mostrarLeche && <Leche />}
            {key === 'asistencias' && mostrarAsistencias && <Asistencias />}
            {key === 'certificaciones' && mostrarCertificaciones && <Certificaciones />}
            {key === 'cursos' && mostrarCursos && <Cursos />}
            {key === 'evalcapacitacion' && mostrarEvalcapacitacion && <Evalcapacitacion />}
            {key === 'evaluaciones' && mostrarEvaluaciones && <Evaluaciones />}
            {key === 'objetivos' && mostrarObjetivos && <Objetivos />}
            {key === 'salarios' && mostrarSalarios && <Salarios />}
            {key === 'segseguridad' && mostrarSegSeguridad && <SegSeguridad />}
            {key === 'seguridad' && mostrarSeguridad && <Seguridad />}
            {key === 'cargos' && mostrarCargos && <Cargos />}
            {key === 'departamentos' && mostrarDepartamentos && <Departamentos />}
            {key === 'cert-medicos' && mostrarCertMedicos && <CertificadosMedicos />}
            {key === 'eval-medicas' && mostrarEvalMedicas && <EvaluacionesMedicas />}
            {key === 'vacaciones' && mostrarVacaciones && <Vacaciones />}
            {key === 'turnos-trabajo' && mostrarTurnosTrabajo && <TurnosTrabajo />}
            {key === 'grupos-trabajo' && mostrarGruposTrabajo && <GruposTrabajo />}
            {key === 'sanciones' && mostrarSanciones && <Sanciones />}
            {key === 'reconocimientos' && mostrarReconocimientos && <Reconocimientos />}
            {key === 'jubilaciones' && mostrarJubilaciones && <Jubilaciones />}
            {key === 'empleados' && mostrarEmpleados && <GestionEmpleados />}
            {key === 'bajas-empleados' && mostrarEmpleados && <BajasEmpleados />}
            {key === 'reporte-personal' && mostrarEmpleados && <ReportePersonal />}
            {key === 'cambios-cargo' && mostrarEmpleados && <CambiosCargo />}
            {key === 'reporte-consolidado' && mostrarEmpleados && <ReporteConsolidado />}
            {key === 'produccion-historico' && mostrarProduccion && (mostrarSacrificio || mostrarMatadero || mostrarLeche) && (
              <ProduccionHistorico />
            )}
          </div>

          <aside className="dashboard-side-info">
            <div className="dashboard-side-info__card">
              <span className="dashboard-side-info__pill">Información</span>
              <p className="dashboard-side-info__line">
                Módulo: <strong>{moduloLabel[key] || 'Panel principal'}</strong>
              </p>
              <p className="dashboard-side-info__date">
                {now.toLocaleDateString('es-ES')}
              </p>
              <p className="dashboard-side-info__time">
                {now.toLocaleTimeString('es-ES')}
              </p>
            </div>
            <div className="dashboard-side-info__dna" aria-hidden="true">
              <DnaThreeWidget />
            </div>
            <div className="dashboard-side-info__logo-wrap">
              <img
                src="/images/LOGOTIPO.png"
                alt="Logotipo"
                className="dashboard-side-info__logo"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
