require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql');

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const defs = [
  "ALTER TABLE contratos_generales ADD COLUMN aprobacion_estado VARCHAR(20) NOT NULL DEFAULT 'aprobado' AFTER cancelado_por",
  'ALTER TABLE contratos_generales ADD COLUMN aprobacion_accion VARCHAR(20) NULL AFTER aprobacion_estado',
  'ALTER TABLE contratos_generales ADD COLUMN aprobacion_propuesta JSON NULL AFTER aprobacion_accion',
  'ALTER TABLE contratos_generales ADD COLUMN aprobacion_solicitado_por VARCHAR(255) NULL AFTER aprobacion_propuesta',
  'ALTER TABLE contratos_generales ADD COLUMN aprobacion_solicitado_en DATETIME NULL AFTER aprobacion_solicitado_por',
  'ALTER TABLE contratos_generales ADD COLUMN aprobacion_resuelto_por VARCHAR(255) NULL AFTER aprobacion_solicitado_en',
  'ALTER TABLE contratos_generales ADD COLUMN aprobacion_resuelto_en DATETIME NULL AFTER aprobacion_resuelto_por',
];

function query(sql) {
  return new Promise((resolve, reject) => {
    db.query(sql, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

(async () => {
  for (const sql of defs) {
    try {
      await query(sql);
      console.log('OK:', sql.slice(0, 60) + '...');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('Ya existe:', err.message);
      } else {
        throw err;
      }
    }
  }
  console.log('Migración de aprobación completada.');
  db.end();
})().catch((err) => {
  console.error(err.message);
  db.end();
  process.exit(1);
});
