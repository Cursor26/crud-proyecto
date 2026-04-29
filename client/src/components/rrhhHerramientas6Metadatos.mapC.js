/**
 * Metadatos ayuda — bloque C (8 módulos). Alineado con rrhhHerramientas6Bloques.js
 */
export const HERR6_MAP_C = {
  objetivos: [
    {
      titulo: '1 · Estado (cumplido / en curso)',
      queHace:
        'Barras por `estado` o “—” (hasta 5 categorías en el agregado).',
      datosYValores:
        'Fuente: `pack.objetivos` = `GET /objetivos`. Cada fila = un objetivo, no un empleado.',
    },
    {
      titulo: '2 · Vencimientos por mes',
      queHace:
        'Agrupación AAAA-MM sobre `fecha_objetivo` vía `mesDesdeFecha`.',
      datosYValores:
        'Objetivos sin fecha no aportan un mes válido en el mapa de claves.',
    },
    {
      titulo: '3 · Metas en cartera',
      queHace:
        'Cuenta total de objetivos en la lista cargada.',
      datosYValores:
        '`o.length` sin filtrar por estado o vigencia.',
    },
    {
      titulo: '4 · Ponderación: con KPI numérico',
      queHace:
        'Torta: “Con KPI” si `meta_numerica != null`; “Cualitativo” si no (incluye `undefined` y ausencia de campo).',
      datosYValores:
        'Un cero numérico en `meta_numerica` cuenta como “Con KPI”.',
    },
    {
      titulo: '5 · Carga (índice de fila)',
      queHace:
        'Línea a altura 1 con x = 1..n para todos los objetivos. Densidad del listado, no evolución temporal.',
      datosYValores:
        'Orden = orden del array devuelto por el servidor.',
    },
    {
      titulo: '6 · Descripción: longitud media',
      queHace:
        'Promedio de caracteres de `descripcion` (longitud 0 si vacía). “caracteres”.',
      datosYValores:
        'Si no hay filas, 0; se formatea con `fmtN`.',
    },
  ],
  salarios: [
    {
      titulo: '1 · Última escala: agrupación por depto',
      queHace:
        'Usa **empleados activos** y agrega por `departamento` o “—” (misma función `head` que en módulo empleados; tope 8).',
      datosYValores:
        'Requiere `pack.empleados` (`GET /empleados` compartido). No usa la tabla `salarios` en este bloque.',
    },
    {
      titulo: '2 · Muestras de salario: por mes (si existe fecha)',
      queHace:
        'Agrupación AAAA-MM sobre el campo `fecha` de cada fila de `pack.salarios`.',
      datosYValores:
        '`GET /salarios` → conteos de filas nómina por mes de inicio/validez, según haya almacenado en `fecha`.',
    },
    {
      titulo: '3 · Líneas de nómina',
      queHace:
        'Cuenta renglones de la tabla salarios. “Tabla salarios”.',
      datosYValores:
        '`s.length` directo.',
    },
    {
      titulo: '4 · Tendencia de importe (salario_neto u otros campos numéricos)',
      queHace:
        'Cada renglón toma un importe con prioridad: `salario_neto` (como en la pantalla y la tabla `salarios`), luego `monto`, `salario`, `importe`, `valor`, usando el mismo `parseSalarioNum` que el resto de analítica. Se dejan importes mayores que 0, hasta 20 puntos, en el orden del array, eje 1..N vs importe.',
      datosYValores:
        'En este proyecto el API devuelve `id_tabla` (documento) y `salario_neto`, no `monto` ni `salario`, por lo que el gráfico quedaba vacío si no se leía `salario_neto`. Ceros o campos no numéricos se excluyen. No hay columna `fecha` en el listado de salarios: el eje X es el orden de renglón, no un calendario.',
    },
    {
      titulo: '5 · Tipo de haber (si existe)',
      queHace:
        'Torta: `tipo` o `concepto` o “Haber” por defecto.',
      datosYValores:
        'Categoría por texto exacto; sin “tipo” y sin “concepto” → rótulo “Haber” para toda fila faltante.',
    },
    {
      titulo: '6 · Masa: suma aprox. de importes',
      queHace:
        'Suma de importes en **todas** las filas usando la misma prioridad que la herramienta 4: `salario_neto` y, en su defecto, otros campos monetarios reconocidos.',
      datosYValores:
        'Criterio de importe idéntico al de la herramienta 4. Cada fila de la nómina aporta 0 o un monto numérico.',
    },
  ],
  segseguridad: [
    {
      titulo: '1 · Nivel o tipo de riesgo',
      queHace:
        'Barras por `nivel_riesgo` o `tipo` o “—” (6 categorías frecuencia corte lógica).',
      datosYValores:
        '`pack.segseg` = `GET /segseguridad`.',
    },
    {
      titulo: '2 · Inspecciones por mes',
      queHace:
        'Agrupación AAAA-MM sobre `fecha_inspeccion`.',
      datosYValores:
        'Fechas vacías: mes “—” o sin fila en el conteo, según el string devuelto.',
    },
    {
      titulo: '3 · Controles',
      queHace:
        'Cuenta filas de controles/seg. específico.',
      datosYValores:
        'Total = `s.length` del pack.',
    },
    {
      titulo: '4 · Con plan de acción',
      queHace:
        'Torta: “Con plan” si `plan_accion` tiene texto (trim no vacío), “Sin plan” si no.',
      datosYValores:
        'Solo inspecciona `plan_accion`.',
    },
    {
      titulo: '5 · Riesgo percibido (índice)',
      queHace:
        'Hasta 20 filas, eje 1..20, altura 1. Placeholder de densidad, no riesgo calculado.',
      datosYValores:
        'No usa columnas de puntuación; eje fijo 1 en “n”.',
    },
    {
      titulo: '6 · Acciones: texto medio',
      queHace:
        'Longitud promedio de `accion_correctiva`. “caract.”',
      datosYValores:
        'Si lista vacía, 0. `fmtN` formatea decimales.',
    },
  ],
  seguridad: [
    {
      titulo: '1 · Categoría de evento',
      queHace:
        'Agrupación `categoria` o `tipo_incidente` o “—” (6 categorías corte lógica).',
      datosYValores:
        '`pack.seguridad` = `GET /seguridad` (módulo distinto de `segseguridad`).',
    },
    {
      titulo: '2 · Hechos por mes',
      queHace:
        'Agrupación AAAA-MM sobre `fecha_evento`.',
      datosYValores:
        'Misma lógica `mesDesdeFecha` con nombre/value.',
    },
    {
      titulo: '3 · Registros de incidente',
      queHace:
        'Cuenta incidentes de seguridad laboral en la lista.',
      datosYValores:
        'Un incidente = una fila.',
    },
    {
      titulo: '4 · Con lesión vs sin lesión',
      queHace:
        'Torta: “Con lesión” si `hubo_lesion` o `lesion` es truthy; en caso contrario “Solo material”.',
      datosYValores:
        'Basta con que uno de los dos campos exista; no distingue gravedad.',
    },
    {
      titulo: '5 · Días de baja (suma)',
      queHace:
        'Suma de `dias_baja` numéricos. “Si existe campo”',
      datosYValores:
        'NaN o vacío aporta 0. Subtítulo indica dependencia de que el backend rellene el campo.',
    },
    {
      titulo: '6 · Densidad temporal',
      queHace:
        'Hasta 25 renglones, y=1, x=1..n. “Densidad” sin eje de tiempo real (solo orden de fila).',
      datosYValores:
        'Tamaño `slice(0, 25)`; altura 100px en el bloque de línea.',
    },
  ],
  cargos: [
    {
      titulo: '1 · Nombre de puesto',
      queHace:
        'Barras por las primeras 20 letras de `nombre` o “—” (8 categorías frecuencia corte lógica).',
      datosYValores:
        '`pack.cargos` = `GET /cargos`. Misma lista que catálogo de puestos.',
    },
    {
      titulo: '2 · Cargos activos',
      queHace:
        'Torta: “Baja” si `activo == 0` (doble igual); de lo contrario “Alta en catálogo”.',
      datosYValores:
        'No usa `===` con string; cuidado con tipos: `"0"` (string) no es 0, iría a “Alta en catálogo”.',
    },
    {
      titulo: '3 · Posiciones en catálogo',
      queHace:
        'Cuenta puestos en memoria. No filtra duplicados de nombre si el API los manda.',
      datosYValores:
        '`c.length`.',
    },
    {
      titulo: '4 · Descripciones rellenadas',
      queHace:
        'Cuenta cargos cuyo `descripcion` supera 10 caracteres (longitud de string, no “palabras significativas”).',
      datosYValores:
        'Once espacios seguidos pasarían el umbral; texto corto no.',
    },
    {
      titulo: '5 · Carga',
      queHace:
        'Línea y=1, x=1..n en todo el catálogo. “Carga” de filas.',
      datosYValores:
        'Incluye todos los renglones, sin límite de slice a diferencia de otros módulos (usa `c.map` completo).',
    },
    {
      titulo: '6 · Categoría o familia',
      queHace:
        'Agrupación en `categoria_cargo` o `familia` o `General` (6 categorías corte lógica).',
      datosYValores:
        'Si faltan ambas claves, “General” por defecto.',
    },
  ],
  departamentos: [
    {
      titulo: '1 · Nombre de unidad',
      queHace:
        'Barras por 20 chars de `nombre` o `nombre_departamento` o “—”.',
      datosYValores:
        '`d` = `GET /departamentos` en el pack.',
    },
    {
      titulo: '2 · Carga real: gente viva (empleados) por depto',
      queHace:
        'Como módulo empleados(1) pero forzado: `head` sobre `pack.empleados` activos por `departamento`. Muestra plantilla viva, no estructura orgánica del catálogo.',
      datosYValores:
        'Activos = `empleadoEsActivo`. Tope 8 categorías frecuencia. No cruza con `d` (catálogo) salvo en que los textos de departamento deben coincidir con lo puesto en empleado.',
    },
    {
      titulo: '3 · Unidades administrativas',
      queHace:
        'Cuenta filas del catálogo de departamentos. “Catálogo”.',
      datosYValores:
        '`d.length` sin validar unidades con gente o sin gente.',
    },
    {
      titulo: '4 · Centros con responsable',
      queHace:
        'Torta: “Con jefe” si `responsable` o `jefe` es truthy; “Pendiente” en otro caso.',
      datosYValores:
        'Basta con que uno de los campos tenga dato. No exige e-mail o carnet de jefe.',
    },
    {
      titulo: '5 · Código de costo informado',
      queHace:
        'Cuenta unidades con `codigo` o `id_costo` truthy (0 numérico sería “sin” si 0 es falsy).',
      datosYValores:
        'Sub: “Filas” (cada match es una fila de departamento, no FTEs).',
    },
    {
      titulo: '6 · Tamaño de nombre',
      queHace:
        'Hasta 15 depto., longitud de `String(nombre)`: índice vs caracteres. No nombres, solo conteo de letras de la clave `nombre` (puede faltar `nombre_departamento` si solo está lleno el otro en BD — el código pide `r.nombre` solo).',
      datosYValores:
        'Eje o = j+1; eje l = `nombre.length` o 0. Si el nombre vive en `nombre_departamento` pero no en `nombre`, longitud 0 en este análisis.',
    },
  ],
  'cert-medicos': [
    {
      titulo: '1 · Tipo o aptitud',
      queHace:
        'Barras por `tipo` o, si no hay, `aptitud` o “—” (6 categorías frecuencia en el agregado).',
      datosYValores:
        'Fuente: `pack.certMed` (certificados médicos). La categoría toma el primer campo disponible en ese orden.',
    },
    {
      titulo: '2 · Vencimientos (mes)',
      queHace:
        'Agrupación AAAA-MM sobre `fecha_vencimiento`.',
      datosYValores:
        'Certificados sin vencimiento no aportan mes.',
    },
    {
      titulo: '3 · Fichas clínicas',
      queHace:
        'Cuenta certificados médicos en lista. No filtra por vigencia.',
      datosYValores:
        '`c.length` directo.',
    },
    {
      titulo: '4 · Apto / no apto',
      queHace:
        'Torta: categoría = primeros 8 chars de `resultado` o `aptitud` o “Sin dato” en string.',
      datosYValores:
        'Categorías recortadas; “Aptitud no apto” y “Aptitud a” comparten prefijo 8 y podrían unirse visualmente distinto no reflejado en texto.',
    },
    {
      titulo: '5 · Emisión por mes',
      queHace:
        'Agrupación AAAA-MM sobre `fecha_emision` (barras/line, mismo helper `mesDesdeFecha` que otros).',
      datosYValores:
        'A veces reutiliza `name` y `value` con altura 200; mes sin emisión: ausente.',
    },
    {
      titulo: '6 · Restricciones: textos',
      queHace:
        'Cuenta renglones con `restricciones` de longitud > 3. “Con restricción”',
      datosYValores:
        'Tres caracteres o menos no entran, cuatro o más (incl. espacios) sí.',
    },
  ],
  'eval-medicas': [
    {
      titulo: '1 · Resultado / aptitud',
      queHace:
        'Barras por `resultado` o “—” (6 categorías corte lógica).',
      datosYValores:
        '`pack.evalMed` = `GET` de evaluaciones médicas.',
    },
    {
      titulo: '2 · Evaluaciones por mes',
      queHace:
        'Agrupación AAAA-MM sobre `fecha_evaluacion`.',
      datosYValores:
        'Estandarizado con otros módulos “por mes” en panel.',
    },
    {
      titulo: '3 · Exámenes',
      queHace:
        'Cuenta evaluaciones médicas en arreglo.',
      datosYValores:
        'Una fila = un examen o visita, según haya en base.',
    },
    {
      titulo: '4 · Próxima cita',
      queHace:
        'Torta: “Programada” si `fecha_proxima` truthy; “A definir” si no.',
      datosYValores:
        'Cualquier string o fecha rellenada basta para “Programada”.',
    },
    {
      titulo: '5 · IMC: muestras con dato',
      queHace:
        'Cuenta filas con `imc != null` o con `peso` truthy. “Si el campo existe”',
      datosYValores:
        '`peso` 0 es falsy: no contaría para la segunda rama, pero `imc` 0 con `== null` falso Sí (imc 0 pasa imc != null). Cuidado con interpretación de 0 IMC en datos.',
    },
    {
      titulo: '6 · Tensión / signos: índice',
      queHace:
        'Hasta 20 filas, eje 1..20, y=1. Densidad de registros, no medición clínica.',
      datosYValores:
        'No lee `tension` u otros: solo índice y constante 1. Altura 100px.',
    },
  ],
};
