import { describe, expect, it } from 'bun:test'
import { app } from './app'

describe('API Smoke Test', () => {
  it('should return health status ok', async () => {
    const response = await app.handle(new Request('http://localhost/health'))

    expect(response.status).toBe(200)
    const json = (await response.json()) as { status: string }
    expect(json.status).toBe('ok')
  })

  it('should return 404 for unknown routes', async () => {
    const response = await app.handle(new Request('http://localhost/not-found'))
    expect(response.status).toBe(404)
  })
})
