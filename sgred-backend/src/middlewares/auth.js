// [AUTH] Propósito: validar JWT y sesión activa en la base. HU-02, HU-06.
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { getPool, sql } from '../config/database.js'
import { AppError } from '../utils/AppError.js'
import { mensajes } from '../constants/mensajes.js'
import { DateTime } from 'luxon'

export async function autenticar(req, _res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) throw new AppError('NO_AUTORIZADO', 401, 'No autorizado')
    const payload = jwt.verify(token, env.jwtSecret)
    const pool = await getPool()
    const result = await pool.request()
      .input('SesionId', sql.UniqueIdentifier, payload.sessionId)
      .query(`SELECT s.Id, s.Revocada, s.UltimaActividad, u.Id AS UsuarioId, u.RolId,
        r.Nombre AS Rol, u.PuedeGestionarUsuarios, u.Activo
        FROM dbo.Sesiones s JOIN dbo.Usuarios u ON u.Id=s.UsuarioId
        JOIN dbo.Roles r ON r.Id=u.RolId WHERE s.Id=@SesionId`)
    const row = result.recordset[0]
    if (!row || row.Revocada || !row.Activo) throw new AppError('NO_AUTORIZADO', 401, 'No autorizado')
    const ult = DateTime.fromJSDate(row.UltimaActividad, { zone: 'utc' }).setZone(env.zone)
    if (DateTime.now().setZone(env.zone).diff(ult, 'minutes').minutes >= env.inactivityMinutes) {
      await pool.request().input('SesionId', sql.UniqueIdentifier, row.Id).query(`UPDATE dbo.Sesiones SET Revocada=1, FechaRevocacion=SYSUTCDATETIME() WHERE Id=@SesionId`)
      throw new AppError('SESION_EXPIRADA', 401, mensajes.SESION_EXPIRADA)
    }
    await pool.request().input('SesionId', sql.UniqueIdentifier, row.Id).query(`UPDATE dbo.Sesiones SET UltimaActividad=SYSUTCDATETIME() WHERE Id=@SesionId`)
    req.usuario = { ...row, sessionId: payload.sessionId }
    next()
  } catch (error) {
    next(error instanceof AppError ? error : new AppError('NO_AUTORIZADO', 401, 'No autorizado'))
  }
}

export function autorizarRoles(...roles) {
  return (req, _res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.Rol)) {
      return next(new AppError('SIN_PERMISOS', 403, mensajes.SIN_PERMISOS))
    }
    next()
  }
}
