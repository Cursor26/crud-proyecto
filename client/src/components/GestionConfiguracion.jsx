import ModuleTitleBar from './ModuleTitleBar';
import AppConfiguracion from './AppConfiguracion';
import { usePermissions } from '../context/PermissionsContext';

function GestionConfiguracion() {
  const { can } = usePermissions();
  const mostrarAplicacion = can('configuracion', 'view');

  if (!mostrarAplicacion) {
    return (
      <div className="container-fluid px-0">
        <p className="text-muted">No tiene permiso para ver la configuración.</p>
      </div>
    );
  }

  return (
    <div className="container-fluid px-0 gestion-config-page">
      <ModuleTitleBar title="Configuración" />
      <AppConfiguracion embedded />
    </div>
  );
}

export default GestionConfiguracion;
