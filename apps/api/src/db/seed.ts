import { db } from './index.js'
import { users } from './schema/users.js'

async function seed() {
  console.log('🌱 Seeding database...')

  await db
    .insert(users)
    .values([
      {
        discordId: 'admin-123456789',
        username: 'admin_user',
        tier: 'admin',
      },
      {
        discordId: 'member-123456789',
        username: 'member_user',
        tier: 'member',
      },
      {
        discordId: 'guest-123456789',
        username: 'guest_user',
        tier: 'guest',
      },
    ])
    .onConflictDoNothing()

  console.log('✅ Seeding complete')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err)
  process.exit(1)
})
