import { type Linter } from 'eslint'
import { enforceLineWrappingRule } from './rules/enforceLineWrapping'
import { noDuplicateClassesRule } from './rules/noDuplicateClasses'
import { noUnnecessaryWhitespaceRule } from './rules/noUnnecessaryWhitespace'
import { orderRule } from './rules/order'



export const rules = {
  order: orderRule,
  'no-duplicate-classes': noDuplicateClassesRule,
  'no-unnecessary-whitespace': noUnnecessaryWhitespaceRule,
  'enforce-line-wrapping': enforceLineWrappingRule,
}

export const configs = {

  /**
   * Default config: only order rule enabled.
   */
  flat: {
    plugins: {
      'better-unocss': { rules },
    },
    rules: {
      'better-unocss/order': 'error',
    },
  } satisfies Linter.Config,

  /**
   * Strict config: all rules enabled.
   */
  strict: {
    plugins: {
      'better-unocss': { rules },
    },
    rules: {
      'better-unocss/order': 'error',
      'better-unocss/no-duplicate-classes': 'error',
      'better-unocss/no-unnecessary-whitespace': 'error',
      'better-unocss/enforce-line-wrapping': ['error', { classesPerLine: 1 }],
    },
  } satisfies Linter.Config,
}
