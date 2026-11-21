// [CORREO] Propósito: transporte SMTP o consola para desarrollo.
import nodemailer from 'nodemailer'
export const mailer = nodemailer.createTransport(
  process.env.SMTP_HOST
    ? { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined }
    : { streamTransport: true, newline: 'unix', buffer: true },
)
