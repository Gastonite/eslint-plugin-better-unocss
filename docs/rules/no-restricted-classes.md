# better-unocss/no-restricted-classes

Disallow specific classes based on patterns.

## Rule Details

This rule allows you to ban certain classes or patterns. Useful for:
- Enforcing design system constraints
- Migrating from old utilities to new ones
- Preventing use of deprecated patterns

### Examples

#### Invalid

```tsx
// With restrict: ['hidden']
cn`flex hidden`

// With restrict: [{ pattern: '^bg-black$' }]
cn`bg-black text-white`
```

#### Valid

```tsx
// "hidden" is not in restrict list
cn`flex invisible`

// Pattern doesn't match
cn`bg-gray-900 text-white`
```

## Options

```typescript
type NoRestrictedClassesOptions = {
  selectors?: Selector[]
  restrict?: Array<string | {
    pattern: string
    message?: string
    fix?: string
  }>
}
```

### `selectors`

Custom selectors to detect class strings. See [Selectors](../selectors.md) for details.

### `restrict`

Type: `Array<string | { pattern, message?, fix? }>`
Default: `[]`

List of restricted class patterns.

#### Simple Pattern (string)

```json
{
  "better-unocss/no-restricted-classes": ["error", {
    "restrict": ["hidden", "invisible"]
  }]
}
```

Each string is treated as a regex pattern:

```tsx
// Error: Restricted class: "hidden"
cn`flex hidden`
```

#### Object Pattern with Custom Message

```json
{
  "better-unocss/no-restricted-classes": ["error", {
    "restrict": [
      {
        "pattern": "^bg-black$",
        "message": "Use bg-gray-900 instead of bg-black for better contrast"
      }
    ]
  }]
}
```

```tsx
// Error: Use bg-gray-900 instead of bg-black for better contrast
cn`bg-black text-white`
```

#### Object Pattern with Autofix

```json
{
  "better-unocss/no-restricted-classes": ["error", {
    "restrict": [
      {
        "pattern": "^bg-black$",
        "message": "Use bg-gray-900 instead",
        "fix": "bg-gray-900"
      }
    ]
  }]
}
```

```tsx
// Before
cn`bg-black text-white`

// After (autofix)
cn`bg-gray-900 text-white`
```

#### Regex Capture Groups

Use capture groups in patterns and reference them in `message` and `fix`:

```json
{
  "better-unocss/no-restricted-classes": ["error", {
    "restrict": [
      {
        "pattern": "^text-(red|blue|green)-500$",
        "message": "Use semantic colors instead of $1-500",
        "fix": "text-primary"
      }
    ]
  }]
}
```

```tsx
// Error: Use semantic colors instead of red-500
cn`text-red-500`

// After (autofix)
cn`text-primary`
```

#### Dynamic Fix with Capture Groups

```json
{
  "better-unocss/no-restricted-classes": ["error", {
    "restrict": [
      {
        "pattern": "^m([trbl])?-(\\d+)$",
        "message": "Use spacing scale: m$1-$2 -> m$1-spacing-$2",
        "fix": "m$1-spacing-$2"
      }
    ]
  }]
}
```

```tsx
// Before
cn`mt-4 mr-2`

// After (autofix)
cn`mt-spacing-4 mr-spacing-2`
```

## Use Cases

### Enforce Design System

```json
{
  "restrict": [
    {
      "pattern": "^(p|m)[trblxy]?-\\d+$",
      "message": "Use spacing tokens: spacing-xs, spacing-sm, spacing-md, etc."
    }
  ]
}
```

### Migrate Deprecated Classes

```json
{
  "restrict": [
    {
      "pattern": "^bg-opacity-(\\d+)$",
      "message": "bg-opacity is deprecated, use bg-black/$1",
      "fix": "bg-black/$1"
    }
  ]
}
```

### Ban Arbitrary Values

```json
{
  "restrict": [
    {
      "pattern": "\\[.*\\]",
      "message": "Arbitrary values are not allowed, use design tokens"
    }
  ]
}
```

## When Not To Use It

If you don't need to restrict specific classes.

## Related Rules

- [no-unknown-classes](./no-unknown-classes.md)
- [no-conflicting-classes](./no-conflicting-classes.md)
