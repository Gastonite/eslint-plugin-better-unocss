import { RuleTester } from '@typescript-eslint/rule-tester'
import vueParser from 'vue-eslint-parser'

import { noDuplicateClassesRule } from './noDuplicateClasses'

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

ruleTester.run('no-duplicate-classes', noDuplicateClassesRule as never, {
  valid: [
    { code: 'cn("p-4 mt-2 flex")' },
    { code: 'cn("p-4")' },
    { code: 'clsx("p-4", "mt-2")' },
    { code: 'cn`p-4 mt-2 flex`' },

    // Different variants = NOT duplicates
    { code: 'cn("flex hover:flex")' },
    { code: 'cn("text-red hover:text-red focus:text-red")' },
  ],
  invalid: [
    {
      code: 'cn("p-4 mt-2 p-4")',
      errors: [{ messageId: 'duplicate' }],
      output: 'cn("p-4 mt-2")',
    },
    {
      code: 'cn("p-4 p-4 p-4")',
      errors: [{ messageId: 'duplicate' }],
      output: 'cn("p-4")',
    },
    {
      code: 'clsx("flex flex items-center")',
      errors: [{ messageId: 'duplicate' }],
      output: 'clsx("flex items-center")',
    },
    {
      code: 'cn`p-4 mt-2 p-4`',
      errors: [{ messageId: 'duplicate' }],
      output: 'cn`p-4 mt-2`',
    },

    // Same variant = duplicate
    {
      code: 'cn("hover:flex hover:flex")',
      errors: [{ messageId: 'duplicate' }],
      output: 'cn("hover:flex")',
    },
  ],
})

// =============================================================================
// JSX Tests
// =============================================================================

jsxRuleTester.run('no-duplicate-classes (JSX)', noDuplicateClassesRule as never, {
  valid: [
    { code: '<div className="flex p-4" />' },
    { code: '<div className={"flex p-4"} />' },
  ],
  invalid: [
    {
      code: '<div className="flex flex p-4" />',
      errors: [{ messageId: 'duplicate' }],
      output: '<div className="flex p-4" />',
    },
    {
      code: '<div className={"flex flex p-4"} />',
      errors: [{ messageId: 'duplicate' }],
      output: '<div className={"flex p-4"} />',
    },
  ],
})

// =============================================================================
// Vue Tests
// =============================================================================

vueRuleTester.run('no-duplicate-classes (Vue)', noDuplicateClassesRule as never, {
  valid: [
    { code: '<template><div class="flex p-4"></div></template>' },
    { code: `<template><div :class="'flex p-4'"></div></template>` },
  ],
  invalid: [
    {
      code: '<template><div class="flex flex p-4"></div></template>',
      errors: [{ messageId: 'duplicate' }],
      output: '<template><div class="flex p-4"></div></template>',
    },
    {
      code: `<template><div :class="'flex flex p-4'"></div></template>`,
      errors: [{ messageId: 'duplicate' }],
      output: `<template><div :class="'flex p-4'"></div></template>`,
    },
  ],
})
