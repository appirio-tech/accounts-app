'use strict'

{ logout } = require '../../core/auth.js'
{ generateReturnUrl, redirectTo } = require '../../core/url.js'

LogoutController = (
  $log
  $state
  $stateParams
) ->
  
  vm           = this
  vm.title     = 'Logout'
  vm.error     = false
  vm.loading   = false

  init = ->
    if $stateParams.message
      alert($stateParams.message)
    
    logout().then (res) ->
      $log.debug res
    
    if $stateParams.retUrl
      redirectTo generateReturnUrl(decodeURIComponent($stateParams.retUrl))
    else
      $state.go 'home'
    vm

  init()

LogoutController.$inject = [
  '$log'
  '$state'
  '$stateParams'
]

angular.module('accounts').controller 'LogoutController', LogoutController
