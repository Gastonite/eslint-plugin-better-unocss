# better-unocss/enforce-line-wrapping

Enforce consistent line wrapping in class strings.

## Rule Details

This rule enforces multiline formatting for class strings based on:
- Maximum classes per line
- Maximum line width (print width)
- Variant grouping

### Examples

#### Invalid

```tsx
// Too many classes on one line (classesPerLine: 1)
cn`flex px-4 text-sm bg-red-500`

// Exceeds print width
cn`flex items-center justify-between gap-4 px-8 py-4 bg-gradient-to-r`
```

#### Valid

```tsx
// One class per line
cn`
  flex
  px-4
  text-sm
  bg-red-500
`

// Respects print width
cn`
  flex items-center justify-between
  gap-4 px-8 py-4
  bg-gradient-to-r
`
```

## Options

```typescript
type EnforceLineWrappingOptions = {
  selectors?: Selector[]
  classesPerLine?: number
  printWidth?: number
  indent?: number | 'tab'
  group?: 'newLine' | 'emptyLine' | 'never'
  convertToTaggedTemplate?: string
}
```

### `selectors`

Custom selectors to detect class strings. See [Selectors](../selectors.md) for details.

### `classesPerLine`

Type: `number`
Default: `0` (disabled)

Maximum number of classes per line. Set to `0` to disable this constraint.

```tsx
// classesPerLine: 1
cn`
  flex
  px-4
  mt-2
`

// classesPerLine: 2
cn`
  flex px-4
  mt-2 gap-4
`

// classesPerLine: 3
cn`
  flex px-4 mt-2
  gap-4 items-center justify-between
`
```

### `printWidth`

Type: `number`
Default: `80`

Maximum line width before wrapping. Set to `0` to disable this constraint.

```tsx
// printWidth: 40
cn`
  flex items-center
  justify-between gap-4
`

// printWidth: 80
cn`
  flex items-center justify-between gap-4 px-8 py-4
`
```

### `indent`

Type: `number | 'tab'`
Default: `2`

Indentation for wrapped lines.

```tsx
// indent: 2 (default)
cn`
  flex
  px-4
`

// indent: 4
cn`
    flex
    px-4
`

// indent: 'tab'
cn`
	flex
	px-4
`
```

### `group`

Type: `'newLine' | 'emptyLine' | 'never'`
Default: `'newLine'`

How to separate groups of classes with different variant prefixes.

#### `group: 'newLine'` (default)

Classes with different variants start on a new line:

```tsx
cn`
  flex gap-1
  hover:bg-red hover:text-white
  focus:ring focus:ring-blue
`
```

#### `group: 'emptyLine'`

Empty line between variant groups:

```tsx
cn`
  flex gap-1

  hover:bg-red hover:text-white

  focus:ring focus:ring-blue
`
```

#### `group: 'never'`

No grouping, just respect `classesPerLine` and `printWidth`:

```tsx
// group: 'never', classesPerLine: 2
cn`
  flex gap-1
  hover:bg-red hover:text-white
  focus:ring focus:ring-blue
`
```

### `convertToTaggedTemplate`

Type: `string`
Default: `undefined`

When converting a string literal to multiline, wrap it with this tagged template tag.

```tsx
// convertToTaggedTemplate: 'cn'

// Before
cn('flex px-4 mt-2')

// After (autofix)
cn(cn`
  flex
  px-4
  mt-2
`)
```

## Autofix Behavior

### String Literals in JS Context

String literals inside JS expressions can be converted to template literals:

```tsx
// Before
cn('flex gap-1')

// After
cn(`
  flex
  gap-1
`)
```

### String Literals in HTML Context

String literals in HTML attributes (like `class="..."`) cannot be converted to template literals and will only report an error without autofix:

```html
<!-- Reports error but no autofix -->
<div class="flex gap-1 items-center justify-between">
```

### Template Literals

Template literals can always be fixed:

```tsx
// Before
cn`flex gap-1 items-center`

// After
cn`
  flex
  gap-1
  items-center
`
```

## Variant Detection

The rule detects variant prefixes:

| Class | Variant Prefix |
|-------|----------------|
| `flex` | (none) |
| `hover:bg-red` | `hover:` |
| `sm:hover:text-white` | `sm:hover:` |
| `dark:md:flex` | `dark:md:` |

Classes with the same variant prefix are grouped together.

## When Not To Use It

- If you prefer single-line class strings
- If you use a formatter like Prettier that handles line wrapping

## Related Rules

- [no-unnecessary-whitespace](./no-unnecessary-whitespace.md)
- [order](./order.md)
