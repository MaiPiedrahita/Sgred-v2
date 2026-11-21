// Propósito: consulta y actualización del perfil. HU-07.
import { getPool, sql } from '../config/database.js'
import { mensajes } from '../constants/mensajes.js'
import { AppError } from '../utils/AppError.js'
export async function obtenerPerfil(usuarioId) {
  const pool = await getPool()
  const r = await pool.request().input('Id', sql.Int, usuarioId).query(`SELECT Id,Documento,Nombres,Apellidos,Correo,Telefono,EntidadRepresentada FROM dbo.Usuarios WHERE Id=@Id`)
  return r.recordset[0]
}
export async function actualizarPerfil(usuarioId, body) {
  if (!body.nombres?.trim() || !body.apellidos?.trim()) throw new AppError('CAMPOS_OBLIGATORIOS', 400, mensajes.CAMPOS_OBLIGATORIOS)
  if (body.telefono && !/^\d{7,15}$/.test(body.telefono)) throw new AppError('TELEFONO_INVALIDO', 400, mensajes.TELEFONO_INVALIDO)
  const pool = await getPool()
  await pool.request().input('Id', sql.Int, usuarioId).input('Nombres', sql.NVarChar, body.nombres.trim())
    .input('Apellidos', sql.NVarChar, body.apellidos.trim()).input('Telefono', sql.NVarChar, body.telefono || null)
    .input('Entidad', sql.NVarChar, body.entidadRepresentada || null)
    .query(`UPDATE dbo.Usuarios SET Nombres=@Nombres,Apellidos=@Apellidos,Telefono=@Telefono,
      EntidadRepresentada=@Entidad,FechaActualizacion=SYSUTCDATETIME() WHERE Id=@Id`)
  return obtenerPerfil(usuarioId)
}
