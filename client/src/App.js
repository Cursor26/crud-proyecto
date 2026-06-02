import { useState, useEffect, useMemo } from 'react';
import Axios, { API_BASE } from './axiosConfig';
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
import GestionRoles from './components/GestionRoles';
import Auditoria from './components/Auditoria';
import { PermissionsProvider, usePermissions } from './context/PermissionsContext';
import { createLegacyCan } from './lib/legacyRolAccess';
import { hasAnyPermission } from './lib/rbacModules';
import ConfigCorreoServicio from './components/ConfigCorreoServicio';
import AppConfiguracion from './components/AppConfiguracion';
import { PuedeEscribirProvider } from './context/PuedeEscribirContext';
import { AppPreferencesProvider, useAppPreferences } from './context/AppPreferencesContext';
import { NavPrefsInitializer, useDashboardNavHandlers } from './hooks/useDashboardNav';
import { formatAppDate, formatAppTime } from './lib/formatAppDate';
import RrhhModuloHerramientas6Modal from './components/RrhhModuloHerramientas6Modal';
import logoAepg from './images/logo-aepg.png';
import UserProfileAvatar from './components/UserProfileAvatar';
import DnaThreeWidget from './components/DnaThreeWidget';

const TOKEN_KEY = 'token';
const PERMISOS_KEY = 'permisos';

function loadPermisosFromStorage() {
  try {
    const raw = localStorage.getItem(PERMISOS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function parseJwtPayload(token) {
  try {
    const part = String(token || '').split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function normalizarUsuarioGuardado(raw, authToken) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const payload = authToken ? parseJwtPayload(authToken) : null;
  const rol = String(parsed?.rol || payload?.rol || '')
    .trim()
    .toLowerCase();
  return {
    email: parsed?.email || payload?.email || '',
    nombre: parsed?.nombre || payload?.nombre || '',
    rol,
    fotoPerfil: parsed?.fotoPerfil || null,
  };
}

/** Vista inicial al entrar o al cambiar de rol — ver useDashboardNav.js */
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
  'contratos-archivo',
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
  const [permisos, setPermisos] = useState(loadPermisosFromStorage);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(tokenInicial);

  const [key, setKey] = useState('');
  /** A la vez solo un submenú lateral abierto: 'rrhh' | 'contratos' | 'prod' | null */
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(null);
  const [now, setNow] = useState(new Date());
  const [rrhhAnaliticaOpen, setRrhhAnaliticaOpen] = useState(false);

  const moduloLabel = {
    usuarios: 'Gestión de usuarios',
    'gestion-roles': 'Roles y permisos',
    auditoria: 'Auditoría de seguridad',
    'config-correo': 'Correo del sistema',
    'app-configuracion': 'Configuración de la aplicación',
    contratos: 'Contratación',
    'contratos-resumen': 'Contratación · Resumen',
    'contratos-lista': 'Contratación · Contratos',
    'contratos-vencimientos': 'Contratación · Vencimientos',
    'contratos-renovaciones': 'Contratación · Renovaciones',
    'contratos-reportes': 'Contratación · Reportes',
    'contratos-archivo': 'Contratación · Archivo histórico',
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
    setSidebarMenuOpen(nextOpen ? 'rrhh' : null);
  };

  const handleSidebarProdToggle = (nextOpen) => {
    setSidebarMenuOpen(nextOpen ? 'prod' : null);
  };

  const handleSidebarContratosToggle = (nextOpen) => {
    setSidebarMenuOpen(nextOpen ? 'contratos' : null);
  };

  const handleNavSelect = (selectedKey) => {
    setKey(selectedKey);
    if (
      selectedKey === 'usuarios' ||
      selectedKey === 'gestion-roles' ||
      selectedKey === 'auditoria' ||
      selectedKey === 'config-correo' ||
      selectedKey === 'app-configuracion' ||
      selectedKey === 'contratos'
    ) {
      setSidebarMenuOpen(null);
    } else if (SIDEBAR_RRHH_KEYS.has(selectedKey)) {
      setSidebarMenuOpen('rrhh');
    } else if (SIDEBAR_CONTRATOS_KEYS.has(selectedKey)) {
      setSidebarMenuOpen('contratos');
    } else if (SIDEBAR_PROD_KEYS.has(selectedKey)) {
      setSidebarMenuOpen('prod');
    }
  };

  const handleContratosSectionChange = (sectionId) => {
    const sectionToKey = {
      resumen: 'contratos-resumen',
      contratos: 'contratos-lista',
      vencimientos: 'contratos-vencimientos',
      renovaciones: 'contratos-renovaciones',
      reportes: 'contratos-reportes',
      archivo: 'contratos-archivo',
    };
    const nextKey = sectionToKey[sectionId];
    if (!nextKey || nextKey === key) return;
    handleNavSelect(nextKey);
  };

  useEffect(() => {
    if (token) {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const usuario = normalizarUsuarioGuardado(userData, token);
          if (usuario.rol) {
            localStorage.setItem('user', JSON.stringify(usuario));
          }
          setUser(usuario.rol ? usuario : null);
        } catch {
          setUser(null);
        }
      }
      const stored = loadPermisosFromStorage();
      if (!stored || !hasAnyPermission(stored)) {
        Axios.get(`${API_BASE}/rbac/me/permissions`)
          .then((res) => {
            const perms = res.data?.permisos;
            if (perms && hasAnyPermission(perms)) {
              localStorage.setItem(PERMISOS_KEY, JSON.stringify(perms));
              setPermisos(perms);
            } else {
              localStorage.removeItem(PERMISOS_KEY);
              setPermisos(null);
            }
          })
          .catch(() => {
            localStorage.removeItem(PERMISOS_KEY);
            setPermisos(null);
          });
      }
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    const tmr = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tmr);
  }, []);

  const login = async (identifier, password) => {
    try {
      const loginId = String(identifier || '').trim();
      const response = await Axios.post('/login', {
        identifier: loginId,
        email: loginId,
        password,
      });
      const { token: newToken, usuario, permisos: permisosLogin } = response.data;
      const usuarioNormalizado = {
        ...usuario,
        rol: String(usuario?.rol || '').trim().toLowerCase(),
      };
      const perms =
        permisosLogin && hasAnyPermission(permisosLogin) ? permisosLogin : null;
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem('user', JSON.stringify(usuarioNormalizado));
      if (perms) localStorage.setItem(PERMISOS_KEY, JSON.stringify(perms));
      else localStorage.removeItem(PERMISOS_KEY);
      setAuthToken(newToken);
      setToken(newToken);
      setUser(usuarioNormalizado);
      setPermisos(perms);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al conectar' };
    }
  };

  const logout = async () => {
    try {
      await Axios.post('/auth/logout');
    } catch {
      /* registrar logout es best-effort */
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user');
    localStorage.removeItem(PERMISOS_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setPermisos(null);
    setKey('');
    setSidebarMenuOpen(null);
  };

  const handleProfilePhotoUpdated = (fotoPerfil) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, fotoPerfil: fotoPerfil || null };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  const legacyCan = useMemo(() => (user?.rol ? createLegacyCan(user.rol) : null), [user?.rol]);

  return (
    <PermissionsProvider permisos={permisos} legacyCan={legacyCan}>
      <AppWithPermissions
        user={user}
        permisos={permisos}
        token={token}
        loading={loading}
        login={login}
        logout={logout}
        handleProfilePhotoUpdated={handleProfilePhotoUpdated}
        navKey={key}
        setKey={setKey}
        sidebarMenuOpen={sidebarMenuOpen}
        setSidebarMenuOpen={setSidebarMenuOpen}
        now={now}
        rrhhAnaliticaOpen={rrhhAnaliticaOpen}
        setRrhhAnaliticaOpen={setRrhhAnaliticaOpen}
        handleNavSelect={handleNavSelect}
        handleContratosSectionChange={handleContratosSectionChange}
        handleSidebarRrhhToggle={handleSidebarRrhhToggle}
        handleSidebarProdToggle={handleSidebarProdToggle}
        handleSidebarContratosToggle={handleSidebarContratosToggle}
        moduloLabel={moduloLabel}
      />
    </PermissionsProvider>
  );
}

function AppWithPermissions(props) {
  const {
    user,
    loading,
    login,
    logout,
    handleProfilePhotoUpdated,
    navKey,
    setKey,
    sidebarMenuOpen,
    setSidebarMenuOpen,
    now,
    rrhhAnaliticaOpen,
    setRrhhAnaliticaOpen,
    handleNavSelect,
    handleContratosSectionChange,
    handleSidebarRrhhToggle,
    handleSidebarProdToggle,
    handleSidebarContratosToggle,
    moduloLabel,
  } = props;

  const { can, puedeEscribir } = usePermissions();

  const mostrarUsuarios = can('usuarios', 'view');
  const mostrarGestionRoles = can('usuarios', 'edit') || can('usuarios', 'create');
  const mostrarAuditoria = can('auditoria', 'view');
  const mostrarConfigCorreo = can('configuracion', 'view');
  const mostrarContratos = can('contratos', 'view');
  const mostrarRHum = can('empleados', 'view');
  const mostrarProduccion = can('produccion', 'view');
  const mostrarEmpleados = mostrarRHum;
  const mostrarAsistencias = mostrarRHum;
  const mostrarCertificaciones = mostrarRHum;
  const mostrarCursos = mostrarRHum;
  const mostrarEvalcapacitacion = mostrarRHum;
  const mostrarEvaluaciones = mostrarRHum;
  const mostrarObjetivos = mostrarRHum;
  const mostrarSalarios = mostrarRHum;
  const mostrarVacaciones = mostrarRHum;
  const mostrarTurnosTrabajo = mostrarRHum;
  const mostrarGruposTrabajo = mostrarRHum;
  const mostrarSanciones = mostrarRHum;
  const mostrarReconocimientos = mostrarRHum;
  const mostrarJubilaciones = mostrarRHum;
  const mostrarSegSeguridad = mostrarRHum;
  const mostrarSeguridad = mostrarRHum;
  const mostrarCargos = mostrarRHum;
  const mostrarDepartamentos = mostrarRHum;
  const mostrarCertMedicos = mostrarRHum;
  const mostrarEvalMedicas = mostrarRHum;
  const mostrarSacrificio = mostrarProduccion;
  const mostrarMatadero = mostrarProduccion;
  const mostrarLeche = mostrarProduccion;

  const allowedModuleKeys = useMemo(() => {
    const keys = new Set();
    if (can('configuracion', 'view')) keys.add('app-configuracion');
    if (mostrarUsuarios) keys.add('usuarios');
    if (mostrarGestionRoles) keys.add('gestion-roles');
    if (mostrarAuditoria) keys.add('auditoria');
    if (mostrarConfigCorreo) keys.add('config-correo');
    if (mostrarContratos) SIDEBAR_CONTRATOS_KEYS.forEach((k) => keys.add(k));
    if (mostrarRHum) SIDEBAR_RRHH_KEYS.forEach((k) => keys.add(k));
    if (mostrarProduccion) SIDEBAR_PROD_KEYS.forEach((k) => keys.add(k));
    return keys;
  }, [can, mostrarUsuarios, mostrarGestionRoles, mostrarAuditoria, mostrarConfigCorreo, mostrarContratos, mostrarRHum, mostrarProduccion]);

  useEffect(() => {
    if (!navKey || allowedModuleKeys.has(navKey)) return;
    const next = [...allowedModuleKeys][0];
    if (next) setKey(next);
  }, [navKey, allowedModuleKeys, setKey]);

  const rolEtiqueta = (r) => {
    if (r === 'estadistica' || r === 'produccion') return 'Estadística';
    if (r === 'admin') return 'Administrador';
    if (r === 'director') return 'Director (consulta)';
    if (r === 'contratacion') return 'Contratación';
    if (r === 'rrhh') return 'Rec. humanos';
    return r || '';
  };

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
    <AppPreferencesProvider userEmail={user.email}>
    <PuedeEscribirProvider puedeEscribir={puedeEscribir}>
    <NavPrefsInitializer
      user={user}
      allowedKeys={allowedModuleKeys}
      setKey={setKey}
      setSidebarMenuOpen={setSidebarMenuOpen}
    />
    <DashboardShell
      user={user}
      logout={logout}
      navKey={navKey}
      setKey={setKey}
      sidebarMenuOpen={sidebarMenuOpen}
      setSidebarMenuOpen={setSidebarMenuOpen}
      handleNavSelect={handleNavSelect}
      handleContratosSectionChange={handleContratosSectionChange}
      handleSidebarContratosToggle={handleSidebarContratosToggle}
      handleSidebarRrhhToggle={handleSidebarRrhhToggle}
      handleSidebarProdToggle={handleSidebarProdToggle}
      now={now}
      rrhhAnaliticaOpen={rrhhAnaliticaOpen}
      setRrhhAnaliticaOpen={setRrhhAnaliticaOpen}
      moduloLabel={moduloLabel}
      rolEtiqueta={rolEtiqueta}
      puedeEscribir={puedeEscribir}
      allowedModuleKeys={allowedModuleKeys}
      onProfilePhotoUpdated={handleProfilePhotoUpdated}
      mostrarUsuarios={mostrarUsuarios}
      mostrarGestionRoles={mostrarGestionRoles}
      mostrarAuditoria={mostrarAuditoria}
      mostrarConfigCorreo={mostrarConfigCorreo}
      mostrarContratos={mostrarContratos}
      mostrarRHum={mostrarRHum}
      mostrarProduccion={mostrarProduccion}
      mostrarEmpleados={mostrarEmpleados}
      mostrarAsistencias={mostrarAsistencias}
      mostrarCertificaciones={mostrarCertificaciones}
      mostrarCursos={mostrarCursos}
      mostrarEvalcapacitacion={mostrarEvalcapacitacion}
      mostrarEvaluaciones={mostrarEvaluaciones}
      mostrarObjetivos={mostrarObjetivos}
      mostrarSalarios={mostrarSalarios}
      mostrarVacaciones={mostrarVacaciones}
      mostrarTurnosTrabajo={mostrarTurnosTrabajo}
      mostrarGruposTrabajo={mostrarGruposTrabajo}
      mostrarSanciones={mostrarSanciones}
      mostrarReconocimientos={mostrarReconocimientos}
      mostrarJubilaciones={mostrarJubilaciones}
      mostrarSegSeguridad={mostrarSegSeguridad}
      mostrarSeguridad={mostrarSeguridad}
      mostrarCargos={mostrarCargos}
      mostrarDepartamentos={mostrarDepartamentos}
      mostrarCertMedicos={mostrarCertMedicos}
      mostrarEvalMedicas={mostrarEvalMedicas}
      mostrarSacrificio={mostrarSacrificio}
      mostrarMatadero={mostrarMatadero}
      mostrarLeche={mostrarLeche}
    />
    </PuedeEscribirProvider>
    </AppPreferencesProvider>
  );
}

function DashboardShell(props) {
  const { preferences, resolved } = useAppPreferences();
  const { handleNavSelect, dropdownShow } = useDashboardNavHandlers({
    user: props.user,
    setKey: props.setKey,
    setSidebarMenuOpen: props.setSidebarMenuOpen,
    baseNavSelect: props.handleNavSelect,
  });
  const sidebarWidth = resolved.sidebarWidth.width;
  const {
    user, logout, navKey: key, sidebarMenuOpen, now, rrhhAnaliticaOpen, setRrhhAnaliticaOpen,
    moduloLabel, rolEtiqueta, puedeEscribir,
    handleContratosSectionChange, handleSidebarContratosToggle, handleSidebarRrhhToggle, handleSidebarProdToggle,
    mostrarUsuarios, mostrarGestionRoles, mostrarAuditoria, mostrarConfigCorreo,
    mostrarContratos, mostrarRHum, mostrarProduccion, mostrarEmpleados,
    mostrarAsistencias, mostrarCertificaciones, mostrarCursos, mostrarEvalcapacitacion,
    mostrarEvaluaciones, mostrarObjetivos, mostrarSalarios, mostrarVacaciones,
    mostrarTurnosTrabajo, mostrarGruposTrabajo, mostrarSanciones, mostrarReconocimientos,
    mostrarJubilaciones, mostrarSegSeguridad, mostrarSeguridad, mostrarCargos,
    mostrarDepartamentos, mostrarCertMedicos, mostrarEvalMedicas, mostrarSacrificio,
    mostrarMatadero, mostrarLeche, onProfilePhotoUpdated,
  } = props;

  return (
    <div className="dashboard-shell d-flex vh-100" style={{ overflow: 'hidden' }}>
      <div className="dashboard-sidebar vh-100 p-4 d-flex flex-column shadow-lg" style={{ width: sidebarWidth, minWidth: sidebarWidth }}>
        <div className="text-white mb-2 pb-4 border-bottom dashboard-sidebar-divider">
          <div className="dashboard-sidebar-brand mb-2">
            <img src={logoAepg} alt="Logo AEPG" className="dashboard-sidebar-brand-logo" />
            <h3 className="fw-bold mb-0">AEPG</h3>
          </div>
          <p className="mb-0 opacity-75">Bienvenido, {user.nombre} </p>
        </div>

        <Nav className="flex-column flex-grow-1 dashboard-sidebar-nav" activeKey={key} onSelect={handleNavSelect}>
          {mostrarUsuarios && (
            <Nav.Item className="mb-2">
              <Nav.Link eventKey="usuarios" className="dashboard-nav-link rounded-3 p-1">
                <i className="bi bi-person-badge me-2" aria-hidden="true"></i>Usuarios
              </Nav.Link>
            </Nav.Item>
          )}
          {mostrarGestionRoles && (
            <Nav.Item className="mb-2">
              <Nav.Link eventKey="gestion-roles" className="dashboard-nav-link rounded-3 p-1">
                <i className="bi bi-shield-lock me-2" aria-hidden="true"></i>Roles y permisos
              </Nav.Link>
            </Nav.Item>
          )}
          {mostrarAuditoria && (
            <Nav.Item className="mb-2">
              <Nav.Link eventKey="auditoria" className="dashboard-nav-link rounded-3 p-1">
                <i className="bi bi-journal-text me-2" aria-hidden="true"></i>Auditoría
              </Nav.Link>
            </Nav.Item>
          )}
          {mostrarConfigCorreo && (
            <Nav.Item className="mb-2">
              <Nav.Link eventKey="config-correo" className="dashboard-nav-link rounded-3 p-1">
                <i className="bi bi-envelope-at me-2" aria-hidden="true"></i>Correo del sistema
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
              show={dropdownShow('contratos', sidebarMenuOpen)}
              onToggle={(next) => !preferences.pinSubmenus && handleSidebarContratosToggle(next)}
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
              <NavDropdown.Item eventKey="contratos-archivo" active={key === 'contratos-archivo'}>
                <i className="bi bi-archive me-2" aria-hidden="true"></i>Archivo histórico
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
              show={dropdownShow('rrhh', sidebarMenuOpen)}
              onToggle={(next) => !preferences.pinSubmenus && handleSidebarRrhhToggle(next)}
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
                  <i className="bi bi-box-seam me-2" aria-hidden="true"></i>Estadística
                </span>
              }
              id="sidebar-dropdown-prod"
              className="mi-dropdown-sidebar"
              autoClose={false}
              show={dropdownShow('prod', sidebarMenuOpen)}
              onToggle={(next) => !preferences.pinSubmenus && handleSidebarProdToggle(next)}
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

        <div className="dashboard-sidebar-footer mt-auto pt-3">
          <button
            type="button"
            className={`dashboard-sidebar-config-btn w-100${key === 'app-configuracion' ? ' is-active' : ''}`}
            onClick={() => handleNavSelect('app-configuracion')}
            aria-current={key === 'app-configuracion' ? 'page' : undefined}
          >
            <i className="bi bi-gear-wide-connected me-2" aria-hidden="true" />
            Configuración
          </button>
        </div>
      </div>

      <div className="dashboard-main dashboard-main--contratos flex-grow-1 ps-4 pb-4 pe-0">
        <div className="dashboard-topbar-wave" aria-hidden="true" />
        <Navbar expand="lg" className="dashboard-topbar shadow-none py-1 px-4">
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <div className="dashboard-topbar-avatar-wrap">
              <UserProfileAvatar user={user} onPhotoUpdated={onProfilePhotoUpdated} />
              <div className="dashboard-topbar-user-meta">
                <span className="dashboard-topbar-user-name">{user.nombre}</span>
                <span className="dashboard-topbar-user-role">{rolEtiqueta(user.rol)}</span>
              </div>
            </div>
            <Nav className="ms-auto align-items-center gap-2 dashboard-topbar-actions">
              <button type="button" className="btn btn-cerrar mb-0" onClick={logout}>
                <i className="bi bi-box-arrow-right" aria-hidden="true" />
                Cerrar sesión
              </button>
            </Nav>
          </Navbar.Collapse>
        </Navbar>

        {!puedeEscribir ? (
          <div className="alert alert-info py-2 px-4 mb-0 rounded-0 border-0 small" role="status">
            Modo solo consulta: podés revisar la información; no podés crear, editar ni eliminar registros.
          </div>
        ) : null}

        <div className="dashboard-main-scroll">
          <div className="dashboard-content-layout">
          <div className="dashboard-content-main">
            {(key === 'contratos' || key === 'contratos-lista') && (
              <GestionContratos vistaInicial="contratos" user={user} onSectionChange={handleContratosSectionChange} />
            )}
            {key === 'contratos-resumen' && (
              <GestionContratos vistaInicial="resumen" user={user} onSectionChange={handleContratosSectionChange} />
            )}
            {key === 'contratos-vencimientos' && (
              <GestionContratos vistaInicial="vencimientos" user={user} onSectionChange={handleContratosSectionChange} />
            )}
            {key === 'contratos-renovaciones' && (
              <GestionContratos vistaInicial="renovaciones" user={user} onSectionChange={handleContratosSectionChange} />
            )}
            {key === 'contratos-reportes' && (
              <GestionContratos vistaInicial="reportes" user={user} onSectionChange={handleContratosSectionChange} />
            )}
            {key === 'contratos-archivo' && (
              <GestionContratos vistaInicial="archivo" user={user} onSectionChange={handleContratosSectionChange} />
            )}
            {key === 'usuarios' && mostrarUsuarios && <GestionUsuarios currentUser={user} />}
            {key === 'gestion-roles' && mostrarGestionRoles && <GestionRoles />}
            {key === 'auditoria' && mostrarAuditoria && <Auditoria />}
            {key === 'config-correo' && mostrarConfigCorreo && <ConfigCorreoServicio currentUser={user} />}
            {key === 'app-configuracion' && (
              <AppConfiguracion />
            )}
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
              <p className="dashboard-side-info__date">{formatAppDate(now, preferences.dateFormat)}</p>
              <p className="dashboard-side-info__time">
                {formatAppTime(now, preferences.timeFormat)}
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
        {mostrarRHum && key && SIDEBAR_RRHH_KEYS.has(key) && (
          <>
            <button
              type="button"
              className="btn btn-primary shadow rrhh-analitica-fab"
              onClick={() => setRrhhAnaliticaOpen(true)}
              title="6 herramientas de análisis del módulo actual (RR.HH.)"
              aria-label="Abrir 6 herramientas específicas del módulo de recursos humanos"
            >
              <i className="bi bi-bar-chart-line-fill" aria-hidden="true" />
            </button>
            <RrhhModuloHerramientas6Modal
              show={rrhhAnaliticaOpen}
              onHide={() => setRrhhAnaliticaOpen(false)}
              moduleKey={key}
              moduleLabel={moduloLabel[key] || key}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
