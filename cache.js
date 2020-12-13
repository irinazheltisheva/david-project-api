import redis from 'redis'
import LRUCache from 'lru-cache'
import { promisify } from 'util'
import { HOUR, MINUTE } from './constants.js'

export class RedisCache {
  constructor (config) {
    if (!config) throw new Error('missing config')
    if (!config.redis) throw new Error('missing redis connection string in config')
    this._redis = redis.createClient(config.redis)
    this._redis.getAsync = promisify(this._redis.get).bind(this._redis)
    this._redis.setAsync = promisify(this._redis.set).bind(this._redis)
    this._maxAge = config.maxAge ?? HOUR
    this._maxStale = config.maxStale ?? HOUR + MINUTE
  }

  async get (k) {
    const v = JSON.parse(await this._redis.getAsync(k))
    if (!v) return {}
    return { value: v.value, stale: Date.now() - v.createdAt > this._maxAge }
  }

  set (k, v) {
    return this._redis.setAsync(k, JSON.stringify({ value: v, createdAt: Date.now() }), 'PX', this._maxAge + this._maxStale)
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
