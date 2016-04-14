'use strict'

{ TC_JWT, ZENDESK_JWT, DOMAIN, ZENDESK_DOMAIN } = require '../../core/constants.js'
{ getToken }            = require '../../core/token.js'

Utils = (
  $log
  $window
) ->

  # returns Auth0 connection name for password login
  getLoginConnection = (userId) ->
    return if isEmail(userId) then 'TC-User-Database' else 'LDAP'

  # returns true if the value is a valid email address  
  isEmail = (value) ->
    EMAIL_PATTERN = /^(([^<>()[\]\.,:\s@\"]+(\.[^<>()[\]\.,:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,:\s@\"]+\.)+[^<>()[\]\.,:\s@\"]{2,})$/i
    EMAIL_PATTERN.test value

  # returns true if the value is a valid HTTP(s) URL
  isUrl = (value) ->
    URL_PATTERN = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?/i
    URL_PATTERN.test value
  
  # encode object
  encodeParams = (params, includeNull) ->
    result = {}
    for p,v of params
      if v || includeNull then result[p] = encodeURIComponent(v) 
    result
  
  # parseQuery("p1=v1&p2=p3&p4")
  # returns {p1:v1, p2:v2, p3:null}
  parseQuery = (query) ->
    params = {}
    parseKV = (kv) ->
      pair = kv.split '='
      if pair.length == 1
        params[pair[0]] = null
      else
        params[pair[0]] = decodeURIComponent(pair[1])

    parseKV kv for kv in query.split '&'
    params
  
  # redirect to the given URL
  redirectTo = (url) ->
    unless validateUrl url
      $log.error 'Invalid URL: ' + url
      return 'Invalid URL: ' + url
    
    $log.info 'redirect to ' + url
    $window.location = url
    return undefined # no error

  # generate URL to Auth0 authentication endpoint with parameters.
  # https://auth0.com/docs/protocols#oauth-for-native-clients-and-javascript-in-the-browser
  generateSSOUrl = (org, callbackUrl, state) ->
    apiUrl = API_URL.replace 'api-work', 'api'
    [
      "https://#{Contants.AUTH0_DOMAIN}/authorize?"
      "response_type=token"
      "&client_id=#{Contants.AUTH0_CLIENT_ID}"
      "&connection=#{org}"
      "&redirect_uri=#{encodeURIComponent(callbackUrl)}"
      "&state=#{encodeURIComponent(state)}"
      "&scope=openid%20profile%20offline_access"
      "&device=browser"
    ].join('')
    
  # generate URL to return application with token.
  # format:
  #   returnUrlBase?jwt={TC_JWT}
  generateReturnUrl = (returnUrlBase) ->
    return returnUrlBase
    #v3jwt = getToken(TC_JWT)
    #unless v3jwt
    #  return returnUrlBase
    #else
    #  return returnUrlBase + '?jwt=' + encodeURIComponent(v3jwt)
  
  # generate URL to return back to Zendesk after authentication
  generateZendeskReturnUrl = (returnToUrl) ->
    return "https://#{ZENDESK_DOMAIN}/access/jwt?jwt=#{getToken(ZENDESK_JWT)}&return_to=#{returnToUrl}"
  
  # validate
  validateUrl = (returnUrlBase) ->
    unless isUrl returnUrlBase
      return false
    
    parser = document?.createElement 'a'
    if parser
      parser.href = returnUrlBase
      hostname = parser.hostname.toLowerCase()
      return hostname.endsWith(DOMAIN) || hostname.endsWith(ZENDESK_DOMAIN)
    false

  # porting from Helpers in topcoder-app
  setupLoginEventMetrics = (id) ->
    if $window._kmq
      $window._kmq.push ['identify', id]

  # expose functions
  getLoginConnection: getLoginConnection
  isEmail           : isEmail
  isUrl             : isUrl
  redirectTo        : redirectTo
  encodeParams      : encodeParams
  parseQuery        : parseQuery
  generateSSOUrl    : generateSSOUrl
  generateReturnUrl : generateReturnUrl
  generateZendeskReturnUrl : generateZendeskReturnUrl
  setupLoginEventMetrics : setupLoginEventMetrics

Utils.$inject = [
  '$log'
  '$window'
]

angular.module('accounts').factory 'Utils', Utils
  
