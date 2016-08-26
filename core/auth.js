import replace from 'lodash/replace'
import get from 'lodash/get'
import merge from 'lodash/merge'
import { getLoginConnection } from './utils.js'
import { setToken, getToken, clearTokens, isTokenExpired } from './token.js'
import { V3_JWT, V2_JWT, V2_SSO, AUTH0_REFRESH, AUTH0_JWT, ZENDESK_JWT, API_URL, AUTH0_DOMAIN, AUTH0_CLIENT_ID } from './constants.js'
import fetch from 'isomorphic-fetch'
import Auth0 from 'auth0-js'

const auth0 = new Auth0({
  domain      : AUTH0_DOMAIN,
  clientID    : AUTH0_CLIENT_ID,
  callbackOnLocationHash: true
})

function fetchJSON(url, options) {
  const config = merge({
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  }, options)

  if (config.body) config.body = JSON.stringify(config.body)

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
    auth0.login(
      {
        scope: options.scope || 'openid profile offline_access',
        connection: options.connection,
        popup: true
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

function setAuth0Tokens({id_token, refresh_token}) {
  if (id_token === undefined || refresh_token === undefined) {
    const error = new Error('Unable to contact login server')
    error.reason = 'Auth0 response did not contain proper tokens',
    error.id_token = id_token
    error.refresh_token = refresh_token

    throw error
  }

  setToken(AUTH0_JWT, id_token)
  setToken(AUTH0_REFRESH, refresh_token)
}

function getNewJWT() {
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
  return fetchJSON(API_URL + '/users/resetToken?email=' + encodeURIComponent(email) + '&resetPasswordUrlPrefix=' + encodeURIComponent(resetPasswordUrlPrefix) )
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

  return fetchJSON(url, config)
}

export function registerUser(body) {
  return fetchJSON(API_URL + '/users', {
    method: 'POST',
    body
  })
}

export function socialRegistration(provider, state) {
  return new Promise(function(resolve, reject) {
    // supported backends
    var providers = ['facebook', 'google-oauth2', 'twitter', 'github']
    if (providers.indexOf(provider) > -1) {
      auth0.signin({
        popup: true,
        connection: provider,
        scope: 'openid profile offline_access',
        state: state
      },
        function(error, profile, idToken, accessToken, state, refreshToken) {
          console.log('error ')
          console.log(error)
          if (error) {
            console.warning('onSocialLoginFailure ' + JSON.stringify(error))
            reject(error)
            return
          }
          console.log(profile)
          console.log(accessToken)
          var socialData = extractSocialUserData(profile, accessToken)
          console.log(socialData)

          validateSocialProfile(socialData.socialUserId, socialData.socialProvider)
            .then(function(resp) {
              console.debug(JSON.stringify(resp))
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

function extractSocialUserData(profile, accessToken) {
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
  if (profile.identities && profile.identities.length > 0) {
    token = profile.identities[0].access_token
    tokenSecret = profile.identities[0].access_token_secret
  }
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
    cache: false,
    skipAuthorization: true
  }
  var success = function(res) {
    if (res.result && res.result.status === 200) {
      return res.result.content ? res.result.content : null
    } else {
      return null
    }
  }

  return fetchJSON(url, config).then(success)
}
