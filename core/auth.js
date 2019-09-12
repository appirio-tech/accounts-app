import replace from 'lodash/replace'
import get from 'lodash/get'
import merge from 'lodash/merge'
import { getLoginConnection, isEmail } from './utils.js'
import { setToken, getToken, clearTokens, isTokenExpired, decodeToken } from './token.js'
import { V3_JWT, V2_JWT, V2_SSO, AUTH0_REFRESH, AUTH0_JWT, ZENDESK_JWT, API_URL, API_URL_V5,
  AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CALLBACK, WIPRO_SSO_PROVIDER,
  TOPCODER_SSO_PROVIDER, APPIRIO_SSO_PROVIDER, SSO_PROVIDER_DOMAINS, SSO_PROVIDER_DOMAINS_WIPRO,
  SSO_PROVIDER_DOMAINS_APPIRIO, SSO_PROVIDER_DOMAINS_TOPCODER, CREDITSUISSE_SSO_PROVIDER, SSO_PROVIDER_DOMAINS_CREDITSUISSE,
  LOCALSIMPLESAML_SSO_PROVIDER, SSO_PROVIDER_DOMAINS_LOCALSIMPLESAML,
  ZURICH_SSO_PROVIDER, SSO_PROVIDER_DOMAINS_ZURICH } from './constants.js'
import fetch from 'isomorphic-fetch'
import Auth0 from 'auth0-js'

/// Adding a temp comment to kick off a fresh deploy
const auth0 = new Auth0.WebAuth({
  domain      : AUTH0_DOMAIN,
  clientID    : AUTH0_CLIENT_ID,
  responseType: 'token id_token'
})

function fetchJSON(url, options) {
  const config = merge({
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  }, options)

  if (config.body && typeof config.body === 'object')
    config.body = JSON.stringify(config.body)

  function handleResponse(response) {
    return response.json()
      .then( json => {

        // All v3 apis *should* have a result object
        if (json.result) {

          // If the nested status is ok, return the parsed JSON
          if (json.result.status >= 200 && json.result.status < 300) {
            return json
          } else {
            const error = new Error(json.result.content)
            error.response = response
            error.status = json.result.status

            throw error
          }

        // If this is a non v3 response but still ok
        } else if (response.status >= 200 && response.status < 300) {
          return json
        } else {
          const error = new Error(response.statusText)
          error.response = response

          throw error
        }
      })
  }

  return fetch(url, config).then( handleResponse )
}

export function isLoggedIn() {
  // make sure all tokens are set
  const v3jwt = getV3Jwt()
  const v2jwt = getV2Jwt()
  const v2sso = getV2Sso()
  return !!v3jwt && !!v2jwt && !!v2sso
}

export function getV3Jwt() {
  return getToken(V3_JWT)
}

export function getV2Jwt() {
  return getToken(V2_JWT)
}

export function getV2Sso() {
  return getToken(V2_SSO)
}

export function getFreshToken() {
  const v3Token = getV3Jwt()
  const v2TokenExists = getV2Jwt() && getV2Sso()

  // If we have no token, short circuit
  if (!v3Token || !v2TokenExists) {
    return Promise.reject('No token found')
  }

  // If the token is still fresh for at least another minute
  if ( !isTokenExpired(v3Token, 60) ) {

    // If the token will expire in the next 5m, refresh it in the background
    if ( isTokenExpired(v3Token, 300) ) {
      refreshToken()
    }

    return Promise.resolve(v3Token)
  }

  // If the token is expired, return a promise for a fresh token
  return refreshToken()
}

export function logout() {
  function getJwtSuccess(token) {
    clearTokens()

    const url = API_URL + '/authorizations/1'
    const config = {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer ' + token
      }
    }
    return fetchJSON(url, config)
  }

  function getJwtFailure() {
    clearTokens()
    console.warn('Failed to get token, assuming we are already logged out')
  }

  return getFreshToken().then(getJwtSuccess, getJwtFailure)
}

function setConnection(options) {
  if (options.connection === undefined) {
    options.connection = getLoginConnection(options.username)
  }

  return Promise.resolve(options)
}

function auth0Signin(options) {
  const url = 'https://' + AUTH0_DOMAIN + '/oauth/ro'

  /* eslint camelcase: 0 */
  const config = {
    method: 'POST',
    body: {
      username: options.username,
      password: options.password,
      client_id: AUTH0_CLIENT_ID,
      sso: false,
      scope: 'openid profile offline_access',
      response_type: 'token',
      connection: options.connection || 'LDAP',
      grant_type: 'password',
      device: 'Browser'
    }
  }

  return fetchJSON(url, config)
}

function auth0Popup(options) {
  return new Promise( (resolve, reject) => {
    auth0.popup.authorize(
      {
        scope: options.scope || 'openid profile offline_access',
        connection: options.connection,
        owp: true
      },
      (err, profile, id_token, access_token, state, refresh_token) => {
        if (err) {
          reject(err)
          return
        }

        /* eslint camelcase: 0 */
        resolve({
          profile,
          id_token,
          access_token,
          state,
          refresh_token
        })
      }
    )
  })
}

function setAuth0Tokens({id_token, refresh_token, profile}) {
  var idToken = id_token || profile.idToken
  var refreshToken = refresh_token || profile.refreshToken
  if (idToken === undefined || refreshToken === undefined) {
    const error = new Error('Unable to contact login server')
    error.reason = 'Auth0 response did not contain proper tokens',
    error.idToken = idToken
    error.refreshToken = refreshToken

    throw error
  }

  setToken(AUTH0_JWT, idToken)
  setToken(AUTH0_REFRESH, refreshToken)
}

export function getNewJWT() {
  const externalToken = getToken(AUTH0_JWT)
  const refreshToken = getToken(AUTH0_REFRESH)

  const params = {
    param: {
      externalToken,
      refreshToken
    }
  }

  const url = API_URL + '/authorizations'
  const config = {
    method: 'POST',
    credentials: 'include',
    body: params
  }

  function success(data) {
    return get(data, 'result.content')
  }

  return fetchJSON(url, config).then(success)
}

function handleAuthResult({token, zendeskJwt}) {
  setTcJwt(token)
  setZendeskJwt(zendeskJwt)
}

function setTcJwt(token) {
  setToken(V3_JWT, token || '')
}

function setZendeskJwt(token) {
  setToken(ZENDESK_JWT, token || '')
}

// refreshPromise is needed outside the refreshToken scope to allow throttling
let refreshPromise = null

export function refreshToken() {
  if (refreshPromise) {
    return refreshPromise
  }

  const token = getV3Jwt() || ''
  const url = API_URL + '/authorizations/1'
  const config = {
    headers: {
      Authorization: 'Bearer ' + token
    }
  }

  function refreshSuccess(data) {
    // Assign it to local storage
    const newToken = get(data, 'result.content.token')
    setToken(V3_JWT, newToken)

    refreshPromise = null

    return newToken
  }

  function refreshFailure(response) {
    refreshPromise = null

    const error = new Error('Unable to refresh token')
    error.reponse = response

    throw error
  }

  refreshPromise = fetchJSON(url, config).then(refreshSuccess, refreshFailure)

  return refreshPromise
}

export function login(options) {
  return setConnection(options)
    .then(auth0Signin)
    .then(setAuth0Tokens)
    .then(getNewJWT)
    .then(handleAuthResult)
}

export function socialLogin(options) {
  return auth0Popup(options)
    .then(setAuth0Tokens)
    .then(getNewJWT)
    .then(handleAuthResult)
}

export function sendResetEmail(email, resetPasswordUrlPrefix) {
  function failure(res) {
    throw new Error( get(res, 'result.content') || "We weren't able to send a reset link because of a system error. Please try again or contact support@topcoder.com." )
  }
  return fetchJSON(API_URL + '/users/resetToken?email=' + encodeURIComponent(email) + '&resetPasswordUrlPrefix=' + encodeURIComponent(resetPasswordUrlPrefix))
  .catch(failure)
}

export function resetPassword(handle, resetToken, password) {
  const url = API_URL + '/users/resetPassword'
  const config = {
    method: 'PUT',
    body: {
      param: {
        handle,
        credential: {
          password,
          resetToken
        }
      }
    }
  }

  function failure(res) {
    throw new Error( get(res, 'result.content') || "We weren't able to reset password because of a system error. Please try again or contact support@topcoder.com." )
  }

  return fetchJSON(url, config).catch(failure)
}

export function updateUserInfo(token, handle, body) {
  function success(data) {
    return get(data, 'result.content')
  }

  return fetchJSON(API_URL + '/members/'+handle+'/traits', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token
    },
    body
  })
  .then(success)
}

export function registerUser(body) {

  function success(data) {
    return get(data, 'result.content');
  }

  function failure(res) {
    throw new Error( get(res, 'result.content') || 'We weren\'t able to register you because of a system error. Please try again or contact support@topcoder.com.' )
  }

  return fetchJSON(API_URL + '/users', {
    method: 'POST',
    body
  })
  .then(success)
  .catch(failure)
}

export function ssoLogin(provider, state) {
  return new Promise(function(resolve, reject) {
    // supported backends
    var providers = [ WIPRO_SSO_PROVIDER, APPIRIO_SSO_PROVIDER, TOPCODER_SSO_PROVIDER, CREDITSUISSE_SSO_PROVIDER, LOCALSIMPLESAML_SSO_PROVIDER, ZURICH_SSO_PROVIDER ]
    if (providers.indexOf(provider) > -1) {
      auth0.popup.authorize({
        connection: provider,
        scope: 'openid profile offline_access',
        state: state,
        owp: true
      },
        function(error, authResult) {
          if (error) {
            console.warn('onSSORegistrationFailure ' + JSON.stringify(error))
            reject(error)
            return
          }
          var profile = decodeToken(authResult.idToken);
          var ssoUserData = extractSSOUserData(profile, authResult.accessToken)
          var result = {
            status: 'SUCCESS',
            data: {
              profile: profile,
              idToken: authResult.idToken,
              accessToken: authResult.accessToken,
              refreshToken: authResult.refreshToken,
              ssoUserData : ssoUserData
            }
          }
          console.debug('ssoLogin Result: ' + JSON.stringify(result))
          resolve(result)
        }
      )
    } else {
      console.error('Unsupported SSO login provider', provider)

      reject({
        status: 'FAILED',
        'error': 'Unsupported SSO login provider \'' + provider + '\''
      })
    }
  })
}

export function socialRegistration(provider, state) {
  return new Promise(function(resolve, reject) {
    // supported backends
    var providers = ['facebook', 'google-oauth2', 'twitter', 'github']
    if (providers.indexOf(provider) > -1) {
      auth0.popup.authorize({
        connection: provider,
        scope: 'openid profile offline_access',
        state: state,
        owp: true
      },
        function(error, authResult) {
          if (error) {
            console.warn('onSocialLoginFailure ' + JSON.stringify(error))
            reject(error)
            return
          }
          var profile = decodeToken(authResult.idToken);
          var socialData = extractSocialUserData(profile, authResult.accessToken)

          validateSocialProfile(socialData.socialUserId, socialData.socialProvider)
            .then(function(resp) {
              if (resp.valid) {
                // success
                var result = {
                  status: 'SUCCESS',
                  data: socialData
                }
                console.debug('socialRegister Result: ' + JSON.stringify(result))
                resolve(result)
              } else {
                if (resp.reasonCode === 'ALREADY_IN_USE') {
                  console.error('Social handle already exists')
                  reject({
                    status: 'SOCIAL_PROFILE_ALREADY_EXISTS'
                  })
                }
              }

            })
            .catch(function(err) {
              console.debug(JSON.stringify(err))
            })
        }
      )
    } else {
      console.error('Unsupported social login provider', provider)

      reject({
        status: 'FAILED',
        'error': 'Unsupported social login provider \'' + provider + '\''
      })
    }
  })
}

function extractSSOUserData(profile, accessToken) {
  profile.identities = profile[Object.keys(profile).filter(key => {return key.indexOf('identities') !== -1 })[0]] // This sucks, isn't there a lodash way?
  profile.user_id = profile.identities[0].user_id;
  profile.email = profile[Object.keys(profile).filter(key => {return key.indexOf('email') !== -1 })[0]]
  var ssoProvider = profile.identities[0].connection
  var firstName = '',
    lastName = '',
    name = '',
    handle = '',
    email = ''
 
  var ssoUserId = profile.user_id.substring(profile.user_id.lastIndexOf('|') + 1)
  if (ssoProvider === WIPRO_SSO_PROVIDER || ssoProvider === APPIRIO_SSO_PROVIDER
    || ssoProvider === TOPCODER_SSO_PROVIDER || ssoProvider === ZURICH_SSO_PROVIDER) {
    firstName = profile.given_name
    lastName  = profile.family_name
    name      = profile.name
    email     = profile.email
  }
  if (!firstName && !lastName && name) {
    var names = name.split(/\s/)
    if (names.length > 0) {
      firstName = names[0]
    }
    if (names.length > 1) {
      lastName = names[1]
    }
  }
  return {
    ssoUserId: ssoUserId,
    firstName: firstName,
    lastName: lastName,
    name: name,
    email: email,
    ssoProvider: ssoProvider
  }
}

function extractSocialUserData(profile, accessToken) {
  profile.identities = profile[Object.keys(profile).filter(key => {return key.indexOf('identities') !== -1 })[0]]
  var socialProvider = profile.identities[0].connection
  var firstName = '',
    lastName = '',
    handle = '',
    email = ''

  var socialUserId = profile.user_id.substring(profile.user_id.lastIndexOf('|') + 1)
  var splitName

  if (socialProvider === 'google-oauth2') {
    firstName = profile.given_name
    lastName = profile.family_name
    handle = profile.nickname
    email = profile.email
  } else if (socialProvider === 'facebook') {
    firstName = profile.given_name
    lastName = profile.family_name
    handle = firstName + '.' + lastName
    email = profile.email
  } else if (socialProvider === 'twitter') {
    splitName = profile.name.split(' ')
    firstName = splitName[0]
    if (splitName.length > 1) {
      lastName = splitName[1]
    }
    handle = profile.screen_name
  } else if (socialProvider === 'github') {
    splitName = profile.name.split(' ')
    firstName = splitName[0]
    if (splitName.length > 1) {
      lastName = splitName[1]
    }
    handle = profile.nickname
    email = profile.email
  } else if (socialProvider === 'bitbucket') {
    firstName = profile.first_name
    lastName = profile.last_name
    handle = profile.username
    email = profile.email
  } else if (socialProvider === 'stackoverflow') {
    firstName = profile.first_name
    lastName = profile.last_name
    handle = socialUserId
    email = profile.email
  } else if (socialProvider === 'dribbble') {
    firstName = profile.first_name
    lastName = profile.last_name
    handle = socialUserId
    email = profile.email
  }

  var token = accessToken
  var tokenSecret = null
  // if (profile.identities && profile.identities.length > 0) {
  //   token = profile.identities[0].access_token
  //   tokenSecret = profile.identities[0].access_token_secret
  // }
  return {
    socialUserId: socialUserId,
    username: handle,
    firstname: firstName,
    lastname: lastName,
    email: email,
    socialProfile: profile,
    socialProvider: socialProvider,
    accessToken: token,
    accessTokenSecret : tokenSecret
  }
}

export function generateSSOUrl(org, callbackUrl) {
  
  return [
    'https://' + AUTH0_DOMAIN + '/authorize?',
    'response_type=token',
    '&client_id=' + AUTH0_CLIENT_ID,
    '&connection=' + org,
    '&redirect_uri=' + AUTH0_CALLBACK,
    '&state=' + (encodeURIComponent(callbackUrl)),
    '&scope=openid%20profile%20offline_access',
    '&device=device'
  ].join('')
}

export function getSSOProvider(handle) {
  const filter = encodeURIComponent('handle=' + handle)

  function success(res) {
    const content = get(res, 'result.content')
    if (!content) {
      const error = new Error('Could not contact login server')
      error.reason = 'Body did not contain content'
      error.response = res

      throw error
    }

    if (content.type !== 'samlp') {
      const error = new Error('This handle does not appear to have an SSO login associated')
      error.reason = 'No provider of type \'samlp\''
      error.response = res

      throw error
    }

    return content.name
  }

  function failure(res) {
    throw new Error( get(res, 'result.content') || 'Could not contact login server' )
  }

  return fetchJSON(API_URL + '/identityproviders?filter=' + filter)
    .catch(failure)
    .then(success)
}

export function validateClient(clientId, redirectUrl, scope) {
  const token = getV3Jwt() || ''
  const url = API_URL + '/authorizations/validateClient?clientId=' + clientId + '&redirectUrl=' + encodeURIComponent(redirectUrl) + '&scope=' + scope

  return fetchJSON(url, {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token
    }
  })
}

export function validateSocialProfile(userId, provider) {
  const url = API_URL + '/users/validateSocial?socialUserId=' + userId + '&socialProvider=' + encodeURIComponent(provider)
  var config = {
    method: 'GET',
    skipAuthorization: true
  }
  var success = function(res) {
    if (res.result && res.result.status === 200) {
      return res.result.content ? res.result.content : null
    } else {
      return null
    }
  }

  function failure(res) {
    console.error(res)
  }

  return fetchJSON(url, config).catch(failure).then(success)
}

export function getOneTimeToken(userId, password) {
  const url = API_URL + '/users/oneTimeToken'
  const config = {
    method: 'POST',
    body: 'userId=' + userId + '&password=' + password,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }
  function success(data) {
    return get(data, 'result.content')
  }
  return fetchJSON(url, config).then(success)
}

export function createLead(token, body) {
  const url = API_URL_V5 + '/connect2sf/leadInfo'
  return fetchJSON(url, {
    method:'POST', 
    headers: {
      Authorization: 'Bearer ' + token
    },
    body})
}

export function verifyPIN(pin, source) {
  let url = API_URL + '/users/activate?code=' + pin
  // adds source param, if available. Can be used to identify the calling app.
  // one implemented use case is to supress welcome email for connect users.
  if (source) {
    url += '&source=' + source
  }
  const config = {
    method: 'PUT',
    body: {
      param: {
        code: pin
      }
    }
  }
  function success(data) {
    return get(data, 'result.content')
  }

  function failure(res) {
    throw new Error( get(res, 'result.content') || "We weren't able to verify PIN because of a system error. Please try again or contact support@topcoder.com." )
  }
  return fetchJSON(url, config).then(success).catch(failure)
}

export function resendActivationCode(userId, afterActivationURL) {
  const url = API_URL + '/users/' + userId + '/sendActivationCode'
  const config = {
    method: 'POST',
    body: {
      param: {},
      options: {
        afterActivationURL : afterActivationURL
      }
    }
  }

  return fetchJSON(url, config)
}

export function updatePrimaryEmail(userId, email, tempToken) {
  const url = API_URL + '/users/' + userId + '/email/' + email
  const config = {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + tempToken
    },
    body: {
      param: {
        email: email
      }
    }
  }
  function success(data) {
    return get(data, 'result.content')
  }
  return fetchJSON(url, config).then(success)
}

export function identifySSOProvider(emailOrHandle) {
  //var EMAIL_DOMAIN_REGEX = new RegExp('^[a-zA-Z0-9_.+-]+@(?:(?:[a-zA-Z0-9-]+\\.)?[a-zA-Z]+\\.)?(' + SSO_PROVIDER_DOMAINS + ')\\.[a-zA-Z]{2,15}$')
  var EMAIL_DOMAIN_REGEX = new RegExp('^[a-zA-Z0-9_.+-]+@(?:(?:[a-zA-Z0-9-]+\\.)?[a-zA-Z]+\\.)?(' + SSO_PROVIDER_DOMAINS + ')$', 'i')
  var match = EMAIL_DOMAIN_REGEX.exec(emailOrHandle)
  var domain, provider = null
  if (match && match.length > 1) {
    domain = match[1]
  }
  // identify SSO provider by looking at domain of the email or handle
  // if handle does not follow email pattern, this won't work
  // switch(domain && domain.toLowerCase()) {
  // case SSO_PROVIDER_DOMAINS_WIPRO:
  //   provider = WIPRO_SSO_PROVIDER
  //   break
  // case SSO_PROVIDER_DOMAINS_CREDITSUISSE:
  //   provider = CREDITSUISSE_SSO_PROVIDER
  //   break
  // case SSO_PROVIDER_DOMAINS_LOCALSIMPLESAML:
  //   provider = LOCALSIMPLESAML_SSO_PROVIDER
  //   break
  // case SSO_PROVIDER_DOMAINS_ZURICH:
  //   provider = ZURICH_SSO_PROVIDER
  //   break
  // /* supports only wipro.com
  //   case SSO_PROVIDER_DOMAINS_APPIRIO:
  //   provider = APPIRIO_SSO_PROVIDER
  //   break
  // case SSO_PROVIDER_DOMAINS_TOPCODER:
  //   provider = TOPCODER_SSO_PROVIDER
  //   break
  // */
  // default:
  //   break
  // }

  // identify SSO provider by looking at domain of the email or handle
  if (domain) {
    var domainLower = domain.toLowerCase()

    if (SSO_PROVIDER_DOMAINS_WIPRO.indexOf(domainLower) != -1) {
      provider = WIPRO_SSO_PROVIDER
    } else if (SSO_PROVIDER_DOMAINS_CREDITSUISSE.indexOf(domainLower) != -1) {
      provider = CREDITSUISSE_SSO_PROVIDER
    } else if (SSO_PROVIDER_DOMAINS_LOCALSIMPLESAML.indexOf(domainLower) != -1) {
      provider = LOCALSIMPLESAML_SSO_PROVIDER
    } else if (SSO_PROVIDER_DOMAINS_ZURICH.indexOf(domainLower) != -1) {
      provider = ZURICH_SSO_PROVIDER
    }
  }

  return provider
}
