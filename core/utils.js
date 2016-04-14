import { TC_JWT, ZENDESK_JWT, DOMAIN, ZENDESK_DOMAIN } from './constants.js'
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

export function isUrl(value) {
  const URL_PATTERN = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?/i;

  return URL_PATTERN.test(value);
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
