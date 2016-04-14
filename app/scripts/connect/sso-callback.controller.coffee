'use strict'

{ TC_JWT }   = require '../../../core/constants.js'
{ login }    = require '../../../core/auth.js'
{ setToken } = require '../../../core/token.js'

SSOCallbackController = (
  $log
  $state
  $stateParams
  Utils) ->
  
  vm = this
  vm.retUrl = encodeURIComponent($stateParams.retUrl)
  vm.$stateParams = $stateParams
  vm.error = null
  
  vm.hasError = ->
    !!vm.error
  
  init = ->
    status = $stateParams.status
    message = decodeURIComponent($stateParams.message)
    if status && status > 200 
      $log.debug 'status:'+status
      $log.debug 'message:'+message
      if status >= 500
        $log.error status + ', ' + message
        vm.error = 'Unexpected error occurred.'
      else if status >= 400
        vm.error = message
      else
        $log.warn status + ', ' + message
      return vm
  
    setToken(TC_JWT, $stateParams.userJWTToken)
    
    error = Utils.redirectTo Utils.generateReturnUrl($stateParams.retUrl)
    if error
      vm.error = 'Invalid URL is assigned to the return-URL.'
    vm
  
  init()

SSOCallbackController.$inject = [
  '$log'
  '$state'
  '$stateParams'
  'Utils'
]

angular.module('accounts').controller 'SSOCallbackController', SSOCallbackController
