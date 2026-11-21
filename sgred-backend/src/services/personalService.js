// Propósito: registro de personal administrativo. HU-05.
import { getPool, sql } from '../config/database.js'
import { env } from '../config/env.js'
import { mensajes } from '../constants/mensajes.js'
import { AppError } from '../utils/AppError.js'
import { crearTokenUsuario } from './tokenEnlaceService.js'
import { mailer } from '../config/email.js'

export async function registrarPersonal(usuarioActual, body) {
  if (!usuarioActual.PuedeGestionarUsuarios) throw new AppError('SIN_PERMISOS', 403, mensajes.SIN_PERMISOS)
  if (!body.documento || !body.nombres || !body.apellidos || !body.correo || !body.unidadId)
    throw new AppError('CAMPOS_OBLIGATORIOS', 400, mensajes.CAMPOS_OBLIGATORIOS)
  const pool = await getPool()
  const duplicado = await pool.request().input('Documento', sql.NVarChar, body.documento).input('Correo', sql.NVarChar, body.correo.toLowerCase())
    .query(`SELECT 1 AS Existe FROM dbo.Usuarios WHERE Documento=@Documento OR LOWER(Correo)=@Correo`)
  if (duplicado.recordset.length) throw new AppError('PERSONAL_DUPLICADO', 409, 'El documento o el correo ya están registrados')
  const result = await pool.request().input('Documento', sql.NVarChar, body.documento).input('Nombres', sql.NVarChar, body.nombres)
    .input('Apellidos', sql.NVarChar, body.apellidos).input('Correo', sql.NVarChar, body.correo.toLowerCase())
    .query(`INSERT INTO dbo.Usuarios (RolId,Documento,Nombres,Apellidos,Correo,PuedeGestionarUsuarios,Activo)
      OUTPUT INSERTED.Id SELECT r.Id,@Documento,@Nombres,@Apellidos,@Correo,0,1 FROM dbo.Roles r WHERE r.Nombre='administrativo'`)
  const usuarioId = result.recordset[0].Id
  await pool.request().input('UsuarioId', sql.Int, usuarioId).input('UnidadId', sql.Int, body.unidadId)
    .query(`INSERT INTO dbo.AdministrativoUnidad (UsuarioId,UnidadId) VALUES (@UsuarioId,@UnidadId)`)
  const token = await crearTokenUsuario(usuarioId)
  let correoEnviado = true
  try {
    await mailer.sendMail({
      to: body.correo,
      subject: 'Activa tu cuenta SGRED',
      text: `Define tu contraseña en ${env.frontendUrl}/definir-password?token=${token}`,
    })
  } catch {
    correoEnviado = false
  }
  return { id: usuarioId, correoEnviado }
}
