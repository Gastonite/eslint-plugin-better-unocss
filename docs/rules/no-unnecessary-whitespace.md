# better-unocss/no-unnecessary-whitespace

Disallow unnecessary whitespace in class strings.

## Rule Details

This rule normalizes whitespace in class strings by:
- Removing leading/trailing whitespace
- Collapsing multiple spaces to single spaces
- Optionally collapsing multiline to single line

### Examples

#### Invalid

```tsx
// Multiple spaces
cn('flex   px-4  text-sm')

// Leading/trailing whitespace
cn('  flex px-4  ')

// Inconsistent spacing
<div className="flex    items-center   gap-4" />
```

#### Valid

```tsx
cn('flex px-4 text-sm')

cn('flex px-4')

<div className="flex items-center gap-4" />
```

## Options

```typescript
type NoUnnecessaryWhitespaceOptions = {
  selectors?: Selector[]
  allowMultiline?: boolean
}
```

### `selectors`

Custom selectors to detect class strings. See [Selectors](../selectors.md) for details.

### `allowMultiline`

Type: `boolean`
Default: `true`

When `true`, multiline class strings are allowed and not collapsed.

When `false`, multiline class strings are collapsed to a single line.

#### `allowMultiline: true` (default)

```tsx
// Valid - multiline allowed
cn`
  flex
  px-4
  text-sm
`
```

#### `allowMultiline: false`

```tsx
// Invalid - multiline not allowed
cn`
  flex
  px-4
`

// Fixed to single line
cn`flex px-4`
```

## Autofix

This rule automatically normalizes whitespace:

```tsx
// Before
cn('flex   px-4    mt-2  ')

// After (autofix)
cn('flex px-4 mt-2')
```

## When Not To Use It

If you have specific whitespace requirements or use a formatter that handles this.

## Related Rules

- [enforce-line-wrapping](./enforce-line-wrapping.md)
