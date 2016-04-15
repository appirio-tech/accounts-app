import { GET_TOKEN_REQUEST, GET_TOKEN_SUCCESS, GET_TOKEN_FAILURE, GET_FRESH_TOKEN_REQUEST, GET_FRESH_TOKEN_SUCCESS, GET_FRESH_TOKEN_FAILURE, REFRESH_TOKEN_REQUEST, REFRESH_TOKEN_SUCCESS, REFRESH_TOKEN_FAILURE, LOGOUT_REQUEST, LOGOUT_SUCCESS, LOGOUT_FAILURE } from '../core/constants.js'
import { getToken, getFreshToken, refreshToken, logout } from '../core/auth.js'

window.addEventListener('message', function(e) {
  function success(token) {
    e.source.postMessage({
      type: GET_FRESH_TOKEN_SUCCESS,
      token
    }, e.origin)
  }

  function failure(error) {
    e.source.postMessage({
      type: GET_FRESH_TOKEN_FAILURE
    }, e.origin)
  }

  if (e.data.type === GET_FRESH_TOKEN_REQUEST) {
    console.log('iframe event', e.data)
    getFreshToken().then(success, failure)
  }
})

window.addEventListener('message', function(e) {
  function success(resp) {
    e.source.postMessage({
      type: LOGOUT_SUCCESS
    }, e.origin)
  }

  if (e.data.type === LOGOUT_REQUEST) {
    console.log('iframe event', e.data)
    logout().then(success)
  }
})