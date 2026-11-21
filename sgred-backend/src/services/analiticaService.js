// [EVENTO] Propósito: registrar eventos propios y del backend.
import { getPool, sql } from '../config/database.js'
const permitidos = new Set(['reservar_sin_sesion','registro_exitoso','registro_fallido_correo_duplicado','login_exitoso','login_fallido','cuenta_bloqueada','logout_manual','logout_inactividad','perfil_actualizado','perfil_error_validacion','admin_registrado','registro_admin_fallido_duplicado','catalogo_visitado','unidad_consultada','filtro_aplicado','filtro_sin_resultados','disponibilidad_consultada','reserva_solicitada','reserva_franja_no_disponible','mis_reservas_consultadas','detalle_reserva_consultado','bandeja_consultada','solicitud_detalle_abierto','reserva_aprobada','reserva_rechazada','rechazo_sin_motivo','escenario_creado','escenario_editado','escenario_inactivado'])
export async function registrarEvento(evento, usuarioId, datos) {
  if (!permitidos.has(evento)) throw new Error('Evento no permitido')
  const pool = await getPool()
  await pool.request().input('Evento', sql.NVarChar, evento).input('UsuarioId', sql.Int, usuarioId || null)
    .input('Datos', sql.NVarChar, JSON.stringify(datos || {}))
    .query(`INSERT INTO dbo.EventosAnalitica (Evento,UsuarioId,Datos) VALUES (@Evento,@UsuarioId,@Datos)`)
  return { registrado: true }
}
