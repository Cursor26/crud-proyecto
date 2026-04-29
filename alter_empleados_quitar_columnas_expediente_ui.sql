-- Alineación de `empleados` con la ficha de gestión (columnas quitadas de la vista).
-- Ejecutar en bd_crud. Hacer respaldo completo antes.
--
-- Orden recomendado:
--   1) Desplegar el backend actualizado (INSERT/SELECT sin esas columnas; JOIN con departamentos y salarios).
--   2) Tabla `licencias_empleado` creada y, si aplica, datos migrados desde la columna `licencias`.
--   3) Ejecutar este script.
--
-- Tras el ALTER, el listado `GET /empleados` expone aún `departamento` y `salario_normal` como
-- columnas calculadas: nombre de `departamentos` y `salarios.salario_neto`.
-- El reporte consolidado suma `masa_salarial_activos` con `salario_neto` (no hay columna en empleados).

USE bd_crud;

ALTER TABLE `empleados`
  DROP COLUMN `departamento`,
  DROP COLUMN `evaluaciones`,
  DROP COLUMN `salario_normal`,
  DROP COLUMN `cursos_disponibles`,
  DROP COLUMN `certificados`,
  DROP COLUMN `licencias`,
  DROP COLUMN `acceso`,
  DROP COLUMN `seguimiento_seguridad`;

-- SHOW COLUMNS FROM empleados;
