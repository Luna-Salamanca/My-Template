import openapi from '@elysiajs/openapi'
import { Elysia } from 'elysia'
import type {} from 'jose'
import { env } from './config/env.js'
import { requireTier } from './middleware/auth.js'
import { auth } from './modules/auth/index.js'
import { health } from './modules/health/index.js'
import { users } from './modules/users/index.js'

export const app = new Elysia().use(health).use(auth).use(users)

if (env.NODE_ENV !== 'production') {
  app.use(
    openapi({
      documentation: {
        info: { title: 'API', version: '1.0.0' },
      },
      scalar: {
        spec: { url: '/openapi/json' },
      },
    }),
  )
} else {
  app.use(
    new Elysia().use(requireTier('admin')).use(
      openapi({
        provider: null,
        documentation: { info: { title: 'API', version: '1.0.0' } },
      }),
    ),
  )
}

export type App = typeof app
