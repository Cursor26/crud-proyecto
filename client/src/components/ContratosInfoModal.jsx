import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import Axios, { API_BASE } from '../axiosConfig';
import { combinarDocumentosServidorYCache } from '../lib/contratosPdfs';
import ContratosInfoFormStack from './ContratosInfoFormStack';

function ContratosInfoModal({
  show,
  onHide,
  numeroContrato,
  fmtDisplayDate,
  getIconoEmpresa,
  getPdfsContrato,
  onVerPdf,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const num = String(numeroContrato || '').trim();

  useEffect(() => {
    if (!show || !num) {
      setData(null);
      setError('');
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    setData(null);

    Axios.get(`${API_BASE}/contratos/${encodeURIComponent(num)}/informacion`)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'No se pudo cargar la información.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [show, num]);

  const contrato = data?.contrato;
  const recordatorios = data?.recordatorios;
  const documentosServidor = Array.isArray(data?.documentos) ? data.documentos : [];
  const pdfsLocales = typeof getPdfsContrato === 'function' ? getPdfsContrato(num) : [];
  const pdfs = combinarDocumentosServidorYCache(documentosServidor, pdfsLocales);

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop="static"
      dialogClassName="modal-premium-dialog modal-minimal-dialog"
      contentClassName="modal-premium-content modal-minimal-content"
    >
      <Modal.Header closeButton className="modal-premium-header modal-minimal-header border-0">
        <div className="modal-premium-header-inner modal-minimal-header-inner">
          <span className="modal-premium-badge modal-minimal-badge">Información</span>
        </div>
      </Modal.Header>

      <Modal.Body className="modal-premium-body modal-minimal-body modal-form-body-scroll">
        {loading ? (
          <p className="text-muted small mb-0 py-2">Cargando datos del contrato…</p>
        ) : null}
        {error ? <p className="text-danger small mb-0">{error}</p> : null}
        {!loading && !error && contrato ? (
          <ContratosInfoFormStack
            contrato={contrato}
            recordatorios={recordatorios}
            pdfs={pdfs}
            numeroContrato={num}
            fmtDisplayDate={fmtDisplayDate}
            getIconoEmpresa={getIconoEmpresa}
            onVerPdf={onVerPdf}
          />
        ) : null}
      </Modal.Body>

      <Modal.Footer className="modal-premium-footer modal-minimal-footer border-0">
        <span aria-hidden="true" />
        <button type="button" className="btn btn-outline-secondary modal-minimal-btn" onClick={onHide}>
          Cerrar
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default ContratosInfoModal;
