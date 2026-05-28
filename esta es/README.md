# Base de datos normalizada — `bd_crud`

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `bd_crud_normalizada.sql` | Script completo: DROP/CREATE `bd_crud`, DDL 3FN/BCNF, datos migrados |
| `build-normalized-sql.mjs` | Regenera el SQL desde el dump original |

## Importar en MySQL

```bash
mysql -u root -p < "esta es/bd_crud_normalizada.sql"
```

O desde MySQL Workbench: ejecutar el archivo completo.

## Qué se normalizó

- **Usuarios:** tabla `roles` + `usuarios.id_rol` (se conservan email, hash bcrypt, auditoría).
- **Contratos:** catálogos de contraparte y tipo; sin columna `vencido` (se calcula en el API).
- **RRHH:** `carnet_identidad` como FK; tablas 1:1 antes ligadas por `id_tabla`; `segseguridad` → incidencias en tabla hija.
- **Producción:** `prod_registro` + `prod_valor` + `prod_metrica`; sin columnas `total*` persistidas (se calculan en el backend).
- **Histórico:** `historico_produccion` + `historico_produccion_valor` (sin JSON en BD).
- **Eliminado:** `tabla1` (demo).

## Migración de datos (última generación)

- **6 usuarios** migrados íntegros.
- **12 empleados** (2 originales + 10 referenciados en RRHH sin ficha previa, creados como “Migrado / Referenciado”).
- **RRHH:** la mayoría de registros satélite recuperados; huérfanos sin carnet válido se omiten.
- **Producción:** sacrificio (2 fechas), matadero (2), leche (1), histórico (15 eventos).
- **Contratos y departamentos:** según dump origen.

## Backend

`server/index.js` adaptado; **código SMTP/correo sin cambios**.

Módulos nuevos:

- `server/db/produccionNorm.js`
- `server/db/produccionTotals.js`
- `server/db/queryHelpers.js`
- `server/db/registerProduccionRoutes.js`

## Regenerar SQL

```bash
node "esta es/build-normalized-sql.mjs"
```

Requiere el dump en:

`Downloads/Normalizando base de datos/bd prueba/prueba 1/bd_crud.sql`

## Tribunal / tesis

Incluir diagrama ER y explicar:

1. Eliminación de redundancia y dependencias parciales (3FN).
2. Catálogos para dominios repetidos (BCNF donde aplica).
3. Totales de producción como **datos derivados** (no almacenados).
4. Histórico normalizado con reconstrucción del snapshot en lectura (misma UX en frontend).
