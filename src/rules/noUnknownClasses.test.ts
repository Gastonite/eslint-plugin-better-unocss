import { RuleTester } from '@typescript-eslint/rule-tester'
import vueParser from 'vue-eslint-parser'

import { noUnknownClassesRule } from './noUnknownClasses'

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

ruleTester.run('no-unknown-classes', noUnknownClassesRule as never, {
  valid: [
    // Standard UnoCSS classes
    { code: 'cn("flex items-center")' },
    { code: 'cn("p-4 m-2 mt-4")' },
    { code: 'cn("text-red-500 bg-blue-500")' },

    // With variants
    { code: 'cn("hover:bg-red-500")' },
    { code: 'cn("md:flex lg:hidden")' },
    { code: 'cn("dark:text-white")' },

    // Empty or whitespace only
    { code: 'cn("")' },
    { code: 'cn("  ")' },

    // Object index with fallback - should not lint the fallback value
    { code: 'const x = sizes[props.size ?? "md"]' },
    { code: 'cn(sizes[props.size ?? "md"])' },
    { code: 'cn(obj[condition || "fallback"])' },
  ],

  invalid: [
    // Unknown class
    {
      code: 'cn("not-a-class")',
      errors: [{ messageId: 'unknown' }],
    },

    // Unknown class among valid ones
    {
      code: 'cn("flex typo-class p-4")',
      errors: [{ messageId: 'unknown' }],
    },

    // Variant with unknown class
    {
      code: 'cn("hover:not-exists")',
      errors: [{ messageId: 'unknown' }],
    },

    // Multiple unknown classes
    {
      code: 'cn("unknown-1 flex unknown-2")',
      errors: [{ messageId: 'unknown' }, { messageId: 'unknown' }],
    },

    // Typo in common class
    {
      code: 'cn("flx items-center")',
      errors: [{ messageId: 'unknown' }],
    },
  ],
})

// =============================================================================
// JSX Tests
// =============================================================================

jsxRuleTester.run('no-unknown-classes (JSX)', noUnknownClassesRule as never, {
  valid: [
    { code: '<div className="flex p-4" />' },
    { code: '<div className={"flex p-4"} />' },
    // Object index fallback
    { code: '<div className={sizes[props.size ?? "md"]} />' },
  ],
  invalid: [
    {
      code: '<div className="not-a-class" />',
      errors: [{ messageId: 'unknown' }],
    },
    {
      code: '<div className={"flx items-center"} />',
      errors: [{ messageId: 'unknown' }],
    },
  ],
})

// =============================================================================
// Vue Tests
// =============================================================================

vueRuleTester.run('no-unknown-classes (Vue)', noUnknownClassesRule as never, {
  valid: [
    { code: '<template><div class="flex p-4"></div></template>' },
    { code: `<template><div :class="'flex p-4'"></div></template>` },
    // Object index fallback
    { code: `<template><div :class="sizes[props.size ?? 'md']"></div></template>` },
  ],
  invalid: [
    {
      code: '<template><div class="not-a-class"></div></template>',
      errors: [{ messageId: 'unknown' }],
    },
    {
      code: `<template><div :class="'flx items-center'"></div></template>`,
      errors: [{ messageId: 'unknown' }],
    },
  ],
})
