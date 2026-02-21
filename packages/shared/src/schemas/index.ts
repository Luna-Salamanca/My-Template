import { type Static, t } from 'elysia'

// Tier
export const TierSchema = t.Union([t.Literal('admin'), t.Literal('member'), t.Literal('guest')])

export type Tier = Static<typeof TierSchema>

// User
export const UserSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  discordId: t.String(),
  username: t.String(),
  avatarUrl: t.Union([t.String(), t.Null()]),
  tier: TierSchema,
})

export type User = Static<typeof UserSchema>

// Auth tokens
export const AuthTokensSchema = t.Object({
  accessToken: t.String(),
  refreshToken: t.String(),
})

export type AuthTokens = Static<typeof AuthTokensSchema>
