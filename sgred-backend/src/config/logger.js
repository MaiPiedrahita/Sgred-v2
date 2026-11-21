// Propósito: registrar eventos sin secretos ni contraseñas.
import pino from 'pino'
export const logger = pino({
  redact: ['req.headers.authorization', 'password', 'confirmacionPassword', 'token'],
})
