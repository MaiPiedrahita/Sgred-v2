// Propósito: rutas HTTP y traducción mínima a servicios. HU-01 a HU-17.
import express from 'express'
import jwt from 'jsonwebtoken'
import { asyncHandler } from '../utils/asyncHandler.js'
import { responder } from '../utils/respuesta.js'
import { crearLimite } from '../middlewares/rateLimit.js'
import { autenticar, autorizarRoles } from '../middlewares/auth.js'
import { env } from '../config/env.js'
import { mensajes } from '../constants/mensajes.js'
import { registrar, login, logout, sesion } from '../services/authService.js'
import { obtenerPerfil, actualizarPerfil } from '../services/perfilService.js'
import { registrarPersonal } from '../services/personalService.js'
import { definirPassword } from '../services/tokenEnlaceService.js'
import { listarUnidades, detalleUnidad, listarEscenarios, catalogo, disponibilidad } from '../services/catalogoService.js'
import { crearReserva, misReservas, detalleReserva } from '../services/reservaService.js'
import { listarSolicitudes, detalleSolicitud, decidirSolicitud, listarEscenariosAdmin, crearEscenario, editarEscenario, cambiarEstadoEscenario } from '../services/adminService.js'
import { registrarEvento } from '../services/analiticaService.js'
import { AppError } from '../utils/AppError.js'

const router = express.Router()
const limiteLogin = crearLimite(15 * 60 * 1000, 10)

router.post('/auth/registro', crearLimite(15 * 60 * 1000, 20), asyncHandler(async (req, res) => {
  const data = await registrar(req.body)
  responder(res, 201, data, mensajes.CUENTA_CREADA)
}))
router.post('/auth/login', limiteLogin, asyncHandler(async (req, res) => {
  const data = await login(req.body)
  responder(res, 200, data, 'Sesión iniciada correctamente')
}))
router.post('/auth/logout', autenticar, asyncHandler(async (req, res) => {
  await logout(req.usuario.sessionId)
  responder(res, 200, { cerrado: true }, 'Tu sesión se cerró correctamente')
}))
router.get('/auth/sesion', autenticar, asyncHandler(async (req, res) => {
  responder(res, 200, await sesion(req.usuario.sessionId))
}))
router.post('/auth/renovar', autenticar, asyncHandler(async (req, res) => {
  const data = await sesion(req.usuario.sessionId)
  responder(res, 200, data)
}))
router.post('/auth/definir-password', crearLimite(15 * 60 * 1000, 10), asyncHandler(async (req, res) => {
  await definirPassword(req.body)
  responder(res, 200, { definida: true }, 'Contraseña definida correctamente')
}))
router.get('/perfil', autenticar, asyncHandler(async (req, res) => responder(res, 200, await obtenerPerfil(req.usuario.UsuarioId))))
router.put('/perfil', autenticar, asyncHandler(async (req, res) => responder(res, 200, await actualizarPerfil(req.usuario.UsuarioId, req.body), mensajes.PERFIL_ACTUALIZADO)))

router.post('/admin/personal', autenticar, autorizarRoles('administrativo'), asyncHandler(async (req, res) => {
  const data = await registrarPersonal(req.usuario, req.body)
  responder(res, 201, data, mensajes.ADMIN_REGISTRADO)
}))

router.get('/unidades', asyncHandler(async (req, res) => responder(res, 200, await listarUnidades(req.query.buscar))))
router.get('/unidades/:id', asyncHandler(async (req, res) => responder(res, 200, await detalleUnidad(Number(req.params.id)))))
router.get('/escenarios', asyncHandler(async (req, res) => responder(res, 200, await listarEscenarios({
  zonaId: req.query.zonaId ? Number(req.query.zonaId) : undefined,
  tipoUnidadId: req.query.tipoUnidadId ? Number(req.query.tipoUnidadId) : undefined,
  tipoEscenarioId: req.query.tipoEscenarioId ? Number(req.query.tipoEscenarioId) : undefined,
  unidadId: req.query.unidadId ? Number(req.query.unidadId) : undefined,
}))))
router.get('/catalogos/:tipo', asyncHandler(async (req, res) => responder(res, 200, await catalogo(req.params.tipo))))
router.get('/escenarios/:id/disponibilidad', asyncHandler(async (req, res) => responder(res, 200, await disponibilidad(Number(req.params.id), req.query.fecha))))

router.post('/reservas', autenticar, autorizarRoles('usuario'), asyncHandler(async (req, res) => {
  const data = await crearReserva(req.usuario.UsuarioId, req.body)
  responder(res, 201, data, data.mensaje)
}))
router.get('/reservas/mias', autenticar, autorizarRoles('usuario'), asyncHandler(async (req, res) => responder(res, 200, await misReservas(req.usuario.UsuarioId, req.query.estado))))
router.get('/reservas/mias/:id', autenticar, autorizarRoles('usuario'), asyncHandler(async (req, res) => responder(res, 200, await detalleReserva(req.usuario.UsuarioId, req.params.id))))

router.get('/admin/solicitudes', autenticar, autorizarRoles('administrativo'), asyncHandler(async (req, res) => {
  const data = await listarSolicitudes(req.usuario.UsuarioId, req.query)
  responder(res, 200, data, undefined, { totalPendientes: data.length })
}))
router.get('/admin/solicitudes/:id', autenticar, autorizarRoles('administrativo'), asyncHandler(async (req, res) => responder(res, 200, await detalleSolicitud(req.usuario.UsuarioId, req.params.id))))
router.post('/admin/solicitudes/:id/aprobar', autenticar, autorizarRoles('administrativo'), asyncHandler(async (req, res) => responder(res, 200, {}, await decidirSolicitud(req.usuario.UsuarioId, req.params.id, 'aprobar'))))
router.post('/admin/solicitudes/:id/rechazar', autenticar, autorizarRoles('administrativo'), asyncHandler(async (req, res) => responder(res, 200, {}, await decidirSolicitud(req.usuario.UsuarioId, req.params.id, 'rechazar', req.body.motivo))))

router.get('/admin/escenarios', autenticar, autorizarRoles('administrativo'), asyncHandler(async (req, res) => responder(res, 200, await listarEscenariosAdmin(req.usuario.UsuarioId))))
router.post('/admin/escenarios', autenticar, autorizarRoles('administrativo'), asyncHandler(async (req, res) => responder(res, 201, await crearEscenario(req.usuario.UsuarioId, req.body), 'Escenario creado correctamente')))
router.put('/admin/escenarios/:id', autenticar, autorizarRoles('administrativo'), asyncHandler(async (req, res) => responder(res, 200, { actualizado: true }, await editarEscenario(req.usuario.UsuarioId, req.params.id, req.body))))
router.patch('/admin/escenarios/:id/estado', autenticar, autorizarRoles('administrativo'), asyncHandler(async (req, res) => responder(res, 200, await cambiarEstadoEscenario(req.usuario.UsuarioId, req.params.id, req.body.estado))))

router.post('/analitica/eventos', crearLimite(60 * 1000, 100), asyncHandler(async (req, res) => {
  let usuarioId
  if (req.headers.authorization) {
    try { const p = jwt.verify(req.headers.authorization.replace(/^Bearer\s+/i, ''), env.jwtSecret); usuarioId = p.sub } catch { usuarioId = undefined }
  }
  try { responder(res, 200, await registrarEvento(req.body.evento, usuarioId, req.body.datos)) }
  catch { throw new AppError('EVENTO_INVALIDO', 400, 'Evento no permitido') }
}))

export default router
