import angular from 'angular'

(function() {
  'use strict'

  angular.module('accounts.directives').directive('toggleConfirmPassword', toggleConfirmPassword)

  function toggleConfirmPassword() {
    return {
      restrict: 'E',
      require: '^form',
      template: require('../../views/directives/toggle-confirm-password.directive')(),
      link: function(scope, element, attrs, formController) {
        var vm = scope.vm
        scope.confirmtPasswordDefaultPlaceholder = attrs.placeholder || 'confirmPassword'
        scope.confirmtPasswordPlaceholder = scope.confirmtPasswordDefaultPlaceholder
        vm.confirmPassword = ''
        vm.toggleShowLabel = 'Show'

        var confirmPasswordInput = element.find('input')[0]

        element.bind('click', function(event) {
          confirmPasswordInput.focus()
        })

        element.bind('keyup', function(event) {
          if (event.keyCode === 13) {
            confirmPasswordInput.blur()
          }
        })

        vm.onCPFocus = function(event) {
          scope.confirmPasswordPlaceholder = ''
          element.addClass('focus')
        }

        vm.onCPBlur = function(event) {
          var relatedTarget = angular.element(event.relatedTarget)
          element.removeClass('focus')

          // If you are blurring from the password input and clicking the checkbox
          if (relatedTarget.attr('type') === 'checkbox' && relatedTarget.attr('id') === 'toggleInputTypeBtn') {
            scope.confirmPasswordPlaceholder = ''
            confirmPasswordInput.focus()
          } else {
            if (vm.confirmPassword === '' || vm.confirmPassword === undefined) {
              scope.confirmPasswordPlaceholder = scope.confirmPasswordDefaultPlaceholder
              formController.confirmPassword.$setPristine()
            }
          }
        }

        vm.toggleTypeAttribute = function() {
          var $confirmPasswordInput = angular.element(confirmPasswordInput)

          if ($confirmPasswordInput.attr('type') === 'text') {
            $confirmPasswordInput.attr('type', 'password')
            vm.toggleShowLabel = 'Show'
          } else {
            $confirmPasswordInput.attr('type', 'text')
            vm.toggleShowLabel = 'Hide'
          }
        }
      }
    }
  }
})()
