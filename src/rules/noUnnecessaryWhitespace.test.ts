import { RuleTester } from '@typescript-eslint/rule-tester'
import vueParser from 'vue-eslint-parser'

import { noUnnecessaryWhitespaceRule } from './noUnnecessaryWhitespace'

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

ruleTester.run('no-unnecessary-whitespace', noUnnecessaryWhitespaceRule as never, {
  valid: [
    { code: 'cn("p-4 mt-2 flex")' },
    { code: 'cn("p-4")' },
    { code: 'cn("")' },
  ],
  invalid: [
    {
      code: 'cn("p-4  mt-2")',
      errors: [{ messageId: 'unnecessaryWhitespace' }],
      output: 'cn("p-4 mt-2")',
    },
    {
      code: 'cn("  p-4 mt-2  ")',
      errors: [{ messageId: 'unnecessaryWhitespace' }],
      output: 'cn("p-4 mt-2")',
    },
    {
      code: 'cn("p-4    mt-2    flex")',
      errors: [{ messageId: 'unnecessaryWhitespace' }],
      output: 'cn("p-4 mt-2 flex")',
    },
    {
      code: 'clsx("  p-4  ")',
      errors: [{ messageId: 'unnecessaryWhitespace' }],
      output: 'clsx("p-4")',
    },
  ],
})

// =============================================================================
// JSX Tests
// =============================================================================

jsxRuleTester.run('no-unnecessary-whitespace (JSX)', noUnnecessaryWhitespaceRule as never, {
  valid: [
    { code: '<div className="flex p-4" />' },
    { code: '<div className={"flex p-4"} />' },
  ],
  invalid: [
    {
      code: '<div className="flex  p-4" />',
      errors: [{ messageId: 'unnecessaryWhitespace' }],
      output: '<div className="flex p-4" />',
    },
    {
      code: '<div className={"  flex  p-4  "} />',
      errors: [{ messageId: 'unnecessaryWhitespace' }],
      output: '<div className={"flex p-4"} />',
    },
  ],
})

// =============================================================================
// Vue Tests
// =============================================================================

vueRuleTester.run('no-unnecessary-whitespace (Vue)', noUnnecessaryWhitespaceRule as never, {
  valid: [
    { code: '<template><div class="flex p-4"></div></template>' },
    { code: `<template><div :class="'flex p-4'"></div></template>` },
  ],
  invalid: [
    {
      code: '<template><div class="flex  p-4"></div></template>',
      errors: [{ messageId: 'unnecessaryWhitespace' }],
      output: '<template><div class="flex p-4"></div></template>',
    },
    {
      code: `<template><div :class="'  flex  p-4  '"></div></template>`,
      errors: [{ messageId: 'unnecessaryWhitespace' }],
      output: `<template><div :class="'flex p-4'"></div></template>`,
    },
  ],
})
