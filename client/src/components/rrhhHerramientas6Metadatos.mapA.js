/**
 * Metadatos ayuda — bloque A (8 módulos). Alineado con rrhhHerramientas6Bloques.js
 */
export const HERR6_MAP_A = {
  empleados: [
    {
      titulo: '1 · Planta viva: dotación activa por departamento',
      queHace:
        'Agrupa a los empleados considerados activos y cuenta cuántos hay en cada departamento. Muestra la distribución de la plantilla viva por unidad, sin contar a quienes no están en alta lógica.',
      datosYValores:
        'Fuente: `GET /empleados` (pack.empleados). Activo: la función `empleadoEsActivo` (activo nulo, 1 o "1"). Campo: `departamento`; vacío se agrupa en “(sin dato)”. `agregadoPorCategoria` con tope 8 categorías. Eje Y: entero. Sin activos: barras vacías o sin datos.',
    },
    {
      titulo: '2 · Histograma de sueldos (activos con monto legible)',
      queHace:
        'Parte el rango de salario de los activos en 6 tramos y cuenta frecuencias. Sirve para ver concentración o dispersión de `salario_normal`.',
      datosYValores:
        '`histogramaSalario(activos, 6)`: solo sueldos parseables a número; el resto se excluye. Ejes: etiqueta de tramo y conteo. Si no hay sueldos válidos, el histograma queda vacío o sin barras relevantes.',
    },
    {
      titulo: '3 · Formación: nivel escolar',
      queHace:
        'Cuenta por `nivel_escolar` entre activos y muestra torta (hasta 5 entradas según el slice del agregado).',
      datosYValores:
        'Usa `contarCampoTexto` sobre activos. Vacío → “(sin dato)”. Colores: paleta fija C[]. Sin datos: gráfico sin sectores o mensaje mínimo de Recharts.',
    },
    {
      titulo: '4 · Densidad de teléfono (≥6 dígitos)',
      queHace:
        'Cuenta activos cuyo `telefono` tiene 6+ dígitos numéricos tras quitar no-numéricos (proxy de teléfono “completo”).',
      datosYValores:
        '`String(telefono).replace(/\\D/g, "").length >= 6`. No valida prefijo. Subtítulo: “Frente a N activos” (N = activos).',
    },
    {
      titulo: '5 · Diversidad de puestos (categorías distintas)',
      queHace:
        'Cuenta valores de texto distintos de `puesto` (trim) entre activos. No deduplica sinónimos.',
      datosYValores:
        '`new Set` sobre puestos no vacíos. Comparación exacta (mayúsculas cuentan). Puesto vacío no entra. Subtítulo: “Valores de texto distintos”.',
    },
    {
      titulo: '6 · Carga de seguimiento de seguridad',
      queHace:
        'Cuenta activos con `seguimiento_seguridad` con algún carácter no blanco. Indicador de cumplimentación, no de auditoría real.',
      datosYValores:
        'Criterio: `String(seguimiento_seguridad).trim().length > 0`. Subtítulo: “Activos con campo no vacío”.',
    },
  ],
  'bajas-empleados': [
    {
      titulo: '1 · Baja formalizada por mes (campo fecha baja)',
      queHace:
        'Agrupa por mes (AAAA-MM) las bajas con `fecha_baja` rellenada, solo entre empleados inactivos vía `bajasPorMes(empleados)`.',
      datosYValores:
        'Incluye inactivos con fecha no nula; el mes se deriva de la fecha (ISO o string). Sin fechas: no aportan al gráfico. Ejes: `mes` y conteo `n`.',
    },
    {
      titulo: '2 · Fichas inactivas sin sellado de fecha',
      queHace:
        'Cuenta inactivos sin `fecha_baja` (inconsistencia de carga). “A limpiar en nómina”.',
      datosYValores:
        '`!empleadoEsActivo(e) && !e.fecha_baja` (falsy: null, undefined, "" probablemente).',
    },
    {
      titulo: '3 · Frecuencia de descripción del motivo',
      queHace:
        'Agrupa `motivo_baja` (inactivos), clave recortada a 50 caracteres; `∅` si venía vacío. Hasta 8 barras frecuentes.',
      datosYValores:
        'Solo inactivos. Mapa de frecuencias ordenado desc. Gráfico de barras name/value.',
    },
    {
      titulo: '4 · Tendencia acumulada de bajas en el calendario',
      queHace:
        'A partir de la misma serie que (1), acumula el conteo mes a mes en orden cronológico (curva creciente).',
      datosYValores:
        'Datos: `{ mes, ac }` donde `ac` es suma de `n` hasta ese mes. Si (1) está vacía, no hay puntos.',
    },
    {
      titulo: '5 · Situación operativa: altas vs bajas en plantilla',
      queHace:
        'Torta con dos sectores: activos e inactivos en toda la nómina cargada.',
      datosYValores:
        'Activos = `empleadoEsActivo`; inactivos = `length - activos`. Valores = conteos enteros. Un sector puede ser 0.',
    },
    {
      titulo: '6 · Stock de inactividad por unidad',
      queHace:
        'Inactivos agregados por `departamento` (hasta 10 categorías frecuentes).',
      datosYValores:
        '`agregadoPorCategoria` sobre filtro `!activo`. Departamento vacío → “—”.',
    },
  ],
  'reporte-personal': [
    {
      titulo: '1 · Muster por departamento (vista de reporte)',
      queHace:
        'Barras por `departamento` sobre las filas de `pack.reportePersonal` (mismo dataset que abre la pantalla, según carga al refrescar).',
      datosYValores:
        '`GET /reporte-personal`. Tope 9. Vacío → “—”. Si el array va vacío, el gráfico no tiene series útiles.',
    },
    {
      titulo: '2 · Muster por puesto',
      queHace:
        'Igual al (1) pero por `puesto` (tope 8).',
      datosYValores:
        'Mismas filas. `puesto` vacío → “—”.',
    },
    {
      titulo: '3 · Cuenta de hojas en el reporte',
      queHace:
        'KPI: número de registros en el array del reporte.',
      datosYValores:
        '`reportePersonal.length`. Duplicados de carnet se cuentan tal cual vengan del API. Sub: “Registros devueltos”.',
    },
    {
      titulo: '4 · Fichas en alta operativa',
      queHace:
        'Cuenta filas del reporte con `empleadoEsActivo`.',
      datosYValores:
        'Sub: “Criterio activo=1” (misma heurística global). Puede no coincidir con totales manuales si el backend manda `activo` raro.',
    },
    {
      titulo: '5 · Cobertura de e-mail (título UI; cálculo sobre nombre)',
      queHace:
        'Torta “Con nombre” / “Sin dato” según si `nombre` tiene longitud > 0. El título del gráfico en pantalla habla de e-mail, pero el código **solo mira** `nombre` (posible desalineación título/criterio).',
      datosYValores:
        '`contarCampoTexto` con clasificación booleana de string `nombre`. No inspecciona email.',
    },
    {
      titulo: '6 · Últimas bajas (tabla auxiliar)',
      queHace:
        'Hasta 6 inactivos con baja, los más recientes, desde **toda** la nómina `p.empleados` vía `ultimasBajas` (no desde el subconjunto del reporte).',
      datosYValores:
        'Función `ultimasBajas(empleados, 6)`: requiere `fecha_baja`. Muestra carnet y fecha (10 primeros caracteres del string de fecha).',
    },
  ],
  'cambios-cargo': [
    {
      titulo: '1 · Clasificación de anotación (puesto, salario, depto.)',
      queHace:
        'Torta por frecuencia de `tipo_cambio` en el historial laboral (tope 4 categorías frecuentes en `agregadoPorCategoria`).',
      datosYValores:
        '`GET /historial-laboral?limite=500` → `pack.historial`. Tipo faltante → “—”.',
    },
    {
      titulo: '2 · Cargos de destino frecuentes',
      queHace:
        'Solo `tipo_cambio === "puesto"`. Clave: `valor_nuevo` (24 caracteres). Cuenta repeticiones, hasta 8 barras.',
      datosYValores:
        'Si no hay puestos, el mapa vacío. `valor_nuevo` vacío se etiqueta “—” en la clave.',
    },
    {
      titulo: '3 · Densidad de anotación (cada renglón = un movimiento, índice)',
      queHace:
        'Línea a altura 1 en índices 1..min(50, len(historial)). No es eje temporal; es densidad/orden de fila.',
      datosYValores:
        'Primeras 50 filas en orden de respuesta. Ejes `n` y `v=1` fijo.',
    },
    {
      titulo: '4 · Personas con carrera documentada',
      queHace:
        'Cuenta **carnets** distintos cuyo conteo de renglones de historial es >1 (mínimo 2 movimientos por persona en el lote).',
      datosYValores:
        'Mapa carnet→conteo sobre todo `h`. Sub: “Al menos 2 movimientos”. Carnet null no suma (solo si `c` truthy en el bucle).',
    },
    {
      titulo: '5 · Ajuste retributivo (registros salario)',
      queHace:
        'Cuenta renglones con `tipo_cambio === "salario"`.',
      datosYValores:
        'Sub: “En el historial mostrado” (mismo límite 500).',
    },
    {
      titulo: '6 · Reubicación departamental',
      queHace:
        'Cuenta renglones con `tipo_cambio === "departamento"`.',
      datosYValores:
        'Sub: “Anotaciones de cambio de área”.',
    },
  ],
  'reporte-consolidado': [
    {
      titulo: '1 · Masa salarial de activos (vista resumen depto.)',
      queHace:
        'Una barra por fila de `reporteConsolidado`: eje X = departamento (20 chars), eje Y = `masa_salarial_activos` numérico o 0.',
      datosYValores:
        '`GET /reporte-consolidado-departamentos` → `pack.reporteConsolidado`. Cada depto del resumen aporta un punto. Vacío/NaN se fuerzan a 0 en visual.',
    },
    {
      titulo: '2 · Fracción inactiva por unidad',
      queHace:
        'Por fila, porcentaje = `empleados_inactivos / total_empleados` × 100; si total 0, el porcentaje se fuerza a 0.',
      datosYValores:
        'Eje X: departamento 16 chars. Mismo array consolidado. No es “fracción real” de varios días, es snapshot del reporte.',
    },
    {
      titulo: '3 · Unidad con más masa',
      queHace:
        'Recorre filas y elige el `departamento` cuya `masa_salarial_activos` es máxima (empates: gana el que el reduce encuentre con mayor valor en comparaciones).',
      datosYValores:
        'Sub: masa formateada con `fmtN` y texto “(referencia $)”. Si todo 0, queda d “—” y m 0 según el reduce inicial.',
    },
    {
      titulo: '4 · Suma de activos (todas las filas)',
      queHace:
        'Suma de `empleados_activos` de cada fila del consolidado (puede doble contar si el backend agrega filas no disjuntas).',
      datosYValores:
        '`reduce` con `Number(...) || 0` por renglón. Subtítulo vacío en UI.',
    },
    {
      titulo: '5 · Dientes de inactivos al ordenar alfabéticamente',
      queHace:
        'Línea con índice 0..n-1 en eje X y `empleados_inactivos` en Y **en el orden actual del array** (luego, presentación como “alfabético” en el título: es el orden del resultado del API, no se re-ordena alfabéticamente en código).',
      datosYValores:
        'Si el backend devuelve orden alfabético, la forma coincidirá; si no, el eje X es solo posición. Valores faltantes → 0.',
    },
    {
      titulo: '6 · Peso de activos: top 5 depto.',
      queHace:
        'Torta: toma `empleados_activos` por departamento (10 chars en etiqueta), filtra `value>0`, ordena desc, toma 5.',
      datosYValores:
        'Sectores con valor 0 se descartan en el `filter`. Nombres truncados; mismos totales que el consolidado.',
    },
  ],
  vacaciones: [
    {
      titulo: '1 · Carga de trámites de ausencia (por mes inicio)',
      queHace:
        'Agrupa registros de vacaciones por los primeros 7 caracteres AAAA-MM de `fecha_inicio` (`mesDesdeFecha`).',
      datosYValores:
        'Fuente: `pack.vacaciones`. Nombre eje: string mes; clave faltante → “—” en clave. `GET /vacaciones`.',
    },
    {
      titulo: '2 · Duración promedio (d corridos)',
      queHace:
        'Media de días entre `fecha_inicio` y `fecha_fin` (Date diff / 864e5, mínimo 0).',
      datosYValores:
        'Si falta inicio o fin, ese renglón aporta 0 a la suma. Sub: N rangos. Sin filas, muestra 0 vía ternario.',
    },
    {
      titulo: '3 · Récord de solicitudes',
      queHace:
        'Carnet con más filas de vacaciones (topCarnetCount: solo carnet truthy).',
      datosYValores:
        'Muestra nombre = carnet y sub “N: count”. Si no hay datos, `—` y sub vacía.',
    },
    {
      titulo: '4 · Quedan por empleado (6 primeros con más renglones)',
      queHace:
        'Top 6 empleados con más solicitudes de vacaciones, agrupando por documento. Se usa el mismo conteo que otras gráficas de “carnet” pero, si en la fila no viene `carnet_identidad`, se usa `id_tabla` (en este módulo el documento del empleado corresponde a `id_tabla`, como en la pantalla de Vacaciones).',
      datosYValores:
        'Cada renglón aporta 1. Si faltan identificadores, la fila no suma. Antes el código solo miraba `carnet_identidad` y en esta API suele faltar, dejando el gráfico vacío.',
    },
    {
      titulo: '5 · Tamaño de ventana: días según renglón',
      queHace:
        'Hasta 20 filas: por índice, días entre inicio y fin; si faltan fechas, 0.',
      datosYValores:
        'Orden = orden del array. No ordena por fecha. Ejes `r` (1-based índice) y `d` (float días).',
    },
    {
      titulo: '6 · Mes pico de inicio de ausencias',
      queHace:
        'A partir del agregado por mes (misma función que 1), elige el mes con mayor `value`.',
      datosYValores:
        'Sub: “X registros en ese mes”. Si todos 0, mes “—” y v=0 el reduce conserva.',
    },
  ],
  'turnos-trabajo': [
    {
      titulo: '1 · Definiciones de turno (por etiqueta)',
      queHace:
        'Agrupa turnos por `nombre_turno` o, si no existe, `nombre` o `descripcion` o “—” (tope 8).',
      datosYValores:
        '`pack.turnos` desde `GET /turnos-trabajo`. Categoría según el primer campo disponible en ese orden.',
    },
    {
      titulo: '2 · Catálogo registrado',
      queHace:
        'KPI: `turnos.length`. “Filas en sistema”.',
      datosYValores:
        'Cuenta total de filas devueltas, no turnos “activos” vs dados de baja a menos que el API filtre.',
    },
    {
      titulo: '3 · Cobertura de horas (si hay campo)',
      queHace:
        'Torta: “Con horas” si `r.horas` es truthy, si no “Sin horas”.',
      datosYValores:
        'Cualquier valor en `horas` (string no vacía, número) cuenta como con hora; 0 puede interpretarse distinto — truthy 0 en JS es falsy, cae en “Sin horas”.',
    },
    {
      titulo: '4 · Orden de alta (índice en la lista)',
      queHace:
        'Hasta 24 filas, línea fija 1 con eje = índice 0..23. No lee `fecha_creación`.',
      datosYValores:
        'Orden = orden del JSON del servidor. Altura 140px en gráfico.',
    },
    {
      titulo: '5 · Longitud media de descripción',
      queHace:
        'Promedio de longitud de string de `descripcion` (0 si null). “Caracteres”.',
      datosYValores:
        '0 si `turnos` vacío. `fmtN` con un decimal posible en formato es-ES.',
    },
    {
      titulo: '6 · Primer token de nombre (agrupación)',
      queHace:
        'Agrupa por la primera palabra (split en espacios) de `nombre_turno` o `nombre` o “—” (tope 6).',
      datosYValores:
        'Categorización burda: “Noche A” y “Noche B” se fusionan bajo el mismo token si empiezan igual.',
    },
  ],
  'grupos-trabajo': [
    {
      titulo: '1 · Equipos por denominación',
      queHace:
        'Agrupa por `nombre_grupo` o `nombre` o “—” (hasta 8).',
      datosYValores:
        '`pack.grupos` vía `GET /grupos-trabajo`.',
    },
    {
      titulo: '2 · Total de equipos',
      queHace:
        'Cuenta filas del catálogo de grupos.',
      datosYValores:
        'Simple `g.length`.',
    },
    {
      titulo: '3 · Grupos con descripción vs mínimos',
      queHace:
        'Torta: “Con descripción” si `descripcion` trim no vacía; “Breve” si no.',
      datosYValores:
        'Criterio estricto de trim en el campo.',
    },
    {
      titulo: '4 · Secuencia de filas (densidad del catálogo)',
      queHace:
        'Línea 1,1,1… con x = índice 1..n para todas las filas del array.',
      datosYValores:
        'Eje y fijo 1. Altura 120px. No indica “tiempo”.',
    },
    {
      titulo: '5 · Nombre más largo (caracteres)',
      queHace:
        'Máxima longitud de `nombre_grupo` o `nombre` en el lote. “Máximo en listado”.',
      datosYValores:
        'Si g vacío, 0. Usa `Math.max` del array de longitudes.',
    },
    {
      titulo: '6 · Frecuencia de palabra inicial',
      queHace:
        'Agrupa por primer token (máx 12 chars) de `nombre_grupo` o `nombre` o “x” (tope 7).',
      datosYValores:
        '“x” de respaldo hace que nunca falle en split, pero nombres vacíos podrían mostrar raro el primer token.',
    },
  ],
};
