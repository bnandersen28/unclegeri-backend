const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'unclegeri-db.c2vos4siyf8o.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: 'UncleGeri$!', // Use environment variable or default password
  database: 'unclegeri',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,

});

module.exports = pool;