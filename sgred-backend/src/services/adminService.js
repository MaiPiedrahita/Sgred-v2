// Propósito: bandeja, decisiones, escenarios administrativos. HU-14 a HU-17.
import { getPool, sql } from '../config/database.js'
import { mensajes } from '../constants/mensajes.js'
import { AppError } from '../utils/AppError.js'
import { mailer } from '../config/email.js'

async function verificarUnidad(usuarioId, escenarioId) {
  const pool = await getPool()
  const r = await pool.request().input('UsuarioId', sql.Int, usuarioId).input('EscenarioId', sql.Int, escenarioId)
    .query(`SELECT 1 AS Permitido FROM dbo.AdministrativoUnidad au
      JOIN dbo.Escenarios e ON e.UnidadId=au.UnidadId WHERE au.UsuarioId=@UsuarioId AND e.Id=@EscenarioId`)
  if (!r.recordset.length) throw new AppError('SIN_PERMISOS', 403, mensajes.SIN_PERMISOS)
}
export async function listarSolicitudes(usuarioId, filtros) {
  const pool = await getPool()
  const req = pool.request().input('UsuarioId', sql.Int, usuarioId)
  const where = [`r.Estado='Pendiente'`, `EXISTS (SELECT 1 FROM dbo.AdministrativoUnidad au JOIN dbo.Escenarios ae ON ae.UnidadId=au.UnidadId WHERE au.UsuarioId=@UsuarioId AND ae.Id=r.EscenarioId)`]
  if (filtros.escenarioId) { req.input('EscenarioId', sql.Int, filtros.escenarioId); where.push('r.EscenarioId=@EscenarioId') }
  if (filtros.fechaReserva) { req.input('Fecha', sql.Date, filtros.fechaReserva); where.push('r.FechaReserva=@Fecha') }
  const r = await req.query(`SELECT r.Id,r.Codigo,u.Nombres,u.Apellidos,u.EntidadRepresentada,e.Nombre AS Escenario,
    r.FechaReserva,r.HoraInicio,r.HoraFin,r.TipoUso,r.Participantes,r.FechaSolicitud
    FROM dbo.Reservas r JOIN dbo.Usuarios u ON u.Id=r.UsuarioId JOIN dbo.Escenarios e ON e.Id=r.EscenarioId
    WHERE ${where.join(' AND ')} ORDER BY r.FechaSolicitud ASC`)
  return r.recordset
}
export async function detalleSolicitud(usuarioId, id) {
  const pool = await getPool()
  const r = await pool.request().input('Id', sql.Int, id).query(`SELECT r.*,e.Nombre AS Escenario,e.UnidadId,u.Nombres,u.Apellidos,u.Documento,u.Correo,u.Telefono,u.EntidadRepresentada FROM dbo.Reservas r
    JOIN dbo.Escenarios e ON e.Id=r.EscenarioId JOIN dbo.Usuarios u ON u.Id=r.UsuarioId WHERE r.Id=@Id`)
  if (!r.recordset.length) throw new AppError('NO_ENCONTRADO', 404, 'Solicitud no encontrada')
  await verificarUnidad(usuarioId, r.recordset[0].EscenarioId)
  return r.recordset[0]
}
export async function decidirSolicitud(usuarioId, id, accion, motivo) {
  const pool = await getPool()
  const actual = await pool.request().input('Id', sql.Int, id).query(`SELECT r.*,e.UnidadId,u.Correo,u.Nombres,u.Apellidos FROM dbo.Reservas r
    JOIN dbo.Escenarios e ON e.Id=r.EscenarioId JOIN dbo.Usuarios u ON u.Id=r.UsuarioId WHERE r.Id=@Id`)
  if (!actual.recordset.length) throw new AppError('NO_ENCONTRADO', 404, 'Solicitud no encontrada')
  await verificarUnidad(usuarioId, actual.recordset[0].EscenarioId)
  if (actual.recordset[0].Estado !== 'Pendiente') throw new AppError('YA_RESUELTA', 409, mensajes.YA_RESUELTA)
  if (accion === 'rechazar') {
    const limpio = (motivo || '').trim()
    if (limpio.length < 10) throw new AppError('MOTIVO_RECHAZO', 400, mensajes.MOTIVO_RECHAZO)
  }
  // [TRANSACCION] [REGLA HU-15] [REGLA HU-16] Actualizacion atomica y condicionada.
  const tx = new sql.Transaction(pool)
  await tx.begin()
  const estado = accion === 'aprobar' ? 'Aprobada' : 'Rechazada'
  const update = await new sql.Request(tx).input('Id', sql.Int, id).input('Estado', sql.NVarChar, estado)
    .input('UsuarioId', sql.Int, usuarioId).input('Motivo', sql.NVarChar, accion === 'rechazar' ? motivo.trim() : null)
    .query(`UPDATE dbo.Reservas SET Estado=@Estado,DecididoPorId=@UsuarioId,FechaDecision=SYSUTCDATETIME(),MotivoRechazo=@Motivo
      WHERE Id=@Id AND Estado='Pendiente'`)
  if (update.rowsAffected[0] !== 1) {
    await tx.rollback()
    throw new AppError('YA_RESUELTA', 409, mensajes.YA_RESUELTA)
  }
  await tx.commit()
  try {
    await mailer.sendMail({ to: actual.recordset[0].Correo, subject: `Solicitud ${estado.toLowerCase()} en SGRED`, text: accion === 'rechazar' ? motivo : 'Tu solicitud fue aprobada.' })
  } catch (error) {
    await pool.request().input('ReservaId', sql.Int, id).input('UsuarioId', sql.Int, actual.recordset[0].UsuarioId)
      .input('Destino', sql.NVarChar, actual.recordset[0].Correo).input('Asunto', sql.NVarChar, `Solicitud ${estado}`)
      .input('Error', sql.NVarChar, error.message)
      .query(`INSERT INTO dbo.NotificacionesCorreo (Tipo,Destinatario,Asunto,Estado,Error,ReservaId,UsuarioId)
        VALUES ('Decisión',@Destino,@Asunto,'Fallido',@Error,@ReservaId,@UsuarioId)`)
  }
  return accion === 'aprobar' ? mensajes.SOLICITUD_APROBADA : mensajes.SOLICITUD_RECHAZADA
}

export async function listarEscenariosAdmin(usuarioId) {
  const pool = await getPool()
  const r = await pool.request().input('UsuarioId', sql.Int, usuarioId).query(`SELECT e.*,u.Nombre AS Unidad,te.Nombre AS Tipo
    FROM dbo.Escenarios e JOIN dbo.UnidadesDeportivas u ON u.Id=e.UnidadId
    JOIN dbo.TiposEscenario te ON te.Id=e.TipoEscenarioId
    JOIN dbo.AdministrativoUnidad au ON au.UnidadId=u.Id WHERE au.UsuarioId=@UsuarioId`)
  return r.recordset
}
export async function crearEscenario(usuarioId, body) {
  if (!body.nombre || !body.unidadId || !body.tipoEscenarioId || !body.capacidad)
    throw new AppError('CAMPOS_OBLIGATORIOS', 400, mensajes.CAMPOS_OBLIGATORIOS)
  if (Number(body.capacidad) <= 0) throw new AppError('CAPACIDAD_INVALIDA', 422, mensajes.CAPACIDAD_INVALIDA)
  const pool = await getPool()
  const permiso = await pool.request().input('UsuarioId', sql.Int, usuarioId).input('UnidadId', sql.Int, body.unidadId)
    .query(`SELECT 1 AS Permitido FROM dbo.AdministrativoUnidad WHERE UsuarioId=@UsuarioId AND UnidadId=@UnidadId`)
  if (!permiso.recordset.length) throw new AppError('SIN_PERMISOS', 403, mensajes.SIN_PERMISOS)
  const dup = await pool.request().input('UnidadId', sql.Int, body.unidadId).input('Nombre', sql.NVarChar, body.nombre.trim())
    .query(`SELECT 1 FROM dbo.Escenarios WHERE UnidadId=@UnidadId AND LOWER(Nombre)=LOWER(@Nombre)`)
  if (dup.recordset.length) throw new AppError('ESCENARIO_DUPLICADO', 409, mensajes.ESCENARIO_DUPLICADO)
  const r = await pool.request().input('UnidadId', sql.Int, body.unidadId).input('Tipo', sql.Int, body.tipoEscenarioId)
    .input('Nombre', sql.NVarChar, body.nombre.trim()).input('Capacidad', sql.Int, body.capacidad).input('Descripcion', sql.NVarChar, body.descripcion || null)
    .query(`INSERT INTO dbo.Escenarios (UnidadId,TipoEscenarioId,Nombre,Capacidad,Descripcion,Estado)
      OUTPUT INSERTED.Id VALUES (@UnidadId,@Tipo,@Nombre,@Capacidad,@Descripcion,'Activo')`)
  return { id: r.recordset[0].Id }
}
export async function editarEscenario(usuarioId, id, body) {
  const pool = await getPool()
  const actual = await pool.request().input('Id', sql.Int, id).query(`SELECT UnidadId FROM dbo.Escenarios WHERE Id=@Id`)
  if (!actual.recordset.length) throw new AppError('NO_ENCONTRADO', 404, 'Escenario no encontrado')
  await verificarUnidad(usuarioId, id)
  if (body.capacidad !== undefined && Number(body.capacidad) <= 0) throw new AppError('CAPACIDAD_INVALIDA', 422, mensajes.CAPACIDAD_INVALIDA)
  await pool.request().input('Id', sql.Int, id).input('Nombre', sql.NVarChar, body.nombre)
    .input('Tipo', sql.Int, body.tipoEscenarioId).input('Capacidad', sql.Int, body.capacidad).input('Descripcion', sql.NVarChar, body.descripcion || null)
    .query(`UPDATE dbo.Escenarios SET Nombre=@Nombre,TipoEscenarioId=@Tipo,Capacidad=@Capacidad,Descripcion=@Descripcion WHERE Id=@Id`)
  return mensajes.ESCENARIO_ACTUALIZADO
}
export async function cambiarEstadoEscenario(usuarioId, id, estado) {
  const pool = await getPool()
  await verificarUnidad(usuarioId, id)
  if (estado === 'Inactivo') {
    const futuras = await pool.request().input('Id', sql.Int, id).query(`SELECT 1 FROM dbo.Reservas
      WHERE EscenarioId=@Id AND Estado='Aprobada' AND
      (FechaReserva>CONVERT(DATE,SYSUTCDATETIME()) OR (FechaReserva=CONVERT(DATE,SYSUTCDATETIME()) AND HoraFin>CONVERT(TIME,SYSUTCDATETIME()))`)
    if (futuras.recordset.length) throw new AppError('NO_INACTIVAR', 409, mensajes.NO_INACTIVAR)
  }
  await pool.request().input('Id', sql.Int, id).input('Estado', sql.NVarChar, estado)
    .query(`UPDATE dbo.Escenarios SET Estado=@Estado WHERE Id=@Id`)
  return { estado }
}
