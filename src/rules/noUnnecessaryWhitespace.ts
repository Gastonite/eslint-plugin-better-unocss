/**
 * Rule: no-unnecessary-whitespace
 * Disallow unnecessary whitespace in class strings.
 */

import type { Literal } from '../types/literal'
import { createRule, type RuleOptionsWithSelectors } from '../utils/createRule'



// =============================================================================
// Types
// =============================================================================

export type NoUnnecessaryWhitespaceOptions = RuleOptionsWithSelectors & {
  allowMultiline?: boolean
}


// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if content has unnecessary whitespace.
 */
const hasUnnecessaryWhitespace = (content: string, allowMultiline: boolean): boolean => {

  // Check for multiple consecutive spaces (not newlines)
  if ((/[^\S\n]{2,}/).test(content))
    return true

  // Check for leading/trailing whitespace on lines
  const lines = content.split('\n')

  for (const line of lines) {

    if (line !== line.trim() && line.trim().length > 0)
      return true
  }

  // If multiline not allowed, check for newlines
  if (!allowMultiline && content.includes('\n'))
    return true

  return false
}

/**
 * Normalize whitespace in content.
 */
const normalizeWhitespace = (content: string, allowMultiline: boolean): string => {

  // For single line or when multiline not allowed, normalize all whitespace
  if (!allowMultiline || !content.includes('\n'))
    return content.split(/\s+/).filter(s => s.length > 0).join(' ')

  // Normalize each line for multiline content
  const lines = content.split('\n')
  const normalized = lines
    .map(line => line.trim().split(/\s+/).filter(s => s.length > 0).join(' '))
    .filter(line => line.length > 0)

  if (normalized.length === 0)
    return ''

  if (normalized.length === 1)
    return normalized[0] ?? ''

  return normalized.join(' ')
}

/**
 * Format the fixed literal with normalized whitespace.
 */
const formatFixedLiteral = (literal: Literal, normalized: string): string => {

  const quote = literal.openingQuote ?? '"'

  return quote + normalized + quote
}


// =============================================================================
// Rule
// =============================================================================

export const noUnnecessaryWhitespaceRule = createRule<'unnecessaryWhitespace', NoUnnecessaryWhitespaceOptions>({
  name: 'no-unnecessary-whitespace',

  meta: {
    type: 'layout',
    docs: {
      description: 'Disallow unnecessary whitespace in class strings',
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
          allowMultiline: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unnecessaryWhitespace: 'Unnecessary whitespace in class string',
    },
  },

  defaultOptions: {
    allowMultiline: true,
  },

  lintLiterals(ctx, literals, options) {

    const allowMultiline = options.allowMultiline ?? true

    for (const literal of literals) {

      const content = literal.content

      // For multiline allowed, skip already-multiline content
      // (let enforce-line-wrapping handle it)
      if (allowMultiline && content.includes('\n'))
        continue

      if (!hasUnnecessaryWhitespace(content, allowMultiline))
        continue

      ctx.report({
        loc: literal.loc,
        messageId: 'unnecessaryWhitespace',
        fix(fixer) {

          const normalized = normalizeWhitespace(content, allowMultiline)
          const fixed = formatFixedLiteral(literal, normalized)

          return fixer.replaceTextRange(literal.range, fixed)
        },
      })
    }
  },
})
