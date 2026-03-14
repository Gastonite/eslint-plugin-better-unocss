/**
 * Helper utilities for class string manipulation.
 * Adapted from eslint-plugin-better-tailwindcss (MIT license).
 */

import type { Rule } from 'eslint'
import type { BaseNode as ESBaseNode } from 'estree'

import type { Literal, LiteralValueQuotes } from '../types/literal'



// =============================================================================
// Whitespace & Quotes
// =============================================================================

export const getWhitespace = (classes: string): {
  leadingWhitespace: string | undefined
  trailingWhitespace: string | undefined
} => {

  const leadingWhitespace = classes.match(/^\s*/)?.[0]
  const trailingWhitespace = classes.match(/\s*$/)?.[0]

  return { leadingWhitespace, trailingWhitespace }
}

export const getQuotes = (raw: string): {
  openingQuote: LiteralValueQuotes | undefined
  closingQuote: LiteralValueQuotes | undefined
} => {

  const openingQuote = raw.at(0)
  const closingQuote = raw.at(-1)

  return {
    closingQuote: closingQuote === '\'' || closingQuote === '"' || closingQuote === '`'
      ? closingQuote
      : undefined,
    openingQuote: openingQuote === '\'' || openingQuote === '"' || openingQuote === '`'
      ? openingQuote
      : undefined,
  }
}

export const getContent = (
  raw: string,
  quotes?: { openingQuote?: string; closingQuote?: string },
  braces?: { openingBraces?: string; closingBraces?: string },
): string => (

  raw.substring(
    (quotes?.openingQuote?.length ?? 0) + (braces?.closingBraces?.length ?? 0),
    raw.length - (quotes?.closingQuote?.length ?? 0) - (braces?.openingBraces?.length ?? 0),
  )
)


// =============================================================================
// Class Manipulation
// =============================================================================

export const splitClasses = (classes: string): Array<string> => {

  if (classes.trim() === '')
    return []

  return classes
    .trim()
    .split(/\s+/)
}

/**
 * Split string by non-whitespace, returning whitespace chunks.
 * Complementary to splitClasses - returns the gaps between classes.
 */
export const splitWhitespaces = (classes: string): Array<string> => (

  classes.split(/\S+/)
)

export const deduplicateClasses = (classes: Array<string>): Array<string> => (

  classes.filter((className, index) => classes.indexOf(className) === index)
)


// =============================================================================
// Indentation
// =============================================================================

export const getIndentation = (line: string): number => (

  line.match(/^[\t ]*/)?.[0].length ?? 0
)


// =============================================================================
// Name Matching
// =============================================================================

export const matchesName = (pattern: string, name: string | undefined): boolean => {

  if (!name)
    return false

  const match = name.match(pattern)

  return !!match && match[0] === name
}


// =============================================================================
// Literal Utilities
// =============================================================================

export const deduplicateLiterals = (
  literal: Literal,
  index: number,
  literals: Array<Literal>,
): boolean => (

  literals.findIndex(l2 => (
    literal.content === l2.content &&
    literal.range[0] === l2.range[0] &&
    literal.range[1] === l2.range[1]
  )) === index
)

export const addAttribute = (name: string | undefined) => (
  (literal: Literal): Literal => {

    if (!name)
      return literal

    literal.attribute = name

    return literal
  }
)


// =============================================================================
// Object Path
// =============================================================================

export const createObjectPathElement = (path?: string): string => {

  if (!path)
    return ''

  return path.match(/^[A-Z_a-z]\w*$/)
    ? path
    : `["${path}"]`
}


// =============================================================================
// Node Utilities
// =============================================================================

export type GenericNodeWithParent = {
  parent: Partial<GenericNodeWithParent>
}

export const isGenericNodeWithParent = (node: unknown): node is GenericNodeWithParent => (

  typeof node === 'object' &&
  node !== null &&
  'parent' in node &&
  node.parent !== null &&
  typeof node.parent === 'object'
)

/**
 * Type guard to check if a node has the ESLint parent extension.
 * Use this instead of `as any` to safely access `.parent`.
 */
export const hasESNodeParentExtension = (
  node: ESBaseNode,
): node is Rule.Node & Rule.NodeParentExtension => (

  'parent' in node && !!node.parent
)


// =============================================================================
// Location Utilities
// =============================================================================

export const getExactClassLocation = (
  literal: Literal,
  startIndex: number,
  endIndex: number,
): {
  start: { line: number; column: number }
  end: { line: number; column: number }
} => {

  const linesUpToStartIndex = literal.content.slice(0, startIndex).split(/\r?\n/)
  const isOnFirstLine = linesUpToStartIndex.length === 1
  const containingLine = linesUpToStartIndex.at(-1)

  const line = literal.loc.start.line + linesUpToStartIndex.length - 1
  const column = (
    isOnFirstLine
      ? literal.loc.start.column + (literal.openingQuote?.length ?? 0) + (literal.closingBraces?.length ?? 0)
      : 0
  ) + (containingLine?.length ?? 0)

  return {
    end: {
      column: column + (endIndex - startIndex),
      line,
    },
    start: {
      column,
      line,
    },
  }
}
