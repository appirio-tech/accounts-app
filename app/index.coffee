require 'babel-polyfill'

scripts    = document.getElementsByTagName 'script'
src        = scripts[scripts.length - 1].getAttribute 'src'
publicPath = src.substr 0, src.lastIndexOf('/' + 1)

__webpack_public_path__ = publicPath

require 'angular'
require '@uirouter/angularjs'
require '@uirouter/angularjs/lib/legacy/stateEvents'
require 'angular-messages'
require 'auth0-js'

require './3rdparty/angular-auth0.js'
require 'appirio-tech-ng-iso-constants'
require 'angucomplete-alt'
require 'angular-animate'
require 'angular-aria'
require 'angular-material'

require './app.directives'
require './app.react'
require './app.module'
require './app-config'
require './app-run'

require 'appirio-tech-ng-ui-components'

require('../node_modules/angucomplete-alt/angucomplete-alt.css')

requireContextFiles = (files) ->
  paths = files.keys()

  for path in paths
    files path

requireContextFiles require.context './styles/', true, /^(.*\.(scss$))[^.]*$/igm
requireContextFiles require.context './scripts/', true, /^(.*\.(coffee$))[^.]*$/igm
requireContextFiles require.context './scripts/', true, /^(.*\.(js$))[^.]*$/igm
