import angular from 'angular'

(function () {
    'use strict'

    angular.module('accounts.directives').directive('validConfirmPassword', validConfirmPassword)

    function validConfirmPassword() {
        return {
            require: 'ngModel',
            link: function (scope, element, attrs, ctrl) {
                ctrl.$validators.validConfirmPassword = function (modelValue, viewValue) {
                    if (modelValue === ctrl.$$parentForm.password.$modelValue) {
                        return true
                    }
                    return false
                }
            }
        }
    }
})()
