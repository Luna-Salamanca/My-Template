import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

const EnvSchema = Type.Object({
  DATABASE_URL: Type.String(),
  REDIS_URL: Type.String(),
  JWT_ACCESS_SECRET: Type.String(),
  JWT_REFRESH_SECRET: Type.String(),
  DISCORD_CLIENT_ID: Type.String(),
  DISCORD_CLIENT_SECRET: Type.String(),
  DISCORD_REDIRECT_URI: Type.String(),
  DISCORD_BOT_TOKEN: Type.String(),
  DISCORD_GUILD_ID: Type.String(),
  ADMIN_ROLE_IDS: Type.String(),
  MEMBER_ROLE_IDS: Type.String(),
  DISCORD_INVITE_URL: Type.String(),
  NODE_ENV: Type.Union([
    Type.Literal('development'),
    Type.Literal('production'),
    Type.Literal('test'),
  ]),
})

const isError = !Value.Check(EnvSchema, process.env)
if (isError) {
  const errors = [...Value.Errors(EnvSchema, process.env)]
  console.error('❌ Environment variables are missing or malformed:')
  for (const error of errors) {
    console.error(`  - ${error.path}: ${error.message}`)
  }
  process.exit(1)
}

export const env = Value.Cast(EnvSchema, process.env)
