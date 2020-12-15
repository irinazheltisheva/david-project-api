import rc from 'rc'
import { HOUR, YEAR } from './constants.js'

export default rc('david', {
  port: 3001,
  cache: {
    type: 'memory', // also 'redis' + add additional redis prop for config
    maxAge: HOUR,
    maxStale: YEAR
  },
  octokit: {
    auth: null
  }
})
