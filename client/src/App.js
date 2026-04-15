import './App.css';
import { useState, useEffect } from 'react';
import Axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
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

  const handleSidebarRrhhToggle = (nextOpen) => {
    setSidebarRrhhOpen(nextOpen);
    if (nextOpen) setSidebarProdOpen(false);
  };

  const handleSidebarProdToggle = (nextOpen) => {
    setSidebarProdOpen(nextOpen);
    if (nextOpen) setSidebarRrhhOpen(false);
  };

  const handleNavSelect = (selectedKey) => {
    setKey(selectedKey);
    if (selectedKey === 'usuarios' || selectedKey === 'contratos') {
      setSidebarRrhhOpen(false);
      setSidebarProdOpen(false);
    } else if (SIDEBAR_RRHH_KEYS.has(selectedKey)) {
      setSidebarRrhhOpen(true);
      setSidebarProdOpen(false);
    } else if (SIDEBAR_PROD_KEYS.has(selectedKey)) {
      setSidebarProdOpen(true);
      setSidebarRrhhOpen(false);
    }
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

  const login = async (email, password) => {
    try {
      const response = await Axios.post('http://localhost:3001/login', { email, password });
      const { token: newToken, usuario } = response.data;
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem('user', JSON.stringify(usuario));
      setAuthToken(newToken);
      setToken(newToken);
      setUser(usuario);
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

  const mostrarSacrificio = user?.rol === 'admin' || user?.rol === 'produccion';
  const mostrarMatadero = user?.rol === 'admin' || user?.rol === 'produccion';
  const mostrarLeche = user?.rol === 'admin' || user?.rol === 'produccion';
  const mostrarAsistencias = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarCertificaciones = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarCursos = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarEvalcapacitacion = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarEvaluaciones = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarObjetivos = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarContratos = user?.rol === 'admin' || user?.rol === 'contratacion';
  const mostrarEmpleados = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarUsuarios = user?.rol === 'admin';
  const mostrarRHum = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarProduccion = user?.rol === 'admin' || user?.rol === 'produccion';
  const mostrarSalarios = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarVacaciones = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarTurnosTrabajo = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarGruposTrabajo = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarSanciones = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarReconocimientos = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarJubilaciones = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarSegSeguridad = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarSeguridad = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarCargos = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarDepartamentos = user?.rol === 'admin' || user?.rol === 'rrhh';
  const mostrarCertMedicos = user?.rol === 'admin' || user?.rol === 'rrhh' || user?.rol === 'produccion';
  const mostrarEvalMedicas = user?.rol === 'admin' || user?.rol === 'rrhh' || user?.rol === 'produccion';

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
    <div className="d-flex vh-100" style={{ overflow: 'hidden' }}>
      <div className="bg-success vh-100 p-4 d-flex flex-column shadow-lg" style={{ width: '280px', minWidth: '280px' }}>
        <div className="text-white mb-2 pb-4 border-bottom border-success">
          <h3 className="fw-bold mb-2">AEPG</h3>
          <p className="mb-0 opacity-75">Bienvenido, {user.nombre} </p>
        </div>

        <Nav className="flex-column flex-grow-1" activeKey={key} onSelect={handleNavSelect}>
          {mostrarUsuarios && (
            <Nav.Item className="mb-2">
              <Nav.Link eventKey="usuarios" className="text-white rounded-3 p-1 bg-success bg-opacity-75 hover-bg-opacity-50">
                <i className="bi bi-person-badge me-2" aria-hidden="true"></i>Usuarios
              </Nav.Link>
            </Nav.Item>
          )}

          {mostrarContratos && (
            <Nav.Item className="mb-2">
              <Nav.Link eventKey="contratos" className="text-white rounded-3 p-1 bg-success bg-opacity-75 hover-bg-opacity-50">
                <i className="bi bi-file-earmark-ruled me-2" aria-hidden="true"></i>Contratación
              </Nav.Link>
            </Nav.Item>
          )}

          {mostrarRHum && (
            <NavDropdown
              title={
                <span className="d-inline-flex align-items-center">
                  <i className="bi bi-people-fill me-2" aria-hidden="true"></i>Rec. Humanos
                </span>
              }
              id="sidebar-dropdown-rrhh"
              className="mi-dropdown-verde"
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
              className="mi-dropdown-verde"
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

      <div className="flex-grow-1 p-4 overflow-auto" style={{ backgroundColor: '#f8f9fa' }}>
        <Navbar expand="lg" className="bg-white shadow-sm rounded-3 mb-4 py-3 px-4">
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <h4>
                Bienvenido, {user.nombre} ({user.rol})
              </h4>
              <img src="/images/usuario.png" alt="" width="40" height="40" />
              <div className="d-flex justify-content-between align-items-center mb-3">
                <button type="button" className="btn btn-cerrar" onClick={logout}>
                  Cerrar sesión
                </button>
              </div>
            </Nav>
          </Navbar.Collapse>
        </Navbar>

        {key === 'contratos' && <GestionContratos />}

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
    </div>
  );
}

export default App;
