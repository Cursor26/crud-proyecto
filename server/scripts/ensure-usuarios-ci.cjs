require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bd_crud',
  });
  try {
    const [cols] = await pool.query(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'ci'`
    );
    if (Number(cols[0]?.n) === 0) {
      await pool.query('ALTER TABLE usuarios ADD COLUMN ci CHAR(11) NULL AFTER nombre');
      console.log('[ok] Columna ci agregada a usuarios');
    } else {
      console.log('[ok] Columna ci ya existía');
    }
    const [idx] = await pool.query(
      `SELECT COUNT(*) AS n FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'uq_usuarios_ci'`
    );
    if (Number(idx[0]?.n) === 0) {
      try {
        await pool.query('CREATE UNIQUE INDEX uq_usuarios_ci ON usuarios (ci)');
        console.log('[ok] Índice único uq_usuarios_ci creado');
      } catch (e) {
        console.warn('[warn] Índice uq_usuarios_ci:', e.message);
      }
    }
    const [users] = await pool.query('SELECT email, nombre, ci FROM usuarios LIMIT 3');
    console.log('muestra:', users);
  } catch (e) {
    console.error('[error]', e.message);
    process.exitCode = 1;
  }
  await pool.end();
})();
