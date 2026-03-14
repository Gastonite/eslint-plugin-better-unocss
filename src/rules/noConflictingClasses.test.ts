import { RuleTester } from '@typescript-eslint/rule-tester'
import vueParser from 'vue-eslint-parser'

import { noConflictingClassesRule } from './noConflictingClasses'

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

ruleTester.run('no-conflicting-classes', noConflictingClassesRule as never, {
  valid: [
    // Different CSS properties
    { code: 'cn("flex items-center")' },
    { code: 'cn("p-4 m-2")' },
    { code: 'cn("text-red-500 bg-blue-500")' },

    // Different variants (no conflict)
    { code: 'cn("flex hover:block")' },
    { code: 'cn("md:flex lg:block")' },
    { code: 'cn("text-red-500 hover:text-blue-500")' },
  ],

  invalid: [
    // Same CSS property (display)
    {
      code: 'cn("flex block")',
      errors: [{ messageId: 'conflict' }],
      output: 'cn("block")',
    },
    {
      code: 'cn("hidden block")',
      errors: [{ messageId: 'conflict' }],
      output: 'cn("block")',
    },

    // Same CSS property (color)
    {
      code: 'cn("text-red-500 text-blue-500")',
      errors: [{ messageId: 'conflict' }],
      output: 'cn("text-blue-500")',
    },

    // Same CSS property (padding)
    {
      code: 'cn("p-4 p-8")',
      errors: [{ messageId: 'conflict' }],
      output: 'cn("p-8")',
    },

    // Same variant + same property = conflict
    {
      code: 'cn("hover:flex hover:block")',
      errors: [{ messageId: 'conflict' }],
      output: 'cn("hover:block")',
    },

    // Multiple conflicts
    {
      code: 'cn("flex block text-red-500 text-blue-500")',
      errors: [{ messageId: 'conflict' }, { messageId: 'conflict' }],
      output: 'cn("block text-blue-500")',
    },

    // TODO: Variant group with conflicts inside - not yet implemented
    // { code: 'cn("hover:(flex block)")' },
  ],
})

// =============================================================================
// JSX Tests
// =============================================================================

jsxRuleTester.run('no-conflicting-classes (JSX)', noConflictingClassesRule as never, {
  valid: [
    { code: '<div className="flex items-center" />' },
    { code: '<div className={"flex hover:block"} />' },
  ],
  invalid: [
    {
      code: '<div className="flex block" />',
      errors: [{ messageId: 'conflict' }],
      output: '<div className="block" />',
    },
    {
      code: '<div className={"text-red-500 text-blue-500"} />',
      errors: [{ messageId: 'conflict' }],
      output: '<div className={"text-blue-500"} />',
    },
  ],
})

// =============================================================================
// Vue Tests
// =============================================================================

vueRuleTester.run('no-conflicting-classes (Vue)', noConflictingClassesRule as never, {
  valid: [
    { code: '<template><div class="flex items-center"></div></template>' },
    { code: `<template><div :class="'flex hover:block'"></div></template>` },
  ],
  invalid: [
    {
      code: '<template><div class="flex block"></div></template>',
      errors: [{ messageId: 'conflict' }],
      output: '<template><div class="block"></div></template>',
    },
    {
      code: `<template><div :class="'text-red-500 text-blue-500'"></div></template>`,
      errors: [{ messageId: 'conflict' }],
      output: `<template><div :class="'text-blue-500'"></div></template>`,
    },
  ],
})
