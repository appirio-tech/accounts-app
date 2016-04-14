'use strict'

{ TC_JWT, DOMAIN }   = require '../../core/constants.js'
{ getToken } = require '../../core/token.js'

HomeController = (
  $log
  $state
  $window
) ->
  
  vm           = this
  vm.title     = 'Home'
  
  init = ->
    unless getToken(TC_JWT)
      $state.go 'MEMBER_LOGIN'
    else
      $window.location = 'https://www.' + DOMAIN + '/'
    vm
  
  init()
  

HomeController.$inject = [
  '$log'
  '$state'
  '$window'
]

angular.module('accounts').controller 'HomeController', HomeController
