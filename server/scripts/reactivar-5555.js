require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql');
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
db.query(
  `UPDATE contratos_generales
      SET cancelado = 0, cancelado_en = NULL, cancelado_por = NULL,
          aprobacion_estado = 'aprobado', aprobacion_accion = NULL
    WHERE numero_contrato = '5555'`,
  (err, result) => {
    if (err) console.error(err.message);
    else console.log('Contrato 5555 reactivado. Filas:', result.affectedRows);
    db.end();
  }
);
