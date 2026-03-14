import { RuleTester } from '@typescript-eslint/rule-tester'
import vueParser from 'vue-eslint-parser'

import { noRestrictedClassesRule } from './noRestrictedClasses'

const ruleTester = new RuleTester()

const jsxRuleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
})

const vueRuleTester = new RuleTester({
  languageOptions: {
    parser: vueParser,
  },
})

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

// =============================================================================
// JSX Tests
// =============================================================================

jsxRuleTester.run('no-restricted-classes (JSX)', noRestrictedClassesRule as never, {
  valid: [
    {
      code: '<div className="flex p-4" />',
      options: [{ restrict: ['container'] }],
    },
  ],
  invalid: [
    {
      code: '<div className="flex container" />',
      options: [{ restrict: ['container'] }],
      errors: [{ messageId: 'restricted' }],
    },
    {
      code: '<div className={"text-green-500"} />',
      options: [{ restrict: [{ pattern: '^text-green-500$', fix: 'text-success' }] }],
      errors: [{ messageId: 'restricted' }],
      output: '<div className={"text-success"} />',
    },
  ],
})

// =============================================================================
// Vue Tests
// =============================================================================

vueRuleTester.run('no-restricted-classes (Vue)', noRestrictedClassesRule as never, {
  valid: [
    {
      code: '<template><div class="flex p-4"></div></template>',
      options: [{ restrict: ['container'] }],
    },
  ],
  invalid: [
    {
      code: '<template><div class="flex container"></div></template>',
      options: [{ restrict: ['container'] }],
      errors: [{ messageId: 'restricted' }],
    },
    {
      code: `<template><div :class="'text-green-500'"></div></template>`,
      options: [{ restrict: [{ pattern: '^text-green-500$', fix: 'text-success' }] }],
      errors: [{ messageId: 'restricted' }],
      output: `<template><div :class="'text-success'"></div></template>`,
    },
  ],
})
