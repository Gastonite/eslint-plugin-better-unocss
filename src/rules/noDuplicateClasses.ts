/**
 * Rule: no-duplicate-classes
 * Disallow duplicate CSS classes.
 */

import type { Literal } from '../types/literal'
import { createRule, type RuleOptionsWithSelectors } from '../utils/createRule'



// =============================================================================
// Types
// =============================================================================

export type NoDuplicateClassesOptions = RuleOptionsWithSelectors


// =============================================================================
// Helpers
// =============================================================================

/**
 * Parse content into classes, handling variant groups.
 */
const parseClasses = (content: string): Array<string> => {

  const classes: Array<string> = []
  let current = ''
  let parenDepth = 0

  for (const char of content) {

    if (char === '(') {

      parenDepth++
      current += char
    }
    else if (char === ')') {

      parenDepth--
      current += char
    }
    else if ((/\s/).test(char) && parenDepth === 0) {

      if (current.trim())
        classes.push(current.trim())

      current = ''
    }
    else {

      current += char
    }
  }

  if (current.trim())
    classes.push(current.trim())

  return classes
}

/**
 * Find duplicate classes in an array.
 */
const findDuplicates = (classes: Array<string>): Array<string> => {

  const seen = new Set<string>()
  const duplicates: Array<string> = []

  for (const cls of classes) {

    if (seen.has(cls))
      duplicates.push(cls)
    else
      seen.add(cls)
  }

  return duplicates
}

/**
 * Remove duplicates, keeping first occurrence.
 */
const removeDuplicates = (classes: Array<string>): Array<string> => {

  const seen = new Set<string>()
  const result: Array<string> = []

  for (const cls of classes) {

    if (!seen.has(cls)) {

      seen.add(cls)
      result.push(cls)
    }
  }

  return result
}

/**
 * Format the fixed literal with deduplicated classes.
 */
const formatFixedLiteral = (literal: Literal, uniqueClasses: Array<string>): string => {

  const content = literal.content
  const multiline = content.includes('\n')

  if (!multiline) {

    const quote = literal.openingQuote ?? '"'
    return quote + uniqueClasses.join(' ') + quote
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
  const formatted = '\n' + uniqueClasses.map(c => indentation + c).join('\n') + '\n' + baseIndent

  return quote + formatted + quote
}


// =============================================================================
// Rule
// =============================================================================

export const noDuplicateClassesRule = createRule<'duplicate', NoDuplicateClassesOptions>({
  name: 'no-duplicate-classes',

  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow duplicate classes',
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
        },
        additionalProperties: false,
      },
    ],
    messages: {
      duplicate: 'Duplicate class: {{className}}',
    },
  },

  defaultOptions: {},

  lintLiterals(ctx, literals, _options) {

    for (const literal of literals) {

      const classes = parseClasses(literal.content)
      const duplicates = findDuplicates(classes)

      if (duplicates.length === 0)
        continue

      ctx.report({
        loc: literal.loc,
        messageId: 'duplicate',
        data: { className: duplicates.join(', ') },
        fix(fixer) {

          const unique = removeDuplicates(classes)
          const fixed = formatFixedLiteral(literal, unique)

          return fixer.replaceTextRange(literal.range, fixed)
        },
      })
    }
  },
})
