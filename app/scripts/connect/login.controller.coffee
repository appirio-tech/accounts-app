'use strict'

{ TC_JWT, DOMAIN }   = require '../../../core/constants.js'
{ login }    = require '../../../core/auth.js'
{ getToken } = require '../../../core/token.js'
{ getLoginConnection } = require '../../../core/utils.js'
{ generateReturnUrl, redirectTo } = require '../../../core/url.js'

ConnectLoginController = (
  $scope
  $state
  $stateParams
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
    callLogin(vm.username, vm.password)

  loginFailure = (error) ->
    $scope.$apply ->
      vm.error   = true
      vm.loading = false

  loginSuccess = ->
    jwt = localStorage.getItem(TC_JWT)

    unless jwt
      vm.error = true
    else if vm.retUrl
      redirectTo generateReturnUrl(vm.retUrl)
    else
      $state.go 'home'

  callLogin = (id, password) ->
    vm.error   = false
    vm.loading = true

    options =
      username: id
      password: password
    
    login(options).then(loginSuccess, loginFailure)

  init = ->
    jwt = getToken(TC_JWT)

    { handle, email, password } = $stateParams

    if jwt && vm.retUrl
      redirectTo generateReturnUrl(vm.retUrl)
    else if (handle || email) && password
      callLogin(handle || email, password)
    else
      vm.init = true

    vm

  init()


ConnectLoginController.$inject = [
  '$scope'
  '$state'
  '$stateParams'
]

angular.module('accounts').controller 'ConnectLoginController', ConnectLoginController
