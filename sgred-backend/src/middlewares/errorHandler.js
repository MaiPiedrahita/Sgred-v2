// Propósito: convertir AppError y errores internos en respuestas consistentes.
import { ZodError } from 'zod'
import { AppError } from '../utils/AppError.js'
export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({ ok: false, error: { codigo: 'VALIDACION', mensaje: 'Todos los campos son obligatorios', detalles: error.errors.map((x) => ({ campo: x.path.join('.'), mensaje: x.message })) } })
  }
  const app = error instanceof AppError ? error : new AppError('ERROR_INTERNO', 500, 'Error interno del servidor')
  res.status(app.estado).json({ ok: false, error: { codigo: app.codigo, mensaje: app.mensaje, ...(app.detalles ? { detalles: app.detalles } : {}) } })
}
