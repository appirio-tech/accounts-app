'use strict'

{ getSSOProvider, generateSSOUrl } = require '../../../core/auth.js'

SSOLoginController = (
  $log
  $state
  $stateParams
  $window
) ->
  
  vm               = this
  vm.loading       = false
  vm.success       = false
  vm.error         = ''
  vm.emailOrHandle = ''
  vm.org           = $stateParams.org
  vm.retUrl        = $stateParams.retUrl

  activate = ->
    if vm.org
      go()

  vm.submit = ->
    vm.loading = true

    success = (org) ->
      vm.org     = org
      vm.success = true
      go()

    failure = (err) ->
      vm.loading = false
      vm.error   = err.message

    getSSOProvider(vm.emailOrHandle)
      .then(success)
      .catch(failure)
  
  go = ->
    state = vm.retUrl
    unless state
      # TODO: home?
      state = $state.href 'home', {}, { absolute: true }
    callbackUrl = $state.href 'SSO_CALLBACK', {retUrl : state}, { absolute: true }
    authUrl = generateSSOUrl vm.org, callbackUrl
    $log.info 'redirecting to ' + authUrl
    $window.location.href = authUrl;
  
  activate()

  vm

SSOLoginController.$inject = [
  '$log'
  '$state'
  '$stateParams'
  '$window'
]

angular.module('accounts').controller 'SSOLoginController', SSOLoginController


