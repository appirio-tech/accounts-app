import replace from 'lodash/replace'
import get from 'lodash/get'
import merge from 'lodash/merge'
import { getLoginConnection } from './utils.js'
import { clearTokens, readCookie, isTokenExpired } from './token.js'
import { TC_JWT, AUTH0_REFRESH, AUTH0_JWT, ZENDESK_JWT, V2_SSO, V2_COOKIE, API_URL, AUTH0_DOMAIN, AUTH0_CLIENT_ID } from './constants.js'
import fetch from 'isomorphic-fetch'
import Auth0 from 'auth0-js'

const auth0 = new Auth0({
    domain      : AUTH0_DOMAIN,
    clientID    : AUTH0_CLIENT_ID,
    callbackOnLocationHash: true
  });

function AuthException(params) {
  Object.assign(this, params)
}

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
            throw new AuthException({
              message: json.result.content,
              response
            })
          }

        // If this is a non v3 response but still ok
        } else if (response.status >= 200 && response.status < 300) {
          return json
        } else {
          throw new AuthException({
            message: response.statusText,
            response
          })
        }
      })
  }

  return fetch(url, config).then( handleResponse )
}

export function isLoggedIn() {
  return getToken() !== null
}

export function getToken() {
  var token = localStorage.getItem(TC_JWT)
  if(token) {
    token = token.replace(/^"|"$/g, '')
  }
  return token
}

export function getFreshToken() {
  const currentToken = (localStorage.getItem(TC_JWT) || '').replace(/^"|"$/g, '')

  // If we have no token, short circuit
  if (!currentToken) {
    return Promise.reject('No token found')
  }

  // If the token is still fresh for at least another minute
  if ( !isTokenExpired(currentToken, 60) ) {

    // If the token will expire in the next 5m, refresh it in the background
    if ( isTokenExpired(currentToken, 300) ) {
      refreshToken()
    }

    return Promise.resolve(currentToken)
  }

  // If the token is expired, return a promise for a fresh token
  return refreshToken()
}

export function logout() {
  
  //var API_URL = "http://local.topcoder-dev.com:8080"  
  let token = getToken()
  if (!token || isTokenExpired(token, 300)) {
    refreshToken().catch( error => console.error(error) )
  }
  
  const jwt = getToken() || ''

  clearTokens()

  const url = API_URL + '/v3/authorizations/1'
  const config = {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer ' + jwt
    }
  }

  return fetchJSON(url, config)
    .catch(function(error){
      console.error(error)
    })
}

function setConnection(options) {
  if (options.connection === undefined) {
    options.connection = getLoginConnection(options.username)
  }

  return Promise.resolve(options)
}

function auth0Signin(options) {
  const url = 'https://' + AUTH0_DOMAIN + '/oauth/ro'
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
  return new Promise(function(onFulfilled, onRejected) {
    auth0.login(
      {
        scope: options.scope || 'openid profile offline_access',
        connection: options.connection,
        popup: true
      },
      function(err, profile, id_token, access_token, state, refresh_token) {
        if (err) {
          onRejected(err);
          return;
        }
        
        onFulfilled({
          profile : profile,
          id_token : id_token,
          access_token : access_token,
          state : state,
          refresh_token : refresh_token
        });
      }
    );
  })
}

function setAuth0Tokens({id_token, refresh_token}) {
  if (id_token === undefined || refresh_token === undefined) {
    throw new AuthException({
      message: 'Unable to contact login server',
      reason: 'Auth0 response did not contain proper tokens',
      id_token,
      refresh_token
    })
  }

  localStorage.setItem(AUTH0_JWT, id_token)
  localStorage.setItem(AUTH0_REFRESH, refresh_token)
}

function getNewJWT() {
  const externalToken = localStorage.getItem(AUTH0_JWT)
  const refreshToken = localStorage.getItem(AUTH0_REFRESH)

  const params = {
    param: {
      externalToken,
      refreshToken
    }
  }
  
  //let API_URL = "http://local.topcoder-dev.com:8080"
  const url = API_URL + '/v3/authorizations'
  const config = {
    method: 'POST',
    withCredentials: true,
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
  setSSOToken()
}

function setTcJwt(token) {
  localStorage.setItem(TC_JWT, token || '')
}

function setZendeskJwt(token) {
  localStorage.setItem(ZENDESK_JWT, token || '')
}

function setSSOToken() {
  localStorage.setItem(V2_SSO, readCookie(V2_COOKIE) || '' )
}

// refreshPromise is needed outside the refreshToken scope to allow throttling
let refreshPromise = null

export function refreshToken() {
  if (refreshPromise) {
    return refreshPromise
  }

  const token = getToken() || ''
  const url = API_URL + '/v3/authorizations/1'
  const config = {
    headers: {
      Authorization: 'Bearer ' + token
    }
  }

  return refreshPromise = fetchJSON(url, config)
    .then( data => {
      // Assign it to local storage
      const newToken = get(data, 'result.content.token')
      localStorage.setItem(TC_JWT, newToken)

      refreshPromise = null

      return newToken
    })
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

export function sendResetEmail(email) {
  return fetchJSON(API_URL + '/v3/users/resetToken?email=' + email + '&source=connect')
}

export function resetPassword(handle, resetToken, password) {
  const url = API_URL + '/v3/users/resetPassword'
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

export function registerUser({param, options}) {
  const url = API_URL + '/v3/users'
  const config = {
    method: 'POST',
    body: {
      param,
      options
    }
  }

  return fetchJSON(url, config)
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
      throw new AuthException({
        message: 'Could not contact login server',
        reason: 'Body did not contain content',
        response: res
      })
    }

    if (content.type !== 'samlp') {
      throw new AuthException({
        message: 'This handle does not appear to have an SSO login associated',
        reason: 'No provider of type \'samlp\'',
        response: res
      })
    }

    return content.name
  }

  function failure(res) {
    throw new AuthException({
      message: get(res, 'result.content') || 'Could not contact login server'
    })
  }

  return fetchJSON(API_URL + '/v3/identityproviders?filter=' + filter)
    .catch(failure)
    .then(success)
}