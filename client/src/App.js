import { useState, useEffect, useMemo } from 'react';
import Axios, { API_BASE, forceSessionExpired, setVoluntaryLogoutInProgress } from './axiosConfig';
import { isTokenExpired } from './lib/jwtSession';
import { saveTrustedDeviceProfile } from './lib/trustedDeviceProfile';
import { useMailServiceStatus } from './hooks/useMailServiceStatus';
import MailServiceUnavailableBanner from './components/MailServiceUnavailableBanner';
import { mailQueueBannerMessage } from './lib/mailServiceMessages';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Nav, Navbar, NavDropdown } from 'react-bootstrap';

import Login from './components/Login';
import GestionContratos from './components/GestionContratos';
import GestionUsuarios from './components/GestionUsuarios';
import GestionRoles from './components/GestionRoles';
import Auditoria from './components/Auditoria';
import { PermissionsProvider, usePermissions } from './context/PermissionsContext';
import { createLegacyCan } from './lib/legacyRolAccess';
import { hasAnyPermission } from './lib/rbacModules';
import GestionConfiguracion from './components/GestionConfiguracion';
import ConfigCorreoServicio from './components/ConfigCorreoServicio';
import { PuedeEscribirProvider } from './context/PuedeEscribirContext';
import { AppPreferencesProvider, useAppPreferences } from './context/AppPreferencesContext';
import {
  ContratosNavCountsProvider,
  contratosSidebarBadgeCount,
  useContratosNavCounts,
} from './context/ContratosNavCountsContext';
import { NavPrefsInitializer, PinSubmenusSync, useDashboardNavHandlers } from './hooks/useDashboardNav';
import useNativeTooltips from './hooks/useNativeTooltips';
import { formatAppDate, formatAppTime } from './lib/formatAppDate';
import logoAepg from './images/logo-aepg.png';
import UserProfileAvatar from './components/UserProfileAvatar';
import DnaThreeWidget from './components/DnaThreeWidget';
import {
  CONTRATOS_KEY_TO_SECTION,
  CONTRATOS_MENU_SECTIONS,
  CONTRATOS_SECTION_TO_KEY,
  contratosNavKeyAllowed,
  getContratosAllowedNavKeys,
  getContratosSidebarNavItems,
} from './lib/contratosNavSections';

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
const SIDEBAR_CONTRATOS_KEYS = new Set(CONTRATOS_MENU_SECTIONS.map((section) => section.key));

function contratosSectionFromNavKey(navKey) {
  return CONTRATOS_KEY_TO_SECTION[navKey] || 'contratos';
}

function isContratosNavKey(navKey) {
  return navKey === 'contratos' || SIDEBAR_CONTRATOS_KEYS.has(navKey);
}

function ContratosSidebarNavContent({ item }) {
  const counts = useContratosNavCounts();
  const badge = contratosSidebarBadgeCount(item.sectionId, counts);
  return (
    <>
      <i className={`bi ${item.icon} me-2 dashboard-sidebar-icon`} aria-hidden="true" />
      <span className="dashboard-sidebar-label dashboard-sidebar-label--with-badge">{item.label}</span>
      {badge > 0 ? (
        <span className="dashboard-sidebar-badge" aria-label={`${badge} pendiente(s)`}>
          {badge}
        </span>
      ) : null}
    </>
  );
}

function ContratosSidebarLinks({ itemClassName = 'mb-2', linkClassName = 'dashboard-nav-link p-1' }) {
  const { can } = usePermissions();
  const items = getContratosSidebarNavItems(can);
  return items.map((item) => (
    <Nav.Item key={item.eventKey} className={itemClassName}>
      <Nav.Link eventKey={item.eventKey} className={linkClassName} title={item.label}>
        <ContratosSidebarNavContent item={item} />
      </Nav.Link>
    </Nav.Item>
  ));
}

function SidebarLinkLabel({ icon, label }) {
  return (
    <>
      <i className={`bi ${icon} me-2 dashboard-sidebar-icon`} aria-hidden="true" />
      <span className="dashboard-sidebar-label">{label}</span>
    </>
  );
}

const setAuthToken = (token) => {
  if (token) {
    Axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete Axios.defaults.headers.common['Authorization'];
  }
};

const tokenInicial = localStorage.getItem(TOKEN_KEY);
if (tokenInicial) {
  if (isTokenExpired(tokenInicial)) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user');
    localStorage.removeItem(PERMISOS_KEY);
  } else {
    setAuthToken(tokenInicial);
  }
}

function App() {
  const [user, setUser] = useState(null);
  const [permisos, setPermisos] = useState(loadPermisosFromStorage);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(
    tokenInicial && !isTokenExpired(tokenInicial) ? tokenInicial : null
  );

  const [key, setKey] = useState('');
  /** A la vez solo un submenú lateral abierto: 'contratos' | null */
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(null);
  const [now, setNow] = useState(new Date());

  const moduloLabel = {
    usuarios: 'Gestión de usuarios',
    'gestion-roles': 'Roles y permisos',
    auditoria: 'Auditoría de seguridad',
    'config-aplicacion': 'Configuración · Aplicación',
    'config-correo': 'Correo del sistema',
    contratos: 'Contratación',
    'contratos-resumen': 'Contratación · Resumen',
    'contratos-lista': 'Contratación · Contratos',
    'contratos-rechazados': 'Contratación · Contratos rechazados',
    'contratos-verificar': 'Contratación · Verificar contrato',
    'contratos-pendientes': 'Contratación · Aprobar contrato',
    'contratos-vencimientos': 'Contratación · Vencimientos',
    'contratos-renovaciones': 'Contratación · Renovaciones',
    'contratos-correo': 'Contratación · Correo',
    'contratos-reportes': 'Contratación · Reportes',
    'contratos-archivo': 'Contratación · Archivo histórico',
    'contratos-tipos': 'Contratación · Tipos de contrato',
    'contratos-auditoria': 'Contratación · Auditoría',
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
      selectedKey === 'config-aplicacion' ||
      selectedKey === 'contratos'
    ) {
      setSidebarMenuOpen(null);
    } else if (SIDEBAR_CONTRATOS_KEYS.has(selectedKey)) {
      setSidebarMenuOpen('contratos');
    }
  };

  const handleContratosSectionChange = (sectionId) => {
    const nextKey = CONTRATOS_SECTION_TO_KEY[sectionId];
    if (!nextKey || nextKey === key) return;
    handleNavSelect(nextKey);
  };

  useEffect(() => {
    if (!token) return undefined;

    const checkExpiry = () => {
      const current = localStorage.getItem(TOKEN_KEY);
      if (!current || isTokenExpired(current)) {
        forceSessionExpired();
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 30000);
    return () => clearInterval(interval);
  }, [token]);

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
          const stored = loadPermisosFromStorage();
          if (stored && hasAnyPermission(stored)) {
            setPermisos(stored);
          } else {
            localStorage.removeItem(PERMISOS_KEY);
            setPermisos(null);
          }
        });
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
      saveTrustedDeviceProfile({
        email: usuarioNormalizado.email,
        nombre: usuarioNormalizado.nombre,
        fotoPerfil: usuarioNormalizado.fotoPerfil || null,
      });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al conectar' };
    }
  };

  const logout = async () => {
    setVoluntaryLogoutInProgress(true);
    try {
      await Axios.post('/auth/logout');
    } catch {
      /* registrar logout es best-effort */
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('user');
      localStorage.removeItem(PERMISOS_KEY);
      setAuthToken(null);
      setToken(null);
      setUser(null);
      setPermisos(null);
      setKey('');
      setSidebarMenuOpen(null);
      window.setTimeout(() => setVoluntaryLogoutInProgress(false), 800);
    }
  };

  const handleProfilePhotoUpdated = (fotoPerfil) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, fotoPerfil: fotoPerfil || null };
      localStorage.setItem('user', JSON.stringify(next));
      saveTrustedDeviceProfile({
        email: next.email,
        nombre: next.nombre,
        fotoPerfil: next.fotoPerfil,
      });
      return next;
    });
  };

  const handleProfileUpdated = (patch) => {
    if (patch?.token) {
      localStorage.setItem(TOKEN_KEY, patch.token);
      setAuthToken(patch.token);
      setToken(patch.token);
    }
    setUser((prev) => {
      if (!prev) return prev;
      const { token: _token, ...rest } = patch || {};
      const next = { ...prev, ...rest };
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
        handleProfileUpdated={handleProfileUpdated}
        navKey={key}
        setKey={setKey}
        sidebarMenuOpen={sidebarMenuOpen}
        setSidebarMenuOpen={setSidebarMenuOpen}
        now={now}
        handleNavSelect={handleNavSelect}
        handleContratosSectionChange={handleContratosSectionChange}
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
    handleProfileUpdated,
    navKey,
    setKey,
    sidebarMenuOpen,
    setSidebarMenuOpen,
    now,
    handleNavSelect,
    handleContratosSectionChange,
    handleSidebarContratosToggle,
    moduloLabel,
  } = props;

  const { can, puedeEscribir } = usePermissions();
  const mailStatus = useMailServiceStatus(true);
  const necesitaCorreo =
    can('contratos', 'approve') ||
    can('contratos', 'edit') ||
    can('usuarios', 'view') ||
    can('usuarios', 'edit');

  const mostrarUsuarios = can('usuarios', 'view');
  const mostrarGestionRoles = can('usuarios', 'edit') || can('usuarios', 'create');
  const mostrarAuditoria = can('auditoria', 'view');
  const mostrarConfigApp = can('configuracion', 'view');
  const mostrarCorreoSistema = can('usuarios', 'view');
  const mostrarContratos = can('contratos', 'view');

  /** Solo Contratación + Configuración: menú lateral plano (sin desplegable). */
  const menuContratacionPlano = useMemo(
    () =>
      mostrarContratos &&
      !mostrarUsuarios &&
      !mostrarGestionRoles &&
      !mostrarAuditoria &&
      !mostrarCorreoSistema,
    [mostrarContratos, mostrarUsuarios, mostrarGestionRoles, mostrarAuditoria, mostrarCorreoSistema]
  );

  const allowedModuleKeys = useMemo(() => {
    const keys = new Set();
    if (mostrarConfigApp) keys.add('config-aplicacion');
    if (mostrarUsuarios) keys.add('usuarios');
    if (mostrarGestionRoles) keys.add('gestion-roles');
    if (mostrarAuditoria) keys.add('auditoria');
    if (mostrarCorreoSistema) keys.add('config-correo');
    if (mostrarContratos) getContratosAllowedNavKeys(can).forEach((k) => keys.add(k));
    return keys;
  }, [can, mostrarConfigApp, mostrarUsuarios, mostrarGestionRoles, mostrarAuditoria, mostrarCorreoSistema, mostrarContratos]);

  useEffect(() => {
    if (!navKey || allowedModuleKeys.has(navKey)) return;
    const next = [...allowedModuleKeys][0];
    if (next) setKey(next);
  }, [navKey, allowedModuleKeys, setKey]);

  const rolEtiqueta = (r) => {
    if (r === 'admin') return 'Administrador';
    if (r === 'director') return 'Director (consulta)';
    if (r === 'contratacion') return 'Contratación';
    if (r === 'abogado') return 'Abogado Revisor Jurídico';
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
    <ContratosNavCountsProvider>
    <NavPrefsInitializer
      user={user}
      allowedKeys={allowedModuleKeys}
      setKey={setKey}
      setSidebarMenuOpen={setSidebarMenuOpen}
    />
    <PinSubmenusSync navKey={navKey} setSidebarMenuOpen={setSidebarMenuOpen} />
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
      now={now}
      moduloLabel={moduloLabel}
      rolEtiqueta={rolEtiqueta}
      puedeEscribir={puedeEscribir}
      allowedModuleKeys={allowedModuleKeys}
      onProfilePhotoUpdated={handleProfilePhotoUpdated}
      onProfileUpdated={handleProfileUpdated}
      mostrarUsuarios={mostrarUsuarios}
      mostrarGestionRoles={mostrarGestionRoles}
      mostrarAuditoria={mostrarAuditoria}
      mostrarConfigApp={mostrarConfigApp}
      mostrarCorreoSistema={mostrarCorreoSistema}
      mostrarContratos={mostrarContratos}
      menuContratacionPlano={menuContratacionPlano}
      mailStatus={mailStatus}
      necesitaCorreo={necesitaCorreo}
    />
    </ContratosNavCountsProvider>
    </PuedeEscribirProvider>
    </AppPreferencesProvider>
  );
}

function DashboardShell(props) {
  const { preferences, resolved } = useAppPreferences();
  const { can } = usePermissions();
  useNativeTooltips();
  const contratosSidebarItems = useMemo(() => getContratosSidebarNavItems(can), [can]);
  const { handleNavSelect, dropdownShow } = useDashboardNavHandlers({
    user: props.user,
    setKey: props.setKey,
    setSidebarMenuOpen: props.setSidebarMenuOpen,
    baseNavSelect: props.handleNavSelect,
  });
  const sidebarWidth = resolved.sidebarWidth.width;
  const {
    user, logout, navKey: key, sidebarMenuOpen, setSidebarMenuOpen, now,
    moduloLabel, rolEtiqueta, puedeEscribir,
    handleContratosSectionChange, handleSidebarContratosToggle,
    mostrarConfigApp,
    mostrarUsuarios, mostrarGestionRoles, mostrarAuditoria, mostrarCorreoSistema,
    mostrarContratos, menuContratacionPlano, onProfilePhotoUpdated, onProfileUpdated,
    mailStatus, necesitaCorreo,
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
              <Nav.Link eventKey="usuarios" className="dashboard-nav-link p-1" title="Usuarios">
                <SidebarLinkLabel icon="bi-person-badge" label="Usuarios" />
              </Nav.Link>
            </Nav.Item>
          )}
          {mostrarGestionRoles && (
            <Nav.Item className="mb-2">
              <Nav.Link eventKey="gestion-roles" className="dashboard-nav-link p-1" title="Roles y permisos">
                <SidebarLinkLabel icon="bi-shield-lock" label="Roles y permisos" />
              </Nav.Link>
            </Nav.Item>
          )}
          {mostrarAuditoria && (
            <Nav.Item className="mb-2">
              <Nav.Link eventKey="auditoria" className="dashboard-nav-link p-1" title="Auditoría">
                <SidebarLinkLabel icon="bi-journal-text" label="Auditoría" />
              </Nav.Link>
            </Nav.Item>
          )}
          {mostrarCorreoSistema && (
            <Nav.Item className="mb-2">
              <Nav.Link eventKey="config-correo" className="dashboard-nav-link p-1" title="Correo del sistema">
                <SidebarLinkLabel icon="bi-envelope-at" label="Correo del sistema" />
              </Nav.Link>
            </Nav.Item>
          )}
          {mostrarContratos && menuContratacionPlano && (
            <div className="dashboard-sidebar-flat-group mb-2">
              <div className="dashboard-sidebar-section-title" role="presentation">
                <i className="bi bi-file-earmark-ruled me-2" aria-hidden="true" />
                Contratación
              </div>
              <ContratosSidebarLinks
                itemClassName="dashboard-sidebar-flat-item"
                linkClassName="dashboard-nav-link dashboard-nav-link--nested p-1"
              />
            </div>
          )}
          {mostrarContratos && !menuContratacionPlano && (
            <NavDropdown
              title={
                <span className="d-inline-flex align-items-center">
                  <i className="bi bi-file-earmark-ruled me-2 dashboard-sidebar-icon" aria-hidden="true" />
                  <span className="dashboard-sidebar-label">Contratación</span>
                </span>
              }
              id="sidebar-dropdown-contratos"
              className="mi-dropdown-sidebar mb-2"
              autoClose={false}
              show={dropdownShow('contratos', sidebarMenuOpen)}
              onToggle={(next) => {
                if (preferences.pinSubmenus) {
                  setSidebarMenuOpen('all');
                  return;
                }
                handleSidebarContratosToggle(next);
              }}
            >
              {contratosSidebarItems.map((item) => (
                <NavDropdown.Item
                  key={item.eventKey}
                  eventKey={item.eventKey}
                  active={key === item.eventKey}
                  className="dashboard-sidebar-dropdown-item"
                >
                  <ContratosSidebarNavContent item={item} />
                </NavDropdown.Item>
              ))}
            </NavDropdown>
          )}
        </Nav>

        <div className="dashboard-sidebar-footer mt-auto pt-3">
          <button
            type="button"
            className={`dashboard-sidebar-config-btn w-100${key === 'config-aplicacion' ? ' is-active' : ''}`}
            onClick={() => handleNavSelect('config-aplicacion')}
            aria-current={key === 'config-aplicacion' ? 'page' : undefined}
            disabled={!mostrarConfigApp}
          >
            <i className="bi bi-gear-wide-connected me-2 dashboard-sidebar-icon" aria-hidden="true" />
            <span className="dashboard-sidebar-label">Configuración</span>
          </button>
        </div>
      </div>

      <div className="dashboard-main dashboard-main--contratos flex-grow-1 ps-4 pb-4 pe-0">
        <div className="dashboard-topbar-wave" aria-hidden="true" />
        <Navbar expand="lg" className="dashboard-topbar shadow-none py-1 px-4">
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <div className="dashboard-topbar-avatar-wrap">
              <div className="dashboard-topbar-user-meta">
                <span className="dashboard-topbar-user-name">{user.nombre}</span>
                <span className="dashboard-topbar-user-role">{rolEtiqueta(user.rol)}</span>
              </div>
              <UserProfileAvatar user={user} onPhotoUpdated={onProfilePhotoUpdated} />
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

        <MailServiceUnavailableBanner
          visible={
            necesitaCorreo &&
            !mailStatus.loading &&
            (mailStatus.smtp_disponible === false || (mailStatus.correos_pendientes || 0) > 0)
          }
          message={mailQueueBannerMessage(mailStatus)}
        />

        <div className="dashboard-main-scroll">
          <div className="dashboard-content-layout">
          <div className="dashboard-content-main">
            {isContratosNavKey(key) && contratosNavKeyAllowed(key, can) && (
              <GestionContratos
                vistaInicial={contratosSectionFromNavKey(key)}
                user={user}
                onSectionChange={handleContratosSectionChange}
              />
            )}
            {key === 'usuarios' && mostrarUsuarios && <GestionUsuarios currentUser={user} />}
            {key === 'gestion-roles' && mostrarGestionRoles && <GestionRoles />}
            {key === 'auditoria' && mostrarAuditoria && <Auditoria />}
            {key === 'config-correo' && mostrarCorreoSistema && (
              <ConfigCorreoServicio currentUser={user} mostrarSmtp mostrarRecordatorios={false} smtpPrimero />
            )}
            {key === 'config-aplicacion' && mostrarConfigApp && (
              <GestionConfiguracion currentUser={user} onProfileUpdated={onProfileUpdated} />
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
      </div>
    </div>
  );
}

export default App;
