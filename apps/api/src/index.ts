import { app } from './app.js'
import { env } from './config/env.js'

app.listen(3000, () => {
  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port} in ${env.NODE_ENV || 'development'} mode`,
  )
})
