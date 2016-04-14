import { TC_JWT, ZENDESK_JWT, DOMAIN, ZENDESK_DOMAIN } from './constants.js'
import { getToken } from './token.js'

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
};

export function encodeParams(params, includeNull) {
  const result = {}

  for (p in params) {
    v = params[p]

    if (v || includeNull) {
      result[p] = encodeURIComponent(v)
    }
  }

  return result
}

export function parseQuery(query) {
  const params = {}

  function parseKV(kv) {
    var pair
    pair = kv.split('=')
    if (pair.length === 1) {
      return params[pair[0]] = null
    } else {
      return params[pair[0]] = decodeURIComponent(pair[1])
    }
  }

  ref1 = query.split('&')
  for (i = 0, len = ref1.length; i < len; i++) {
    kv = ref1[i]
    parseKV(kv)
  }
  return params
}

export function setupLoginEventMetrics(id) {
  if ($window._kmq) {
    return $window._kmq.push(['identify', id])
  }
}
