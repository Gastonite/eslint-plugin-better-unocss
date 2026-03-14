import { type Linter } from 'eslint'
import { enforceLineWrappingRule } from './rules/enforceLineWrapping'
import { noConflictingClassesRule } from './rules/noConflictingClasses'
import { noDuplicateClassesRule } from './rules/noDuplicateClasses'
import { noRestrictedClassesRule } from './rules/noRestrictedClasses'
import { noUnknownClassesRule } from './rules/noUnknownClasses'
import { noUnnecessaryWhitespaceRule } from './rules/noUnnecessaryWhitespace'
import { orderRule } from './rules/order'



export const rules = {
  order: orderRule,
  'no-conflicting-classes': noConflictingClassesRule,
  'no-duplicate-classes': noDuplicateClassesRule,
  'no-restricted-classes': noRestrictedClassesRule,
  'no-unknown-classes': noUnknownClassesRule,
  'no-unnecessary-whitespace': noUnnecessaryWhitespaceRule,
  'enforce-line-wrapping': enforceLineWrappingRule,
}

export const configs = {

  /**
   * Recommended config: stylistic (warn) + correctness (error) rules.
   */
  recommended: {
    plugins: {
      'better-unocss': { rules },
    },
    rules: {
      // Stylistic
      'better-unocss/order': 'warn',
      'better-unocss/no-unnecessary-whitespace': 'warn',
      // Correctness
      'better-unocss/no-conflicting-classes': 'error',
      'better-unocss/no-duplicate-classes': 'error',
      'better-unocss/no-unknown-classes': 'error',
    },
  } satisfies Linter.Config,
}



// =============================================================================
// Type Exports
// =============================================================================

export type { EnforceLineWrappingOptions } from './rules/enforceLineWrapping'
export type { NoConflictingClassesOptions } from './rules/noConflictingClasses'
export type { NoDuplicateClassesOptions } from './rules/noDuplicateClasses'
export type { NoRestrictedClassesOptions, NoRestrictedClassesRestriction } from './rules/noRestrictedClasses'
export type { NoUnknownClassesOptions } from './rules/noUnknownClasses'
export type { NoUnnecessaryWhitespaceOptions } from './rules/noUnnecessaryWhitespace'
export type { OrderOptions } from './rules/order'
export type { RuleOptionsWithSelectors } from './utils/createRule'

import type { EnforceLineWrappingOptions } from './rules/enforceLineWrapping'
import type { NoConflictingClassesOptions } from './rules/noConflictingClasses'
import type { NoDuplicateClassesOptions } from './rules/noDuplicateClasses'
import type { NoRestrictedClassesOptions } from './rules/noRestrictedClasses'
import type { NoUnknownClassesOptions } from './rules/noUnknownClasses'
import type { NoUnnecessaryWhitespaceOptions } from './rules/noUnnecessaryWhitespace'
import type { OrderOptions } from './rules/order'

type RuleSeverity = 'off' | 'warn' | 'error' | 0 | 1 | 2
type RuleConfig<T> = RuleSeverity | [RuleSeverity, T]

export type BetterUnocssRules = {
  'better-unocss/order'?: RuleConfig<OrderOptions>
  'better-unocss/no-conflicting-classes'?: RuleConfig<NoConflictingClassesOptions>
  'better-unocss/no-duplicate-classes'?: RuleConfig<NoDuplicateClassesOptions>
  'better-unocss/no-restricted-classes'?: RuleConfig<NoRestrictedClassesOptions>
  'better-unocss/no-unknown-classes'?: RuleConfig<NoUnknownClassesOptions>
  'better-unocss/no-unnecessary-whitespace'?: RuleConfig<NoUnnecessaryWhitespaceOptions>
  'better-unocss/enforce-line-wrapping'?: RuleConfig<EnforceLineWrappingOptions>
}
