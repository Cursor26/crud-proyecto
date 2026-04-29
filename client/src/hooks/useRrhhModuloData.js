import { useState, useEffect, useCallback } from 'react';
import Axios from 'axios';

const initial = {
  empleados: [],
  cargos: [],
  departamentos: [],
  historial: [],
  reportePersonal: [],
  reporteConsolidado: [],
  vacaciones: [],
  turnos: [],
  grupos: [],
  sanciones: [],
  reconocimientos: [],
  jubilaciones: [],
  asistencias: [],
  certificaciones: [],
  cursos: [],
  evalcap: [],
  evaluaciones: [],
  objetivos: [],
  salarios: [],
  segseg: [],
  seguridad: [],
  certMed: [],
  evalMed: [],
};

/**
 * Carga de datos mínima por pantalla de RR.HH. para las 6 herramientas del módulo.
 */
export function useRrhhModuloData(moduleKey, show) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [data, setData] = useState(initial);

  const load = useCallback(async () => {
    if (!show || !moduleKey) return;
    setLoading(true);
    setErr('');
    const g = (url) => Axios.get(url).then((r) => r.data || []).catch(() => []);
    const k = String(moduleKey);
    try {
      const out = { ...initial, empleados: await g('/empleados') };
      if (
        [
          'empleados',
          'bajas-empleados',
          'reporte-personal',
          'cambios-cargo',
          'salarios',
          'departamentos',
          'vacaciones',
          'sanciones',
          'reconocimientos',
          'jubilaciones',
          'cargos',
        ].includes(k)
      ) {
        const [cargos, departamentos] = await Promise.all([g('/cargos'), g('/departamentos')]);
        out.cargos = cargos;
        out.departamentos = departamentos;
      }
      if (k === 'cambios-cargo') {
        out.historial = await g('/historial-laboral?limite=500');
      }
      if (k === 'reporte-personal') {
        out.reportePersonal = await g('/reporte-personal');
      }
      if (k === 'reporte-consolidado') {
        out.reporteConsolidado = await g('/reporte-consolidado-departamentos');
      }
      if (k === 'vacaciones') {
        out.vacaciones = await g('/vacaciones');
      }
      if (k === 'turnos-trabajo') {
        out.turnos = await g('/turnos-trabajo');
      }
      if (k === 'grupos-trabajo') {
        out.grupos = await g('/grupos-trabajo');
      }
      if (k === 'sanciones') {
        out.sanciones = await g('/sanciones-empleado');
      }
      if (k === 'reconocimientos') {
        out.reconocimientos = await g('/reconocimientos-empleado');
      }
      if (k === 'jubilaciones') {
        out.jubilaciones = await g('/jubilaciones-empleado');
      }
      if (k === 'asistencias') {
        out.asistencias = await g('/asistencias');
      }
      if (k === 'certificaciones') {
        out.certificaciones = await g('/certificaciones');
      }
      if (k === 'cursos') {
        out.cursos = await g('/cursos');
      }
      if (k === 'evalcapacitacion') {
        out.evalcap = await g('/evalcapacitacion');
      }
      if (k === 'evaluaciones') {
        out.evaluaciones = await g('/evaluaciones');
      }
      if (k === 'objetivos') {
        out.objetivos = await g('/objetivos');
      }
      if (k === 'salarios') {
        out.salarios = await g('/salarios');
      }
      if (k === 'segseguridad') {
        out.segseg = await g('/segseguridad');
      }
      if (k === 'seguridad') {
        out.seguridad = await g('/seguridad');
      }
      if (k === 'cargos') {
        out.cargos = await g('/cargos');
        out.departamentos = out.departamentos.length ? out.departamentos : await g('/departamentos');
      }
      if (k === 'departamentos') {
        out.departamentos = await g('/departamentos');
        out.cargos = out.cargos.length ? out.cargos : await g('/cargos');
      }
      if (k === 'cert-medicos') {
        out.certMed = await g('/certificados-medicos');
      }
      if (k === 'eval-medicas') {
        out.evalMed = await g('/evaluaciones-medicas');
      }
      setData(out);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Error al cargar datos');
      setData(initial);
    } finally {
      setLoading(false);
    }
  }, [moduleKey, show]);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, err, ...data, reload: load };
}
