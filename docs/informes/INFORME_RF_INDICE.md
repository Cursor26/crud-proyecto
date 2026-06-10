# Índice — Informes explicativos de requisitos funcionales (AEPG)

Documentación para defensa ante tribunal: **cómo funciona cada RF en el programa real**, con respuestas a preguntas frecuentes y ubicación del código.

## Informes por bloques (54 RF)

| Parte | Archivo | RF incluidos | Tema |
|-------|---------|--------------|------|
| 1 | [INFORME_RF_PARTE_01_AUTENTICACION.md](./INFORME_RF_PARTE_01_AUTENTICACION.md) | RF-001 a RF-006 | Login, sesión JWT, logout, recuperación contraseña, bloqueos |
| 2 | [INFORME_RF_PARTE_02_USUARIOS_RBAC.md](./INFORME_RF_PARTE_02_USUARIOS_RBAC.md) | RF-007 a RF-017 | Usuarios, perfil, roles y permisos |
| 3 | [INFORME_RF_PARTE_03_CONTRATOS.md](./INFORME_RF_PARTE_03_CONTRATOS.md) | RF-018 a RF-031 | Contratos, aprobaciones, jurídico |
| 4 | [INFORME_RF_PARTE_04_RECORDATORIOS_CORREO_DOCS.md](./INFORME_RF_PARTE_04_RECORDATORIOS_CORREO_DOCS.md) | RF-032 a RF-043 | KPIs, recordatorios, PDFs, correo SMTP |
| 5 | [INFORME_RF_PARTE_05_EXPORT_AUDITORIA_UX.md](./INFORME_RF_PARTE_05_EXPORT_AUDITORIA_UX.md) | RF-044 a RF-054 | Exportaciones, auditoría, preferencias, navegación |

## Informe de arquitectura y ubicación del código

| Documento | Contenido |
|-----------|-----------|
| [INFORME_MAPA_CODIGO_Y_CONFIGURACION.md](./INFORME_MAPA_CODIGO_Y_CONFIGURACION.md) | Dónde está cada módulo, ruta API, tabla BD, variable `.env` y componente React |

## Datos de referencia rápida (para el tribunal)

| Concepto | Valor en el programa |
|----------|---------------------|
| Duración de sesión JWT | **8 horas** (`expiresIn: '8h'` en `server/index.js`) |
| Intentos fallidos antes de bloqueo | **5** (variable `AUDIT_MAX_FAILED_LOGINS`, default 5) |
| Duración del bloqueo | **15 minutos** (`AUDIT_LOCKOUT_MINUTES`, default 15) |
| Caducidad enlace recuperación contraseña | **30 minutos** (`PASSWORD_RESET_TTL_MINUTES`, default 30) |
| Almacenamiento sesión en cliente | `localStorage`: claves `token`, `user`, `permisos` |
| Puerto API | **3001** (Express en `server/index.js`) |
| Puerto cliente React | **3000** (desarrollo) |

## Cómo regenerar el catálogo Word

```powershell
cd c:\crud\server
node scripts/generate-rf-catalogo-docx.mjs
```

Salida: `c:\crud\docs\CATALOGO_REQUISITOS_FUNCIONALES.docx`
