// Propósito: validar robustez de contraseñas sin depender de SQL Server.
import test from 'node:test'
import assert from 'node:assert/strict'
import { passwordService } from '../../src/services/passwordService.js'
import { mensajes } from '../../src/constants/mensajes.js'

test('rechaza contraseña sin longitud o sin número', () => {
  assert.throws(() => passwordService.validarRobustez('abcdef1'), (error) => error.mensaje === mensajes.PASSWORD_INVALIDA || error.message === mensajes.PASSWORD_INVALIDA)
})
test('acepta contraseña robusta', () => {
  assert.doesNotThrow(() => passwordService.validarRobustez('Usuario2026!'))
})
