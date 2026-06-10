# Registro de validación con stakeholders

Documento de seguimiento para requisitos que requieren acuerdo de negocio antes de implementación o despliegue formal.

**Estado general:** pendiente de sesión con dirección / TI / usuarios clave.

---

## RF-G08 — Extensiones empresariales

| Código | Requisito | Pregunta al negocio | Prioridad propuesta | Decisión | Fecha |
|--------|-----------|---------------------|---------------------|----------|-------|
| RF-D08.1.1 | Multi-empresa | ¿La organización operará varias empresas legales en la misma instancia con aislamiento de datos? | Baja (fase 2) | **Pendiente** | — |
| RF-D08.1.2 | Workflow genérico | ¿Se necesitan flujos de aprobación configurables fuera de contratos (RRHH, compras)? | Media (fase 2) | **Pendiente** | — |
| RF-M08.1 | Auditoría transversal | ¿Qué módulos además de usuarios y contratos exigen trazabilidad obligatoria? | Alta | **Pendiente** | — |

**Recomendación técnica:** mantener RF-G08 como extensión; no bloquea el despliegue actual de contratación + identidad.

---

## RNF-DIS — Disponibilidad y SLA

| Código | Métrica | Valor propuesto | Pregunta al negocio | Decisión | Fecha |
|--------|---------|-----------------|---------------------|----------|-------|
| RNF-DIS-01 | Uptime horario laboral | ≥ 99 % (L–V 7:00–19:00) | ¿Ventana horaria y porcentaje aceptables? | **Pendiente** | — |
| RNF-DIS-04 | RPO backup BD | ≤ 24 h | ¿Copia diaria nocturna suficiente? | **Pendiente** | — |
| RNF-DIS-04 | RTO restauración | ≤ 4 h | ¿Tiempo máximo de indisponibilidad tras fallo? | **Pendiente** | — |
| RNF-DIS-03 | Correo en cola | Reintentos 24 h | ¿Aceptan avisos retrasados si SMTP falla? | **Pendiente** | — |

**Notas operativas actuales (código):**

- Healthcheck: `GET /config/correo/estado` y `GET /auth/mail-estado` (público, login).
- Cola correo: `mail_outbox` con flush cada 60 s al arrancar SMTP.
- Sin orquestador de alta disponibilidad (un solo proceso Node).

---

## Acta de cierre (completar tras reunión)

| Campo | Valor |
|-------|-------|
| Participantes | |
| Fecha reunión | |
| RF-G08 aprobados | |
| RF-G08 descartados / diferidos | |
| SLA RNF-DIS acordado | |
| Responsable seguimiento | |

---

## Próximos pasos tras validación

1. Actualizar `REQUISITOS_SGE.md` con decisiones (sustituir **Pendiente**).
2. Si multi-empresa se aprueba: diseño `tenant_id` en tablas críticas.
3. Si SLA se aprueba: documentar en runbook de operaciones y monitorización.
