'use strict'

{ TC_JWT, ZENDESK_JWT, DOMAIN } = require '../../../core/constants.js'
{ login, socialLogin }  = require '../../../core/auth.js'
{ getToken }            = require '../../../core/token.js'

TCLoginController = (
  $log
  $scope
  $window
  $state
  $stateParams
  UserService
  Utils
) ->
  
  vm = this
  vm.loading   = false
  vm.init      = false

  vm.baseUrl = "https://www.#{DOMAIN}"
  vm.registrationUrl      = vm.baseUrl + '/register/'
  vm.forgotPasswordUrl    = vm.baseUrl + '/reset-password/'
  vm.accountInactiveUrl   = vm.baseUrl + '/account-inactive/'
  vm.confirmActivationUrl = vm.baseUrl + '/registered-successfully/'
  vm.retUrl = if $stateParams.retUrl then decodeURIComponent($stateParams.retUrl) else vm.baseUrl
  
  vm.$stateParams = $stateParams
  vm.loginErrors = 
    USERNAME_NONEXISTANT: false
    WRONG_PASSWORD: false
    SOCIAL_LOGIN_ERROR: false
  
  vm.socialLogin = (provider) ->
    # loading
    vm.loading = true
    # clear error flags
    vm.loginErrors.USERNAME_NONEXISTANT = false
    vm.loginErrors.WRONG_PASSWORD = false
    vm.loginErrors.SOCIAL_LOGIN_ERROR = false
    
    loginOptions =
      popup     : true
      connection: provider

    socialLogin(loginOptions)
      .then(loginSuccess)
      .catch(loginFailure)

  vm.login = ->
    # loading
    vm.loading = true
    # clear error flags
    vm.loginErrors.USERNAME_NONEXISTANT = false
    vm.loginErrors.WRONG_PASSWORD = false
    vm.loginErrors.SOCIAL_LOGIN_ERROR = false

    validateUsername(vm.username)
      .then (result) ->
        if result
          vm.loginErrors.USERNAME_NONEXISTANT = true
        else
          doLogin(vm.username, vm.currentPassword)
      .catch (err) ->
        vm.loginErrors.USERNAME_NONEXISTANT = false
        doLogin(vm.username, vm.currentPassword)
  
  validateUsername = (username) ->
    validator = if Utils.isEmail(username) then UserService.validateEmail else UserService.validateHandle
    validator username
      .then (res) ->
        res?.valid
  
  doLogin = (username, password) ->
    # Auth0 connection
    # handle: "LDAP", email: "TC-User-Database"
    conn = Utils.getLoginConnection vm.username

    loginOptions =
      username  : username
      password  : password
      connection: conn

    login(loginOptions)
      .then(loginSuccess)
      .catch(loginFailure)


  loginFailure = (error) ->
    $log.warn(error)
    vm.loading = false
    
    if error?.message?.toLowerCase() == 'account inactive'
      # redirect to the page to prompt activation 
      $log.info 'redirect to #{vm.confirmActivationUrl}'
      $window.location = vm.confirmActivationUrl
    else if error?.message?.toLowerCase() == 'user is not registered'
      vm.loginErrors.SOCIAL_LOGIN_ERROR = true
      $scope.$apply() # refreshing the screen
    else
      vm.loginErrors.WRONG_PASSWORD = true
      vm.password = ''
    
  loginSuccess = ->
    vm.loading = false
    
    # setup login event for analytics tracking
    Utils.setupLoginEventMetrics(vm.username)
    
    if $stateParams.return_to
      Utils.redirectTo Utils.generateZendeskReturnUrl($stateParams.return_to)
    else if vm.retUrl
      Utils.redirectTo Utils.generateReturnUrl(vm.retUrl)
    else
        $state.go 'home'

  init = ->
    if getToken(ZENDESK_JWT) && $stateParams.return_to
      Utils.redirectTo Utils.generateZendeskReturnUrl($stateParams.return_to)
    else if getToken(TC_JWT) && vm.retUrl
      Utils.redirectTo Utils.generateReturnUrl(vm.retUrl)
    else if ($stateParams.handle || $stateParams.email) && $stateParams.password
      id = $stateParams.handle || $stateParams.email
      pass = $stateParams.password
      loginOptions =
        username: id
        password: pass
        connection: Utils.getLoginConnection id
        
      login(loginOptions)
        .then(loginSuccess)
        .catch(loginFailure)
    else
      vm.init = true
    vm
  
  init()


TCLoginController.$inject = [
  '$log'
  '$scope'
  '$window'
  '$state'
  '$stateParams'
  'UserService'
  'Utils'
]

angular.module('accounts').controller 'TCLoginController', TCLoginController
