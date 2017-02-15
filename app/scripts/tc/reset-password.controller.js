import angular from 'angular'
import { login, sendResetEmail, resetPassword } from '../../../core/auth.js'
import { DOMAIN } from '../../../core/constants.js'

(function() {
  'use strict'

  angular.module('accounts').controller('TCResetPasswordController', TCResetPasswordController)

  TCResetPasswordController.$inject = ['$scope', '$state', '$stateParams', '$location', 'UserService']

  function TCResetPasswordController($scope, $state, $stateParams, $location, UserService) {
    var vm = this
    vm.token = $stateParams.token
    vm.handle = $stateParams.handle
    vm.defaultPlaceholder = 'Enter New Password'

    vm.clearState = function() {
      vm.resetTokenSent = false
      vm.resetTokenFailed = false
      vm.alreadySent = false
      vm.emailNotFound = false
      vm.resetError = false
    }
    vm.clearState()

    vm.sendLink = function() {
      if (vm.generateTokenForm.$valid) {
        vm.loading = true
        var resetPasswordUrlPrefix = $state.href('home', {}, { absolute: true }) + '#!' + $state.href('MEMBER_RESET_PASSWORD')
        sendResetEmail(vm.email, resetPasswordUrlPrefix).then(
          function() {
            console.log('success')
            $scope.$apply(function() {
              vm.resetTokenSent = true
              vm.loading = false
            })
          },
          function(err) {
            $scope.$apply(function() {
              if (err.status == 400)
                vm.alreadySent = true
              else if (err.status == 404)
                vm.emailNotFound = true

              vm.resetTokenFailed = true
              vm.loading = false
            })
          }
        )
      }
    }

    vm.resetPassword = function() {
      vm.loading = true
      if (vm.resetPasswordForm.$valid) {
        resetPassword(vm.handle, vm.token, vm.password).then(
          function() {
            var loginOptions = {
              username  : vm.handle,
              password  : vm.password
            }

            login(loginOptions).then(
              function() {
                $location.url('https://www.' + DOMAIN + '/my-dashboard')
              },
              function(err) {
                $state.go('MEMBER_LOGIN', { 'notifyReset': true })
              }
            )
            // $state.go('MEMBER_LOGIN', { 'notifyReset': true })
          },
          function(err) {
            $scope.$apply(function() {
              vm.resetFailed = true
              vm.loading = false
            })
          }
        )
      }
    }
  }
})()
