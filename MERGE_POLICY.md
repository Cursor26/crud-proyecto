# Política de unificación aplicada

| Área | Origen |
|------|--------|
| Login / autenticación / recuperación contraseña | **Tuyo** (`c:\crud`) |
| Gestión de usuarios | **Tuyo** + rol **`director`** (y `estadistica` para compatibilidad BD) en `ROLES_PERMITIDOS_USUARIO` |
| Contratación (contratos) | **Tuyo** |
| Tabla legacy `tabla1` | **Tuyo** |
| Empleados, licencias, bajas, reportes RRHH previos a producción | **Compañero** |
| Producción / estadística (sacrificio, matadero, leche, histórico) | **Compañero** (`estadistica`, `validarSacrificio`, etc.) |
| Módulos RRHH (asistencias → eval. médicas) | **Compañero** |
| `autorizarRol` con mapeo `produccion` → `estadistica` | **Compañero** |
| Arranque servidor (SMTP + puerto 3001) | **Tuyo** |
| Todo el **frontend** (`client/`) | **Tuyo** (diseño y componentes) |
| `client/package.json` | **Fusionado** (dependencias gráficas del compañero + jspdf tuyo) |
| `server/.env.example` | **Fusionado** |

Ensamblado automático: `scripts/assemble-unificado-index.js`
