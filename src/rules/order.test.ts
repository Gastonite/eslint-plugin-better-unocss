import { RuleTester } from '@typescript-eslint/rule-tester'
import vueParser from 'vue-eslint-parser'

import { orderRule } from './order'

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

ruleTester.run('order', orderRule as never, {
  valid: [
    { code: 'cn("p-4")' },
    { code: 'cn("")' },
    { code: 'otherFn("mt-2 p-4")' }, // not a tracked function
    // Expanded variant groups - correctly ordered, should not error
    {
      code: `cn\`
  flex
  p-4
  hover:(
    bg-red
    text-white
  )
\``,
    },
  ],
  invalid: [
    {
      code: 'cn("mt-2 p-4 flex")',
      errors: [{ messageId: 'unordered' }],
      output: 'cn("mt-2 flex p-4")',
    },
    {
      code: 'clsx("text-red-500 flex p-4")',
      errors: [{ messageId: 'unordered' }],
      output: 'clsx("flex p-4 text-red-500")',
    },
  ],
})

// =============================================================================
// JSX Tests
// =============================================================================

jsxRuleTester.run('order (JSX)', orderRule as never, {
  valid: [
    { code: '<div className="flex p-4" />' },
    { code: '<div className={"flex p-4"} />' },
  ],
  invalid: [
    {
      code: '<div className="p-4 flex" />',
      errors: [{ messageId: 'unordered' }],
      output: '<div className="flex p-4" />',
    },
    {
      code: '<div className={"text-red-500 flex"} />',
      errors: [{ messageId: 'unordered' }],
      output: '<div className={"flex text-red-500"} />',
    },
  ],
})

// =============================================================================
// Vue Tests
// =============================================================================

vueRuleTester.run('order (Vue)', orderRule as never, {
  valid: [
    { code: '<template><div class="flex p-4"></div></template>' },
    { code: `<template><div :class="'flex p-4'"></div></template>` },
  ],
  invalid: [
    {
      code: '<template><div class="p-4 flex"></div></template>',
      errors: [{ messageId: 'unordered' }],
      output: '<template><div class="flex p-4"></div></template>',
    },
    {
      code: `<template><div :class="'text-red-500 flex'"></div></template>`,
      errors: [{ messageId: 'unordered' }],
      output: `<template><div :class="'flex text-red-500'"></div></template>`,
    },
  ],
})
