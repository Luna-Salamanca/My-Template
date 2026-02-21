import { Elysia } from 'elysia'
import { health } from './modules/health/index.js'

export const app = new Elysia().use(health)

export type App = typeof app
