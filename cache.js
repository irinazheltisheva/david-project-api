import Redis from 'ioredis'
import LRUCache from 'lru-cache'
import { HOUR, MINUTE } from './constants.js'

export class RedisCache {
  constructor (config) {
    if (!config) throw new Error('missing config')
    if (!config.ioredis) throw new Error('missing redis configuration')
    this._redis = new Redis(config.ioredis)
    this._maxAge = config.maxAge ?? HOUR
    this._maxStale = config.maxStale ?? HOUR + MINUTE
  }

  async get (k) {
    const v = await this._redis.get(k)
    if (!v) return {}
    return { value: v.value, stale: Date.now() - v.createdAt > this._maxAge }
  }

  set (k, v) {
    return this._redis.set(k, { value: v, createdAt: Date.now() }, 'PX', this._maxAge + this._maxStale)
  }
}

export class MemoryCache {
  constructor (config) {
    this._maxAge = config?.maxAge ?? HOUR
    this._maxStale = config?.maxStale ?? HOUR + MINUTE
    this._lru = new LRUCache({ maxAge: this._maxAge + this._maxStale })
  }

  get (k) {
    const v = this._lru.get(k)
    if (!v) return {}
    return { value: v.value, stale: Date.now() - v.createdAt > this._maxAge }
  }

  set (k, v) {
    return this._lru.set(k, { value: v, createdAt: Date.now() })
  }
}
