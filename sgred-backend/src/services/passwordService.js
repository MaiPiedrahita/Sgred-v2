// [SEGURIDAD] Propósito: hash, verificación y robustez. HU-01, HU-02, HU-03, HU-05.
import bcrypt from 'bcrypt'
import { mensajes } from '../constants/mensajes.js'
import { AppError } from '../utils/AppError.js'

export const passwordService = {
  hash: (password) => bcrypt.hash(password, 12),
  verificar: (password, hash) => bcrypt.compare(password, hash),
  validarRobustez(password) {
    if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new AppError('PASSWORD_INVALIDA', 400, mensajes.PASSWORD_INVALIDA)
    }
  },
  compararConHashFalso(password, hash) {
    return bcrypt.compare(password, hash || '$2b$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUV')
  },
}
