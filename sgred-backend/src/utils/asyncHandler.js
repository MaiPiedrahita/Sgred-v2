// Propósito: delegar excepciones asíncronas al manejador central.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
