// [SEGURIDAD] Propósito: enlace seguro reutilizable por HU-05 y [TODO Sprint 3] HU-04.
import crypto from 'node:crypto'
import { getPool, sql } from '../config/database.js'
import { env } from '../config/env.js'
import { passwordService } from './passwordService.js'
import { AppError } from '../utils/AppError.js'
import { mensajes } from '../constants/mensajes.js'

export function crearTokenPlano() { return crypto.randomBytes(32).toString('hex') }
export function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex') }

export async function crearTokenUsuario(usuarioId, tipo = 'definir_password') {
  const token = crearTokenPlano()
  const pool = await getPool()
  await pool.request().input('UsuarioId', sql.Int, usuarioId).input('Tipo', sql.NVarChar, tipo)
    .input('Hash', sql.Char, hashToken(token)).input('Expira', sql.DateTime2, new Date(Date.now() + env.tokenHours * 3600000))
    .query(`INSERT INTO dbo.TokensEnlace (UsuarioId,Tipo,TokenHash,FechaExpiracion) VALUES (@UsuarioId,@Tipo,@Hash,@Expira)`)
  return token
}
export async function definirPassword(body) {
  if (!body.token || !body.password || !body.confirmacionPassword) throw new AppError('CAMPOS_OBLIGATORIOS', 400, mensajes.CAMPOS_OBLIGATORIOS)
  passwordService.validarRobustez(body.password)
  if (body.password !== body.confirmacionPassword) throw new AppError('PASSWORD_DIFERENTE', 400, mensajes.PASSWORD_DIFERENTE)
  const pool = await getPool()
  const hashTokenValue = hashToken(body.token)
  const tx = new sql.Transaction(pool)
  await tx.begin(sql.ISOLATION_LEVEL.READ_COMMITTED)
  try {
    const token = await new sql.Request(tx).input('Hash', sql.Char, hashTokenValue)
      .query(`SELECT TOP 1 * FROM dbo.TokensEnlace WHERE TokenHash=@Hash AND Usado=0 AND FechaExpiracion>SYSUTCDATETIME()`)
    if (!token.recordset.length) throw new AppError('ENLACE_INVALIDO', 400, mensajes.ENLACE_INVALIDO)
    const passwordHash = await passwordService.hash(body.password)
    await new sql.Request(tx).input('UsuarioId', sql.Int, token.recordset[0].UsuarioId).input('Hash', sql.NVarChar, passwordHash)
      .query(`UPDATE dbo.Usuarios SET PasswordHash=@Hash,FechaActualizacion=SYSUTCDATETIME() WHERE Id=@UsuarioId`)
    await new sql.Request(tx).input('Hash', sql.Char, hashTokenValue)
      .query(`UPDATE dbo.TokensEnlace SET Usado=1,FechaUso=SYSUTCDATETIME() WHERE TokenHash=@Hash`)
    await tx.commit()
  } catch (error) {
    await tx.rollback().catch(() => {})
    throw error
  }
}
