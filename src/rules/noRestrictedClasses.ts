/**
 * Rule: no-restricted-classes
 * Disallow restricted classes based on patterns.
 */

import type { Literal } from '../types/literal'
import { createRule, type RuleOptionsWithSelectors } from '../utils/createRule'
import { splitClasses } from '../utils/helpers'



// =============================================================================
// Types
// =============================================================================

export type NoRestrictedClassesRestriction = string | {
  pattern: string
  message?: string
  fix?: string
}

export type NoRestrictedClassesOptions = RuleOptionsWithSelectors & {
  restrict?: Array<NoRestrictedClassesRestriction>
}



// =============================================================================
// Helpers
// =============================================================================

/**
 * Replace placeholders ($1, $2, etc.) with matched groups.
 */
const replacePlaceholders = (template: string, matches: RegExpMatchArray): string => {

  let result = template

  for (let i = 0; i < matches.length; i++) {

    const placeholder = `$${i}`
    const value = matches[i] ?? ''
    result = result.replaceAll(placeholder, value)
  }

  return result
}

/**
 * Format the fixed literal with resolved classes.
 */
const formatFixedLiteral = (literal: Literal, fixedClasses: Array<string>): string => {

  const content = literal.content
  const multiline = content.includes('\n')

  if (!multiline) {

    const quote = literal.openingQuote ?? '"'
    return quote + fixedClasses.join(' ') + quote
  }

  // Preserve multiline format
  const lines = content.split('\n')
  let indentation = '  '

  for (const line of lines) {

    const match = line.match(/^(\s+)\S/)

    if (match?.[1]) {

      indentation = match[1]
      break
    }
  }

  const baseIndent = indentation.startsWith('  ')
    ? indentation.slice(2)
    : indentation.startsWith('\t')
      ? indentation.slice(1)
      : ''

  const quote = literal.openingQuote ?? '"'
  const formatted = '\n' + fixedClasses.map(c => indentation + c).join('\n') + '\n' + baseIndent

  return quote + formatted + quote
}



// =============================================================================
// Rule
// =============================================================================

export const noRestrictedClassesRule = createRule<'restricted', NoRestrictedClassesOptions>({
  name: 'no-restricted-classes',

  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow restricted classes based on patterns',
      recommended: false,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          selectors: {
            type: 'array',
            description: 'Custom selectors configuration',
          },
          restrict: {
            type: 'array',
            description: 'List of restricted class patterns',
            items: {
              oneOf: [
                { type: 'string' },
                {
                  type: 'object',
                  properties: {
                    pattern: { type: 'string' },
                    message: { type: 'string' },
                    fix: { type: 'string' },
                  },
                  required: ['pattern'],
                  additionalProperties: false,
                },
              ],
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      restricted: '{{message}}',
    },
  },

  defaultOptions: {
    restrict: [],
  },

  lintLiterals(ctx, literals, options) {

    const restrictions = options.restrict ?? []

    if (restrictions.length === 0)
      return

    for (const literal of literals) {

      const classes = splitClasses(literal.content)

      if (classes.length === 0)
        continue

      // Track which classes need to be fixed
      const classesToFix = new Map<number, string>()
      const errors: Array<{ index: number; message: string; hasFix: boolean }> = []

      for (let i = 0; i < classes.length; i++) {

        const className = classes[i]

        for (const restriction of restrictions) {

          const pattern = typeof restriction === 'string'
            ? restriction
            : restriction.pattern

          const regex = new RegExp(pattern)
          const matches = className.match(regex)

          if (!matches)
            continue

          // Build message
          let message: string

          if (typeof restriction === 'string' || !restriction.message)
            message = `Restricted class: "${className}"`
          else
            message = replacePlaceholders(restriction.message, matches)

          // Check for fix
          const hasFix = typeof restriction !== 'string' && restriction.fix !== undefined

          if (hasFix) {

            const fixValue = replacePlaceholders(restriction.fix!, matches)
            classesToFix.set(i, fixValue)
          }

          errors.push({ index: i, message, hasFix })

          // Only match first restriction per class
          break
        }
      }

      // Report each error
      for (const { message, hasFix } of errors) {

        if (hasFix) {

          ctx.report({
            loc: literal.loc,
            messageId: 'restricted',
            data: { message },
            fix(fixer) {

              const fixedClasses = classes.map((cls, i) => {

                if (classesToFix.has(i))
                  return classesToFix.get(i)!

                return cls
              }).filter(Boolean)

              const fixedText = formatFixedLiteral(literal, fixedClasses)

              return fixer.replaceTextRange(literal.range, fixedText)
            },
          })
        }
        else {

          ctx.report({
            loc: literal.loc,
            messageId: 'restricted',
            data: { message },
          })
        }
      }
    }
  },
})
