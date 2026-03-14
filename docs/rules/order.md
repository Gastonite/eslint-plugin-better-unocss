# better-unocss/order

Enforce consistent class ordering using the UnoCSS engine.

## Rule Details

This rule sorts CSS classes according to UnoCSS's internal rule order, ensuring consistent and predictable class ordering across your codebase.

### Examples

#### Invalid

```tsx
// Classes are not in UnoCSS order
cn`text-sm bg-red-500 flex px-4`

// Function call
cn('mt-2 p-4 flex')

// JSX
<div className="text-center flex items-center" />
```

#### Valid

```tsx
// Classes sorted by UnoCSS engine
cn`flex px-4 bg-red-500 text-sm`

// Function call
cn('flex p-4 mt-2')

// JSX
<div className="flex items-center text-center" />
```

## Options

```typescript
type OrderOptions = {
  selectors?: Selector[]
}
```

### `selectors`

Custom selectors to detect class strings. See [Selectors](../selectors.md) for details.

Default: Detects `cn`, `clsx`, `cva`, `tv`, `twMerge`, `class`, `className`, etc.

## How It Works

1. Loads your `uno.config.ts` via `@unocss/config`
2. Parses each class with UnoCSS to get its rule index
3. Sorts classes by rule index, then alphabetically for ties
4. Handles variant groups (`hover:(...)`) correctly

## Multiline Preservation

The rule preserves multiline formatting:

```tsx
// Before (wrong order)
cn`
  text-sm
  flex
  bg-red-500
`

// After (sorted, format preserved)
cn`
  flex
  bg-red-500
  text-sm
`
```

## Variant Groups

UnoCSS variant groups are handled as units:

```tsx
// Variant group stays together
cn`hover:(bg-red-500 text-white) flex`
// Sorted:
cn`flex hover:(bg-red-500 text-white)`
```

## When Not To Use It

If you prefer manual class ordering or use a different sorting strategy.

## Related Rules

- [no-duplicate-classes](./no-duplicate-classes.md)
- [enforce-line-wrapping](./enforce-line-wrapping.md)
