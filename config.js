import rc from 'rc'
import { HOUR, MINUTE } from './constants.js'

export default rc('david', {
  port: 3001,
  cache: {
    type: 'memory', // also 'redis' + add additional redis prop for config
    maxAge: HOUR,
    maxStale: HOUR + MINUTE
  },
  octokit: {
    authToken: null
  }
})
