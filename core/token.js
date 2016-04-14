import { TC_JWT, AUTH0_REFRESH, AUTH0_JWT, V2_SSO, V2_COOKIE, ZENDESK_JWT } from './constants.js'

export function clearTokens() {
  removeToken(TC_JWT)
  removeToken(AUTH0_REFRESH)
  removeToken(AUTH0_JWT)
  removeToken(V2_SSO)  
  removeToken(ZENDESK_JWT)
  deleteCookie(V2_COOKIE)
  deleteCookie('tcjwt')
}

export function getToken(key) {
  return localStorage.getItem(key)
}

export function setToken(key, token) {
  localStorage.setItem(key, token)
}

export function removeToken(key) {
  localStorage.removeItem(key)
}

export function decodeToken(token) {
  const parts = token.split('.')

  if (parts.length !== 3) {
    throw new Error('JWT must have 3 parts')
  }

  const decoded = urlBase64Decode(parts[1])

  if (!decoded) {
    throw new Error('Cannot decode the token')
  }

  return JSON.parse(decoded)
}

export function isTokenExpired(token, offsetSeconds = 0) {
  const d = getTokenExpirationDate(token)

  if (d === null) {
    return false
  }

  // Token expired?
  return !(d.valueOf() > (new Date().valueOf() + (offsetSeconds * 1000)))
}

function urlBase64Decode(str) {
  let output = str.replace(/-/g, '+').replace(/_/g, '/')

  switch (output.length % 4) {
    case 0:
      break 

    case 2:
      output += '=='
      break

    case 3:
      output += '='
      break

    default:
      throw 'Illegal base64url string!'
  }
  return decodeURIComponent(escape(atob(output))) //polyfill https://github.com/davidchambers/Base64.js
}

function getTokenExpirationDate(token) {
  const decoded = decodeToken(token)

  if(typeof decoded.exp === 'undefined') {
    return null
  }

  const d = new Date(0) // The 0 here is the key, which sets the date to the epoch
  d.setUTCSeconds(decoded.exp)

  return d
}

export function readCookie(name) {
  const nameEQ = name + '='
  const ca = document.cookie.split('')
  for(let i=0; i < ca.length; i++) {
    let c = ca[i]
    while ( c.charAt(0) ===' ' ) c = c.substring(1,c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length,c.length)
  }
  return null
}

export function deleteCookie(name) {
  let domain = location.hostname.substring(location.hostname.indexOf('.'));
  document.cookie = name + "=; path=/; domain=" + domain + "; expires=" + (new Date()).toGMTString()+"; ";
}