import { useRef, useState } from 'react';
import Swal from 'sweetalert2';
import {
  SUPLEMENTO_ACCEPT,
  esArchivoSuplementoValido,
  etiquetaTipoSuplemento,
  renumerarAnexosLista,
} from '../lib/contratosAnexos';

const MAX_ANEXOS = 20;

const anexoTituloAyuda = (max) =>
  `No es obligatorio adjuntar archivos; puede guardar solo con la opción activada (máx. ${max}, 5 MB c/u).`;

function ContratosAnexosField({
  numeroContrato,
  activo,
  items,
  onChange,
  onVerDocumento,
  onEliminarServidor,
  disabled,
}) {
  const inputRef = useRef(null);
  const [tipoImport, setTipoImport] = useState('pdf');
  const lista = Array.isArray(items) ? items : [];
  const anexosActivos = Boolean(activo);

  const actualizar = (patch) => {
    onChange({
      activo: patch.activo !== undefined ? patch.activo : anexosActivos,
      items: patch.items !== undefined ? patch.items : lista,
    });
  };

  const eliminarAnexosEnServidor = async (anexos) => {
    if (typeof onEliminarServidor !== 'function') return;
    for (const anx of anexos) {
      const serverId = anx?.serverId != null ? Number(anx.serverId) : null;
      if (!Number.isFinite(serverId) || serverId <= 0) continue;
      try {
        await onEliminarServidor(anx);
      } catch (err) {
        if (err?.response?.status !== 404) throw err;
      }
    }
  };

  const toggleActivo = async (checked) => {
    if (!checked) {
      if (lista.length > 0) {
        const cantidad = lista.length;
        const result = await Swal.fire({
          title: '¿Desactivar anexos?',
          html:
            cantidad === 1
              ? 'Hay <strong>1 documento</strong> en anexo. Si desactiva la opción, se eliminará.'
              : `Hay <strong>${cantidad} documentos</strong> en anexo. Si desactiva la opción, se eliminarán.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, desactivar y eliminar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#dc2626',
        });
        if (!result.isConfirmed) return;
        try {
          await eliminarAnexosEnServidor(lista);
        } catch (err) {
          Swal.fire(
            'Error',
            err?.response?.data?.message || err?.message || 'No se pudieron eliminar los anexos.',
            'error'
          );
          return;
        }
      }
      actualizar({ activo: false, items: [] });
      return;
    }
    actualizar({ activo: true, items: lista });
  };

  const abrirSelector = () => {
    if (!anexosActivos) return;
    if (!String(numeroContrato || '').trim()) {
      Swal.fire('Número requerido', 'Primero escriba el número de contrato.', 'info');
      return;
    }
    if (lista.length >= MAX_ANEXOS) {
      Swal.fire('Límite alcanzado', `Máximo ${MAX_ANEXOS} anexos por contrato.`, 'info');
      return;
    }
    inputRef.current?.click();
  };

  const manejarArchivo = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !anexosActivos) return;

    if (!esArchivoSuplementoValido(file, tipoImport)) {
      Swal.fire(
        'Archivo inválido',
        tipoImport === 'word'
          ? 'Seleccione un Word (.doc o .docx) de hasta 5 MB.'
          : 'Seleccione un PDF válido de hasta 5 MB.',
        'warning'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      const nuevo = {
        id: `anx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        numero: lista.length + 1,
        nombre: file.name,
        tipo: tipoImport === 'word' ? 'word' : 'pdf',
        dataUrl,
        serverId: null,
      };
      actualizar({ activo: true, items: renumerarAnexosLista([...lista, nuevo]) });
    };
    reader.readAsDataURL(file);
  };

  const quitar = async (id) => {
    const anx = lista.find((s) => s.id === id);
    const serverId = anx?.serverId != null ? Number(anx.serverId) : null;
    const tieneServer = Number.isFinite(serverId) && serverId > 0;
    if (tieneServer && typeof onEliminarServidor === 'function') {
      try {
        await onEliminarServidor(anx);
      } catch (err) {
        if (err?.response?.status !== 404) {
          Swal.fire('Error', err?.response?.data?.message || err?.message || 'No se pudo quitar el archivo.', 'error');
          return;
        }
      }
    }
    const restantes = renumerarAnexosLista(lista.filter((s) => s.id !== id));
    actualizar({ activo: anexosActivos, items: restantes });
  };

  return (
    <div className="minimal-field contrato-anexos-field">
      <div className="contrato-anexos-header d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <div className="form-check form-switch mb-0 contrato-anexos-switch">
          <input
            className="form-check-input"
            type="checkbox"
            id="contratoAnexosActivo"
            checked={anexosActivos}
            onChange={(e) => {
              void toggleActivo(e.target.checked);
            }}
            disabled={disabled}
          />
          <label
            className="form-check-label contrato-anexos-label-tip"
            htmlFor="contratoAnexosActivo"
            title={anexoTituloAyuda(MAX_ANEXOS)}
          >
            Agregar anexo <span className="text-muted fw-normal">(opcional)</span>
          </label>
        </div>

        {anexosActivos ? (
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <div className="contrato-suplementos-tipo-toggle btn-group btn-group-sm" role="group" aria-label="Tipo de anexo">
              <button
                type="button"
                className={`btn ${tipoImport === 'pdf' ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => setTipoImport('pdf')}
                disabled={disabled}
              >
                PDF
              </button>
              <button
                type="button"
                className={`btn ${tipoImport === 'word' ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => setTipoImport('word')}
                disabled={disabled}
              >
                Word
              </button>
            </div>
            {!disabled && (
              <button
                type="button"
                className="contrato-contactos-notif-add"
                onClick={abrirSelector}
                title={`Agregar anexo (${etiquetaTipoSuplemento(tipoImport)})`}
                aria-label="Agregar anexo"
              >
                +
              </button>
            )}
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="d-none"
        accept={tipoImport === 'word' ? SUPLEMENTO_ACCEPT.word : SUPLEMENTO_ACCEPT.pdf}
        onChange={manejarArchivo}
      />

      {anexosActivos ? (
        <>
          {lista.length === 0 ? (
            <p className="text-muted small mb-2">
              Elija <strong>PDF</strong> o <strong>Word</strong> y pulse <strong>+</strong> para importar cada anexo (Anexo 1, 2, 3…).
            </p>
          ) : (
            <ul className="list-unstyled mb-2 contrato-suplementos-list">
              {lista.map((anx) => (
                <li key={anx.id} className="contrato-suplementos-list__item">
                  <span className="contrato-suplementos-list__num" title={`Anexo ${anx.numero}`}>
                    {anx.numero}
                  </span>
                  <span
                    className={`contrato-suplementos-list__tipo contrato-suplementos-list__tipo--${anx.tipo === 'word' ? 'word' : 'pdf'}`}
                  >
                    {etiquetaTipoSuplemento(anx.tipo)}
                  </span>
                  <span className="contrato-suplementos-list__nombre" title={anx.nombre}>
                    {anx.nombre}
                  </span>
                  <div className="contrato-suplementos-list__actions">
                    {typeof onVerDocumento === 'function' && (anx.dataUrl || anx.serverId) && (
                      <button
                        type="button"
                        className="btn btn-sm contratos-btn-view"
                        onClick={() => onVerDocumento(anx)}
                      >
                        Ver
                      </button>
                    )}
                    {!disabled && (
                      <button
                        type="button"
                        className="btn btn-sm contratos-btn-remove"
                        onClick={() => quitar(anx.id)}
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

        </>
      ) : (
        <p className="text-muted small mb-0">
          Active la opción si este contrato lleva anexos documentales.
        </p>
      )}
    </div>
  );
}

export default ContratosAnexosField;
