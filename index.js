import express from 'express'
import compress from 'compression'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { RedisCache, MemoryCache } from './cache.js'
import { cors } from './middleware.js'
import { Services } from './constants.js'
import { GhProjBase } from './projbase.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pkgPath = join(__dirname, 'package.json')

export async function start (config) {
  if (!config) throw new Error('missing config')
  const pkg = JSON.parse(await fs.promises.readFile(pkgPath))
  const cache = config.cache?.type === 'redis' ? new RedisCache(config.cache) : new MemoryCache(config.cache)
  if (cache instanceof MemoryCache) console.warn('🚨 Using in memory cache')
  const Providers = {
    [Services.GitHub]: new GhProjBase(cache, {
      userAgent: `${pkg.name} v${pkg.version}`,
      ...config.octokit
    })
    // IDK maybe someone wants to PR gitlab or bitbucket support?
  }

  const app = express()

  app.use(compress())
  app.use(cors)

  app.get('/:service/:owner/:repo', async (req, res) => {
    const { service, owner, repo } = req.params
    const { ref, path } = req.query
    if (Object.values(Providers).includes(service)) throw new Error('service not supported')
    const projbase = Providers[service]
    res.json(await projbase.get(owner, repo, { ref, path }))
  })

  return new Promise(resolve => {
    const server = app.listen(config.port, () => {
      console.log(`Project API listening at http://localhost:${server.address().port}`)
      resolve(server)
    })
  })
}
