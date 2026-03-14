/**
 * Default selectors for detecting class strings.
 * Adapted from eslint-plugin-better-tailwindcss (MIT license).
 */

import {
  type CalleeSelector,
  type Selectors,
  MatcherType,
  SelectorKind,
} from '../types/selectors'



// =============================================================================
// Callee Selectors
// =============================================================================

/** @see https://ui.shadcn.com/docs/installation/manual */
const CN: Array<CalleeSelector> = [
  {
    kind: SelectorKind.Callee,
    name: 'cn',
    match: [{ type: MatcherType.String }],
  },
  {
    kind: SelectorKind.Callee,
    name: 'cn',
    match: [{ type: MatcherType.ObjectKey }],
  },
]

/** @see https://github.com/lukeed/clsx */
const CLSX: Array<CalleeSelector> = [
  {
    kind: SelectorKind.Callee,
    name: 'clsx',
    match: [{ type: MatcherType.String }],
  },
  {
    kind: SelectorKind.Callee,
    name: 'clsx',
    match: [{ type: MatcherType.ObjectKey }],
  },
]

/** @see https://github.com/JedWatson/classnames */
const CLASSNAMES: Array<CalleeSelector> = [
  {
    kind: SelectorKind.Callee,
    name: 'classnames',
    match: [{ type: MatcherType.String }],
  },
  {
    kind: SelectorKind.Callee,
    name: 'classnames',
    match: [{ type: MatcherType.ObjectKey }],
  },
]

/** @see https://github.com/joe-bell/cva */
const CVA: Array<CalleeSelector> = [
  {
    kind: SelectorKind.Callee,
    name: 'cva',
    match: [{ type: MatcherType.String }],
  },
  {
    kind: SelectorKind.Callee,
    name: 'cva',
    match: [{ type: MatcherType.ObjectValue, path: '^variants.*$' }],
  },
  {
    kind: SelectorKind.Callee,
    name: 'cva',
    match: [{ type: MatcherType.ObjectValue, path: '^compoundVariants\\[\\d+\\]\\.(?:className|class)$' }],
  },
]

/** @see https://github.com/dcastil/tailwind-merge */
const TW_MERGE: Array<CalleeSelector> = [
  {
    kind: SelectorKind.Callee,
    name: 'twMerge',
    match: [{ type: MatcherType.String }],
  },
]

/** @see https://github.com/dcastil/tailwind-merge */
const TW_JOIN: Array<CalleeSelector> = [
  {
    kind: SelectorKind.Callee,
    name: 'twJoin',
    match: [{ type: MatcherType.String }],
  },
]

/** @see https://www.tailwind-variants.org/ */
const TV: Array<CalleeSelector> = [
  {
    kind: SelectorKind.Callee,
    name: 'tv',
    match: [{ type: MatcherType.String }],
  },
  {
    kind: SelectorKind.Callee,
    name: 'tv',
    match: [{ type: MatcherType.ObjectValue, path: '^variants.*$' }],
  },
  {
    kind: SelectorKind.Callee,
    name: 'tv',
    match: [{ type: MatcherType.ObjectValue, path: '^compoundVariants\\[\\d+\\]\\.(?:className|class)$' }],
  },
  {
    kind: SelectorKind.Callee,
    name: 'tv',
    match: [{ type: MatcherType.ObjectValue, path: '^(?:base|slots\\..*)$' }],
  },
]

/** @see https://github.com/jorgebucaran/classcat */
const CC: Array<CalleeSelector> = [
  {
    kind: SelectorKind.Callee,
    name: 'cc',
    match: [{ type: MatcherType.String }],
  },
  {
    kind: SelectorKind.Callee,
    name: 'cc',
    match: [{ type: MatcherType.ObjectKey }],
  },
]

export const DEFAULT_CALLEE_SELECTORS: Selectors = [
  ...CN,
  ...CLSX,
  ...CLASSNAMES,
  ...CVA,
  ...TW_MERGE,
  ...TW_JOIN,
  ...TV,
  ...CC,
]


// =============================================================================
// Attribute Selectors
// =============================================================================

export const DEFAULT_ATTRIBUTE_SELECTORS: Selectors = [
  // HTML/JSX class and className (no matchers = direct string)
  {
    kind: SelectorKind.Attribute,
    name: '^class(?:Name)?$',
  },
  // HTML/JSX class and className with string matcher
  {
    kind: SelectorKind.Attribute,
    name: '^class(?:Name)?$',
    match: [{ type: MatcherType.String }],
  },
  // Angular [class] and [ngClass]
  {
    kind: SelectorKind.Attribute,
    name: '(?:^\\[class\\]$)|(?:^\\[ngClass\\]$)',
  },
  {
    kind: SelectorKind.Attribute,
    name: '(?:^\\[class\\]$)|(?:^\\[ngClass\\]$)',
    match: [{ type: MatcherType.String }, { type: MatcherType.ObjectKey }],
  },
  // Angular [class.something]
  {
    kind: SelectorKind.Attribute,
    name: '(?:^\\[class\\..*\\]$)',
    match: [{ type: MatcherType.String }],
  },
  // Vue v-bind:class
  {
    kind: SelectorKind.Attribute,
    name: '^v-bind:class$',
    match: [{ type: MatcherType.String }, { type: MatcherType.ObjectKey }],
  },
  // Astro class:list
  {
    kind: SelectorKind.Attribute,
    name: '^class:list$',
    match: [{ type: MatcherType.String }, { type: MatcherType.ObjectKey }],
  },
]


// =============================================================================
// Variable Selectors
// =============================================================================

export const DEFAULT_VARIABLE_SELECTORS: Selectors = [
  {
    kind: SelectorKind.Variable,
    name: '^classNames?$',
    match: [{ type: MatcherType.String }],
  },
  {
    kind: SelectorKind.Variable,
    name: '^classes$',
    match: [{ type: MatcherType.String }],
  },
  {
    kind: SelectorKind.Variable,
    name: '^styles?$',
    match: [{ type: MatcherType.String }],
  },
]


// =============================================================================
// Tag Selectors (for tagged template literals)
// =============================================================================

export const DEFAULT_TAG_SELECTORS: Selectors = [
  {
    kind: SelectorKind.Tag,
    name: '^tw$',
  },
  {
    kind: SelectorKind.Tag,
    name: '^cn$',
  },
  {
    kind: SelectorKind.Tag,
    name: '^clsx$',
  },
  {
    kind: SelectorKind.Tag,
    name: '^classnames$',
  },
]


// =============================================================================
// Combined Default Selectors
// =============================================================================

export const DEFAULT_SELECTORS: Selectors = [
  ...DEFAULT_ATTRIBUTE_SELECTORS,
  ...DEFAULT_CALLEE_SELECTORS,
  ...DEFAULT_TAG_SELECTORS,
  ...DEFAULT_VARIABLE_SELECTORS,
]
