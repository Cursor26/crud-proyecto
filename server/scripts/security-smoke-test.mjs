/**
 * Pruebas básicas de seguridad contra la API en ejecución.
 * Ejecutar: node scripts/security-smoke-test.mjs
 * Requiere servidor en http://localhost:3001 (o API_BASE_URL).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CRUD_ROOT = path.join(__dirname, '..', '..');
const API_BASE = (process.env.API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const OUT_JSON = path.join(CRUD_ROOT, 'docs', 'security-test-results.json');

async function request(method, route, { body, headers = {}, origin } = {}) {
  const url = `${API_BASE}${route}`;
  const h = { ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (origin) h.Origin = origin;

  const res = await fetch(url, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }

  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    json,
  };
}

function pass(id, name, detail, expected, actual) {
  const ok = expected(actual);
  return { id, name, ok, detail, expected: String(expected), actualStatus: actual.status, response: actual.json };
}

async function runTests() {
  const results = [];
  const at = new Date().toISOString();

  // 1. Sin token
  results.push(
    pass('SEC-01', 'Ruta protegida sin token', 'GET /user/profile sin Authorization', (r) => r.status === 401, await request('GET', '/user/profile'))
  );

  // 2. Token inválido
  results.push(
    pass(
      'SEC-02',
      'Token JWT inválido',
      'Bearer basura',
      (r) => r.status === 403,
      await request('GET', '/user/profile', { headers: { Authorization: 'Bearer token.invalido' } })
    )
  );

  // 3. Login credenciales inválidas
  results.push(
    pass(
      'SEC-03',
      'Login credenciales incorrectas',
      'POST /login',
      (r) => r.status === 401,
      await request('POST', '/login', { body: { identifier: 'noexiste@test.local', password: 'WrongPass1' } })
    )
  );

  // 4. SQL injection en login
  results.push(
    pass(
      'SEC-04',
      'Inyección SQL en login',
      "identifier: ' OR 1=1--",
      (r) => r.status === 401,
      await request('POST', '/login', { body: { identifier: "' OR 1=1--", password: 'x' } })
    )
  );

  // 5. Reset contraseña débil
  results.push(
    pass(
      'SEC-05',
      'Reset contraseña débil rechazada',
      'POST /auth/reset-password con 12345678',
      (r) => r.status === 400 && String(r.json?.message || '').includes('mayúscula'),
      await request('POST', '/auth/reset-password', {
        body: { email: 'test@test.com', token: 'fake', newPassword: '12345678' },
      })
    )
  );

  // 6. Crear usuario sin token
  results.push(
    pass(
      'SEC-06',
      'Crear usuario sin autenticación',
      'POST /create-usuario',
      (r) => r.status === 401,
      await request('POST', '/create-usuario', { body: { email: 'hacker@test.com', password: 'Hack1234', nombre: 'H', rol: 'admin' } })
    )
  );

  // 7. Listar contratos sin token
  results.push(
    pass(
      'SEC-07',
      'Listar contratos sin token',
      'GET /contratos',
      (r) => r.status === 401,
      await request('GET', '/contratos')
    )
  );

  // 8. Cabeceras Helmet
  const health = await request('GET', '/auth/login-avatar?identifier=xx');
  const hasHelmet =
    health.headers['x-content-type-options'] === 'nosniff' ||
    health.headers['x-dns-prefetch-control'] !== undefined;
  results.push({
    id: 'SEC-08',
    name: 'Cabeceras de seguridad HTTP (Helmet)',
    ok: hasHelmet,
    detail: 'GET /auth/login-avatar',
    expected: 'x-content-type-options u otra cabecera Helmet',
    actualStatus: health.status,
    response: { headers: health.headers },
  });

  // 9. CORS origen no permitido
  const corsBlocked = await request('GET', '/user/profile', {
    origin: 'http://origen-malicioso.ejemplo',
    headers: { Authorization: 'Bearer x' },
  });
  const corsOk =
    corsBlocked.headers['access-control-allow-origin'] !== 'http://origen-malicioso.ejemplo';
  results.push({
    id: 'SEC-09',
    name: 'CORS restringe origen no autorizado',
    ok: corsOk,
    detail: 'Origin: http://origen-malicioso.ejemplo',
    expected: 'Sin Access-Control-Allow-Origin para origen malicioso',
    actualStatus: corsBlocked.status,
    response: { allowOrigin: corsBlocked.headers['access-control-allow-origin'] || null },
  });

  const testLoginId = process.env.TEST_LOGIN_IDENTIFIER || '';
  const testLoginPass = process.env.TEST_LOGIN_PASSWORD || '';
  if (testLoginId && testLoginPass) {
    const loginRes = await request('POST', '/login', {
      body: { identifier: testLoginId, password: testLoginPass },
    });
    const sessionToken = loginRes.json?.token;
    if (loginRes.status === 200 && sessionToken) {
      await request('POST', '/auth/logout', {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const afterLogout = await request('GET', '/user/profile', {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      results.push(
        pass(
          'SEC-10',
          'Token en blacklist tras logout',
          'Login → logout → GET /user/profile mismo token',
          (r) => r.status === 403,
          afterLogout
        )
      );
    } else {
      results.push({
        id: 'SEC-10',
        name: 'Token en blacklist tras logout',
        ok: false,
        detail: 'Login de prueba falló; revise TEST_LOGIN_IDENTIFIER/PASSWORD',
        expected: '403 tras logout',
        actualStatus: loginRes.status,
        response: loginRes.json,
      });
    }
  } else {
    results.push({
      id: 'SEC-10',
      name: 'Token en blacklist tras logout',
      ok: true,
      skipped: true,
      detail: 'Omitida: defina TEST_LOGIN_IDENTIFIER y TEST_LOGIN_PASSWORD en entorno',
      expected: '403 tras logout',
      actualStatus: null,
      response: null,
    });
  }

  const summary = {
    executedAt: at,
    apiBase: API_BASE,
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2), 'utf8');

  console.log(`\nPruebas de seguridad — ${summary.passed}/${summary.total} OK\n`);
  for (const r of results) {
    console.log(`${r.ok ? 'OK' : 'KO'}  ${r.id}  ${r.name}  (HTTP ${r.actualStatus})`);
    if (!r.ok) console.log('     ', r.detail);
  }
  console.log(`\nResultados guardados en: ${OUT_JSON}\n`);

  if (summary.failed > 0) process.exitCode = 1;
}

runTests().catch((err) => {
  console.error('Error ejecutando pruebas:', err.message || err);
  console.error('¿Está el servidor corriendo en', API_BASE, '?');
  process.exit(1);
});
