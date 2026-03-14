/**
 * Rule: no-unknown-classes
 * Disallow classes not recognized by UnoCSS.
 */

import { getUnknownClasses } from '../unocssSort'
import { createRule, type RuleOptionsWithSelectors } from '../utils/createRule'
import { splitClasses } from '../utils/helpers'



// =============================================================================
// Types
// =============================================================================

export type NoUnknownClassesOptions = RuleOptionsWithSelectors



// =============================================================================
// Rule
// =============================================================================

export const noUnknownClassesRule = createRule<'unknown', NoUnknownClassesOptions>({
  name: 'no-unknown-classes',

  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow classes not recognized by UnoCSS',
      recommended: false,
    },
    // No fixable - we cannot guess the correct class
    schema: [
      {
        type: 'object',
        properties: {
          selectors: {
            type: 'array',
            description: 'Custom selectors configuration',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unknown: 'Unknown UnoCSS class: {{className}}',
    },
  },

  defaultOptions: {},

  lintLiterals(ctx, literals, _options) {

    for (const literal of literals) {

      const classes = splitClasses(literal.content)

      if (classes.length === 0)
        continue

      const classesString = classes.join(' ')
      const unknown = getUnknownClasses(classesString, ctx.filename)

      if (unknown.length === 0)
        continue

      // Report each unknown class
      for (const className of unknown) {

        ctx.report({
          loc: literal.loc,
          messageId: 'unknown',
          data: { className },
        })
      }
    }
  },
})
