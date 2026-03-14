# better-unocss/no-unknown-classes

Disallow classes not recognized by UnoCSS.

## Rule Details

This rule detects class names that UnoCSS cannot parse or generate CSS for. This helps catch typos and invalid utility names.

### Examples

#### Invalid

```tsx
// Typo: "flx" instead of "flex"
cn`flx items-center`

// Invalid utility
cn`padding-4`

// Non-existent color
cn`text-purple-999`
```

#### Valid

```tsx
// Valid UnoCSS utilities
cn`flex items-center`

cn`p-4 mt-2`

cn`text-purple-500`
```

## Options

```typescript
type NoUnknownClassesOptions = {
  selectors?: Selector[]
}
```

### `selectors`

Custom selectors to detect class strings. See [Selectors](../selectors.md) for details.

## How It Works

1. Parses each class with `uno.parseToken()`
2. If UnoCSS returns no result, the class is unknown
3. Reports an error for each unknown class

## No Autofix

This rule does **not** provide autofix because:
- It cannot guess the intended class
- The fix depends on user intent (typo vs removed utility vs custom class)

## Error Message

```
Unknown UnoCSS class: flx
Unknown UnoCSS class: padding-4
```

## Custom Classes

If you have custom utilities defined in your `uno.config.ts`, they will be recognized:

```typescript
// uno.config.ts
export default defineConfig({
  rules: [
    ['custom-util', { color: 'red' }],
  ],
})
```

```tsx
// Valid - custom utility is recognized
cn`custom-util flex`
```

## Component Classes

Non-utility classes (like component class names) will be reported as unknown:

```tsx
// Will report "btn" and "btn-primary" as unknown
cn`btn btn-primary flex`
```

To handle this, you can:
1. Use a different attribute for component classes
2. Configure custom selectors to exclude certain patterns
3. Disable the rule for specific files

## When Not To Use It

- If you mix utility classes with component/semantic classes
- If you use many custom classes not defined in UnoCSS config

## Related Rules

- [no-conflicting-classes](./no-conflicting-classes.md)
- [order](./order.md)
