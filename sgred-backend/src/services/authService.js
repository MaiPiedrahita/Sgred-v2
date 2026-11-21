// Propósito: registro, login, sesión y perfil. HU-01, HU-02, HU-03, HU-06, HU-07.
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { getPool, sql } from '../config/database.js'
import { env } from '../config/env.js'
import { passwordService } from './passwordService.js'
import { mensajes } from '../constants/mensajes.js'
import { AppError } from '../utils/AppError.js'

export async function registrar(body) {
  if (!body.documento || !body.nombres || !body.apellidos || !body.correo || !body.password || !body.confirmacionPassword)
    throw new AppError('CAMPOS_OBLIGATORIOS', 400, mensajes.CAMPOS_OBLIGATORIOS)
  passwordService.validarRobustez(body.password)
  if (body.password !== body.confirmacionPassword) throw new AppError('PASSWORD_DIFERENTE', 400, mensajes.PASSWORD_DIFERENTE)
  const pool = await getPool()
  const existeCorreo = await pool.request().input('Correo', sql.NVarChar, body.correo.toLowerCase()).query(`SELECT 1 AS Existe FROM dbo.Usuarios WHERE LOWER(Correo)=@Correo`)
  if (existeCorreo.recordset.length) throw new AppError('CORREO_DUPLICADO', 409, mensajes.CORREO_REGISTRADO)
  const existeDocumento = await pool.request().input('Documento', sql.NVarChar, body.documento).query(`SELECT 1 AS Existe FROM dbo.Usuarios WHERE Documento=@Documento`)
  if (existeDocumento.recordset.length) throw new AppError('DOCUMENTO_DUPLICADO', 409, mensajes.DOCUMENTO_REGISTRADO)
  const hash = await passwordService.hash(body.password)
  const result = await pool.request()
    .input('Documento', sql.NVarChar, body.documento).input('Nombres', sql.NVarChar, body.nombres)
    .input('Apellidos', sql.NVarChar, body.apellidos).input('Correo', sql.NVarChar, body.correo.toLowerCase())
    .input('Hash', sql.NVarChar, hash)
    .query(`INSERT INTO dbo.Usuarios (RolId,Documento,Nombres,Apellidos,Correo,PasswordHash)
      OUTPUT INSERTED.Id
      SELECT r.Id,@Documento,@Nombres,@Apellidos,@Correo,@Hash FROM dbo.Roles r WHERE r.Nombre='usuario'`)
  return { id: result.recordset[0].Id, rol: 'usuario' }
}

const falsoHash = '$2b$12$abcdefghijklmnopqrstuu6fBfYwQHsyiTn4E8a8I3e1n0'
export async function login(body) {
  if (!body.correo || !body.password) throw new AppError('CREDENCIALES_INVALIDAS', 401, mensajes.CREDENCIALES_INVALIDAS)
  const pool = await getPool()
  const found = await pool.request().input('Correo', sql.NVarChar, body.correo.toLowerCase())
    .query(`SELECT u.*, r.Nombre AS Rol FROM dbo.Usuarios u JOIN dbo.Roles r ON r.Id=u.RolId WHERE LOWER(u.Correo)=@Correo`)
  const usuario = found.recordset[0]
  if (!usuario) {
    await bcrypt.compare(body.password, falsoHash)
    throw new AppError('CREDENCIALES_INVALIDAS', 401, mensajes.CREDENCIALES_INVALIDAS)
  }
  if (usuario.BloqueadoHasta && new Date(usuario.BloqueadoHasta) > new Date())
    throw new AppError('CUENTA_BLOQUEADA', 423, mensajes.CUENTA_BLOQUEADA)
  if (!usuario.Activo || !usuario.PasswordHash) throw new AppError('CREDENCIALES_INVALIDAS', 401, mensajes.CREDENCIALES_INVALIDAS)
  const valida = await passwordService.verificar(body.password, usuario.PasswordHash)
  if (!valida) {
    const intentos = usuario.IntentosFallidos + 1
    if (intentos >= 5) {
      await pool.request().input('Id', sql.Int, usuario.Id).query(`UPDATE dbo.Usuarios SET IntentosFallidos=0,BloqueadoHasta=DATEADD(MINUTE,15,SYSUTCDATETIME()) WHERE Id=@Id`)
      throw new AppError('CUENTA_BLOQUEADA', 423, mensajes.CUENTA_BLOQUEADA)
    }
    await pool.request().input('Id', sql.Int, usuario.Id).input('Intentos', sql.Int, intentos).query(`UPDATE dbo.Usuarios SET IntentosFallidos=@Intentos WHERE Id=@Id`)
    throw new AppError('CREDENCIALES_INVALIDAS', 401, mensajes.CREDENCIALES_INVALIDAS)
  }
  await pool.request().input('Id', sql.Int, usuario.Id).query(`UPDATE dbo.Usuarios SET IntentosFallidos=0,BloqueadoHasta=NULL WHERE Id=@Id`)
  const sesion = await pool.request().input('UsuarioId', sql.Int, usuario.Id)
    .query(`INSERT INTO dbo.Sesiones (UsuarioId) OUTPUT INSERTED.Id VALUES (@UsuarioId)`)
  const sessionId = sesion.recordset[0].Id
  const token = jwt.sign({ sessionId, sub: usuario.Id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn })
  const unidades = await pool.request().input('UsuarioId', sql.Int, usuario.Id)
    .query(`SELECT u.Id,u.Nombre FROM dbo.AdministrativoUnidad au JOIN dbo.UnidadesDeportivas u ON u.Id=au.UnidadId WHERE au.UsuarioId=@UsuarioId`)
  return { token, usuario: { id: usuario.Id, nombres: usuario.Nombres, apellidos: usuario.Apellidos, correo: usuario.Correo, rol: usuario.Rol, puedeGestionarUsuarios: !!usuario.PuedeGestionarUsuarios, unidades: unidades.recordset }, expiraEn: env.jwtExpiresIn }
}

export async function logout(sessionId) {
  const pool = await getPool()
  await pool.request().input('SesionId', sql.UniqueIdentifier, sessionId).query(`UPDATE dbo.Sesiones SET Revocada=1,FechaRevocacion=SYSUTCDATETIME() WHERE Id=@SesionId`)
  return { cerrado: true }
}

export async function sesion(sessionId) {
  const pool = await getPool()
  const r = await pool.request().input('SesionId', sql.UniqueIdentifier, sessionId)
    .query(`SELECT UltimaActividad FROM dbo.Sesiones WHERE Id=@SesionId AND Revocada=0`)
  if (!r.recordset.length) throw new AppError('SESION_EXPIRADA', 401, mensajes.SESION_EXPIRADA)
  const ultima = new Date(r.recordset[0].UltimaActividad)
  const restantes = Math.max(0, env.inactivityMinutes * 60 - Math.floor((Date.now() - ultima.getTime()) / 1000))
  return { segundosRestantes: restantes }
}
