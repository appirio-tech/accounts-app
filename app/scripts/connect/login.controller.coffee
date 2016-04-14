'use strict'

{ TC_JWT, DOMAIN }   = require '../../../core/constants.js'
{ login }    = require '../../../core/auth.js'
{ getToken } = require '../../../core/token.js'

ConnectLoginController = (
  $log
  $scope
  $state
  $stateParams
  Utils
) ->
  
  vm           = this
  vm.username  = ''
  vm.password  = ''
  vm.error     = false
  vm.loading   = false
  vm.init      = false
  vm.$stateParams = $stateParams
  
  vm.baseUrl = "https://connect.#{DOMAIN}"
  vm.registrationUrl   = vm.baseUrl + '/registration'
  vm.forgotPasswordUrl = vm.baseUrl + '/forgot-password'
  vm.retUrl = if $stateParams.retUrl then decodeURIComponent($stateParams.retUrl) else vm.baseUrl  

  vm.submit = ->
    vm.error   = false
    vm.loading = true

    # Auth0 connection
    # handle: "LDAP", email: "TC-User-Database"
    conn = Utils.getLoginConnection vm.username

    options =
      connection: conn
      username: vm.username 
      password: vm.password
    
    login(options).then(loginSuccess, loginFailure)

  loginFailure = (error) ->
    $scope.$apply ->
      vm.error   = true
      vm.loading = false

  loginSuccess = ->
    jwt = localStorage.getItem(TC_JWT)

    unless jwt
      vm.error = true
    else if vm.retUrl
      Utils.redirectTo Utils.generateReturnUrl(vm.retUrl)
    else
      $state.go 'home'
    
  init = ->
    jwt = getToken(TC_JWT)
    if jwt && vm.retUrl
      Utils.redirectTo Utils.generateReturnUrl(vm.retUrl)
    else if ($stateParams.handle || $stateParams.email) && $stateParams.password
      id = $stateParams.handle || $stateParams.email
      pass = $stateParams.password
      options =
        connection: Utils.getLoginConnection id
        username: id
        password: pass
      
      login(options)
        .then(loginSuccess)
        .catch(loginFailure)
    else
      vm.init = true
    vm

  init()


ConnectLoginController.$inject = [
  '$log'
  '$scope'
  '$state'
  '$stateParams'
  'Utils'
]

angular.module('accounts').controller 'ConnectLoginController', ConnectLoginController
