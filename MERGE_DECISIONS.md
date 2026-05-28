# Registro de decisiones de unificación

- **Base inicial:** `c:\crud` (tu proyecto)
- **Origen compañero:** `c:\crud-companero`
- **Carpeta de trabajo:** `c:\crud-unificado`

| # | Archivo / bloque | Decisión | Notas |
|---|------------------|----------|-------|
| 0a | Scripts solo en crud (`merge_*.sql`, `scripts/*`) | Mantener | Herramientas de merge |
| 0b | `client/.env.local` (solo compañero) | Copiar desde compañero | Config local React |
| 1 | `server/.env.example` | Fusionar | PORT/DB + SMTP/recuperación |
| 2 | `client/package.json` | Fusionar | Sin boostrap; +file-saver, recharts; jspdf 4.x |
| 3 | `server/package.json` | Fusionar | +rate-limit, start; dotenv 17 |
| 4 | `server/index.js` cabecera | Solo tuya | BD fija, SMTP |
| 5 | Producción (sacrificio/matadero/leche) | Compañero | estadistica + validación |
| **GLOBAL** | Ver `MERGE_POLICY.md` | Política masiva aplicada | Login/contratos/usuarios tuyo; RRHH+prod compañero; frontend tuyo |
