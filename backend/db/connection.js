require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

// Flexible Server configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'forensic-hr-db.postgres.database.azure.com',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'forensic_hr',
  user: process.env.DB_USER || 'forensicadmin',
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
    // สำหรับ Azure Flexible Server
    require: true,
    minVersion: 'TLSv1.2'
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed:', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

async function getClient() {
  return pool.connect();
}

module.exports = {
  query,
  getClient,
  pool
};
