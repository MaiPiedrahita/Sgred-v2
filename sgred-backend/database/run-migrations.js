// [DB] Propósito: aplicar migraciones SQL numeradas sobre una base limpia.
import fs from 'node:fs/promises'
import path from 'node:path'
import sql from 'mssql'
import { env } from '../src/config/env.js'

async function run() {
  const server = await sql.connect({
    server: env.db.server, port: env.db.port, database: 'master',
    user: env.db.user, password: env.db.password,
    options: { encrypt: env.db.encrypt, trustServerCertificate: true },
  })
  await server.request().query("IF DB_ID(N'sgred') IS NULL CREATE DATABASE sgred")
  await server.close()
  const pool = await sql.connect({
    server: env.db.server, port: env.db.port, database: env.db.database,
    user: env.db.user, password: env.db.password,
    options: { encrypt: env.db.encrypt, trustServerCertificate: true },
  })
  const folder = path.join(process.cwd(), 'database')
  for (const file of (await fs.readdir(folder)).filter((x) => /^\d.*\.sql$/.test(x)).sort()) {
    const text = await fs.readFile(path.join(folder, file), 'utf8')
    for (const batch of text.split(/^GO\s*$/gim)) {
      if (batch.trim()) await pool.request().query(batch)
    }
  }
  await pool.close()
  console.log('Migraciones aplicadas')
}
run().catch((error) => { console.error(error); process.exit(1) })
