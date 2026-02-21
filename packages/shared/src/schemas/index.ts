import { type Static, Type } from '@sinclair/typebox'

// Tier
export const TierSchema = Type.Union([
  Type.Literal('admin'),
  Type.Literal('member'),
  Type.Literal('guest'),
])

export type Tier = Static<typeof TierSchema>

// User
export const UserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  discordId: Type.String(),
  username: Type.String(),
  avatarUrl: Type.Union([Type.String(), Type.Null()]),
  tier: TierSchema,
})

export type User = Static<typeof UserSchema>

// Auth tokens
export const AuthTokensSchema = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.String(),
})

export type AuthTokens = Static<typeof AuthTokensSchema>
