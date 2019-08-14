import angular from 'angular'

(function() {
  'use strict'

  angular.module('accounts.directives').directive('togglePasswordWithTips', togglePasswordWithTips)

  togglePasswordWithTips.$inject = ['$timeout']

  function togglePasswordWithTips($timeout) {
    return {
      restrict: 'E',
      require: '^form',
      template: require('../../views/directives/toggle-password-with-tips.directive')(),
      link: function(scope, element, attrs, formController) {
        var vm = scope.vm
        vm.defaultPlaceholder = attrs.placeholder || ''
        vm.placeholder        = vm.defaultPlaceholder
        vm.password           = ''
        vm.toggleShowLabel    = 'Show'

        var passwordInput = element.find('input')[0]

        element.bind('click', function(event) {
          passwordInput.focus()
        })

        element.bind('keyup', function(event) {
          if (event.keyCode === 13) {
            passwordInput.blur()
          }
        })

        vm.onFocus = function(event) {
          vm.passwordFocus = true
          vm.placeholder = ''
          element.addClass('focus')
        }

        vm.onBlur = function(event) {
          var relatedTarget = angular.element(event.relatedTarget)
          element.removeClass('focus')

          // If you are blurring from the password input and clicking the checkbox
          if (relatedTarget.attr('type') === 'checkbox' && relatedTarget.attr('id') === 'toggleInputTypeBtn') {
            vm.passwordFocus = true
            vm.placeholder = ''
            passwordInput.focus()
          } else {
            // If you are blurring from the password input and clicking anywhere but the checkbox
            $timeout(function () {
              vm.passwordFocus = false
            }, 100)

            if (vm.password === '' || vm.password === undefined) {
              vm.placeholder = vm.defaultPlaceholder
              formController.password.$setPristine()
            }
          }
        }

        vm.toggleInputType = function() {
          var $passwordInput = angular.element(passwordInput)

          if ($passwordInput.attr('type') === 'text') {
            $passwordInput.attr('type', 'password')
            vm.toggleShowLabel = 'Show'
          } else {
            $passwordInput.attr('type', 'text')
            vm.toggleShowLabel = 'Hide'
          }
        }
      }
    }
  }
})()
