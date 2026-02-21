import { jwt } from '@elysiajs/jwt'
import { eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import type {} from 'jose'
import { cache } from '../../cache/index.js'
import { env } from '../../config/env.js'
import { db } from '../../db/index.js'
import { users } from '../../db/schema/users.js'
import { type Tier, withAuth } from '../../middleware/auth.js'
import { invalidateUsersCache } from '../users/index.js'

export const auth = new Elysia({ prefix: '/auth' })
  .use(
    jwt({
      name: 'jwtAccess',
      secret: env.JWT_ACCESS_SECRET,
    }),
  )
  .use(
    jwt({
      name: 'jwtRefresh',
      secret: env.JWT_REFRESH_SECRET,
    }),
  )
  .get('/discord', ({ redirect }) => {
    const url = new URL('https://discord.com/oauth2/authorize')
    url.searchParams.set('client_id', env.DISCORD_CLIENT_ID)
    url.searchParams.set('redirect_uri', env.DISCORD_REDIRECT_URI)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'identify')
    return redirect(url.toString())
  })
  .get('/discord/callback', async ({ query, redirect }) => {
    const code = query.code
    if (!code) {
      return redirect(`${env.FRONTEND_URL}/config-error`)
    }

    try {
      // Exchange code for access token
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID,
          client_secret: env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: env.DISCORD_REDIRECT_URI,
        }),
      })

      if (!tokenRes.ok) throw new Error('Failed to exchange code')
      const tokenData = (await tokenRes.json()) as { access_token: string }
      const accessToken = tokenData.access_token

      // Fetch user profile
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      if (!userRes.ok) throw new Error('Failed to fetch user profile')
      const userData = (await userRes.json()) as {
        id: string
        username: string
        avatar: string | null
      }
      const discordId = userData.id
      const username = userData.username
      const avatarUrl = userData.avatar
        ? `https://cdn.discordapp.com/avatars/${discordId}/${userData.avatar}.png`
        : null

      // Fetch guild member (Bot Token)
      const memberRes = await fetch(
        `https://discord.com/api/guilds/${env.DISCORD_GUILD_ID}/members/${discordId}`,
        {
          headers: {
            Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
          },
        },
      )

      if (memberRes.status === 404) {
        return redirect(`${env.FRONTEND_URL}/access-denied`)
      }
      if (!memberRes.ok) {
        return redirect(`${env.FRONTEND_URL}/config-error`)
      }

      const memberData = (await memberRes.json()) as { roles: string[] }
      const roles: string[] = memberData.roles

      // Determine Tier
      let tier: Tier = 'guest'
      const adminRoles = env.ADMIN_ROLE_IDS.split(',').map((r) => r.trim())
      const memberRoles = env.MEMBER_ROLE_IDS.split(',').map((r) => r.trim())

      if (roles.some((r) => adminRoles.includes(r))) {
        tier = 'admin'
      } else if (roles.some((r) => memberRoles.includes(r))) {
        tier = 'member'
      }

      // Upsert User
      const [user] = await db
        .insert(users)
        .values({
          discordId,
          username,
          avatarUrl,
          tier,
        })
        .onConflictDoUpdate({
          target: users.discordId,
          set: { username, avatarUrl, tier, updatedAt: new Date() },
        })
        .returning()

      await invalidateUsersCache()

      // Set OTC
      if (!user) throw new Error('Failed to upsert user')
      const otc = crypto.randomUUID()
      await cache.set(`otc:${otc}`, JSON.stringify({ userId: user.id, tier }), 'EX', 60)

      return redirect(`${env.FRONTEND_URL}/auth/callback?code=${otc}`)
    } catch (err) {
      console.error(err)
      return redirect(`${env.FRONTEND_URL}/config-error`)
    }
  })
  .post(
    '/discord/exchange',
    async ({ body, jwtAccess, jwtRefresh, set }) => {
      const { code } = body
      const otcKey = `otc:${code}`
      const json = await cache.get(otcKey)
      if (!json) {
        set.status = 400
        return 'Invalid or expired OTC'
      }
      await cache.del(otcKey)

      const { userId } = JSON.parse(json)
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      })
      if (!user) {
        set.status = 404
        return 'User not found'
      }

      const accessStr = await jwtAccess.sign({
        userId: user.id,
        discordId: user.discordId,
        username: user.username,
        tier: user.tier,
        avatarUrl: user.avatarUrl,
      })

      const refreshStr = await jwtRefresh.sign({ userId: user.id })
      await cache.set(`refresh:${user.id}`, refreshStr, 'EX', 7 * 24 * 60 * 60)

      return { accessToken: accessStr, refreshToken: refreshStr }
    },
    {
      body: t.Object({
        code: t.String(),
      }),
    },
  )
  .post(
    '/refresh',
    async ({ body, jwtAccess, jwtRefresh, set }) => {
      const { refreshToken } = body
      const payload = await jwtRefresh.verify(refreshToken)
      if (!payload || typeof payload !== 'object' || !payload.userId) {
        set.status = 401
        return 'Invalid refresh token'
      }

      const userId = payload.userId as string
      const stored = await cache.get(`refresh:${userId}`)
      if (stored !== refreshToken) {
        set.status = 401
        return 'Refresh token rotated or invalid'
      }

      // Rotate
      await cache.del(`refresh:${userId}`)

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      })
      if (!user) {
        set.status = 404
        return 'User not found'
      }

      const newAccess = await jwtAccess.sign({
        userId: user.id,
        discordId: user.discordId,
        username: user.username,
        tier: user.tier,
        avatarUrl: user.avatarUrl,
      })
      const newRefresh = await jwtRefresh.sign({ userId: user.id })
      await cache.set(`refresh:${user.id}`, newRefresh, 'EX', 7 * 24 * 60 * 60)

      return { accessToken: newAccess, refreshToken: newRefresh }
    },
    {
      body: t.Object({
        refreshToken: t.String(),
      }),
    },
  )
  .use(withAuth)
  .get('/me', async ({ user, set }) => {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    })
    if (!dbUser) {
      set.status = 404
      return 'User not found'
    }
    return dbUser
  })
  .post('/sync-tier', async ({ user, set }) => {
    const memberRes = await fetch(
      `https://discord.com/api/guilds/${env.DISCORD_GUILD_ID}/members/${user.discordId}`,
      {
        headers: {
          Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        },
      },
    )

    if (!memberRes.ok) {
      if (memberRes.status === 404) {
        // Demote to guest if not in guild
        const [updatedUser] = await db
          .update(users)
          .set({ tier: 'guest', updatedAt: new Date() })
          .where(eq(users.id, user.userId))
          .returning()
        return updatedUser
      }
      set.status = 500
      return 'Failed to fetch bot data'
    }

    const memberData = (await memberRes.json()) as { roles: string[] }
    const roles: string[] = memberData.roles
    let tier: Tier = 'guest'
    const adminRoles = env.ADMIN_ROLE_IDS.split(',').map((r) => r.trim())
    const memberRoles = env.MEMBER_ROLE_IDS.split(',').map((r) => r.trim())

    if (roles.some((r) => adminRoles.includes(r))) {
      tier = 'admin'
    } else if (roles.some((r) => memberRoles.includes(r))) {
      tier = 'member'
    }

    const [updatedUser] = await db
      .update(users)
      .set({ tier, updatedAt: new Date() })
      .where(eq(users.id, user.userId))
      .returning()

    return updatedUser
  })
  .post('/logout', async ({ user }) => {
    await cache.del(`refresh:${user.userId}`)
    return new Response(null, { status: 204 })
  })
