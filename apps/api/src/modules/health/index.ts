import { Elysia } from 'elysia'

export const health = new Elysia({ name: 'module.health' }).get('/health', () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  }
})
