import { useState, useEffect } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { Card } from 'react-bootstrap';

function GestionContratos() {
  const [contratoNumero, setContratoNumero] = useState('');
  const [contratoProveedorCliente, setContratoProveedorCliente] = useState(false);
  const [contratoEmpresa, setContratoEmpresa] = useState('');
  const [contratoSuplementos, setContratoSuplementos] = useState('');
  const [contratoVigencia, setContratoVigencia] = useState('');
  const [contratoTipo, setContratoTipo] = useState('');
  const [contratoFechaInicio, setContratoFechaInicio] = useState('');
  const [contratoFechaFin, setContratoFechaFin] = useState('');
  const [contratoVencido, setContratoVencido] = useState(false);
  const [editarContrato, setEditarContrato] = useState(false);
  const [contratosList, setContratos] = useState([]);

  const getContratos = () => {
    Axios.get('http://localhost:3001/contratos')
      .then((response) => setContratos(response.data))
      .catch((error) => console.error('Error al cargar contratos:', error));
  };

  useEffect(() => {
    getContratos();
  }, []);

  const sumarTiempo = (fechaStr) => {
    if (!fechaStr) return fechaStr;
    const fecha = new Date(fechaStr + 'T00:00:00');

    let vigencia = parseFloat(contratoVigencia);
    let entero = Math.trunc(vigencia);
    let decimal = vigencia - Math.trunc(vigencia);

    fecha.setFullYear(fecha.getFullYear() + entero);

    let diasDecimal = decimal * 365.25;
    let ParteEnteraDe_diasDecimal = Math.trunc(diasDecimal);
    console.log('cantidad de dias' + diasDecimal);

    fecha.setDate(fecha.getDate() + ParteEnteraDe_diasDecimal);

    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const addContrato = () => {
    const nuevaFechaFin = sumarTiempo(contratoFechaInicio);

    Axios.post('http://localhost:3001/create-contrato', {
      numero_contrato: contratoNumero,
      proveedor_cliente: contratoProveedorCliente ? 1 : 0,
      empresa: contratoEmpresa,
      suplementos: contratoSuplementos,
      vigencia: contratoVigencia,
      tipo_contrato: contratoTipo,
      fecha_inicio: contratoFechaInicio,
      fecha_fin: nuevaFechaFin,
      vencido: 1,
    })
      .then(() => {
        getContratos();
        limpiarContrato();
        Swal.fire('Registro exitoso', 'Contrato agregado', 'success');
      })
      .catch((error) => {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
      });
  };

  const updateContrato = () => {
    const nuevaFechaFin = sumarTiempo(contratoFechaInicio);

    Axios.put('http://localhost:3001/update-contrato', {
      numero_contrato: contratoNumero,
      proveedor_cliente: contratoProveedorCliente ? 1 : 0,
      empresa: contratoEmpresa,
      suplementos: contratoSuplementos,
      vigencia: contratoVigencia,
      tipo_contrato: contratoTipo,
      fecha_inicio: contratoFechaInicio,
      fecha_fin: nuevaFechaFin,
      vencido: 1,
    })
      .then(() => {
        getContratos();
        limpiarContrato();
        Swal.fire('Actualización exitosa', 'Contrato actualizado', 'success');
      })
      .catch((error) => {
        Swal.fire('Error', error.response?.data?.message || error.message, 'error');
      });
  };

  const deleteContrato = (val) => {
    Swal.fire({
      title: '¿Eliminar contrato?',
      text: 'Se eliminará el contrato',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.delete(`http://localhost:3001/delete-contrato/${val.numero_contrato}`)
          .then(() => {
            getContratos();
            Swal.fire('Eliminado', 'Contrato eliminado', 'success');
          })
          .catch((error) => {
            Swal.fire('Error', error.response?.data?.message || error.message, 'error');
          });
      }
    });
  };

  const editarContratoTabla = (val) => {
    setEditarContrato(true);
    setContratoNumero(val.numero_contrato);
    setContratoProveedorCliente(val.proveedor_cliente === 1);
    setContratoEmpresa(val.empresa);
    setContratoSuplementos(val.suplementos || '');
    setContratoVigencia(val.vigencia);
    setContratoTipo(val.tipo_contrato);
    setContratoFechaInicio(val.fecha_inicio ? val.fecha_inicio.substring(0, 10) : '');
    setContratoFechaFin(val.fecha_fin ? val.fecha_fin.substring(0, 10) : '');
    setContratoVencido(val.vencido === 1);
  };

  const limpiarContrato = () => {
    setContratoNumero('');
    setContratoProveedorCliente(false);
    setContratoEmpresa('');
    setContratoSuplementos('');
    setContratoVigencia('');
    setContratoTipo('');
    setContratoFechaInicio('');
    setContratoFechaFin('');
    setContratoVencido(false);
    setEditarContrato(false);
  };

  return (
    <div className="row">
      <div className="col-12">
        <h4>Gestión de Contratos</h4>
        <small className="text-muted">Administración de los contratos de la empresa</small>
        <div className="card p-3">
          <div className="row">
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="N° Contrato"
                value={contratoNumero}
                onChange={(e) => setContratoNumero(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <select
                className="form-control"
                value={contratoProveedorCliente ? 'true' : 'false'}
                onChange={(e) => setContratoProveedorCliente(e.target.value === 'true')}
              >
                <option value="true">Proveedor</option>
                <option value="false">Cliente</option>
              </select>
            </div>
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="Empresa"
                value={contratoEmpresa}
                onChange={(e) => setContratoEmpresa(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="Suplementos"
                value={contratoSuplementos}
                onChange={(e) => setContratoSuplementos(e.target.value)}
              />
            </div>
          </div>
          <div className="row mt-2">
            <div className="col-md-2">
              <input
                type="number"
                step="0.01"
                className="form-control"
                placeholder="Vigencia"
                value={contratoVigencia}
                onChange={(e) => setContratoVigencia(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <input
                type="text"
                className="form-control"
                placeholder="Tipo"
                value={contratoTipo}
                onChange={(e) => setContratoTipo(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <input
                type="date"
                className="form-control"
                value={contratoFechaInicio}
                onChange={(e) => setContratoFechaInicio(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <button type="button" className="btn btn-primary" onClick={editarContrato ? updateContrato : addContrato}>
                {editarContrato ? 'Actualizar' : 'Agregar'}
              </button>
              {editarContrato && (
                <button type="button" className="btn btn-secondary ms-2" onClick={limpiarContrato}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
          <hr />
          <table className="table table-bordered table-striped">
            <thead>
              <tr>
                <th>N° Contrato</th>
                <th>Tipo</th>
                <th>Empresa</th>
                <th>Vigencia</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Vencido</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {contratosList.map((con) => (
                <tr key={con.numero_contrato}>
                  <td>{con.numero_contrato}</td>
                  <td>{con.proveedor_cliente ? 'Proveedor' : 'Cliente'}</td>
                  <td>{con.empresa}</td>
                  <td>{con.vigencia}</td>
                  <td>{con.fecha_inicio}</td>
                  <td>{con.fecha_fin}</td>
                  <td>{con.vencido ? 'Sí' : 'No'}</td>
                  <td>
                    <button type="button" className="btn btn-sm me-2" onClick={() => editarContratoTabla(con)}>
                      <img src="/images/editar.png" alt="" width="40" height="40" />
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => deleteContrato(con)}>
                      <img src="/images/eliminar.png" alt="" width="40" height="40" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Card className="border-0 shadow-sm" />
      </div>
    </div>
  );
}

export default GestionContratos;
