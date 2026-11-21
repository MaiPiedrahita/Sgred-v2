// Propósito: unificar el formato de respuestas.
export const responder = (res, estado, data, mensaje, meta) =>
  res.status(estado).json({ ok: true, data, ...(mensaje ? { mensaje } : {}), ...(meta ? { meta } : {}) })
