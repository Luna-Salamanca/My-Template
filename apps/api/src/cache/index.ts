import Redis from 'ioredis'
import { env } from '../config/env.js'

export const cache = new Redis(env.REDIS_URL)

cache.on('error', (err) => {
  console.error('Redis Client Error', err)
})
