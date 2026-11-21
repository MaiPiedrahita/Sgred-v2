// [DB] Propósito: crear el pool y ejecutar consultas parametrizadas. HU-01 a HU-17.
import sql from 'mssql'
import { env } from './env.js'

let pool
export async function getPool() {
  if (!pool) {
    pool = await new sql.ConnectionPool({
      server: env.db.server,
      port: env.db.port,
      database: env.db.database,
      user: env.db.user,
      password: env.db.password,
      options: { encrypt: env.db.encrypt, trustServerCertificate: true },
      pool: { max: 20, min: 0, idleTimeoutMillis: 30000 },
    }).connect()
  }
  return pool
}
export async function closePool() {
  if (pool) await pool.close()
  pool = undefined
}
export { sql }
