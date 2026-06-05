require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql');

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.query(
  `SELECT numero_contrato, cancelado, aprobacion_estado, aprobacion_accion,
          aprobacion_solicitado_por, aprobacion_solicitado_en
     FROM contratos_generales
    ORDER BY numero_contrato`,
  (err, rows) => {
    if (err) {
      console.error(err.message);
      process.exit(1);
    }
    console.log(JSON.stringify(rows, null, 2));
    db.end();
  }
);
