# eslint-plugin-better-unocss

[![npm version](https://img.shields.io/npm/v/eslint-plugin-better-unocss.svg)](https://www.npmjs.com/package/eslint-plugin-better-unocss)
[![license](https://img.shields.io/npm/l/eslint-plugin-better-unocss.svg)](./LICENSE)

ESLint plugin for UnoCSS with real engine sorting, tagged template literals, and powerful formatting rules.

## Why?

The official `@unocss/eslint-plugin` only detects class strings in `class="..."` attributes.

This plugin **also detects** classes in:

- Tagged templates: `` cn`flex items-center` ``
- Function calls: `cn('flex items-center')`
- Multiline strings with proper formatting

Plus additional rules for conflict detection, unknown class detection, and class restrictions.

Uses the **same UnoCSS sorting engine** as the official plugin.

## Installation

```bash
pnpm add -D eslint-plugin-better-unocss
```

## Quick Start

```typescript
// eslint.config.ts
import { configs } from 'eslint-plugin-better-unocss'

export default [
  configs.recommended,
]
```

## Rules

| Rule | Description | Fixable |
|------|-------------|---------|
| [`order`](./docs/rules/order.md) | Sort classes using UnoCSS engine | Yes |
| [`no-duplicate-classes`](./docs/rules/no-duplicate-classes.md) | Disallow duplicate classes | Yes |
| [`no-conflicting-classes`](./docs/rules/no-conflicting-classes.md) | Disallow classes that set the same CSS property | Yes |
| [`no-unknown-classes`](./docs/rules/no-unknown-classes.md) | Disallow classes not recognized by UnoCSS | No |
| [`no-restricted-classes`](./docs/rules/no-restricted-classes.md) | Disallow specific class patterns | Yes |
| [`no-unnecessary-whitespace`](./docs/rules/no-unnecessary-whitespace.md) | Normalize whitespace in class strings | Yes |
| [`enforce-line-wrapping`](./docs/rules/enforce-line-wrapping.md) | Enforce consistent multiline formatting | Yes |

## Configuration

### `configs.recommended`

Recommended config with sensible defaults:

```typescript
{
  // Stylistic (warn)
  'better-unocss/order': 'warn',
  'better-unocss/no-unnecessary-whitespace': 'warn',

  // Correctness (error)
  'better-unocss/no-conflicting-classes': 'error',
  'better-unocss/no-duplicate-classes': 'error',
  'better-unocss/no-unknown-classes': 'error',
}
```

### Manual Configuration

```typescript
// eslint.config.ts
import { rules } from 'eslint-plugin-better-unocss'

export default [
  {
    plugins: {
      'better-unocss': { rules },
    },
    rules: {
      'better-unocss/order': 'error',
      'better-unocss/no-duplicate-classes': 'error',
      'better-unocss/no-conflicting-classes': 'error',
      'better-unocss/no-unknown-classes': 'error',
      'better-unocss/no-unnecessary-whitespace': 'error',
      'better-unocss/no-restricted-classes': ['error', {
        restrict: ['hidden'],
      }],
      'better-unocss/enforce-line-wrapping': ['error', {
        classesPerLine: 1,
        printWidth: 80,
        indent: 2,
        group: 'newLine',
      }],
    },
  },
]
```

## Features

### Tagged Template Literals

```tsx
// Fully supported
cn`flex items-center gap-4`
tw`hover:bg-red-500 focus:ring`
clsx`p-4 mt-2`
```

### Function Calls

```tsx
// All arguments are linted
cn('flex items-center')
clsx('p-4', condition && 'mt-2')
cva('base-class', { variants: { size: { sm: 'text-sm' } } })
```

### Variant Groups

```tsx
// Handled correctly
cn`hover:(bg-red-500 text-white) dark:(bg-gray-800)`
```

### Multiline Formatting

```tsx
// Before
cn`flex items-center justify-between gap-4 px-8 py-4`

// After (with enforce-line-wrapping)
cn`
  flex
  items-center
  justify-between
  gap-4
  px-8
  py-4
`
```

### Conflict Detection

```tsx
// Error: Conflicting classes for display: flex, block
cn`flex block items-center`

// OK: Different variants = no conflict
cn`flex hover:block`
```

## Framework Support

| Framework | Status |
|-----------|--------|
| ES/JS/TS | Supported |
| Vue SFC | Supported |
| JSX/TSX | Supported |

### Vue Example

```vue
<template>
  <!-- Static class -->
  <div class="flex items-center" />

  <!-- Dynamic binding -->
  <div :class="'flex items-center'" />
  <div :class="{ 'flex': true, 'hidden': isHidden }" />
</template>

<script setup>
// Script expressions
const classes = cn`flex items-center`
</script>
```

### JSX Example

```tsx
// Static className
<div className="flex items-center" />

// Expression
<div className={cn`flex items-center`} />
<div className={cn('flex', condition && 'hidden')} />
```

## Supported Callees

Out of the box, the plugin detects:

- `cn`, `clsx`, `classnames`, `cva`, `tv`
- `twMerge`, `twJoin`, `cc`
- `class`, `className` attributes

Custom selectors can be configured per-rule.

## Conflicts with Official Plugin

If you use both plugins, disable the official order rule:

```typescript
{
  rules: {
    'unocss/order': 'off',
  }
}
```

Both use the same UnoCSS engine, so keeping both causes circular fixes.

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  BetterUnocssRules,
  OrderOptions,
  EnforceLineWrappingOptions,
  NoRestrictedClassesOptions,
  // ... other option types
} from 'eslint-plugin-better-unocss'
```

## License

[MIT](./LICENSE)

## Credits

Inspired by [eslint-plugin-better-tailwindcss](https://github.com/schoero/eslint-plugin-better-tailwindcss).
