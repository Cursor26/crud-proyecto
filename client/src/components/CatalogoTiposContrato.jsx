import { useState, useEffect, useCallback } from 'react';
import Axios, { API_BASE } from '../axiosConfig';
import Swal from 'sweetalert2';
import { usePermissions } from '../context/PermissionsContext';
import { FormModal } from './FormModal';
import { BTN_ANADIR, BTN_ANADIR_MD, BTN_CONSULTAR, BTN_ELIMINAR } from '../lib/actionButtonClasses';
import { TIP } from '../lib/actionTooltips';

function CatalogoTiposContrato({ onCatalogChange }) {
  const { can } = usePermissions();
  const puedeCrear = can('contratos', 'create');
  const puedeEditar = can('contratos', 'edit');

  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(false);
  const [idEdit, setIdEdit] = useState(null);
  const [nombre, setNombre] = useState('');
  const [activo, setActivo] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    Axios.get(`${API_BASE}/catalogo/tipos-contrato`, { params: { todos: 1 } })
      .then((res) => setTipos(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        setTipos([]);
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const limpiarModal = () => {
    setEditando(false);
    setIdEdit(null);
    setNombre('');
    setActivo(true);
  };

  const abrirNuevo = () => {
    limpiarModal();
    setShowModal(true);
  };

  const abrirEditar = (row) => {
    setEditando(true);
    setIdEdit(row.id_tipo_contrato);
    setNombre(row.nombre || '');
    setActivo(Number(row.activo) !== 0);
    setShowModal(true);
  };

  const notificarCambio = () => {
    cargar();
    if (typeof onCatalogChange === 'function') onCatalogChange();
  };

  const guardar = async () => {
    const nom = nombre.trim();
    if (!nom) {
      await Swal.fire('Datos incompletos', 'Indique el nombre del tipo.', 'warning');
      return;
    }
    setGuardando(true);
    try {
      if (editando && idEdit) {
        await Axios.put(`${API_BASE}/catalogo/tipos-contrato/${idEdit}`, {
          nombre: nom,
          activo: activo ? 1 : 0,
        });
        await Swal.fire('Guardado', 'Tipo de contrato actualizado.', 'success');
      } else {
        await Axios.post(`${API_BASE}/catalogo/tipos-contrato`, { nombre: nom });
        await Swal.fire('Creado', 'Tipo de contrato registrado.', 'success');
      }
      setShowModal(false);
      limpiarModal();
      notificarCambio();
    } catch (err) {
      await Swal.fire('Error', err.response?.data?.message || err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (row) => {
    if (!puedeEditar) return;
    const nuevoActivo = Number(row.activo) === 0 ? 1 : 0;
    if (nuevoActivo === 0 && Number(row.num_contratos) > 0) {
      const ok = await Swal.fire({
        icon: 'question',
        title: '¿Desactivar tipo?',
        html: `<p>El tipo <strong>${row.nombre}</strong> está en <strong>${row.num_contratos}</strong> contrato(s).</p>
          <p class="mb-0">No se borrará: dejará de aparecer al crear contratos nuevos.</p>`,
        showCancelButton: true,
        confirmButtonText: 'Sí, desactivar',
      });
      if (!ok.isConfirmed) return;
    }
    try {
      await Axios.put(`${API_BASE}/catalogo/tipos-contrato/${row.id_tipo_contrato}`, {
        activo: nuevoActivo,
      });
      notificarCambio();
    } catch (err) {
      await Swal.fire('Error', err.response?.data?.message || err.message, 'error');
    }
  };

  return (
    <div className="catalogo-tipos-contrato">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <p className="text-muted small mb-0">
          Administre los tipos disponibles al registrar contratos. Los tipos en uso solo se pueden desactivar, no eliminar.
        </p>
        {puedeCrear && (
          <button
            type="button"
            className={`${BTN_ANADIR_MD} btn-sm`}
            onClick={abrirNuevo}
            title={TIP.nuevoTipoContrato}
          >
            <i className="bi bi-plus-lg me-1" aria-hidden="true" />
            Nuevo tipo
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-muted">Cargando catálogo…</p>
      ) : tipos.length === 0 ? (
        <p className="text-muted">No hay tipos registrados. Cree el primero con el botón superior.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Nombre</th>
                <th className="text-center">Contratos</th>
                <th className="text-center">Estado</th>
                {puedeEditar && <th className="text-end">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {tipos.map((row) => (
                <tr key={row.id_tipo_contrato} className={Number(row.activo) === 0 ? 'table-secondary' : ''}>
                  <td>{row.nombre}</td>
                  <td className="text-center">{row.num_contratos ?? 0}</td>
                  <td className="text-center">
                    {Number(row.activo) !== 0 ? (
                      <span className="badge text-bg-success">Activo</span>
                    ) : (
                      <span className="badge text-bg-secondary">Inactivo</span>
                    )}
                  </td>
                  {puedeEditar && (
                    <td className="text-end">
                      <button
                        type="button"
                        className={`${BTN_CONSULTAR} me-1`}
                        onClick={() => abrirEditar(row)}
                        title={TIP.editarTipoContrato}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={Number(row.activo) !== 0 ? BTN_ELIMINAR : BTN_ANADIR}
                        onClick={() => toggleActivo(row)}
                        title={
                          Number(row.activo) !== 0 ? TIP.desactivarTipoContrato : TIP.activarTipoContrato
                        }
                      >
                        {Number(row.activo) !== 0 ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormModal
        show={showModal}
        onHide={() => {
          setShowModal(false);
          limpiarModal();
        }}
        title={editando ? 'Editar tipo de contrato' : 'Nuevo tipo de contrato'}
        subtitle=""
        onPrimary={guardar}
        primaryLabel={guardando ? 'Guardando…' : editando ? 'Actualizar' : 'Guardar'}
        primaryDisabled={guardando || (!puedeCrear && !editando) || (editando && !puedeEditar)}
      >
        <div className="mb-3">
          <label className="form-label" htmlFor="tipo-contrato-nombre">
            Nombre
          </label>
          <input
            id="tipo-contrato-nombre"
            type="text"
            className="form-control"
            maxLength={100}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Servicio, Compra, Arrendamiento"
            title="Nombre del tipo que aparecerá al registrar contratos"
          />
        </div>
        {editando && (
          <div className="form-check form-switch">
            <input
              id="tipo-contrato-activo"
              type="checkbox"
              className="form-check-input"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              title={TIP.tipoContratoActivo}
            />
            <label className="form-check-label" htmlFor="tipo-contrato-activo">
              Activo (visible al crear contratos)
            </label>
          </div>
        )}
      </FormModal>
    </div>
  );
}

export default CatalogoTiposContrato;
