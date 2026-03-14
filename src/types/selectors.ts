/**
 * Selector types for detecting class strings in various contexts.
 * Adapted from eslint-plugin-better-tailwindcss (MIT license).
 */

export enum MatcherType {
  /** Matches all object keys that are strings. */
  ObjectKey = 'objectKeys',
  /** Matches all object values that are strings. */
  ObjectValue = 'objectValues',
  /** Matches all strings that are not matched by another matcher. */
  String = 'strings',
}

export enum SelectorKind {
  Attribute = 'attribute',
  Callee = 'callee',
  Tag = 'tag',
  Variable = 'variable',
}

export type Regex = string

export type SelectorStringMatcher = {
  type: MatcherType.String
}

export type SelectorObjectKeyMatcher = {
  type: MatcherType.ObjectKey
  path?: Regex
}

export type SelectorObjectValueMatcher = {
  type: MatcherType.ObjectValue
  path?: Regex
}

export type SelectorMatcher = (
  | SelectorObjectKeyMatcher
  | SelectorObjectValueMatcher
  | SelectorStringMatcher
)

type BaseSelector<Kind extends SelectorKind> = {
  kind: Kind
  name: Regex
  match?: Array<SelectorMatcher>
}

export type AttributeSelector = BaseSelector<SelectorKind.Attribute>

export type CallTarget = 'all' | 'first' | 'last' | number

export type CalleeSelector = {
  kind: SelectorKind.Callee
  callTarget?: CallTarget
  match?: Array<SelectorMatcher>
  name?: Regex
  path?: Regex
}

export type TagSelector = BaseSelector<SelectorKind.Tag>

export type VariableSelector = BaseSelector<SelectorKind.Variable>

export type Selector = (
  | AttributeSelector
  | CalleeSelector
  | TagSelector
  | VariableSelector
)

export type Selectors = Array<Selector>

export type SelectorByKind<Kind extends SelectorKind> = Extract<Selector, { kind: Kind }>
