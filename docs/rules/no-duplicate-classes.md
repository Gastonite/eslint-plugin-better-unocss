# better-unocss/no-duplicate-classes

Disallow duplicate CSS classes.

## Rule Details

This rule detects and removes duplicate class names within a single class string.

### Examples

#### Invalid

```tsx
// Duplicate "flex"
cn`flex px-4 flex text-sm`

// Duplicate in function call
cn('p-4 mt-2 p-4')

// Duplicate in JSX
<div className="flex items-center flex" />
```

#### Valid

```tsx
cn`flex px-4 text-sm`

cn('p-4 mt-2')

<div className="flex items-center" />
```

## Options

```typescript
type NoDuplicateClassesOptions = {
  selectors?: Selector[]
}
```

### `selectors`

Custom selectors to detect class strings. See [Selectors](../selectors.md) for details.

## Autofix

This rule automatically removes duplicate classes, keeping the **first occurrence**:

```tsx
// Before
cn`flex px-4 flex mt-2 px-4`

// After (autofix)
cn`flex px-4 mt-2`
```

## Variant Groups

Duplicate detection works with variant groups:

```tsx
// Invalid - duplicate variant group
cn`hover:(bg-red) flex hover:(bg-red)`

// Valid after fix
cn`hover:(bg-red) flex`
```

## When Not To Use It

If you intentionally use duplicate classes for specificity reasons (rare).

## Related Rules

- [no-conflicting-classes](./no-conflicting-classes.md)
- [order](./order.md)
