import { RuleTester } from '@typescript-eslint/rule-tester'
import { noRestrictedClassesRule } from './noRestrictedClasses'



const ruleTester = new RuleTester()

ruleTester.run('no-restricted-classes', noRestrictedClassesRule as never, {
  valid: [
    // No restrictions configured
    { code: 'cn("flex items-center")' },

    // Class not matching restriction
    {
      code: 'cn("flex items-center")',
      options: [{ restrict: ['container'] }],
    },

    // Regex not matching
    {
      code: 'cn("text-blue-500")',
      options: [{ restrict: ['^text-green-.*$'] }],
    },
  ],

  invalid: [
    // Simple string restriction
    {
      code: 'cn("flex container p-4")',
      options: [{ restrict: ['container'] }],
      errors: [{ messageId: 'restricted' }],
    },

    // Regex restriction
    {
      code: 'cn("text-green-500 p-4")',
      options: [{ restrict: ['^text-green-.*$'] }],
      errors: [{ messageId: 'restricted' }],
    },

    // Multiple matches
    {
      code: 'cn("text-green-500 bg-green-500")',
      options: [{ restrict: ['.*green.*'] }],
      errors: [{ messageId: 'restricted' }, { messageId: 'restricted' }],
    },

    // Object restriction with custom message
    {
      code: 'cn("text-green-500")',
      options: [{
        restrict: [{
          pattern: '^text-green-500$',
          message: 'Use text-success instead',
        }],
      }],
      errors: [{ messageId: 'restricted', data: { message: 'Use text-success instead' } }],
    },

    // Object restriction with fix
    {
      code: 'cn("text-green-500")',
      options: [{
        restrict: [{
          pattern: '^text-green-500$',
          message: 'Use text-success instead',
          fix: 'text-success',
        }],
      }],
      errors: [{ messageId: 'restricted' }],
      output: 'cn("text-success")',
    },

    // Fix with capture groups
    {
      code: 'cn("text-green-500")',
      options: [{
        restrict: [{
          pattern: '^(text|bg)-green-500$',
          message: 'Use $1-success instead',
          fix: '$1-success',
        }],
      }],
      errors: [{ messageId: 'restricted' }],
      output: 'cn("text-success")',
    },

    // Multiple classes with fix
    {
      code: 'cn("text-green-500 bg-green-500 p-4")',
      options: [{
        restrict: [{
          pattern: '^(text|bg)-green-500$',
          fix: '$1-success',
        }],
      }],
      errors: [{ messageId: 'restricted' }, { messageId: 'restricted' }],
      output: 'cn("text-success bg-success p-4")',
    },

    // Remove class with empty fix
    {
      code: 'cn("flex container p-4")',
      options: [{
        restrict: [{
          pattern: '^container$',
          message: 'container is not allowed',
          fix: '',
        }],
      }],
      errors: [{ messageId: 'restricted' }],
      output: 'cn("flex p-4")',
    },

    // Mixed string and object restrictions
    {
      code: 'cn("container text-green-500")',
      options: [{
        restrict: [
          'container',
          { pattern: '^text-green-500$', fix: 'text-success' },
        ],
      }],
      errors: [{ messageId: 'restricted' }, { messageId: 'restricted' }],
      output: 'cn("container text-success")',
    },
  ],
})
