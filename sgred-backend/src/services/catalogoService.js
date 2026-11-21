// Propósito: unidades, escenarios y disponibilidad. HU-08, HU-09, HU-10.1.
import { DateTime } from 'luxon'
import { getPool, sql } from '../config/database.js'
import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'
import { mensajes } from '../constants/mensajes.js'

export async function listarUnidades(buscar) {
  const pool = await getPool()
  const req = pool.request()
  if (buscar) req.input('Buscar', sql.NVarChar, `%${buscar}%`)
  const r = await req.query(`SELECT u.Id,u.Nombre,u.Direccion,u.Activa,z.Nombre AS Zona,tu.Nombre AS Tipo
    FROM dbo.UnidadesDeportivas u JOIN dbo.Zonas z ON z.Id=u.ZonaId JOIN dbo.TiposUnidad tu ON tu.Id=u.TipoUnidadId
    ${buscar ? 'WHERE u.Nombre LIKE @Buscar OR z.Nombre LIKE @Buscar' : ''} ORDER BY u.Nombre`)
  return r.recordset
}
export async function detalleUnidad(id) {
  const pool = await getPool()
  const unidad = await pool.request().input('Id', sql.Int, id).query(`SELECT u.*,z.Nombre AS Zona,tu.Nombre AS Tipo
    FROM dbo.UnidadesDeportivas u JOIN dbo.Zonas z ON z.Id=u.ZonaId JOIN dbo.TiposUnidad tu ON tu.Id=u.TipoUnidadId WHERE u.Id=@Id`)
  if (!unidad.recordset.length) throw new AppError('NO_ENCONTRADO', 404, 'Unidad no encontrada')
  const disciplinas = await pool.request().input('Id', sql.Int, id).query(`SELECT d.Id,d.Nombre FROM dbo.UnidadDisciplina ud JOIN dbo.Disciplinas d ON d.Id=ud.DisciplinaId WHERE ud.UnidadId=@Id`)
  const escenarios = await pool.request().input('Id', sql.Int, id).query(`SELECT e.Id,e.Nombre,e.Capacidad,e.Estado,te.Nombre AS Tipo
    FROM dbo.Escenarios e JOIN dbo.TiposEscenario te ON te.Id=e.TipoEscenarioId WHERE e.UnidadId=@Id`)
  return { ...unidad.recordset[0], zona: unidad.recordset[0].Zona, disciplinas: disciplinas.recordset, escenarios: escenarios.recordset }
}
export async function listarEscenarios(filtros) {
  const pool = await getPool()
  const req = pool.request()
  const where = []
  if (filtros.zonaId) { req.input('ZonaId', sql.Int, filtros.zonaId); where.push('u.ZonaId=@ZonaId') }
  if (filtros.tipoUnidadId) { req.input('TipoUnidadId', sql.Int, filtros.tipoUnidadId); where.push('u.TipoUnidadId=@TipoUnidadId') }
  if (filtros.tipoEscenarioId) { req.input('TipoEscenarioId', sql.Int, filtros.tipoEscenarioId); where.push('e.TipoEscenarioId=@TipoEscenarioId') }
  if (filtros.unidadId) { req.input('UnidadId', sql.Int, filtros.unidadId); where.push('e.UnidadId=@UnidadId') }
  const r = await req.query(`SELECT e.Id,e.Nombre,e.Capacidad,e.Estado,te.Nombre AS Tipo,u.Id AS UnidadId,u.Nombre AS Unidad
    FROM dbo.Escenarios e JOIN dbo.UnidadesDeportivas u ON u.Id=e.UnidadId JOIN dbo.TiposEscenario te ON te.Id=e.TipoEscenarioId
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY u.Nombre,e.Nombre`)
  return r.recordset
}
export async function catalogo(tipo) {
  const permitidos = { zonas: 'Zonas', 'tipos-unidad': 'TiposUnidad', 'tipos-escenario': 'TiposEscenario', disciplinas: 'Disciplinas', 'tipos-uso': 'TiposUso' }
  if (!permitidos[tipo]) throw new AppError('NO_ENCONTRADO', 404, 'Catálogo no encontrado')
  const pool = await getPool()
  const r = await pool.request().query(`SELECT Id,Nombre FROM dbo.${permitidos[tipo]} ORDER BY Nombre`)
  return r.recordset
}
export async function disponibilidad(escenarioId, fecha) {
  const pool = await getPool()
  const escenario = await pool.request().input('Id', sql.Int, escenarioId).query(`SELECT Id,Estado FROM dbo.Escenarios WHERE Id=@Id`)
  if (!escenario.recordset.length) throw new AppError('NO_ENCONTRADO', 404, 'Escenario no encontrado')
  if (escenario.recordset[0].Estado !== 'Activo') throw new AppError('ESCENARIO_INACTIVO', 422, mensajes.ESCENARIO_INACTIVO)
  const dia = DateTime.fromFormat(fecha, 'yyyy-MM-dd', { zone: env.zone })
  if (!dia.isValid) throw new AppError('VALIDACION', 400, 'Formato de fecha inválido')
  const dow = dia.weekday
  const horario = await pool.request().input('Id', sql.Int, escenarioId).input('Dia', sql.TinyInt, dow)
    .query(`SELECT HoraApertura,HoraCierre FROM dbo.HorariosOperacion WHERE EscenarioId=@Id AND DiaSemana=@Dia`)
  if (!horario.recordset.length) return { fecha, franjas: [] }
  const apertura = horario.recordset[0].HoraApertura.toString().slice(0, 5)
  const cierre = horario.recordset[0].HoraCierre.toString().slice(0, 5)
  const reservas = await pool.request().input('Id', sql.Int, escenarioId).input('Fecha', sql.Date, fecha)
    .query(`SELECT HoraInicio,HoraFin,Estado FROM dbo.Reservas WHERE EscenarioId=@Id AND FechaReserva=@Fecha AND Estado IN ('Pendiente','Aprobada')`)
  const franjas = []
  let hora = Number(apertura.slice(0, 2))
  const fin = Number(cierre.slice(0, 2))
  const ahora = DateTime.now().setZone(env.zone)
  for (; hora < fin; hora++) {
    const inicio = `${String(hora).padStart(2, '0')}:00`
    const termino = `${String(hora + 1).padStart(2, '0')}:00`
    const ocupada = reservas.recordset.find((r) => {
      const i = r.HoraInicio.toString().slice(0, 5)
      const f = r.HoraFin.toString().slice(0, 5)
      return inicio < f && termino > i
    })
    const estado = ocupada ? (ocupada.Estado === 'Aprobada' ? 'Reservada' : 'En revisión') : 'Disponible'
    const inicioDt = DateTime.fromFormat(`${fecha} ${inicio}`, 'yyyy-MM-dd HH:mm', { zone: env.zone })
    const seleccionable = estado === 'Disponible' && inicioDt > ahora
    franjas.push({ horaInicio: inicio, horaFin: termino, estado, seleccionable })
  }
  return { fecha, horario: { apertura, cierre }, franjas }
}
