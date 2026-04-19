
import { useState, useEffect } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { exportRowsToExcel } from '../utils/exportExcel';
import { fmtFechaTabla } from '../utils/formatDates';
import { EditTableActionButton, DeleteTableActionButton } from './TableActionIconButtons';
import ModuleTitleBar from './ModuleTitleBar';

// Definición de categorías y sufijos
const categorias = [
    'Zenea', 'Rosafe', 'Nazareno',
    'total1', 'total2', 'total3', 'total4', 'total5', 'total'
];

const sufijos = [
    'Vacas_total', 'Vacas_ordeño', 'Produccion_total', 'Total_ventas',
    'Total_contra', 'Total_indust', 'Acopio', 'Queso_ALGIBE', 'Queso_COMP',
    'Ollo', 'Poblac_CAMP', 'Vtas_Trab', 'ORGA', 'TOTAL',
    'Recria', 'Vaq', 'Cabras', 'Torll', 'Perd'
];

// Generar todos los nombres de campo (sin fecha)
const campos = [];
categorias.forEach(cat => {
    sufijos.forEach(suf => {
        campos.push(`${cat}_${suf}`);
    });
});

const Leche = () => {
    const [registros, setRegistros] = useState([]);
    const [fecha, setFecha] = useState('');
    const [formData, setFormData] = useState({});
    const [editando, setEditando] = useState(false);
    const [fechaOriginal, setFechaOriginal] = useState('');

    // Inicializar formData con todos los campos vacíos
    useEffect(() => {
        const initial = {};
        campos.forEach(campo => initial[campo] = '');
        setFormData(initial);
    }, []);

    const getRegistros = () => {
        Axios.get('http://localhost:3001/leche')
            .then(res => {
                const datos = res.data.map(item => ({
                    ...item,
                    fecha: item.fecha ? item.fecha.split('T')[0] : item.fecha
                }));
                setRegistros(datos);
            })
            .catch(err => console.error('Error al cargar:', err));
    };

    useEffect(() => {
        getRegistros();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const limpiarForm = () => {
        const empty = {};
        campos.forEach(campo => empty[campo] = '');
        setFormData(empty);
        setFecha('');
        setEditando(false);
        setFechaOriginal('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!fecha) {
            Swal.fire('Error', 'Debes ingresar una fecha', 'warning');
            return;
        }
        const data = { fecha, ...formData };

        if (editando) {
            Axios.put(`http://localhost:3001/update-leche/${fechaOriginal}`, data)
                .then(() => {
                    Swal.fire('Actualizado', 'Registro actualizado', 'success');
                    getRegistros();
                    limpiarForm();
                })
                .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
        } else {
            Axios.post('http://localhost:3001/create-leche', data)
                .then(() => {
                    Swal.fire('Creado', 'Registro creado', 'success');
                    getRegistros();
                    limpiarForm();
                })
                .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
        }
    };

    const editarRegistro = (reg) => {
        setEditando(true);
        const fechaSolo = reg.fecha ? reg.fecha.split('T')[0] : '';
        setFechaOriginal(fechaSolo);
        setFecha(fechaSolo);

        const nuevosDatos = {};
        campos.forEach(campo => {
            nuevosDatos[campo] = reg[campo] || '';
        });
        setFormData(nuevosDatos);
    };

    const eliminarRegistro = (fecha) => {
        const fechaSolo = fecha.split('T')[0];
        Swal.fire({
            title: '¿Eliminar?',
            text: `Se eliminará el registro de fecha ${fechaSolo}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí'
        }).then(result => {


if (result.isConfirmed) {
                Axios.delete(`http://localhost:3001/delete-leche/${fechaSolo}`)
                    .then(() => {
                        Swal.fire('Eliminado', 'Registro eliminado', 'success');
                        getRegistros();
                    })
                    .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'));
            }
        });
    };

    const exportarExcel = () => {
        if (!registros.length) return;
        const rows = registros.map((r) => {
            const row = { fecha: r.fecha };
            campos.forEach((c) => {
                row[c] = r[c];
            });
            row.creado_por = r.creado_por || '';
            row.actualizado_por = r.actualizado_por || '';
            return row;
        });
        exportRowsToExcel(rows, 'Leche', `leche_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="container-fluid px-0">
            <ModuleTitleBar title="Gestión de Leche" />
            <div className="card p-3">
                
                <form onSubmit={handleSubmit}>
                    <div className="row mb-3">
                        <div className="col-md-2">
                            <label>Fecha</label>
                            <input type="date" className="form-control" value={fecha} onChange={e => setFecha(e.target.value)} required />
                        </div>
                    </div>
                    <div className="row">
                        {categorias.map(cat => (
                            <div key={cat} className="col-md-6 border p-2 mb-2">
                                <h5 className="bg-light p-1">{cat}</h5>
                                <div className="row">
                                    {sufijos.map(suf => {
                                        const nombreCampo = `${cat}_${suf}`;
                                        return (
                                            <div className="col-md-4 mb-2" key={nombreCampo}>
                                                <label className="small">{suf}</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="form-control form-control-sm"
                                                    name={nombreCampo}
                                                    value={formData[nombreCampo] || ''}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3">
                        <button type="submit" className="btn btn-success btn-form-nowrap">
                            {editando ? 'Actualizar' : 'Guardar'}
                        </button>
                        {editando && <button type="button" className="btn btn-secondary btn-form-nowrap ms-2" onClick={limpiarForm}>Cancelar</button>}
                    </div>
                </form>
                <hr />
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                    <h4 className="mb-0">Registros existentes</h4>
                    <button type="button" className="btn btn-success btn-sm btn-form-nowrap" onClick={exportarExcel} disabled={!registros.length}>
                        Exportar Excel
                    </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table table-data-compact table-bordered table-striped table-sm">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                {campos.map(campo => <th key={campo}>{campo}</th>)}
                                <th>Creado por</th>
                                <th>Actualizado por</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registros.map(reg => (
                                <tr key={reg.fecha}>
                                    <td className="text-nowrap">{fmtFechaTabla(reg.fecha)}</td>
                                    {campos.map(campo => <td key={campo}>{reg[campo]}</td>)}
                                    <td className="small">{reg.creado_por || '—'}</td>
                                    <td className="small">{reg.actualizado_por || '—'}</td>
                                    <td>
                                        <EditTableActionButton onClick={() => editarRegistro(reg)} className="me-1" />
                                        <DeleteTableActionButton onClick={() => eliminarRegistro(reg.fecha)} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Leche;