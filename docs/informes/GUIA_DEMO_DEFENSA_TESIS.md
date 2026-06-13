# Guía de demostración en vivo — Defensa de tesis AEPG

> **Duración estimada:** 12–15 minutos  
> **Requisitos previos:** MySQL (XAMPP) activo, servidor Node en puerto 3001, cliente React en puerto 3000, al menos 3 usuarios de prueba (contratación, abogado, director).

---

## Preparación antes de la defensa

### 1. Arrancar servicios

```powershell
# Terminal 1 — Backend
cd c:\crud\server
node index.js

# Terminal 2 — Frontend
cd c:\crud\client
npm start
```

Verificar: `http://localhost:3000` carga login; consola del servidor muestra conexión MySQL OK.

### 2. Usuarios de demostración (ajustar según su BD)

| Rol | Uso en demo | Permisos clave |
|-----|-------------|----------------|
| **contratacion** | Crear/solicitar contratos | `contratos.view`, `edit`, `create` |
| **abogado** | Verificar jurídico, ver mensajes solicitud | `contratos.view`, `verify` |
| **director** | Aprobar/rechazar, ver mensajes verificación | `contratos.view`, `approve` |
| **admin** | Auditoría, usuarios | `usuarios.*`, `auditoria.view` |

### 3. Datos de prueba recomendados

- Al menos **1 contrato activo** con PDF adjunto (para previsualización móvil).
- Opcional: 1 contrato **pendiente de verificación** y 1 **pendiente de aprobación** para acelerar el flujo de mensajes.

### 4. Dispositivo móvil o emulador

- Chrome DevTools → Toggle device toolbar (iPhone/Android) **o** teléfono real en la misma red (`http://<IP-PC>:3000`).
- Tener un PDF cargado en un contrato para la demo de previsualización.

---

## Guión de demostración (paso a paso)

### Bloque A — Autenticación y RBAC (Pregunta 1) · ~4 min

**Objetivo:** Mostrar que el frontend no es la barrera de seguridad; el backend rechaza accesos no autorizados.

#### A.1 Login exitoso

1. Abrir `http://localhost:3000`.
2. Iniciar sesión como usuario **contratacion**.
3. Mencionar: contraseña verificada con **bcrypt**; token JWT 8 h; permisos cargados desde servidor.

#### A.2 UI adaptada al rol

1. Señalar menú lateral: solo módulos permitidos (Contratación, Configuración).
2. Entrar a **Contratación → Contratos**; botones Editar/Cancelar visibles; **Aprobar** no visible (sin permiso `approve`).

#### A.3 RBAC 403 desde API (opcional pero impactante)

Con el servidor en marcha, ejecutar en PowerShell (sin token):

```powershell
Invoke-WebRequest -Uri "http://localhost:3001/contratos" -Method GET
```

**Resultado esperado:** 401 — *Token no proporcionado*.

Con token de contratacion pero intentando crear usuario (requiere admin):

```powershell
# Obtener token desde DevTools → Application → localStorage → token
$token = "PEGAR_TOKEN_AQUI"
Invoke-WebRequest -Uri "http://localhost:3001/create-usuario" -Method POST `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body '{"email":"test@test.com","password":"Test1234","nombre":"Test","rol":"admin"}'
```

**Resultado esperado:** 403 — sin permiso de administrador.

**Frase para tribunal:** *“Aunque modifiquemos el frontend, la API rechaza la operación; la autorización ocurre en Node.js consultando RBAC en MySQL.”*

---

### Bloque B — Auditoría e inmutabilidad (Pregunta 2) · ~3 min

**Objetivo:** Mostrar trazabilidad append-only.

1. Cerrar sesión; entrar como **admin**.
2. Ir a **Auditoría** en menú lateral.
3. Mostrar pestañas: **Sesiones**, **Intentos fallidos**, **Eventos**.
4. Filtrar eventos recientes; señalar login, cambios de usuario o eventos de contrato.
5. Mencionar: no existe botón “eliminar auditoría”; solo INSERT desde servidor.

**Frase:** *“Incluso el administrador consulta el historial pero no puede borrarlo desde la aplicación; los eventos quedan en `audit_events`.”*

---

### Bloque C — Mensajes de contratación (funcionalidad + workflow) · ~3 min

**Objetivo:** Mostrar notificaciones por rol (verify / approve).

#### C.1 Generar mensaje para abogado

1. Sesión **contratacion**: abrir un contrato activo → **Solicitar edición** o **Cancelar** (con motivo).
2. Cerrar sesión → entrar como **abogado**.
3. En menú **Contratación**, clic en **Mensajes** (icono chat, debajo del submenú).
4. Mostrar badge con contador; abrir panel → solicitud con motivo.
5. Mencionar: lectura **individual por usuario** (el badge baja solo para quien abrió).

#### C.2 Mensaje para director (opcional)

1. Como **abogado**: **Verificar** un contrato pendiente → Aprobar verificación.
2. Sesión **director**: abrir **Mensajes** → ver “Verificación aprobada — pendiente de aprobar…”.

---

### Bloque D — Previsualización PDF en móvil (Pregunta técnica reciente) · ~2 min

**Objetivo:** Demostrar corrección del visor PDF en dispositivos móviles.

1. Activar vista móvil (DevTools o teléfono).
2. Login como **contratacion**.
3. **Contratación → Contratos** → contrato con PDF → icono documento → **Vista previa**.
4. Mostrar PDF renderizado página a página (PDF.js/canvas), no ventana en blanco.
5. Comparar brevemente: documento Word también previsualiza correctamente.

**Frase:** *“En móvil el iframe nativo fallaba; implementamos renderizado con PDF.js sobre canvas, igual de fiable que la vista previa Word.”*

---

### Bloque E — Pruebas de seguridad (Pregunta 3, cierre) · ~2 min

**Sin demo en vivo obligatoria** — mostrar evidencia documental:

1. Abrir `docs/security-test-results.json` o `docs/INFORME_SEGURIDAD_AEPG.docx`.
2. Señalar SEC-04 (inyección SQL login → 401) y SEC-01/07 (rutas sin token → 401).
3. Mencionar script reproducible: `node scripts/security-smoke-test.mjs`.

**Frase:** *“No afirmamos pentest externo; sí pruebas OWASP-alineadas automatizadas y revisión estática documentada.”*

---

## Checklist pre-defensa

- [ ] MySQL corriendo, BD `bd_crud` importada
- [ ] `server/.env` con `JWT_SECRET` y `DB_*` correctos
- [ ] Servidor Node sin errores en consola
- [ ] Cliente React accesible
- [ ] Credenciales de 3 roles anotadas en papel de respaldo
- [ ] Al menos 1 PDF en un contrato
- [ ] `docs/informes/RESPUESTAS_OPONENCIA.md` impreso o en tablet
- [ ] Opcional: teléfono con misma WiFi para demo móvil real

---

## Plan B — Si falla algo en vivo

| Problema | Alternativa |
|----------|-------------|
| MySQL caído | Mostrar capturas de pantalla + `security-test-results.json` |
| Login falla | Usar video corto pregrabado de la demo |
| PDF no carga | Descargar PDF y explicar arquitectura PDF.js; mostrar Word preview |
| Mensajes vacíos | Mostrar panel con eventos en **Auditoría → Contratos** (`/contratos/auditoria`) |

---

## Referencias

- Respuestas completas: `docs/informes/RESPUESTAS_OPONENCIA.md`
- Capítulo 4 matizado: `docs/informes/CAPITULO_4_PRUEBAS_SEGURIDAD_ALINEADO.md`
- Informe seguridad: `docs/INFORME_SEGURIDAD_AEPG.docx`
