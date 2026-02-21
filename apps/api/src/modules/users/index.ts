import { UserSchema } from '@repo/shared'
import { Elysia, t } from 'elysia'
import { cacheHelpers } from '../../cache/helpers.js'
import { db } from '../../db/index.js'
import { users as usersTable } from '../../db/schema/users.js'
import { requireTier } from '../../middleware/auth.js'

export const invalidateUsersCache = async () => {
  await cacheHelpers.del('users:all')
}

export const users = new Elysia({ name: 'module.users', prefix: '/users' })
  .use(requireTier('admin'))
  .get(
    '/',
    async () => {
      return await cacheHelpers.wrap('users:all', () => db.select().from(usersTable), 300)
    },
    {
      response: t.Array(UserSchema),
    },
  )
