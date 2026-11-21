// Propósito: comprobar contratos públicos básicos con Supertest.
import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../../src/app.js'

test('una ruta inexistente responde con 404', async () => {
  const response = await request(app).get('/api/v1/ruta-inexistente')
  assert.equal(response.status, 404)
  assert.equal(response.body.ok, false)
})
