import RecordatoriosContratosConfig from './RecordatoriosContratosConfig';
import { usePermissions } from '../context/PermissionsContext';

function ContratosCorreoConfig() {
  const { can } = usePermissions();
  const puedeEditar = can('contratos', 'edit');
  const puedeEjecutar = can('contratos', 'approve') || puedeEditar;

  return (
    <div className="contratos-correo-config">
      <div className="alert alert-info small mb-3">
        El servidor revisa y envía los avisos de forma automática. Los correos salen solo en los hitos que configure
        abajo (p. ej. 30, 15 y 7 días antes del vencimiento), según la prioridad o el tipo de cada contrato.
      </div>
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h5 className="card-title mb-2">Recordatorios automáticos de contratos</h5>
          <RecordatoriosContratosConfig puedeEditar={puedeEditar} puedeEjecutar={puedeEjecutar} />
        </div>
      </div>
    </div>
  );
}

export default ContratosCorreoConfig;
