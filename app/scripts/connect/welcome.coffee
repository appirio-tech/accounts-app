'use strict'

{ getFreshToken, login }    = require '../../../core/auth.js'
{ DOMAIN } = require '../../../core/constants.js'
{ generateReturnUrl, redirectTo } = require '../../../core/url.js'
_ = require 'lodash'

ConnectWelcomeController = ($state, $stateParams, $scope, ISO3166) ->
  vm              = this
  vm.termsUrl     = 'https://connect.' + DOMAIN + '/terms'
  vm.newProjectUrl       = 'https://connect.' + DOMAIN + '/new-project'
  vm.connectDashboardUrl = 'https://connect.' + DOMAIN + '/projects'
  vm.privacyUrl   = 'https://www.' + DOMAIN + '/community/how-it-works/privacy-policy/'
  vm.username     = ''
  vm.password     = ''
  vm.error        = false
  vm.errorMessage = 'Error Creating User'
  vm.submit       = null
  vm.loading      = false
  vm.isValidCountry    = false
  vm.isCountryDirty    = false
  vm.ssoUser
  vm.baseUrl      = "https://connect.#{DOMAIN}"
  vm.retUrl       = if $stateParams.retUrl then decodeURIComponent($stateParams.retUrl) else vm.baseUrl
  vm.auth0Data    = $stateParams.auth0Data
  vm.screenType   = "welcome"
  vm.isLoggedIn      = false
  vm.userHandle =  $stateParams.username
  
  # SSO user data extracted from auth0 login data
  vm.ssoUser = vm.auth0Data?.ssoUserData

  callLogin = (id, password) ->
    options =
      username: id
      password: password

    login(options).then(loginSuccess, loginFailure)

  loginFailure = (error) ->
    if error?.message?.toLowerCase() == 'account inactive'
      # redirect to the page to prompt activation 
      vm.loginErrors.ACCOUNT_INACTIVE = true
    else
      vm.loginErrors.WRONG_PASSWORD = true
    $scope.$apply ->
      vm.error   = true
      vm.loading = false
    vm.reRender()

  loginSuccess = (result) ->
    jwt = getV3Jwt()

    unless jwt
      vm.error = true
    else if vm.retUrl
      redirectTo generateReturnUrl(vm.retUrl)
    vm.reRender()

  init = ->
    { handle, email, password } = $stateParams
    getJwtSuccess = (jwt) ->
      vm.isLoggedIn = true
      vm.reRender()
      if jwt && vm.retUrl
        # redirectTo generateReturnUrl(vm.retUrl)
      else if (handle || email) && password
        callLogin(handle || email, password)

    getFreshToken().then(getJwtSuccess).catch(() => {
      # ignore, to stop angular complaining about unhandled promise
    })

    vm

  init()

  vm

ConnectWelcomeController.$inject = [
  '$state'
  '$stateParams'
  '$scope',
  'ISO3166'
]

angular.module('accounts').controller 'ConnectWelcomeController', ConnectWelcomeController
