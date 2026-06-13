# Capítulo 4 — Pruebas de seguridad (texto alineado al código)

> **Uso:** Incorporar o adaptar este texto en el Capítulo 4 de la tesis. Sustituye formulaciones genéricas de “pentest” o “pruebas de penetración exhaustivas” por la metodología **realmente aplicada** en el proyecto, sin perder rigor académico.

---

## 4.X Objetivo de las pruebas de seguridad

El objetivo fue validar que la API REST del sistema (Node.js/Express) y su integración con el cliente React cumplen los requisitos no funcionales de seguridad (RNF-SEG) definidos para la plataforma: autenticación robusta, control de acceso basado en roles (RBAC), protección frente a inyección SQL en puntos críticos, configuración segura del servidor y trazabilidad de eventos sensibles.

El alcance comprendió el backend en `server/index.js`, las librerías en `server/lib/*`, la configuración mediante variables de entorno (`server/.env`) y la persistencia de sesión en el cliente React.

---

## 4.X Metodología

Se aplicó una metodología en **tres fases**, alineada con las categorías del **OWASP Top 10** (2021) como marco de referencia, sin constituir una certificación formal OWASP ASVS ni un pentest de caja negra contratado externamente.

### Fase 1 — Revisión estática del código (SAST manual)

Se inspeccionó el código fuente buscando debilidades en:

| Categoría OWASP | Aspecto revisado | Evidencia |
|-----------------|------------------|-----------|
| A01 Broken Access Control | Middleware JWT, RBAC, rutas públicas | `verificarToken`, `autorizarRol`, `autorizarPermiso` |
| A02 Cryptographic Failures | JWT, bcrypt, SMTP | `securityConfig.js`, `bcrypt.hash(..., 10)` |
| A03 Injection | Consultas SQL parametrizadas | mysql2 con placeholders `?` |
| A05 Security Misconfiguration | CORS, Helmet, secretos en .env | `securityConfig.js`, hallazgos H-01 a H-06 |

Los hallazgos y correcciones quedaron documentados en el **Informe de seguridad AEPG** (`docs/INFORME_SEGURIDAD_AEPG.docx`), generado desde `server/scripts/generate-informe-seguridad-docx.mjs`.

### Fase 2 — Pruebas dinámicas automatizadas (smoke tests)

Se desarrolló el script `server/scripts/security-smoke-test.mjs`, que ejecuta **10 pruebas HTTP** contra la API en ejecución, sin interfaz gráfica. Los resultados se exportan a `docs/security-test-results.json`.

**Comando de ejecución:**

```bash
cd server
node index.js          # en otra terminal, con MySQL activo
node scripts/security-smoke-test.mjs
```

**Pruebas incluidas:**

1. Acceso a ruta protegida sin token (401 esperado).
2. Token JWT inválido (403 esperado).
3. Login con credenciales incorrectas (401).
4. **Inyección SQL** en identificador de login: payload `' OR 1=1--` (401, sin bypass).
5. Rechazo de contraseña débil en recuperación (400).
6. Creación de usuario sin autenticación (401).
7. Listado de contratos sin token (401).
8. Presencia de cabeceras de seguridad HTTP (Helmet).
9. Restricción CORS para origen no autorizado.
10. Invalidación de token tras logout (blacklist JWT), cuando se configuran credenciales de prueba.

**Resultado documentado:** 10/10 pruebas superadas en ejecución del 8 de junio de 2026 (`docs/security-test-results.json`).

### Fase 3 — Auditoría de cobertura de autenticación en rutas

El script `server/scripts/audit-api-auth.mjs` verifica que las rutas declaradas en `server/index.js` incluyan protección explícita o estén cubiertas por el middleware global de JWT.

---

## 4.X Resultados

### Controles verificados favorablemente

- Autenticación con **bcrypt** (hash de contraseñas, factor 10).
- **JWT** con caducidad de 8 horas y blacklist en logout.
- **RBAC** con permisos consultados en base de datos en cada petición.
- Bloqueo tras 5 intentos fallidos de login (15 minutos).
- Consultas **SQL parametrizadas** en el API activo.
- Auditoría de sesiones, eventos y logins fallidos.
- Cabeceras **Helmet** y **CORS** con lista blanca.

### Hallazgos corregidos durante el proyecto

| ID | Debilidad | Corrección |
|----|-----------|------------|
| H-01 | Secreto JWT con fallback débil | `JWT_SECRET` obligatorio en producción (≥32 caracteres) |
| H-02 | CORS abierto | Lista blanca `CORS_ORIGINS` |
| H-03 | Sin rate limiting | Límites en login, reset y API general |
| H-04 | Cabeceras HTTP ausentes | Middleware Helmet |
| H-05 | Reset con contraseña débil | Política `passwordFuerte` unificada |
| H-06 | Clave SMTP débil | Derivación compartida con JWT |

### Limitaciones reconocidas (importante para el tribunal)

1. **No se contrató un pentest externo** ni se utilizaron herramientas comerciales de explotación (Burp Suite Pro, OWASP ZAP automatizado sobre todos los endpoints).
2. La prueba de **inyección SQL** dinámica se centró en el endpoint de **login**; no se realizó fuzzing exhaustivo de todos los parámetros de consulta.
3. **No existe suite de tests unitarios** automatizada (Jest/Mocha) en el servidor; las pruebas de seguridad son scripts ad hoc reproducibles.
4. El token JWT se almacena en `localStorage` del navegador (riesgo XSS documentado; mejora futura: cookies `httpOnly`).

---

## 4.X Conclusiones del Capítulo 4

Las pruebas de seguridad aplicadas demostraron que la API implementa controles de autenticación, autorización RBAC, endurecimiento de configuración y mitigación de inyección SQL en el flujo de acceso, conforme a las buenas prácticas OWASP Top 10 utilizadas como marco de revisión.

La metodología combina **análisis estático**, **pruebas dinámicas reproducibles** y **documentación de hallazgos**, adecuada al alcance de un proyecto de titulación. Se recomienda, como trabajo futuro, un **pentest profesional** previo a despliegue en producción institucional y la ampliación de la batería de pruebas dinámicas a todos los endpoints CRUD de contratos y usuarios.

---

## Frases sugeridas para la defensa oral

- *“Utilizamos OWASP Top 10 como marco de categorización, no como certificación.”*
- *“Las pruebas dinámicas están automatizadas y reproducibles; cualquier miembro del tribunal puede ejecutar `security-smoke-test.mjs` con el servidor en marcha.”*
- *“La inyección SQL se previene por diseño con consultas parametrizadas; la prueba SEC-04 valida que un payload clásico no bypass el login.”*

---

## Referencias cruzadas en el repositorio

- `docs/INFORME_SEGURIDAD_AEPG.docx`
- `docs/security-test-results.json`
- `docs/REQUISITOS_SGE.md` (sección RNF-SEG)
- `docs/informes/INFORME_RF_PARTE_01_AUTENTICACION.md`
- `docs/informes/RESPUESTAS_OPONENCIA.md` (pregunta 3)
