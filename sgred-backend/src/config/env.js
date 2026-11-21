// [CONFIG] Propósito: lectura centralizada y validación de variables de entorno.
import 'dotenv/config'
export const env = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  db: {
    server: process.env.DB_SERVER || 'localhost',
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME || 'sgred',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong!Passw0rd',
    encrypt: process.env.DB_ENCRYPT === 'true',
  },
  jwtSecret: process.env.JWT_SECRET || 'development-secret-change',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30m',
  inactivityMinutes: Number(process.env.SESSION_INACTIVITY_MINUTES || 30),
  tokenHours: Number(process.env.TOKEN_ENLACE_HOURS || 24),
  zone: process.env.TZ_CITY || 'America/Bogota',
  trustProxy: process.env.TRUST_PROXY === 'true',
}
