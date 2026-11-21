// Propósito: iniciar y cerrar ordenadamente el servidor HTTP.
import app from './app.js'
import { env } from './config/env.js'
import { closePool } from './config/database.js'
import { logger } from './config/logger.js'
const server = app.listen(env.port, () => logger.info(`SGRED escuchando en puerto ${env.port}`))
async function cerrar() {
  server.close(async () => { await closePool(); process.exit(0) })
}
process.on('SIGTERM', cerrar)
process.on('SIGINT', cerrar)
