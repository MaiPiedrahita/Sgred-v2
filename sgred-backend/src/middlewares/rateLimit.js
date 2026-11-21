// [SEGURIDAD] Límites de peticiones sensibles.
import { rateLimit } from 'express-rate-limit'
export const crearLimite = (windowMs = 15 * 60 * 1000, limit = 20) => rateLimit({
  windowMs, limit, standardHeaders: true, legacyHeaders: false,
  message: { ok: false, error: { codigo: 'DEMASIADAS_PETICIONES', mensaje: 'Demasiadas peticiones' } },
})
