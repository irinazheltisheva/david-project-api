import rc from 'rc'
import { HOUR, MINUTE } from './constants.js'

export default rc('david', {
  port: 3001,
  cache: {
    type: 'memory', // also 'redis' + add additional redisConnectionString and ioredis prop for config
    maxAge: HOUR,
    maxStale: HOUR + MINUTE,
    ioredis: {
      keyPrefix: 'project',
      enableAutoPipelining: true
    }
  },
  octokit: {
    authToken: null
  }
})
