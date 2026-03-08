# eslint-plugin-better-unocss

ESLint plugin for UnoCSS with tagged template literal support and real UnoCSS engine sorting.

## Why?

The official `@unocss/eslint-plugin` has limitations:
- No support for tagged template literals (`cn`...``)
- No multiline formatting preservation
- No support for function calls like `cn('...')`

This plugin solves all of these while using the **same UnoCSS sorting engine** as the official plugin.

## Features

- **UnoCSS engine sorting** — Uses `@unocss/core` for identical ordering to the official plugin
- **Tagged template literals** — Supports `cn`...``, `tw`...``, etc.
- **Function calls** — Supports `cn('...')`, `clsx('...')`, `cva('...')`, etc.
- **Multiline preservation** — Maintains one-class-per-line formatting
- **Variant groups** — Handles `hover:(bg-red-500 text-white)` correctly
- **Additional rules** — Duplicate detection, whitespace normalization, line wrapping

## Installation

```bash
pnpm add -D eslint-plugin-better-unocss
```

## Usage

```typescript
// eslint.config.ts
import { configs } from 'eslint-plugin-better-unocss'

export default [
  // Default: only order rule
  configs.flat,

  // Or strict: all rules enabled
  configs.strict,

  // Disable official plugin order (same engine, redundant)
  {
    rules: {
      'unocss/order': 'off',
    },
  },
]
```

## Rules

### `better-unocss/order` (enabled by default)

Sorts classes using the UnoCSS engine.

```typescript
// Before
cn`text-sm bg-red-500 flex px-4`

// After
cn`text-sm px-4 bg-red-500 flex`
```

Supports:
- Tagged templates: `cn`...``, `tw`...``, `clsx`...``, `classnames`...``
- Function calls: `cn('...')`, `clsx('...')`, `classnames('...')`, `twMerge('...')`, `cva('...')`

Options:
```typescript
{
  'better-unocss/order': ['error', {
    tags: ['tw', 'cn', 'clsx', 'classnames'],
    functions: ['cn', 'clsx', 'classnames', 'twMerge', 'cva'],
  }]
}
```

### `better-unocss/no-duplicate-classes` (opt-in)

Removes duplicate classes.

```typescript
// Before
cn`flex px-4 flex text-sm`

// After
cn`flex px-4 text-sm`
```

### `better-unocss/no-unnecessary-whitespace` (opt-in)

Normalizes whitespace in class strings.

```typescript
// Before
cn('flex   px-4  text-sm')

// After
cn('flex px-4 text-sm')
```

Options:
```typescript
{
  'better-unocss/no-unnecessary-whitespace': ['error', {
    allowMultiline: true, // default
  }]
}
```

### `better-unocss/enforce-line-wrapping` (opt-in)

Forces consistent line wrapping in tagged templates.

```typescript
// Before
cn`flex px-4 text-sm bg-red-500`

// After (classesPerLine: 1)
cn`
  flex
  px-4
  text-sm
  bg-red-500
`
```

Options:
```typescript
{
  'better-unocss/enforce-line-wrapping': ['error', {
    classesPerLine: 1,
    indent: '  ',
  }]
}
```

## Configs

### `configs.flat` (default)

Only enables the `order` rule:
```typescript
{
  'better-unocss/order': 'error',
}
```

### `configs.strict`

Enables all rules:
```typescript
{
  'better-unocss/order': 'error',
  'better-unocss/no-duplicate-classes': 'error',
  'better-unocss/no-unnecessary-whitespace': 'error',
  'better-unocss/enforce-line-wrapping': ['error', { classesPerLine: 1 }],
}
```

## How It Works

### UnoCSS Engine Integration

The plugin uses `synckit` to run the async UnoCSS engine synchronously in ESLint:

1. Loads your `uno.config.ts` via `@unocss/config`
2. Creates a `UnoGenerator` via `@unocss/core`
3. Parses each class token to get its rule order
4. Sorts by rule order, then alphabetically
5. Handles variant groups (`hover:(...)`) via `parseVariantGroup`/`collapseVariantGroup`

This ensures **identical sorting** to the official `@unocss/eslint-plugin`.

### Multiline Preservation

When fixing multiline tagged templates:
1. Normalizes content (collapse whitespace)
2. Sorts with UnoCSS engine
3. Parses result keeping variant groups as single tokens
4. Formats with one class per line, preserving indentation

### Variant Groups

UnoCSS variant groups like `hover:(bg-red-500 text-white)` are:
1. Expanded by UnoCSS for sorting
2. Collapsed back after sorting
3. Kept as single tokens in multiline formatting

## Conflicts with Official Plugin

If you use both plugins, disable the official `order` rule:

```typescript
{
  rules: {
    'unocss/order': 'off', // Use better-unocss/order instead
  }
}
```

Both use the same UnoCSS engine, so keeping both causes circular fixes.

## Limitations

- **Function calls with multiple args**: `cn('a', 'b', 'c')` — Each arg has one class, nothing to sort
- **Dynamic classes**: `cn(condition ? 'a' : 'b')` — Cannot analyze runtime values
- **Template expressions**: `cn`${foo} bar`` — Skipped (has expressions)

## License

MIT
