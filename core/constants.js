export const V3_JWT = 'v3jwt'
export const AUTH0_REFRESH = 'auth0Refresh'
export const AUTH0_JWT = 'auth0Jwt'
export const V2_JWT = 'tcjwt'
export const V2_SSO = 'tcsso'
export const ZENDESK_JWT = 'zendeskJwt'
export const V3_TEMP_JWT = 'v3tempjwt'

export const SCHEME = 'https'
export const DOMAIN = process.env.DOMAIN
export const API_URL = process.env.API_URL
export const API_URL_V5 = SCHEME+"://api."+DOMAIN+'/v5'
export const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN
export const AUTH0_CALLBACK = process.env.auth0Callback
export const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID
export const ZENDESK_DOMAIN = process.env.ZENDESK_DOMAIN

export const GET_FRESH_TOKEN_REQUEST = 'GET_FRESH_TOKEN_REQUEST'
export const GET_FRESH_TOKEN_SUCCESS = 'GET_FRESH_TOKEN_SUCCESS'
export const GET_FRESH_TOKEN_FAILURE = 'GET_FRESH_TOKEN_FAILURE'

export const LOGOUT_REQUEST = 'LOGOUT_REQUEST'
export const LOGOUT_SUCCESS = 'LOGOUT_SUCCESS'
export const LOGOUT_FAILURE = 'LOGOUT_FAILURE'

export const BUSY_PROGRESS_MESSAGE = 'Processing...'

export const ALLOWED_ORIGINS = [DOMAIN, 'http://localhost:3000', 'local.topcoder-dev.com:3000']

export const WIPRO_SSO_PROVIDER = 'wipro-adfs'
export const APPIRIO_SSO_PROVIDER = 'sfdc-aspdev'
export const TOPCODER_SSO_PROVIDER = 'sfdc-aspdev'//TODO update provider for topcoder sfdc org
export const CREDITSUISSE_SSO_PROVIDER = 'CreditSuisse'
export const LOCALSIMPLESAML_SSO_PROVIDER = 'LocalSimpleSaml'
export const ZURICH_SSO_PROVIDER = 'Zurich'

export const SEGMENT_KEY = process.env.ACCOUNTS_SEGMENT_KEY

export const CONNECT_PROJECT_CALLBACK = 'new-project-callback'
// this string should be regex aware i.e. it should backquote any regex reserve characters
//export const SSO_PROVIDER_DOMAINS = 'wipro\\.com|asp\\.appirio\\.com|topcoder'
// export const SSO_PROVIDER_DOMAINS = 'wipro\\.com'
export const SSO_PROVIDER_DOMAINS = 'wipro\\.com|credit-suisse\\.com|localsimplesaml\\.com|zurich\\.com|zurichna\\.com|zurich\\.co\\.jp|zurich\\.ie|zurich\\.sg|zurich\\.com\\.au|zurich\\.ch'
// individual domains should not backquote anything because it is matched without regex
export const SSO_PROVIDER_DOMAINS_WIPRO = ['wipro.com']
export const SSO_PROVIDER_DOMAINS_APPIRIO = ['asp.appirio.com']
export const SSO_PROVIDER_DOMAINS_TOPCODER = ['topcoder']
export const SSO_PROVIDER_DOMAINS_CREDITSUISSE = ['credit-suisse.com']
export const SSO_PROVIDER_DOMAINS_LOCALSIMPLESAML = ['localsimplesaml.com']
export const SSO_PROVIDER_DOMAINS_ZURICH = ['zurich.com', 'zurichna.com', 'zurich.co.jp','zurich.ie', 'zurich.sg', 'zurich.com.au', 'zurich.ch']

export const UTM_SOURCE_CONNECT = 'connect'
