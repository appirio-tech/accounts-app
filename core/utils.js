import { getToken } from './token.js'
import pickBy from 'lodash/pickBy'
import mapValues from 'lodash/mapValues'
import fromPairs from 'lodash/fromPairs'

export function getLoginConnection(userId) {
  return isEmail(userId) ? 'TC-User-Database' : 'LDAP'
}

export function isEmail(value) {
  const EMAIL_PATTERN = /^(([^<>()[\]\.,:\s@\"]+(\.[^<>()[\]\.,:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,:\s@\"]+\.)+[^<>()[\]\.,:\s@\"]{2,})$/i

  return EMAIL_PATTERN.test(value)
}

export function encodeParams(params, includeNull) {
  const relevantParams = pickBy(params, v => v || includeNull )

  return mapValues(relevantParams, v => encodeURIComponent(v) )
}

export function parseQuery(query) {
  const params = query.split('&').map( param => {
    const [ k, v ] = param.split('=')

    return [ k, v ? decodeURIComponent(v) : null ]
  })

  return fromPairs(params)
}

export function setupLoginEventMetrics(id) {
  if (window._kmq) {
    return window._kmq.push(['identify', id])
  }
}
