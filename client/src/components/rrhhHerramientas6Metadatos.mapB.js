/**
 * Metadatos ayuda — bloque B (8 módulos). Alineado con rrhhHerramientas6Bloques.js
 */
export const HERR6_MAP_B = {
  sanciones: [
    {
      titulo: '1 · Tipología de sanción',
      queHace:
        'Barras por `tipo_sancion` o “—” (tope 8) sobre `pack.sanciones` (`GET /sanciones-empleado`).',
      datosYValores:
        'Cada renglón = un hecho de sanción, no un empleado. Sin datos: eje vacío.',
    },
    {
      titulo: '2 · Hechos por mes de aplicación',
      queHace:
        'Agrupación AAAA-MM desde el campo `fecha_aplicacion` (primeros 7 caracteres de la fecha) con `mesDesdeFecha`.',
      datosYValores:
        'Fechas nulas o mal formadas: el mes resultante puede ser “—” según el corte. Orden: orden alfabético de la clave de mes (AAAA-MM).',
    },
    {
      titulo: '3 · Suspensiones con días informados',
      queHace:
        'Cuenta sanciones donde el campo `dias_suspension` está rellenado: debe ser distinto de `null` y `undefined`, y al convertirlo a string no puede ser la cadena vacía.',
      datosYValores:
        'Un `0` numérico o el texto “0” **sí** cuentan (el subtítulo compara con `Sobre N hechos` donde N = total de filas de sanciones, no solo suspensiones con días).',
    },
    {
      titulo: '4 · Vigencia del acto (activo/inactivo)',
      queHace:
        'Torta: “Archivada” si `activo==0` o `activo===false`; “Vigente” en otro caso (incluye 1, null, undefined mientras no sea 0 o false).',
      datosYValores:
        'Cuidado: `null` o `undefined` caen en “Vigente”.',
    },
    {
      titulo: '5 · Días de suspensión (primeros 15 con dato)',
      queHace:
        'Línea: solo renglones cuyo `dias_suspension` es “truthy” (excluye 0, `null` y `""`); toma las primeras 15 filas de ese subconjunto en el orden del array.',
      datosYValores:
        'Eje X: 1, 2, …; eje Y: `Number(dias_suspension) || 0` por punto. Cualquier registro con días 0 o vacío queda fuera de este subconjunto.',
    },
    {
      titulo: '6 · Empleados con más antecedentes',
      queHace:
        'Top 6 carnets por frecuencia de filas sanción (`topCarnetCount`).',
      datosYValores:
        'Solo renglones con `carnet_identidad` truthy. Empates: orden de construcción del mapa (insert order).',
    },
  ],
  reconocimientos: [
    {
      titulo: '1 · Tipo de reconocimiento',
      queHace:
        'Barras por `tipo_reconocimiento` o `tipo` o “—”.',
      datosYValores:
        '`GET /reconocimientos-empleado` → `reconocimientos`.',
    },
    {
      titulo: '2 · Registros por mes',
      queHace:
        'Meses desde `fecha_reconocimiento` (corte AAAA-MM).',
      datosYValores:
        'Misma lógica `mesDesdeFecha` común a varios módulos.',
    },
    {
      titulo: '3 · Total de distinciones',
      queHace:
        'Cuenta filas del módulo.',
      datosYValores:
        '`r.length` sin filtrar anulados.',
    },
    {
      titulo: '4 · Presencia de observación escrita',
      queHace:
        'Torta: “Con nota” / “Sin nota” según trim de `observaciones`.',
      datosYValores:
        'Solo mira `observaciones` (no `comentario` ni otro).',
    },
    {
      titulo: '5 · Índice de hechos (línea neutra)',
      queHace:
        'Hasta 30 filas, y=1 constante, x=n índice. “Densidad” sin métrica de tiempo.',
      datosYValores:
        'Tamaño del segmento: min(30, n filas).',
    },
    {
      titulo: '6 · Carrera: empleados con más distinciones',
      queHace:
        'Top 6 carnets por frecuencia (mismo patrón que sanciones).',
      datosYValores:
        'Requiere `carnet_identidad` en la fila para contar.',
    },
  ],
  jubilaciones: [
    {
      titulo: '1 · Modalidad de retiro / jubilación',
      queHace:
        'Agrupación por `tipo_jubilacion` o `tipo` o “—”.',
      datosYValores:
        '`GET /jubilaciones-empleado`. Tope 8.',
    },
    {
      titulo: '2 · Fecha efectiva por mes',
      queHace:
        'Agrupación AAAA-MM sobre `fecha_efectiva`.',
      datosYValores:
        'Corte string mes like otros módulos.',
    },
    {
      titulo: '3 · Expedientes de cierre',
      queHace:
        'Cuenta total de jubilaciones en lista.',
      datosYValores:
        'Cada registro pesa 1 sin deduplicar por persona.',
    },
    {
      titulo: '4 · Estado de trámite (si existe)',
      queHace:
        'Torta: categoría = `estado` de cada jubilación, o el texto `Sin estado` si el valor es falso (nulo, indefinido o cadena vacía).',
      datosYValores:
        'Cualquier `estado` con texto (tras ser truthy) es su propia pieza. Valores faltantes se agrupan en `Sin estado`.',
    },
    {
      titulo: '5 · Beneficio / monto declarado (filas con número)',
      queHace:
        'Cuenta filas donde al menos uno de `monto_beneficio` o `monto` no es `null` ni `undefined` (aunque sea 0, cadena o número).',
      datosYValores:
        'Una cadena vacía `""` técnicamente pasa el filtro `!= null` y puede contarse como “con monto” según dato. Subtítulo: “Según columnas disponibles”.',
    },
    {
      titulo: '6 · Top 6 empleados por cantidad de líneas de jubilación',
      queHace:
        'Barras: los 6 empleados con más filas de jubilación, ordenados de mayor a menor conteo. Si en la nómina todos tienen una sola línea, aún así verá hasta 6 sectores (con valor 1), no un gráfico en blanco.',
      datosYValores:
        'Agrupación por `carnet_identidad`. El filtro anterior requería más de un registro por persona y, si nadie lo cumplía, el gráfico quedaba vacío. Con lista de jubilaciones vacía, sigue el aviso de “sin datos”.',
    },
  ],
  asistencias: [
    {
      titulo: '1 · Códigos de asistencia',
      queHace:
        'Agrupación por `codigo_asistencia` o “—” (tope 10).',
      datosYValores:
        '`pack.asistencias` vía `GET /asistencias`.',
    },
    {
      titulo: '2 · Causas más citadas (texto)',
      queHace:
        'Torta: primeros 20 caracteres de `desc_causas` o “—” (6 segmentos frecuentes lógica agregada).',
      datosYValores:
        'Categorías recortadas; causas distintas largas pueden colisionar al truncar.',
    },
    {
      titulo: '3 · Horas declaradas: suma',
      queHace:
        'Suma de `horas_trabajadas` numéricas. “Acumulado listado”.',
      datosYValores:
        '`Number(r.horas_trabajadas) || 0` por fila. No distingue periodo; es suma de lo cargado en memoria.',
    },
    {
      titulo: '4 · Densidad de filas',
      queHace:
        'Hasta 40 renglones, eje u=índice, eje h=horas o 0.',
      datosYValores:
        'Muestra horas por renglón, no promedio móvil.',
    },
    {
      titulo: '5 · Registros con horas = 0',
      queHace:
        'Cuenta filas donde el número de horas es 0 o no parsea (Number NaN → 0).',
      datosYValores:
        'Coincide con ausencia numérica o cero estricto tras coerción.',
    },
    {
      titulo: '6 · Frecuencia de longitud de causa',
      queHace:
        'Agrupa por longitud de `desc_causas` (string) como categoría “N car.” (tope 8 frecuencias en agregado).',
      datosYValores:
        'Clasifica por string length, no por contenido semántico.',
    },
  ],
  certificaciones: [
    {
      titulo: '1 · Entidad o rubro',
      queHace:
        'Agrupación `entidad` o `tipo` o “—”.',
      datosYValores:
        '`GET /certificaciones` → `certificaciones`. Tope 8.',
    },
    {
      titulo: '2 · Vigencia por mes (si hay fecha fin)',
      queHace:
        'Agrupación AAAA-MM sobre `fecha_vencimiento`.',
      datosYValores:
        'Certificados sin vencimiento no aportan a ningún mes (mes “—” posible vía corte mínimo).',
    },
    {
      titulo: '3 · Certificados vivos',
      queHace:
        'Cuenta filas totales. “Total de filas”.',
      datosYValores:
        'Incluye vencidos y activos: no filtra por fecha.',
    },
    {
      titulo: '4 · Carga de número de foja',
      queHace:
        'Torta: “Con Nº” si `numero_certificado` truthy; “Sin Nº” si no.',
      datosYValores:
        '0 en número podría contar como sin Nº (falsy) según el valor real del API.',
    },
    {
      titulo: '5 · Evolución del stock (índice)',
      queHace:
        'Hasta 25 renglones, y=1, x=n índice. No es serie temporal de certificados emitidos a menos que el array venga cronológico.',
      datosYValores:
        'Orden = orden del array.',
    },
    {
      titulo: '6 · Nombre promedio de curso (long.)',
      queHace:
        'Promedio de longitud de `nombre_curso` o `titulo`. “Caracteres”.',
      datosYValores:
        'Si 0 filas, 0; `fmtN` aplica a la media.',
    },
  ],
  cursos: [
    {
      titulo: '1 · Proveedores o modalidad',
      queHace:
        'Agrupación: `modalidad` o, si no, `proveedor` o “—” (7 categorías frecuentes corte).',
      datosYValores:
        'Prioridad explícita a `modalidad` aunque `proveedor` tenga dato.',
    },
    {
      titulo: '2 · Inicio por trimestre (fecha)',
      queHace:
        'Agrupación AAAA-MM sobre `fecha_inicio` (aunque el título diga trimestre, el corte en código es **mes**).',
      datosYValores:
        'Desfase título: es mes no trimestre calendario. `mesDesdeFecha` sobre cursos.',
    },
    {
      titulo: '3 · Cursos ofertados',
      queHace:
        'Cuenta filas de cursos en memoria.',
      datosYValores:
        'Sin distinción publicado/borrado si el API lo mezcla.',
    },
    {
      titulo: '4 · Cursos con cupo / sin cupo',
      queHace:
        'Torta: “Con cupo” si `cupo` existe y `Number(cupo) > 0`, si no “Sin cupo”.',
      datosYValores:
        'Cupo = 0 o null → “Sin cupo”.',
    },
    {
      titulo: '5 · Horas-aula (suma aproximada)',
      queHace:
        'Suma de `duracion_horas` numéricas. “Suma de campo duración”.',
      datosYValores:
        'NaN/sin campo → 0 con `Number(...) || 0`.',
    },
    {
      titulo: '6 · Palabra inicial en el título',
      queHace:
        'Agrupación burda por primer token de `nombre_curso` o `titulo` (máx 14 chars clave) (8 categorías corte en agregado).',
      datosYValores:
        'Cursos cuyo título comparte el mismo primer token se agrupan.',
    },
  ],
  evalcapacitacion: [
    {
      titulo: '1 · Resultado global',
      queHace:
        'Agrupación `resultado` o `nota` (texto) o “—” (8 categorías corte lógica).',
      datosYValores:
        'Fuente: `pack.evalcap` = `GET /evalcapacitacion`. mezcla texto de resultado con nota cruda en misma lógica de categoría.',
    },
    {
      titulo: '2 · Evaluaciones por mes',
      queHace:
        'Agrupación AAAA-MM sobre `fecha_evaluacion`.',
      datosYValores:
        'Eje name/value con meses ordenados alfabéticamente (comportamiento de mesDesdeFecha+sort).',
    },
    {
      titulo: '3 · Muestras de evaluación',
      queHace:
        'Cuenta renglones de evaluación de capacitación.',
      datosYValores:
        'Cada renglón 1, sin deduplicar por persona/curso.',
    },
    {
      titulo: '4 · Tendencia de nota (si es numérico)',
      queHace:
        'Serie por orden de fila: para cada renglón, `n = parseFloat(nota) || 0` y luego se eliminan los puntos con `n` cero. La nota 0 o no numérica no aparece (el filtro exige `n` truthy).',
      datosYValores:
        'Eje `p`: `j + 1` con `j` índice en el listado completo; solo quedan puntos cuya nota parseada es distinta de 0. Cada renglón válido aporta a lo sumo un punto.',
    },
    {
      titulo: '5 · Curso vinculado',
      queHace:
        'Torta: “Vinculado” si `id_curso` o `curso` truthy, “Sin id” si no.',
      datosYValores:
        'Cualquier id numérico 0: falsy → “Sin id”.',
    },
    {
      titulo: '6 · Rango de notas',
      queHace:
        'KPI: mínimo y máximo de las notas que `parseFloat` puede interpretar como número finito.',
      datosYValores:
        'Solo se consideran notas con `Number.isFinite`. Si ninguna aplica, se muestra “—”.',
    },
  ],
  evaluaciones: [
    {
      titulo: '1 · Estado del ciclo',
      queHace:
        'Agrupación `estado` o “—” (hasta 6).',
      datosYValores:
        '`pack.evaluaciones` vía `GET /evaluaciones`.',
    },
    {
      titulo: '2 · Periodo o año',
      queHace:
        'Agrupación: string de 8 chars de `anio` o `periodo` o “—”.',
      datosYValores:
        'Etiquetas truncadas; “2024-2025” y “2024-20” podrían colisionar a 8 chars.',
    },
    {
      titulo: '3 · Ciclos de desempeño',
      queHace:
        'Cuenta ciclos en lista. No filtra cerrados/abiertos.',
      datosYValores:
        '`e.length` simple.',
    },
    {
      titulo: '4 · Con observación final',
      queHace:
        'Torta: “Con texto” si trim de `comentario` o `observaciones`; “Mínima” sin texto.',
      datosYValores:
        'Unión de comentario u observacion; basta con uno con contenido.',
    },
    {
      titulo: '5 · Puntuación (si numérica) por orden',
      queHace:
        'Línea: `parseFloat(puntaje) || 0` por renglón, **todos** los índices (incluye 0 en gráfico).',
      datosYValores:
        'Orden = array; no reordena por puntaje. Puntaje no numérico → 0 en serie.',
    },
    {
      titulo: '6 · Frecuencia de instrumento',
      queHace:
        'Agrupación en `tipo_instrumento` o `instrumento` o “STANDARD” (6 categorías corte lógica).',
      datosYValores:
        'Default “STANDARD” si faltan ambos campos.',
    },
  ],
};
