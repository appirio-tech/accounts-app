import Auth0Client from '@auth0/auth0-spa-js'
import { decodeToken, isTokenExpired } from './token'
import _ from 'lodash'

let auth0 = null
const tc_cookie = 'tc-rs256'
const domain = 'testsachin.topcoder-dev.com'
const client_id = 'Is6DB1N9VBbygNfh1UhDJM8SVC3SHtHm'
const redirect_uri = window.location.protocol + "//" + window.location.host
const cexpiremins = 24*30*30 // local cookie expiry in minutes

let cdomain = ""
if (location.hostname !== 'localhost') {
  cdomain = ";domain=." + location.hostname.split('.').reverse()[1] + "." + location.hostname.split('.').reverse()[0]
}

window.addEventListener('load', async () => {
  console.log('window loading...')
  try {
    auth0 = await Auth0Client({
      domain,
      client_id,
      redirect_uri,
      cacheLocation: 'localstorage'
    })
    const query = window.location.search;
    const shouldParseResult = query.includes("code=") && query.includes("state=");
    if (shouldParseResult) {
      console.log('parsed auth0 redirect url')
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
  document.cookie = cname + "=" + cvalue + cdomain + expires + ";path=/";
}

function getCookie(name) {
  const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)')
  return v ? v[2] : undefined
}

const storeToken = (auth0) => {
  return new Promise(async (resolve, reject) => {
    if (auth0) {
      try {
        let rawIdToken = await auth0.getIdTokenClaims()
        console.log("raw token", rawIdToken)
        const token = rawIdToken['__raw']
        console.log("setting token in cookie")

        let userActive = _.find(rawIdToken, (value, key) => {
          return (key.indexOf('active') !== -1)
        })

        if (userActive) {
          setCookie(tc_cookie, token, cexpiremins)

          /**
           * for direct demo
           */
          let tcsso = _.find(rawIdToken, (value, key) => {
            return (key.indexOf('tcsso') !== -1)
          })

          setCookie('v3jwt', token, cexpiremins)
          setCookie('tcjwt', token, cexpiremins)
          setCookie('tcsso', tcsso, cexpiremins)

          resolve(token)
        } else {
           console.log("User not active")
           logout()
        }
      } catch (e) {
        console.log("Error in setting cookie", e)
        reject(e)
      }
    }
    reject("No Auth0 object")
  })
}

export const getFreshToken = async () => {
  return new Promise(async (resolve, reject) => {
    const rs256Token = getCookie(tc_cookie)
    if (rs256Token) {
      if (isTokenExpired(rs256Token)) {
        try {
          let r = await auth0.getTokenSilently()
          console.log("fresh token request", r)
          const token = storeToken(auth0)
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
    // TODO how to handle if cookie expired locally
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
        cacheLocation: 'localstorage'
      })
    }

    await auth0.loginWithPopup()
    let token = await storeToken(auth0)
    console.log("Token is", token)
    window.location = window.location.protocol + "//" + window.location.host
  } catch (e) {
    console.log('Login error', e)
  }
}

export const logout = () => {
  try {
    auth0.logout()
    setCookie(tc_cookie, "", -1)
  } catch (e) {
    console.log('Logout error', e)
  }
}

export {
  decodeToken,
  isTokenExpired
}
