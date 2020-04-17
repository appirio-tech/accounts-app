import Auth0Client from '@auth0/auth0-spa-js'
import { decodeToken, isTokenExpired } from './token'

let auth0 = null
const tc_cookie = 'tc-rs256'
const domain = 'testsachin.topcoder-dev.com'
const client_id = 'Is6DB1N9VBbygNfh1UhDJM8SVC3SHtHm'
const redirect_uri = window.location.protocol + "//" + window.location.host

window.addEventListener('load', async () => {
  console.log('window loading...')
  try {
    auth0 = await Auth0Client({
      domain,
      client_id,
      redirect_uri,
      useRefreshTokens: true,
      cacheLocation: 'localstorage'
    })
    const query = window.location.search;
    const shouldParseResult = query.includes("code=") && query.includes("state=");
    if (shouldParseResult) {
      const redirectResult = await auth0.handleRedirectCallback();
      console.log('parse result', redirectResult)
    }
    storeToken(auth0)
  } catch (e) {
    console.log("Error", e, auth0)
  }
})

function setCookie(cname, cvalue, exmins) {
  let d = new Date();
  d.setTime(d.getTime() + (exmins * 60 * 1000));
  let expires = ";expires=" + d.toUTCString();
  let domain = ""
  if (location.hostname !== 'localhost') {
    domain = ";domain=." + location.hostname.split('.').reverse()[1] + "." + location.hostname.split('.').reverse()[0]
  }
  document.cookie = cname + "=" + cvalue + domain + expires + ";path=/";
}

function getCookie(name) {
  const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)')
  return v ? v[2] : undefined
}

const storeToken = async (auth0) => {
  let token = null
  if (auth0) {
    try {
      let rawIdToken = await auth0.getIdTokenClaims()
      console.log("raw token", rawIdToken)
      token = rawIdToken['__raw']
      console.log("setting token in cookie")
      setCookie(tc_cookie, token, 30)
    } catch (e) {
      console.log("Error in setting cookie", e)
    }
  }
  return token
}

export const getFreshToken = async () => {
  return new Promise(async (resolve, reject) => {
    let token = null
    const rs256Token = getCookie(tc_cookie)
    if (rs256Token) {
      if (isTokenExpired(rs256Token)) {
        try {
          let r = await auth0.getTokenSilently()
          console.log("fresh token request", r)
          token = storeToken(auth0)
          console.log("refreshed id-token", token)
          resolve(token)
        } catch (e) {
          console.log("Error in call getTokenSilently().", e)
          login()
          reject(false)
        }
      } else {
        console.log("fetched token from cookie.")
        resolve(rs256Token)
      }
    }
    reject(false)
  })
}

export const login = async () => {
  try {
    if (!auth0) {
      auth0 = await Auth0Client({
        domain,
        client_id,
        redirect_uri,
        useRefreshTokens: true,
        cacheLocation: 'localstorage'
      })
    }
    await auth0.loginWithPopup()
    let token = storeToken(auth0)
    console.log("Token is", token)
  } catch (e) {
    console.log('Login error', e)
  }
}

export {
  decodeToken,
  isTokenExpired
}
