import replace from 'lodash/replace'
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, API_URL, DOMAIN, ZENDESK_DOMAIN } from './constants.js'

export function redirectTo(url) {
  if ( !validateUrl(url) ) {
    console.error('Invalid URL: ' + url)

    return 'Invalid URL: ' + url
  }

  console.info('redirect to ' + url)

  window.location = url
}

export function isUrl(value) {
  const URL_PATTERN = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?/i;

  return URL_PATTERN.test(value);
}

export function generateSSOUrl(org, callbackUrl) {
  const apiUrl = replace(API_URL, 'api-work', 'api')

  return [
    'https://' + AUTH0_DOMAIN + '/authorize?',
    'response_type=token',
    '&client_id=' + AUTH0_CLIENT_ID,
    '&connection=' + org,
    '&redirect_uri=' + apiUrl + '/pub/callback.html',
    '&state=' + (encodeURIComponent(callbackUrl)),
    '&scope=openid%20profile%20offline_access',
    '&device=device'
  ].join('')
}

export function generateReturnUrl(returnUrlBase) {
  return returnUrlBase
}

export function generateZendeskReturnUrl(returnToUrl) {
  return "https://" + ZENDESK_DOMAIN + "/access/jwt?jwt=" + (getToken(ZENDESK_JWT)) + "&return_to=" + returnToUrl
}

export function validateUrl(returnUrlBase) {
  var hostname, parser;
  if (!isUrl(returnUrlBase)) {
    return false
  }
  parser = typeof document !== "undefined" && document !== null ? document.createElement('a') : void 0
  if (parser) {
    parser.href = returnUrlBase
    hostname = parser.hostname.toLowerCase()
    return hostname.endsWith(DOMAIN) || hostname.endsWith(ZENDESK_DOMAIN)
  }
  return false
}