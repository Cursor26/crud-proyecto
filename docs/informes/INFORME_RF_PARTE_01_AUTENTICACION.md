# Informe RF — Parte 1: Autenticación y sesión (RF-001 a RF-006)

Este documento explica **cómo está implementado** cada requisito en el código y ofrece **respuestas preparadas** para preguntas de tribunal.

---

## RF-001 — Iniciar sesión con credenciales y emitir JWT

### Qué exige el requisito
El usuario debe poder identificarse con correo o nombre de usuario y contraseña; el sistema valida credenciales, rechaza cuentas inactivas y devuelve un token JWT con rol y permisos.

### Cómo funciona en el programa

1. El usuario escribe identificador y contraseña en `client/src/components/Login.jsx`.
2. El cliente envía `POST /login` con `{ identifier, password }` (también acepta `email` o `usuario` como alias).
3. En `server/index.js` (líneas ~920-1032):
   - Se comprueba si el identificador está **bloqueado** (`audit.isLocked`).
   - Se busca el usuario en BD con SQL que compara email **o** nombre (case-insensitive).
   - Si no existe → 401 y se registra intento fallido (`reason: user_not_found`).
   - Si `activo = 0` → 403 "Usuario inactivo" y auditoría (`reason: user_inactive`).
   - Se valida contraseña con **`bcrypt.compare`** contra el hash en tabla `usuarios`.
   - Si la contraseña falla → 401; tras **5 fallos** se bloquea 15 min (ver RF-006).
   - Si todo es correcto: se limpia bloqueo, se registra sesión en `audit_sessions`, se cargan permisos RBAC y se firma el JWT.

4. El JWT se firma con `jwt.sign(..., { expiresIn: '8h' })` e incluye en el payload: `email`, `nombre`, `rol`, `jti` (UUID único por sesión).

5. La respuesta JSON incluye: `token`, `permisos` (matriz RBAC), `usuario` (email, nombre, rol, fotoPerfil).

### Archivos clave
| Capa | Archivo |
|------|---------|
| UI login | `client/src/components/Login.jsx` |
| Manejo post-login | `client/src/App.js` → función `handleLogin` |
| API login | `server/index.js` → `POST /login` |
| Permisos | `server/lib/rbac.js` |
| Auditoría sesión | `server/lib/auditLog.js` |

### Preguntas del tribunal

**¿Con qué se autentica el usuario?**  
Con correo electrónico **o** nombre de usuario más contraseña. Ambos se resuelven contra la misma tabla `usuarios`; la consulta SQL usa `LOWER(TRIM(...))` para evitar problemas de mayúsculas.

**¿Dónde se guarda la contraseña?**  
En MySQL, columna `password` de `usuarios`, como **hash bcrypt**. Nunca se almacena ni transmite en texto plano después del alta.

**¿Cuánto dura la sesión?**  
**8 horas** desde el login. Está fijado en el servidor al firmar el token (`expiresIn: '8h'`). El cliente lee el campo `exp` del JWT para saber cuándo expira.

**¿Qué pasa si el usuario está inactivo?**  
No puede entrar. El servidor responde HTTP 403 con mensaje explícito y deja constancia en `audit_failed_logins` con motivo `user_inactive`.

**¿Qué información lleva el JWT?**  
Identidad (email, nombre), rol canónico, `jti` para revocación, y fecha de expiración. Los permisos granulares se envían **aparte** en el cuerpo de la respuesta (`permisos`) y se cachean en el navegador.

### Sub-requisitos derivados

| Sub | Explicación técnica |
|-----|---------------------|
| **1.1 Validar bcrypt** | `bcrypt.compare(password, usuario.password)` en `POST /login`. Si falla, 401 sin revelar si el usuario existía (mensaje genérico "Credenciales inválidas"). |
| **1.2 Emitir JWT** | `buildJwtPayload()` añade `jti: crypto.randomUUID()`. Firma con `JWT_SECRET` de `server/.env` (mín. 32 caracteres en producción, ver `securityConfig.js`). |
| **1.3 Rechazar inactivos** | Campo `activo` en `usuarios`; `Number(usuario.activo) === 0` bloquea el login. |
| **1.4 Registrar sesión** | `audit.recordLoginSession` inserta en `audit_sessions`: email, nombre, rol, IP, user-agent. |
| **1.5 Avatar login** | `GET /auth/login-avatar` existe con rate-limit pero **devuelve `fotoPerfil: null`**; el avatar en login se sirve desde caché local del dispositivo (`trustedDeviceProfile`). |

---

## RF-002 — Mantener y validar sesión en el cliente

### Qué exige el requisito
Persistir la sesión en el navegador, enviar el token en cada petición y detectar expiración o invalidez.

### Cómo funciona en el programa

**Al hacer login exitoso** (`App.js`, `handleLogin`):
- `localStorage.setItem('token', newToken)`
- `localStorage.setItem('user', JSON.stringify(usuario))`
- `localStorage.setItem('permisos', JSON.stringify(permisos))` si hay permisos RBAC
- `Axios.defaults.headers.common['Authorization'] = 'Bearer ' + token`

**Al cargar la aplicación** (inicio de `App.js`):
- Lee `token` de localStorage.
- Si `isTokenExpired(token)` → borra `token`, `user`, `permisos` y muestra Login.
- Si válido → restaura estado React (`authToken`, `user`, `permisos`) y configura Axios.

**Durante el uso**:
- Un `useEffect` con intervalo comprueba periódicamente si el token expiró; si es así, fuerza logout.
- `client/src/lib/jwtSession.js`: decodifica el payload Base64 del JWT y compara `exp` (segundos Unix) con `Date.now()`.
- `client/src/axiosConfig.js`: interceptor de respuestas; si el servidor responde 401, limpia localStorage y redirige a login (salvo logout voluntario).

**Permisos en UI**:
- `PermissionsProvider` envuelve el dashboard con la matriz `permisos`.
- Cualquier componente usa `can('modulo', 'accion')` para mostrar u ocultar botones y menús.

### Preguntas del tribunal

**¿Cómo se mantiene la sesión del cliente?**  
No hay cookies de sesión de servidor clásicas. Es un modelo **stateless con JWT**: el navegador guarda el token en **localStorage** y lo reenvía en cada petición HTTP en la cabecera `Authorization: Bearer <token>`.

**¿Cuánto tiempo se mantiene?**  
**8 horas** desde el login (misma caducidad del JWT). Si el usuario recarga la página dentro de esas 8 h, la sesión se **restaura** automáticamente leyendo localStorage. Pasadas 8 h, `isTokenExpired` devuelve true y se le pide login de nuevo.

**¿La sesión sobrevive al cerrar el navegador?**  
Sí, mientras el token no haya expirado, porque localStorage persiste entre sesiones del navegador.

**¿Qué pasa si alguien roba el token?**  
El servidor puede **revocarlo** vía blacklist de `jti` (logout o cambio de contraseña). Aunque el token no haya expirado, las peticiones con JTI revocado reciben 401.

**¿Dónde se valida la sesión?**  
- **Cliente**: `jwtSession.js` (expiración por tiempo).  
- **Servidor**: middleware `verificarToken` en **todas** las rutas no públicas (`apiPublicPaths.js`).

### Sub-requisitos derivados

| Sub | Explicación |
|-----|-------------|
| **2.1 Persistir localStorage** | Claves: `token`, `user`, `permisos`. Definidas en `App.js` como `TOKEN_KEY` y `PERMISOS_KEY`. |
| **2.2 Bearer en Axios** | `setAuthHeader(token)` en `App.js`; interceptor global en `axiosConfig.js`. |
| **2.3 Detectar expiración** | `isTokenExpired(token)` lee `exp` del payload JWT; sin `exp` válido se considera expirado. |
| **2.4 Restaurar al recargar** | Bloque inicial de `App.js` líneas ~301-317: valida token antes de `useState` con sesión activa. |
| **2.5 Permisos en cliente** | `PermissionsContext` + `localStorage permisos`; función `can()` usada en `App.js` para menú lateral. |

---

## RF-003 — Cerrar sesión y revocar token

### Qué exige el requisito
Cierre controlado: revocar JWT en servidor, limpiar cliente y auditar el evento.

### Cómo funciona

1. Usuario pulsa "Cerrar sesión" en el dashboard (`App.js`).
2. Se llama `setVoluntaryLogoutInProgress(true)` para no mostrar alerta de "sesión expirada".
3. `POST /auth/logout` con Bearer token actual.
4. Servidor: `jwtBlacklist.revokeToken(req.user)` guarda el `jti` en tabla `jwt_blacklist` hasta que expire el token.
5. `audit.recordLogout(email)` registra el cierre.
6. Cliente: elimina `token`, `user`, `permisos` de localStorage; borra cabecera Authorization; `setAuthToken(null)` → vuelve a `Login`.

### Preguntas del tribunal

**¿El logout invalida el token inmediatamente?**  
Sí. El `jti` del token pasa a blacklist. Cualquier petición posterior con ese token recibe **401** aunque no hayan pasado las 8 horas.

**¿Se puede usar el token después de cerrar sesión?**  
No, si el servidor recibe el JTI en blacklist (`server/lib/jwtBlacklist.js` + `verificarToken`).

**¿Queda registro del cierre?**  
Sí, en auditoría de eventos/sesiones vía `recordLogout`.

### Sub-requisitos derivados

| Sub | Explicación |
|-----|-------------|
| **3.1 API logout** | `POST /auth/logout`, requiere token válido (`verificarToken`). |
| **3.2 Limpiar local** | `localStorage.removeItem` para las tres claves; `delete Axios.defaults.headers.common.Authorization`. |
| **3.3 Blacklist JTI** | Tabla creada con `sql/jwt_blacklist.sql`; limpieza de tokens expirados. |
| **3.4 Cierre voluntario** | `setVoluntaryLogoutInProgress` en `axiosConfig.js` evita modal de sesión expirada. |
| **3.5 Volver a Login** | Estado `authToken === null` hace que `App.js` renderice `<Login />`. |

---

## RF-004 — Recuperar contraseña por correo electrónico

### Cómo funciona

1. En `Login.jsx`, enlace "Olvidé mi contraseña" → formulario con email.
2. `POST /auth/forgot-password` (rate-limit: 10 peticiones/hora por IP, configurable).
3. Servidor:
   - Normaliza email; si no existe, responde **el mismo mensaje genérico** (no revela si hay cuenta).
   - Genera token aleatorio 32 bytes hex; guarda **solo el hash** en `password_reset_tokens`.
   - Borra tokens anteriores del mismo email.
   - TTL: **`PASSWORD_RESET_TTL_MINUTES`** (default **30 min**).
   - Construye URL: `{APP_BASE_URL}/?resetToken=...&email=...`
   - Envía correo vía SMTP (`sistemaCorreo.js`); si falla, puede encolar en `mail_outbox`.

### Preguntas del tribunal

**¿Cuánto dura el enlace de recuperación?**  
**30 minutos** por defecto (variable de entorno `PASSWORD_RESET_TTL_MINUTES` en `server/.env`).

**¿Se puede solicitar varias veces?**  
Sí, pero cada nueva solicitud **invalida** el token anterior del mismo email (`DELETE` previo en `password_reset_tokens`).

**¿Por qué el mensaje es igual si el email no existe?**  
Por **seguridad**: evita que un atacante descubra qué correos están registrados (enumeración de usuarios).

### Sub-requisitos derivados

| Sub | Detalle |
|-----|---------|
| **4.1 Token en BD** | Tabla `password_reset_tokens`: `email`, `token_hash`, `expires_at`, `requested_ip`. |
| **4.2 Correo con enlace** | Plantilla HTML/texto en `index.js` forgot-password; usa `APP_BASE_URL`. |
| **4.3 Rate-limit** | `authRateLimiters.passwordReset`: ventana 1 h, máx. 10 (env `RATE_LIMIT_RESET_*`). |
| **4.4 Mensaje genérico** | Siempre HTTP 200 con texto "Si el correo existe...". |
| **4.5 Invalidar previos** | `DELETE FROM password_reset_tokens WHERE email = ?` antes del INSERT. |

---

## RF-005 — Restablecer contraseña con token de un solo uso

### Cómo funciona

1. Usuario abre enlace con `resetToken` y `email` en la URL; `Login.jsx` detecta query params y muestra formulario de nueva contraseña.
2. `POST /auth/reset-password` con `{ email, token, password, confirmPassword }`.
3. Servidor valida: token hash coincide, no usado, no expirado; contraseña cumple política (longitud, complejidad); actualiza hash bcrypt en `usuarios`; marca token como usado; **revoca sesiones JWT** del usuario (blacklist masiva por email si está implementado en reset flow).

### Preguntas del tribunal

**¿El token se puede reutilizar?**  
No. Tras un restablecimiento exitoso el registro en `password_reset_tokens` se marca consumido o se elimina.

**¿Qué política de contraseña aplica?**  
Validación en servidor en la ruta reset-password (longitud mínima y complejidad; misma lógica que alta de usuario).

**¿Debe volver a iniciar sesión?**  
Sí. Las sesiones anteriores quedan invalidadas por seguridad.

### Sub-requisitos derivados

| Sub | Detalle |
|-----|---------|
| **5.1 Validar token** | Compara hash SHA del token recibido con `token_hash` en BD y `expires_at > NOW()`. |
| **5.2 Política** | Validación en handler `reset-password` antes de `bcrypt.hash`. |
| **5.3 Hash bcrypt** | `bcrypt.hash(nuevaPassword, rounds)` al actualizar `usuarios`. |
| **5.4 Invalidar token** | UPDATE/DELETE en `password_reset_tokens` tras éxito. |
| **5.5 Revocar sesiones** | Invalidación de tokens activos del usuario afectado. |

---

## RF-006 — Limitar intentos fallidos y bloqueo temporal

### Cómo funciona — dos capas

**Capa 1 — Rate limit por IP** (`securityConfig.js`):
- Login: máx. **30** intentos cada **15 minutos** por IP (`RATE_LIMIT_LOGIN_WINDOW_MS`, `RATE_LIMIT_LOGIN_MAX`).

**Capa 2 — Bloqueo por cuenta/identificador** (`auditLog.js`):
- Tras **5** intentos fallidos (`AUDIT_MAX_FAILED_LOGINS`, default 5) → bloqueo **15 minutos** (`AUDIT_LOCKOUT_MINUTES`).
- Estado en tabla `audit_login_lockouts` (clave: identificador normalizado a minúsculas).
- Motivos registrados en `audit_failed_logins`: `bad_password`, `user_not_found`, `user_inactive`, `locked`.

**Login exitoso** limpia el contador: `audit.clearLockout(identifier)` y por email.

### Preguntas del tribunal

**¿Cuántos intentos fallidos antes del bloqueo?**  
**5 intentos** (configurable con `AUDIT_MAX_FAILED_LOGINS` en `.env`).

**¿Cuánto dura el bloqueo?**  
**15 minutos** (`AUDIT_LOCKOUT_MINUTES`).

**¿Dónde ve el administrador los intentos fallidos?**  
Módulo **Auditoría** → pestañas de intentos fallidos; API `GET /audit/failed-logins` y `GET /audit/failed-summary` (solo rol **admin**).

**¿El rate-limit y el bloqueo son lo mismo?**  
No. El rate-limit protege por **IP** (abuso masivo). El bloqueo por **identificador** protege una cuenta concreta tras fallos repetidos.

### Sub-requisitos derivados

| Sub | Detalle |
|-----|---------|
| **6.1 Rate-limit login** | `express-rate-limit` en `createAuthRateLimiters().login`. |
| **6.2 Bloqueo temporal** | `recordFailedLogin` incrementa `fail_count`; al llegar a 5, `locked_until = now + 15 min`. |
| **6.3 Auditar fallos** | INSERT en `audit_failed_logins` con IP normalizada (`clientIp.js`). |
| **6.4 Resumen** | `GET /audit/failed-summary` agrega por motivo y periodo. |
| **6.5 Estado correo en login** | `GET /auth/mail-estado` público; `Login.jsx` + `useMailServiceStatus` muestran si SMTP está caído. |

---

*Continúa en [Parte 2 — Usuarios y RBAC](./INFORME_RF_PARTE_02_USUARIOS_RBAC.md)*
