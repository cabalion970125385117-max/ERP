/**
 * ATCA-ERP v1.0 — SQL Server Database Connection
 * Uses 'mssql' npm package
 * LAN-only; connection pooled; never expose credentials in logs
 */

'use strict';

const sql = require('mssql');

const config = {
  server:   process.env.DB_HOST     || '192.168.1.10',   // LAN fixed IP of SQL Server
  database: process.env.DB_NAME     || 'ATCA_ERP_DB',
  user:     process.env.DB_USER     || 'atca_app',        // Least-privilege app account
  password: process.env.DB_PASS     || '',                 // Set via env; never hardcode
  port:     parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt:                false,   // LAN-only; no TLS required on internal network
    trustServerCertificate: true,
    enableArithAbort:       true,
    requestTimeout:         15000,
  },
  pool: {
    max:             10,
    min:             2,
    idleTimeoutMillis: 30000,
  },
};

/** Singleton connection pool */
let _pool = null;

async function getPool() {
  if (_pool && _pool.connected) return _pool;
  _pool = await sql.connect(config);
  console.log('[DB] Connected to SQL Server:', config.server, '/', config.database);
  return _pool;
}

/**
 * Execute a parameterized query. Returns recordset array.
 * @param {string} queryText - SQL query with @param placeholders
 * @param {Array}  params    - [{name, type, value}] using sql.NVarChar, sql.Int, etc.
 */
async function query(queryText, params = []) {
  const pool = await getPool();
  const request = pool.request();
  params.forEach(p => request.input(p.name, p.type, p.value));
  const result = await request.query(queryText);
  return result.recordset;
}

/**
 * Execute a stored procedure.
 */
async function exec(procName, params = []) {
  const pool = await getPool();
  const request = pool.request();
  params.forEach(p => request.input(p.name, p.type, p.value));
  const result = await request.execute(procName);
  return result.recordset;
}

module.exports = { sql, query, exec, getPool };
