/**
 * Rule: order
 * Enforce consistent class ordering using UnoCSS engine.
 */

import type { Rule } from 'eslint'

import type { Literal } from '../types/literal'
import { sortWithUnocss } from '../unocssSort'
import { createRule, type RuleOptionsWithSelectors } from '../utils/createRule'



// =============================================================================
// Types
// =============================================================================

export type OrderOptions = RuleOptionsWithSelectors


// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if content is multiline.
 */
const isMultiline = (content: string): boolean => content.includes('\n')

/**
 * Detect the indentation used in multiline content.
 */
const detectIndentation = (content: string): string => {

  const lines = content.split('\n')

  for (const line of lines) {

    const match = line.match(/^(\s+)\S/)
    if (match?.[1])
      return match[1]
  }

  return '  '
}

/**
 * Compute base indentation (one level less than class indentation).
 */
const computeBaseIndentation = (classIndentation: string): string => {

  if (classIndentation.startsWith('  '))
    return classIndentation.slice(2)

  if (classIndentation.startsWith('\t'))
    return classIndentation.slice(1)

  return ''
}

/**
 * Parse sorted classes, keeping variant groups as single tokens.
 */
const parseTokens = (sorted: string): Array<string> => {

  const tokens: Array<string> = []
  let current = ''
  let parenDepth = 0

  for (const char of sorted) {

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
        tokens.push(current.trim())

      current = ''
    }
    else {

      current += char
    }
  }

  if (current.trim())
    tokens.push(current.trim())

  return tokens
}

/**
 * Format sorted classes for multiline output.
 */
const formatMultiline = (sorted: string, indentation: string): string => {

  const classes = parseTokens(sorted)
  const baseIndent = computeBaseIndentation(indentation)

  return '\n' + classes.map(c => indentation + c).join('\n') + '\n' + baseIndent
}

/**
 * Format the fixed literal with sorted classes.
 */
const formatFixedLiteral = (literal: Literal, sorted: string): string => {

  const content = literal.content
  const multiline = isMultiline(content)
  const indentation = multiline
    ? detectIndentation(content)
    : ''

  const formatted = multiline
    ? formatMultiline(sorted, indentation)
    : sorted

  const quote = literal.openingQuote ?? '"'

  return quote + formatted + quote
}


// =============================================================================
// Rule
// =============================================================================

/**
 * Create a sorting function that uses UnoCSS engine.
 * We need a closure to capture the filename.
 */
const createSortFunction = (ctx: Rule.RuleContext) => (

  (classes: string): string => sortWithUnocss(classes, ctx.filename)
)

export const orderRule = createRule<'unordered', OrderOptions>({
  name: 'order',

  meta: {
    type: 'layout',
    docs: {
      description: 'Enforce consistent class ordering using UnoCSS engine',
      recommended: true,
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
      unordered: 'Classes should be sorted',
    },
  },

  defaultOptions: {},

  lintLiterals(ctx, literals, _options) {

    const sort = createSortFunction(ctx)

    for (const literal of literals) {

      const content = literal.content

      // Normalize: trim and collapse whitespace to single spaces
      const normalized = content.trim().split(/\s+/).filter(c => c.length > 0).join(' ')

      // Skip empty or single-class content
      if (!normalized || !normalized.includes(' '))
        continue

      const sorted = sort(normalized)

      // Build the expected formatted output
      const multiline = isMultiline(content)
      const indentation = multiline
        ? detectIndentation(content)
        : ''

      const formatted = multiline
        ? formatMultiline(sorted, indentation)
        : sorted

      // Compare with original content to catch both order and formatting issues
      if (content === formatted)
        continue

      ctx.report({
        loc: literal.loc,
        messageId: 'unordered',
        fix(fixer) {

          const fixed = formatFixedLiteral(literal, sorted)

          return fixer.replaceTextRange(literal.range, fixed)
        },
      })
    }
  },
})
