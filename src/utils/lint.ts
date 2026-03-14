/**
 * Lint utilities for iterating over classes with precise offsets.
 * Adapted from eslint-plugin-better-tailwindcss (MIT license).
 */

import type { Rule } from 'eslint'

import type { Literal } from '../types/literal'
import { splitClasses, splitWhitespaces } from './helpers'



// =============================================================================
// Types
// =============================================================================

/**
 * Result returned by the report callback in lintClasses.
 */
export type LintClassResult = (
  | {
    /** Message ID from rule's messages */
    messageId: string
    /** Data to interpolate in message */
    data?: Record<string, string>
    /** Fix: replacement string for this class (empty string to remove) */
    fix?: string
  }
  | {
    /** Custom message (bypasses messageId) */
    message: string
    /** Fix: replacement string for this class */
    fix?: string
  }
  | false
  | undefined
)

/**
 * Callback for each class in a literal.
 *
 * @param className - The current class being checked
 * @param index - Index of the class in the array
 * @param after - Mutable array of remaining classes (for accumulating fixes)
 * @returns Result object, false, or undefined to skip
 */
export type LintClassCallback = (
  className: string,
  index: number,
  after: Array<string>,
) => LintClassResult


// =============================================================================
// Main Function
// =============================================================================

/**
 * Iterate over each class in a literal and report issues with precise offsets.
 *
 * This function handles:
 * - Calculating exact character offsets for each class
 * - Accounting for quotes and braces in the literal
 * - Accumulating fixes in the `after` array
 * - Reporting with correct range for each class
 *
 * @example
 * ```typescript
 * lintClasses(ctx, literal, (className, index, after) => {
 *   if (isDuplicate(className, after)) {
 *     return { messageId: 'duplicate', data: { className }, fix: '' }
 *   }
 *   return undefined
 * })
 * ```
 */
export const lintClasses = (
  ctx: Rule.RuleContext,
  literal: Literal,
  report: LintClassCallback,
): void => {

  const classChunks = splitClasses(literal.content)
  const whitespaceChunks = splitWhitespaces(literal.content)

  const startsWithWhitespace = whitespaceChunks.length > 0 && whitespaceChunks[0] !== ''

  // Mutable array for accumulating fixes
  const after = [...classChunks]

  for (let classIndex = 0, stringIndex = 0; classIndex < classChunks.length; classIndex++) {

    const className = classChunks[classIndex]

    // Account for leading whitespace
    if (startsWithWhitespace)
      stringIndex += whitespaceChunks[classIndex]?.length ?? 0

    const startIndex = stringIndex
    const endIndex = stringIndex + className.length

    stringIndex = endIndex

    // Account for trailing whitespace (if no leading whitespace)
    if (!startsWithWhitespace)
      stringIndex += whitespaceChunks[classIndex + 1]?.length ?? 0

    const result = report(className, classIndex, after)

    // Skip if no issue
    if (result === undefined || result === false)
      continue

    const [literalStart] = literal.range

    // Update the after array with the fix
    if (typeof result === 'object' && result.fix !== undefined)
      after[classIndex] = result.fix

    // Calculate the exact range for this class
    const classRange: [number, number] = [
      literalStart + startIndex + (literal.openingQuote?.length ?? 0) + (literal.closingBraces?.length ?? 0),
      literalStart + endIndex + (literal.openingQuote?.length ?? 0) + (literal.closingBraces?.length ?? 0),
    ]

    // Report with ESLint standard API
    if ('messageId' in result) {

      ctx.report({
        messageId: result.messageId,
        data: result.data,
        loc: {
          start: ctx.sourceCode.getLocFromIndex(classRange[0]),
          end: ctx.sourceCode.getLocFromIndex(classRange[1]),
        },
        fix: result.fix !== undefined
          ? fixer => fixer.replaceTextRange(classRange, result.fix!)
          : undefined,
      })
    }
    else if ('message' in result) {

      ctx.report({
        message: result.message,
        loc: {
          start: ctx.sourceCode.getLocFromIndex(classRange[0]),
          end: ctx.sourceCode.getLocFromIndex(classRange[1]),
        },
        fix: result.fix !== undefined
          ? fixer => fixer.replaceTextRange(classRange, result.fix!)
          : undefined,
      })
    }
  }
}


// =============================================================================
// Helper: Rebuild Content from After Array
// =============================================================================

/**
 * Rebuild the literal content from the modified `after` array.
 * Preserves original whitespace structure.
 */
export const rebuildContent = (
  literal: Literal,
  after: Array<string>,
): string => {

  const whitespaceChunks = splitWhitespaces(literal.content)
  const startsWithWhitespace = whitespaceChunks.length > 0 && whitespaceChunks[0] !== ''

  // Filter out empty strings (removed classes)
  const filteredAfter = after.filter(c => c !== '')

  if (filteredAfter.length === 0)
    return ''

  // Simple case: join with single space
  if (!startsWithWhitespace && whitespaceChunks.every(w => w === ' ' || w === ''))
    return filteredAfter.join(' ')

  // Complex case: preserve original whitespace structure
  let result = ''
  let afterIndex = 0

  for (let i = 0; i < whitespaceChunks.length; i++) {

    if (startsWithWhitespace) {

      // Whitespace first pattern
      result += whitespaceChunks[i] ?? ''

      if (afterIndex < filteredAfter.length)
        result += filteredAfter[afterIndex++] ?? ''
    }
    else {

      // Class first pattern
      if (afterIndex < filteredAfter.length)
        result += filteredAfter[afterIndex++] ?? ''

      result += whitespaceChunks[i] ?? ''
    }
  }

  return result.trim()
}
