import { useRef, useState } from 'react';
import Swal from 'sweetalert2';
import {
  SUPLEMENTO_ACCEPT,
  esArchivoSuplementoValido,
  etiquetaTipoSuplemento,
  renumerarSuplementosLista,
} from '../lib/contratosSuplementos';

const MAX_SUPLEMENTOS = 20;

const suplementoTituloAyuda = (max) =>
  `El número de suplemento corresponde al orden de los documentos importados (máx. ${max}, 5 MB c/u).`;

function ContratosSuplementosField({
  numeroContrato,
  suplementos,
  onChange,
  onVerDocumento,
  onEliminarServidor,
  disabled,
}) {
  const inputRef = useRef(null);
  const [tipoImport, setTipoImport] = useState('pdf');
  const lista = Array.isArray(suplementos) ? suplementos : [];

  const abrirSelector = () => {
    if (!String(numeroContrato || '').trim()) {
      Swal.fire('Número requerido', 'Primero escriba el número de contrato.', 'info');
      return;
    }
    if (lista.length >= MAX_SUPLEMENTOS) {
      Swal.fire('Límite alcanzado', `Máximo ${MAX_SUPLEMENTOS} suplementos por contrato.`, 'info');
      return;
    }
    inputRef.current?.click();
  };

  const manejarArchivo = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

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
        id: `sup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        numero: lista.length + 1,
        nombre: file.name,
        tipo: tipoImport === 'word' ? 'word' : 'pdf',
        dataUrl,
        serverId: null,
      };
      onChange(renumerarSuplementosLista([...lista, nuevo]));
    };
    reader.readAsDataURL(file);
  };

  const quitar = async (id) => {
    const sup = lista.find((s) => s.id === id);
    const serverId = sup?.serverId != null ? Number(sup.serverId) : null;
    const tieneServer = Number.isFinite(serverId) && serverId > 0;
    if (tieneServer && typeof onEliminarServidor === 'function') {
      try {
        await onEliminarServidor(sup);
      } catch (err) {
        if (err?.response?.status !== 404) {
          Swal.fire('Error', err?.response?.data?.message || err?.message || 'No se pudo quitar el archivo.', 'error');
          return;
        }
      }
    }
    onChange(renumerarSuplementosLista(lista.filter((s) => s.id !== id)));
  };

  return (
    <div className="minimal-field contrato-suplementos-field">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <label
          className="minimal-label mb-0 contrato-anexos-label-tip"
          title={suplementoTituloAyuda(MAX_SUPLEMENTOS)}
        >
          Suplementos (documentos):
        </label>
        <div className="d-flex align-items-center gap-2">
          <div className="contrato-suplementos-tipo-toggle btn-group btn-group-sm" role="group" aria-label="Tipo de documento">
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
              title={`Agregar suplemento (${etiquetaTipoSuplemento(tipoImport)})`}
              aria-label="Agregar suplemento"
            >
              +
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="d-none"
        accept={tipoImport === 'word' ? SUPLEMENTO_ACCEPT.word : SUPLEMENTO_ACCEPT.pdf}
        onChange={manejarArchivo}
      />

      {lista.length === 0 ? (
        <p className="text-muted small mb-2">
          Cada suplemento es un documento numerado (Suplemento 1, 2, 3…). Elija <strong>PDF</strong> o <strong>Word</strong> y pulse <strong>+</strong>.
        </p>
      ) : (
        <ul className="list-unstyled mb-2 contrato-suplementos-list">
          {lista.map((sup) => (
            <li key={sup.id} className="contrato-suplementos-list__item">
              <span className="contrato-suplementos-list__num" title={`Suplemento ${sup.numero}`}>
                {sup.numero}
              </span>
              <span
                className={`contrato-suplementos-list__tipo contrato-suplementos-list__tipo--${sup.tipo === 'word' ? 'word' : 'pdf'}`}
              >
                {etiquetaTipoSuplemento(sup.tipo)}
              </span>
              <span className="contrato-suplementos-list__nombre" title={sup.nombre}>
                {sup.nombre}
              </span>
              <div className="contrato-suplementos-list__actions">
                {typeof onVerDocumento === 'function' && (sup.dataUrl || sup.serverId) && (
                  <button
                    type="button"
                    className="btn btn-sm contratos-btn-view"
                    onClick={() => onVerDocumento(sup)}
                  >
                    Ver
                  </button>
                )}
                {!disabled && (
                  <button
                    type="button"
                    className="btn btn-sm contratos-btn-remove"
                    onClick={() => quitar(sup.id)}
                  >
                    Quitar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}

export default ContratosSuplementosField;
