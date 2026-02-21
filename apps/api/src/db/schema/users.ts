import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const tierEnum = pgEnum('tier', ['admin', 'member', 'guest'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  discordId: varchar('discord_id', { length: 32 }).notNull().unique(),
  username: varchar('username', { length: 64 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 256 }),
  tier: tierEnum('tier').notNull().default('guest'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
