import { RuleTester } from '@typescript-eslint/rule-tester'
import vueParser from 'vue-eslint-parser'

import { enforceLineWrappingRule } from './enforceLineWrapping'

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

ruleTester.run('enforce-line-wrapping', enforceLineWrappingRule as never, {
  valid: [
    { code: 'cn`p-4`' },
    {
      code: 'cn`p-4 mt-2 flex`',
      options: [{ classesPerLine: 3 }],
    },
    {
      code: `cn\`
  p-4
  mt-2
  flex
\``,
      options: [{ classesPerLine: 1 }],
    },
    // Expanded variant group format is valid
    {
      code: `cn\`
  flex
  hover:(
    bg-red
    text-white
  )
\``,
      options: [{ classesPerLine: 1, expandVariantGroups: true }],
    },
  ],
  invalid: [
    {
      code: 'cn`p-4 mt-2`',
      options: [{ classesPerLine: 1 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  p-4
  mt-2
\``,
    },
    {
      code: 'cn`p-4 mt-2 flex items-center`',
      options: [{ classesPerLine: 2 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  p-4 mt-2
  flex items-center
\``,
    },

    // String converted to template literal (no tag)
    {
      code: `cn('flex items-center')`,
      options: [{ classesPerLine: 1 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn(\`
  flex
  items-center
\`)`,
    },

    // String converted to tagged template literal
    {
      code: `cn('flex items-center')`,
      options: [{ classesPerLine: 1, convertToTaggedTemplate: 'cn' }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn(cn\`
  flex
  items-center
\`)`,
    },

    // String with custom tag
    {
      code: `cn('p-4 mt-2 flex')`,
      options: [{ classesPerLine: 1, convertToTaggedTemplate: 'tw' }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn(tw\`
  p-4
  mt-2
  flex
\`)`,
    },

    // Re-indent: multiline but wrong indentation (simulates post-Vue reformat)
    {
      code: `      cn\`
      flex
      gap-1
    \``,
      options: [{ classesPerLine: 1 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `      cn\`
        flex
        gap-1
      \``,
    },

    // Tagged template - preserve existing tag, don't duplicate
    {
      code: 'cn`flex gap-1`',
      options: [{ classesPerLine: 1 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  flex
  gap-1
\``,
    },

    // Tagged template with convertToTaggedTemplate - existing tag takes precedence
    {
      code: 'cn`flex gap-1`',
      options: [{ classesPerLine: 1, convertToTaggedTemplate: 'tw' }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  flex
  gap-1
\``,
    },

    // Variant group without expansion (default) - variant group stays intact
    {
      code: 'cn`flex hover:(bg-red text-white outline-none)`',
      options: [{ classesPerLine: 1 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  flex
  hover:(bg-red text-white outline-none)
\``,
    },

    // Variant group with single class - no expansion needed
    {
      code: 'cn`flex hover:(bg-red)`',
      options: [{ classesPerLine: 1 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  flex
  hover:(bg-red)
\``,
    },

    // Variant group with expandVariantGroups: true - expand to multiline
    {
      code: 'cn`flex hover:(bg-red text-white outline-none)`',
      options: [{ classesPerLine: 1, expandVariantGroups: true }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  flex
  hover:(
    bg-red
    text-white
    outline-none
  )
\``,
    },

    // Variant group with classesPerLine: 2 + expandVariantGroups - expand when > 2 inner classes
    {
      code: 'cn`flex hover:(bg-red text-white outline-none)`',
      options: [{ classesPerLine: 2, expandVariantGroups: true }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  flex hover:(
    bg-red
    text-white
    outline-none
  )
\``,
    },

    // Variant group with classesPerLine: 2 - no expansion when <= 2 inner classes
    {
      code: 'cn`flex mt-2 gap-1 hover:(bg-red text-white)`',
      options: [{ classesPerLine: 2 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  flex mt-2
  gap-1 hover:(bg-red text-white)
\``,
    },
  ],
})

// =============================================================================
// indent Tests
// =============================================================================

ruleTester.run('enforce-line-wrapping (indent)', enforceLineWrappingRule as never, {
  valid: [],
  invalid: [
    // indent: 4 spaces
    {
      code: 'cn`flex gap-1`',
      options: [{ classesPerLine: 1, indent: 4 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
    flex
    gap-1
\``,
    },

    // indent: 'tab'
    {
      code: 'cn`flex gap-1`',
      options: [{ classesPerLine: 1, indent: 'tab' }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
\tflex
\tgap-1
\``,
    },
  ],
})

// =============================================================================
// printWidth Tests
// =============================================================================

ruleTester.run('enforce-line-wrapping (printWidth)', enforceLineWrappingRule as never, {
  valid: [
    // Under printWidth - no wrapping needed
    {
      code: 'cn`flex gap-1 items-center`',
      options: [{ printWidth: 80 }],
    },
  ],
  invalid: [
    // Exceeds printWidth - wrap
    {
      code: 'cn`flex gap-1 items-center justify-between`',
      options: [{ printWidth: 30 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  flex gap-1 items-center
  justify-between
\``,
    },
    // printWidth with classesPerLine - both apply
    {
      code: 'cn`flex gap-1 items-center justify-between`',
      options: [{ printWidth: 50, classesPerLine: 2 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  flex gap-1
  items-center justify-between
\``,
    },
  ],
})

// =============================================================================
// group Tests
// =============================================================================

ruleTester.run('enforce-line-wrapping (group)', enforceLineWrappingRule as never, {
  valid: [],
  invalid: [
    // group: 'newLine' (default) - variants on separate lines
    {
      code: 'cn`flex gap-1 hover:bg-red hover:text-white`',
      options: [{ classesPerLine: 2, group: 'newLine' }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  flex gap-1
  hover:bg-red hover:text-white
\``,
    },

    // group: 'emptyLine' - empty line between variant groups
    {
      code: 'cn`flex gap-1 hover:bg-red hover:text-white`',
      options: [{ classesPerLine: 2, group: 'emptyLine' }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  flex gap-1

  hover:bg-red hover:text-white
\``,
    },

    // group: 'never' - no grouping, just classesPerLine
    {
      code: 'cn`flex gap-1 hover:bg-red hover:text-white`',
      options: [{ classesPerLine: 2, group: 'never' }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  flex gap-1
  hover:bg-red hover:text-white
\``,
    },

    // Multiple variant groups
    {
      code: 'cn`flex gap-1 hover:bg-red hover:text-white focus:ring focus:ring-blue`',
      options: [{ classesPerLine: 2, group: 'emptyLine' }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  flex gap-1

  hover:bg-red hover:text-white

  focus:ring focus:ring-blue
\``,
    },

    // Stacked variants (sm:hover:)
    {
      code: 'cn`flex sm:flex-col sm:hover:bg-red`',
      options: [{ classesPerLine: 1, group: 'newLine' }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  flex
  sm:flex-col
  sm:hover:bg-red
\``,
    },
  ],
})

// =============================================================================
// JSX Tests - contextIsJs
// =============================================================================

jsxRuleTester.run('enforce-line-wrapping (JSX)', enforceLineWrappingRule as never, {
  valid: [
    // Single class - no wrapping needed
    { code: '<div className="flex" />' },
    // Under threshold
    {
      code: '<div className="flex gap-1" />',
      options: [{ classesPerLine: 2 }],
    },
    // JSX expression - under threshold
    {
      code: `<div className={'flex gap-1'} />`,
      options: [{ classesPerLine: 2 }],
    },
  ],
  invalid: [
    // JSX static attribute - error but NO fix (contextIsJs: false)
    {
      code: '<div className="flex gap-1" />',
      options: [{ classesPerLine: 1 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      // No output = no fix
    },

    // JSX expression - error WITH fix (contextIsJs: true)
    {
      code: `<div className={'flex gap-1'} />`,
      options: [{ classesPerLine: 1 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `<div className={\`
  flex
  gap-1
\`} />`,
    },

    // JSX template literal - already JS context, can fix
    {
      code: '<div className={`flex gap-1`} />',
      options: [{ classesPerLine: 1 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `<div className={\`
  flex
  gap-1
\`} />`,
    },

    // JSX tagged template - preserve existing tag, don't duplicate
    {
      code: '<div className={cn`flex gap-1`} />',
      options: [{ classesPerLine: 1 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `<div className={cn\`
  flex
  gap-1
\`} />`,
    },

    // JSX tagged template with convertToTaggedTemplate - existing tag takes precedence
    {
      code: '<div className={cn`flex gap-1`} />',
      options: [{ classesPerLine: 1, convertToTaggedTemplate: 'tw' }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `<div className={cn\`
  flex
  gap-1
\`} />`,
    },

    // JSX template literal with convertToTaggedTemplate - adds tag
    {
      code: '<div className={`flex gap-1`} />',
      options: [{ classesPerLine: 1, convertToTaggedTemplate: 'cn' }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `<div className={cn\`
  flex
  gap-1
\`} />`,
    },
  ],
})

// =============================================================================
// Vue Tests - contextIsJs
// =============================================================================

vueRuleTester.run('enforce-line-wrapping (Vue)', enforceLineWrappingRule as never, {
  valid: [
    // Single class - no wrapping needed
    { code: '<template><div class="flex"></div></template>' },
    // Under threshold
    {
      code: '<template><div class="flex gap-1"></div></template>',
      options: [{ classesPerLine: 2 }],
    },
  ],
  invalid: [
    // Vue static attribute - error but NO fix (contextIsJs: false)
    {
      code: '<template><div class="flex gap-1"></div></template>',
      options: [{ classesPerLine: 1 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      // No output = no fix
    },

    // Vue binding with string - error WITH fix (contextIsJs: true)
    {
      code: `<template><div :class="'flex gap-1'"></div></template>`,
      options: [{ classesPerLine: 1 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `<template><div :class="\`
  flex
  gap-1
\`"></div></template>`,
    },

    // Vue binding with template literal - should add tag when configured
    {
      code: `<template><div :class="\`flex gap-1\`"></div></template>`,
      options: [{ classesPerLine: 1, convertToTaggedTemplate: 'cn' }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `<template><div :class="cn\`
  flex
  gap-1
\`"></div></template>`,
    },

    // Vue binding with tagged template - preserve existing tag, don't duplicate
    {
      code: `<template><div :class="cn\`flex gap-1\`"></div></template>`,
      options: [{ classesPerLine: 1 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `<template><div :class="cn\`
  flex
  gap-1
\`"></div></template>`,
    },

    // Vue binding with tagged template + convertToTaggedTemplate - existing tag takes precedence
    {
      code: `<template><div :class="cn\`flex gap-1\`"></div></template>`,
      options: [{ classesPerLine: 1, convertToTaggedTemplate: 'tw' }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `<template><div :class="cn\`
  flex
  gap-1
\`"></div></template>`,
    },

    // Vue binding with string + convertToTaggedTemplate - adds tag
    {
      code: `<template><div :class="'flex gap-1'"></div></template>`,
      options: [{ classesPerLine: 1, convertToTaggedTemplate: 'cn' }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `<template><div :class="cn\`
  flex
  gap-1
\`"></div></template>`,
    },
  ],
})
