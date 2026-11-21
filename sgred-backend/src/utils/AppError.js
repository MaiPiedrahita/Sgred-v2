// Propósito: errores HTTP estructurados compartidos por todos los servicios.
export class AppError extends Error {
  constructor(codigo, estado, mensaje, detalles) {
    super(mensaje)
    this.codigo = codigo
    this.estado = estado
    this.detalles = detalles
  }
}
