import { useState, useEffect } from 'react';
import Axios from 'axios';

/**
 * Lista de empleados para selects y resolución de nombre por carnet (id_tabla).
 */
export function useEmpleadosOptions() {
  const [empleados, setEmpleados] = useState([]);

  useEffect(() => {
    Axios.get('http://localhost:3001/empleados?solo_activos=1')
      .then((res) => {
        const ordenados = [...res.data].sort((a, b) =>
          `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es')
        );
        setEmpleados(ordenados);
      })
      .catch((err) => console.error('Error al cargar empleados:', err));
  }, []);

  const nombrePorCarnet = (carnet) => {
    if (carnet == null || carnet === '') return '';
    const emp = empleados.find((e) => String(e.carnet_identidad) === String(carnet));
    return emp ? `${emp.nombre} ${emp.apellidos}`.trim() : '';
  };

  return { empleados, nombrePorCarnet };
}
