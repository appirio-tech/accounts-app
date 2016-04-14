'use strict'

`import { isUrl, encodeParams } from '../../core/utils.js'`

LoginController = (
  $log
  $state
  $stateParams
  Constants
) ->
  
  vm = this
  
  isConnectLogin = ->
    # checking with app parameter
    app = $stateParams.app
    if app
      $log.info 'app: '+app
      return app.toLowerCase() == 'connect'
    
    # checking with return url
    retUrl = $stateParams.retUrl
    if retUrl && isUrl retUrl
      parser = document?.createElement 'a'
      if parser
        parser.href = retUrl
        return parser.hostname.toLowerCase().startsWith('connect.')
    
    false
  
  init = ->
    if isConnectLogin()
      $state.go 'CONNECT_LOGIN', encodeParams $stateParams
    else
      $state.go 'MEMBER_LOGIN', encodeParams $stateParams
    vm
  
  init()


LoginController.$inject = [
  '$log'
  '$state'
  '$stateParams'
  'Constants'
]

angular.module('accounts').controller 'LoginController', LoginController
