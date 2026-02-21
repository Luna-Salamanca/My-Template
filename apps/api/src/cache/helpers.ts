import { cache } from './index.js'

export const cacheHelpers = {
  async get<T>(key: string): Promise<T | null> {
    const data = await cache.get(key)
    if (!data) return null
    try {
      return JSON.parse(data) as T
    } catch {
      return null
    }
  },

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const data = JSON.stringify(value)
    if (ttlSeconds) {
      await cache.set(key, data, 'EX', ttlSeconds)
    } else {
      await cache.set(key, data)
    }
  },

  async del(key: string): Promise<void> {
    await cache.del(key)
  },

  async wrap<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null && cached !== undefined) return cached

    const result = await fn()
    await this.set(key, result, ttlSeconds)
    return result
  },
}
