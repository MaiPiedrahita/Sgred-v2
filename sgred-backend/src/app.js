// Propósito: configuración de Express y middlewares comunes.
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import pinoHttp from 'pino-http'
import swaggerUi from 'swagger-ui-express'
import fs from 'node:fs'
import YAML from 'yaml'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import routes from './routes/index.js'
import { errorHandler } from './middlewares/errorHandler.js'

const app = express()
if (env.trustProxy) app.set('trust proxy', 1)
app.use(helmet())
app.use(cors({ origin: env.frontendUrl, credentials: true }))
app.use(pinoHttp({ logger }))
app.use(express.json({ limit: '100kb' }))
app.use((req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next() })
// [TODO Sprint 3] HU-04 recuperación de contraseña.
// [TODO Sprint 3] HU-10.2 estado No disponible y horario configurable.
// [TODO Sprint 3] HU-13 cancelación de reservas.
// [TODO Sprint 3] HU-18 horario y bloqueo de franjas.
// [TODO Sprint 3] HU-19 candidata.
// [SEGURIDAD] Punto de extension para CAPTCHA sin implementarlo en este sprint.

const openapiPath = `${process.cwd()}/openapi.yaml`
if (fs.existsSync(openapiPath)) {
  const openapi = YAML.parse(fs.readFileSync(openapiPath, 'utf8'))
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi))
}
app.use('/api/v1', routes)
app.use((req, res) => res.status(404).json({ ok: false, error: { codigo: 'NO_ENCONTRADO', mensaje: 'Ruta no encontrada' } }))
app.use(errorHandler)
export default app
