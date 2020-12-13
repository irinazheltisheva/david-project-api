import { Octokit } from '@octokit/rest'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'
import { piggyback } from 'piggybacker'

const GitHubAPI = Octokit.plugin(retry, throttling)

/**
 * key generates a key for the given params.
 * @param {string} service Name of the service providing the package.json.
 * @param {string} owner User or organization name.
 * @param {string} repo Repository name.
 * @param {object} [opts]
 * @param {string} [opts.path]
 * @param {string} [opts.ref]
 * @returns {string}
 */
function key (service, owner, repo, opts) {
  let { path, ref } = opts || {}
  let key = `${service}/${owner}/${repo}`
  if (path) {
    if (path[path.length - 1] === '/') {
      path = path.slice(0, -1)
    }
    key = `${key}/${path}`
  }
  return ref ? `${key}#${ref}` : key
}

export class GhProjBase {
  constructor (cache, config) {
    this._cache = cache
    this._octokit = new GitHubAPI({
      ...(config || {}),
      throttle: {
        onRateLimit (retryAfter, options) {
          console.warn(`Request quota exhausted for request ${options.method} ${options.url}`)
          // Retry twice after hitting a rate limit error, then give up
          if (options.request.retryCount <= 2) {
            console.log(`Retrying after ${retryAfter} seconds!`)
            return true
          }
        },
        onAbuseLimit (retryAfter, options) {
          // does not retry, only logs a warning
          console.warn(`Abuse detected for request ${options.method} ${options.url}`)
        }
      }
    })
    this.get = piggyback(this.get.bind(this), key.bind(null, 'gh'))
  }

  /**
   * get retrieves a package.json for the passed params.
   * @param {string} owner User or organization name.
   * @param {string} repo Repository name.
   * @param {object} [opts]
   * @param {string} [opts.path] Path from the root of the repo to the dir of the package.json.
   * @param {string} [opts.ref] Name of the commit/branch/tag.
   * @returns {Promise<any>}
   */
  async get (owner, repo, opts) {
    opts = opts || {}

    const projKey = key('gh', owner, repo, opts)
    const { value, stale } = await this._cache.get(projKey)
    const { pkg, etag } = value || {}

    if (value && !stale) {
      console.log('Cache hit', projKey, pkg.version)
      return pkg
    }

    let resp
    try {
      resp = await this._octokit.repos.getContent({
        owner,
        repo,
        path: (opts.path ? opts.path + '/' : '') + 'package.json',
        ref: opts.ref,
        headers: etag ? { 'If-None-Match': etag } : {}
      })
    } catch (err) {
      if (stale && err.status === 304) {
        console.log('Stale but unmodified package.json', projKey)
        await this._cache.set(projKey, value)
        return pkg
      }
      throw Object.assign(err, { message: `failed to get package.json for ${projKey}: ${err.message}` })
    }

    let data
    try {
      const buffer = Buffer.from(resp.data.content, resp.data.encoding)
      data = JSON.parse(buffer.toString().trim())
    } catch (err) {
      throw Object.assign(err, { message: `failed to parse package.json for ${projKey}: ${err.message}` })
    }

    if (!data) throw new Error(`empty package.json for ${projKey}`)

    console.log(`Got package.json for ${projKey}:`, data.name, data.version)

    await this._cache.set(projKey, { pkg: data, etag: resp.headers?.etag })
    return data
  }
}
