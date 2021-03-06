import redis from 'redis'
import LRUCache from 'lru-cache'
import { promisify } from 'util'
import { HOUR, YEAR } from './constants.js'

export class RedisCache {
  constructor (config) {
    if (!config) throw new Error('missing config')
    if (!config.redis) throw new Error('missing redis config')
    this._redis = redis.createClient(config.redis)
    this._redis.getAsync = promisify(this._redis.get).bind(this._redis)
    this._redis.setAsync = promisify(this._redis.set).bind(this._redis)
    this._maxAge = config.maxAge ?? HOUR
    this._maxStale = config.maxStale ?? YEAR
    this._keyPrefix = config.keyPrefix ?? 'project:'
  }

  keyPrefix (k) {
    return `${this._keyPrefix}${k}`
  }

  async get (k) {
    const v = await this._redis.getAsync(this.keyPrefix(k))
    if (!v) return {}
    const { value, createdAt } = JSON.parse(v)
    return { value, stale: Date.now() - createdAt > this._maxAge }
  }

  set (k, v) {
    const sv = JSON.stringify({ value: v, createdAt: Date.now() })
    return this._redis.setAsync(this.keyPrefix(k), sv, 'PX', this._maxAge + this._maxStale)
  }
}

export class MemoryCache {
  constructor (config) {
    this._maxAge = config?.maxAge ?? HOUR
    this._maxStale = config?.maxStale ?? YEAR
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
