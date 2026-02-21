import { bearer } from '@elysiajs/bearer'
import { jwt } from '@elysiajs/jwt'
import type { Elysia } from 'elysia'
import type {} from 'jose'

import { env } from '../config/env.js'

export const TIER_ORDER = {
  guest: 0,
  member: 1,
  admin: 2,
} as const

export type Tier = keyof typeof TIER_ORDER

export const setupAuth = (app: Elysia) =>
  app.use(bearer()).use(
    jwt({
      name: 'jwtAccess',
      secret: env.JWT_ACCESS_SECRET,
    }),
  )

export const withAuth = (app: Elysia) =>
  app.use(setupAuth).derive(async ({ jwtAccess, bearer, set }) => {
    if (!bearer) {
      set.status = 401
      throw new Error('Unauthorized: Missing bearer token')
    }

    const payload = await jwtAccess.verify(bearer)
    if (!payload || typeof payload !== 'object' || !payload.userId) {
      set.status = 401
      throw new Error('Unauthorized: Invalid token')
    }

    return {
      user: {
        userId: payload.userId as string,
        discordId: payload.discordId as string,
        username: payload.username as string,
        avatarUrl: payload.avatarUrl as string | null,
        tier: payload.tier as Tier,
      },
    }
  })

export const requireTier = (minTier: Tier) => (app: Elysia) =>
  app.use(withAuth).onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401
      throw new Error('Unauthorized')
    }
    if (TIER_ORDER[user.tier] < TIER_ORDER[minTier]) {
      set.status = 403
      throw new Error('Forbidden: Insufficient tier')
    }
  })
