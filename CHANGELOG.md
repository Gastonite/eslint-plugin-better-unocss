# Changelog

## 0.3.0

### Changed

- Variant groups `hover:(...)` are now only expanded if `transformerVariantGroup` is in user's UnoCSS config
- `no-unknown-classes` and `no-conflicting-classes` respect user's transformer configuration

### Fixed

- `splitClasses` correctly parses variant groups like `hover:(bg-red text-white)`

---

## 0.2.0

### New Rules

- `no-conflicting-classes` - Detect classes that set the same CSS property (with autofix)
- `no-unknown-classes` - Detect classes not recognized by UnoCSS
- `no-restricted-classes` - Disallow specific class patterns with regex, custom messages, and autofix

### New Options for `enforce-line-wrapping`

- `printWidth` - Maximum line width before wrapping (default: 80)
- `group` - Variant grouping mode: `newLine`, `emptyLine`, `never`
- `indent` - Now accepts `number | 'tab'` (default: 2)
- `convertToTaggedTemplate` - Convert strings to tagged templates

### Changes

- `classesPerLine` default: `1` -> `0` (disabled by default)
- Improved variant detection for conflict checking

### Fixes

- `contextIsJs` detection for proper autofix in HTML vs JS contexts

### Documentation

- Complete rule documentation in `docs/rules/`
- Updated README

---

## 0.1.0

Initial release.

### Features

- `order` - Sort classes using UnoCSS engine
- `no-duplicate-classes` - Remove duplicate classes
- `no-unnecessary-whitespace` - Normalize whitespace
- `enforce-line-wrapping` - Force multiline when classes exceed threshold

### Supported Contexts

- Function calls: `cn()`, `clsx()`, `classnames()`, `twMerge()`, `cva()`
- Tagged template literals: `` cn`...` ``, `` tw`...` ``
- Vue: `class`, `:class`, `v-bind:class`
- JSX: `className`
