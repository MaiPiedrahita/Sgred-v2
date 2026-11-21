// Propósito: solicitud y seguimiento de reservas. HU-11, HU-12.
import { DateTime } from 'luxon'
import { getPool, sql } from '../config/database.js'
import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'
import { mensajes } from '../constants/mensajes.js'
import { disponibilidad } from './catalogoService.js'

export async function crearReserva(usuarioId, body) {
  if (!body.escenarioId || !body.fecha || !body.horaInicio || !body.horaFin || !body.tipoUso || !body.participantes)
    throw new AppError('CAMPOS_OBLIGATORIOS', 400, mensajes.CAMPOS_OBLIGATORIOS)
  if (!/^\d{2}:\d{2}$/.test(body.horaInicio) || !/^\d{2}:\d{2}$/.test(body.horaFin))
    throw new AppError('VALIDACION', 400, 'Formato de hora inválido')
  if (body.horaFin <= body.horaInicio) throw new AppError('HORA_INVALIDA', 422, mensajes.FIN_INVALIDO)
  const inicio = DateTime.fromFormat(`${body.fecha} ${body.horaInicio}`, 'yyyy-MM-dd HH:mm', { zone: env.zone })
  if (!inicio.isValid || inicio <= DateTime.now().setZone(env.zone))
    throw new AppError('FECHA_FUTURA', 422, mensajes.FECHA_FUTURA)
  const pool = await getPool()
  const escenario = await pool.request().input('Id', sql.Int, body.escenarioId).query(`SELECT e.*,te.Nombre AS Tipo FROM dbo.Escenarios e JOIN dbo.TiposEscenario te ON te.Id=e.TipoEscenarioId WHERE e.Id=@Id`)
  if (!escenario.recordset.length) throw new AppError('NO_ENCONTRADO', 404, 'Escenario no encontrado')
  const e = escenario.recordset[0]
  if (e.Estado !== 'Activo') throw new AppError('ESCENARIO_INACTIVO', 422, mensajes.ESCENARIO_INACTIVO)
  if (body.participantes > e.Capacidad) throw new AppError('SUPERA_CAPACIDAD', 422, mensajes.SUPERA_CAPACIDAD)
  const dow = inicio.weekday
  const horario = await pool.request().input('Id', sql.Int, e.Id).input('Dia', sql.TinyInt, dow)
    .query(`SELECT HoraApertura,HoraCierre FROM dbo.HorariosOperacion WHERE EscenarioId=@Id AND DiaSemana=@Dia`)
  if (!horario.recordset.length) throw new AppError('VALIDACION', 422, 'El escenario no opera en esa fecha')
  const h = horario.recordset[0]
  const apertura = h.HoraApertura.toString().slice(0, 5)
  const cierre = h.HoraCierre.toString().slice(0, 5)
  if (body.horaInicio < apertura || body.horaFin > cierre || body.horaInicio.slice(3) !== '00' || body.horaFin.slice(3) !== '00')
    throw new AppError('VALIDACION', 422, 'La reserva debe estar dentro del horario y usar horas exactas')
  const disponibles = await disponibilidad(e.Id, body.fecha)
  for (let hora = Number(body.horaInicio.slice(0, 2)); hora < Number(body.horaFin.slice(0, 2)); hora++) {
    const f = disponibles.franjas.find((x) => x.horaInicio === `${String(hora).padStart(2, '0')}:00`)
    if (!f?.seleccionable) throw new AppError('FRANJA_OCUPADA', 409, mensajes.FRANJA_OCUPADA)
  }

  const tx = new sql.Transaction(pool)
  await tx.begin(sql.ISOLATION_LEVEL.READ_COMMITTED)
  try {
    const txRequest = new sql.Request(tx)
    // [TRANSACCION] [REGLA HU-11] Bloqueo y verificacion atomica de la franja.
    const ocupadas = await txRequest
      .input('EscenarioId', sql.Int, e.Id).input('Fecha', sql.Date, body.fecha)
      .input('Inicio', sql.VarChar, body.horaInicio).input('Fin', sql.VarChar, body.horaFin)
      .query(`SELECT Id FROM dbo.Reservas WITH (UPDLOCK,HOLDLOCK)
        WHERE EscenarioId=@EscenarioId AND FechaReserva=@Fecha
        AND Estado IN ('Pendiente','Aprobada')
        AND HoraInicio < @Fin AND HoraFin > @Inicio`)
    if (ocupadas.recordset.length) {
      await tx.rollback()
      throw new AppError('FRANJA_OCUPADA', 409, mensajes.FRANJA_OCUPADA)
    }
    const sec = await new sql.Request(tx).query(`SELECT FORMAT(NEXT VALUE FOR dbo.SeqCodigoReserva,'000000') AS Num`)
    const numero = sec.recordset[0].Num
    const year = String(DateTime.now().setZone(env.zone).year)
    const codigo = `RES-${year}-${numero}`
    const insert = await new sql.Request(tx)
      .input('Codigo', sql.NVarChar, codigo).input('UsuarioId', sql.Int, usuarioId)
      .input('EscenarioId', sql.Int, e.Id).input('Fecha', sql.Date, body.fecha)
      .input('Inicio', sql.VarChar, body.horaInicio).input('Fin', sql.VarChar, body.horaFin)
      .input('TipoUso', sql.NVarChar, body.tipoUso).input('Participantes', sql.Int, body.participantes)
      .input('Observaciones', sql.NVarChar, body.observaciones || null)
      .query(`INSERT INTO dbo.Reservas (Codigo,UsuarioId,EscenarioId,FechaReserva,HoraInicio,HoraFin,TipoUso,Participantes,Observaciones,Estado)
        OUTPUT INSERTED.Id
        VALUES (@Codigo,@UsuarioId,@EscenarioId,@Fecha,@Inicio,@Fin,@TipoUso,@Participantes,@Observaciones,'Pendiente')`)
    await tx.commit()
    return { id: insert.recordset[0].Id, codigo, estado: 'Pendiente', mensaje: `Solicitud enviada. Código de seguimiento: ${codigo}` }
  } catch (error) {
    await tx.rollback().catch(() => undefined)
    throw error
  }
}

export async function misReservas(usuarioId, estado) {
  const pool = await getPool()
  const req = pool.request().input('UsuarioId', sql.Int, usuarioId)
  const filtro = estado ? 'AND r.Estado=@Estado' : ''
  if (estado) req.input('Estado', sql.NVarChar, estado)
  const r = await req.query(`SELECT r.Codigo,r.Id,e.Nombre AS Escenario,u.Nombre AS Unidad,r.FechaReserva,
    r.HoraInicio,r.HoraFin,r.TipoUso,r.Estado,r.FechaSolicitud,r.FechaDecision,r.MotivoRechazo
    FROM dbo.Reservas r JOIN dbo.Escenarios e ON e.Id=r.EscenarioId JOIN dbo.UnidadesDeportivas u ON u.Id=e.UnidadId
    WHERE r.UsuarioId=@UsuarioId ${filtro} ORDER BY r.FechaReserva DESC,r.HoraInicio DESC`)
  return r.recordset
}
export async function detalleReserva(usuarioId, id) {
  const lista = await misReservas(usuarioId)
  const r = lista.find((x) => x.Id === Number(id))
  if (!r) throw new AppError('NO_ENCONTRADO', 404, 'Reserva no encontrada')
  return r
}
