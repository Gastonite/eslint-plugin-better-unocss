/**
 * JSX literal extraction.
 * Adapted from eslint-plugin-better-tailwindcss (MIT license).
 */

import type { Rule } from 'eslint'
import type { BaseNode as ESBaseNode, TemplateLiteral as ESTemplateLiteral } from 'estree'
import type {
  JSXAttribute,
  BaseNode as JSXBaseNode,
  JSXExpressionContainer,
  JSXOpeningElement,
} from 'estree-jsx'

import type { Literal, LiteralValueQuotes } from '../types/literal'
import type { AttributeSelector } from '../types/selectors'

import { addAttribute, deduplicateLiterals, matchesName } from '../utils/helpers'
import { hasESNodeParentExtension } from '../utils/helpers'
import {
  ES_CONTAINER_TYPES_TO_REPLACE_QUOTES,
  type ESSimpleStringLiteral,
  getLiteralsByESMatchers,
  getLiteralsByESTemplateLiteral,
  getStringLiteralByESStringLiteral,
  isESNode,
  isESSimpleStringLiteral,
  isESTemplateLiteral,
} from './es'



// =============================================================================
// Constants
// =============================================================================

export const JSX_CONTAINER_TYPES_TO_REPLACE_QUOTES = [
  ...ES_CONTAINER_TYPES_TO_REPLACE_QUOTES,
  'JSXExpressionContainer',
]

export const JSX_CONTAINER_TYPES_TO_INSERT_BRACES: Array<string> = []


// =============================================================================
// Main Extraction Functions
// =============================================================================

/**
 * Extract literals from a JSX attribute.
 */
export const getLiteralsByJSXAttribute = (
  ctx: Rule.RuleContext,
  attribute: JSXAttribute,
  selectors: Array<AttributeSelector>,
): Array<Literal> => {

  const name = getAttributeName(attribute)
  const value = attribute.value

  const literals = selectors.reduce<Array<Literal>>((acc, selector) => {

    if (!value)
      return acc

    if (typeof name !== 'string')
      return acc

    if (!matchesName(selector.name.toLowerCase(), name.toLowerCase()))
      return acc

    if (!selector.match) {

      acc.push(...getLiteralsByJSXAttributeValue(ctx, value))

      return acc
    }

    acc.push(...getLiteralsByESMatchers(ctx, value, selector.match))

    return acc
  }, [])

  return literals
    .filter(deduplicateLiterals)
    .map(addAttribute(name))
}

/**
 * Get all JSX attributes from an opening element.
 */
export const getAttributesByJSXElement = (
  _ctx: Rule.RuleContext,
  node: JSXOpeningElement,
): Array<JSXAttribute> => (

  node.attributes.reduce<Array<JSXAttribute>>((acc: Array<JSXAttribute>, attribute) => {

    if (isJSXAttribute(attribute))
      acc.push(attribute)

    return acc
  }, [])
)


// =============================================================================
// Helpers
// =============================================================================

const getAttributeName = (attribute: JSXAttribute): string | undefined => {

  if (attribute.name.type === 'JSXIdentifier')
    return attribute.name.name

  if (attribute.name.type === 'JSXNamespacedName')
    return `${attribute.name.namespace.name}:${attribute.name.name.name}`
}

const getLiteralsByJSXAttributeValue = (
  ctx: Rule.RuleContext,
  value: JSXAttribute['value'],
): Array<Literal> => {

  if (!value)
    return []

  // String literal directly in attribute: className="..."
  // This is HTML context, cannot convert to template literal
  if (isESSimpleStringLiteral(value)) {

    const stringLiteral = getStringLiteralByJSXStringLiteral(ctx, value)

    if (stringLiteral)
      return [{ ...stringLiteral, contextIsJs: false }]
  }

  // String literal in JSX expression container: className={'...'}
  // This is JS context, can convert to template literal
  if (isJSXExpressionContainerWithESSimpleStringLiteral(value)) {

    const stringLiteral = getStringLiteralByJSXStringLiteral(ctx, value.expression)

    if (stringLiteral)
      return [{ ...stringLiteral, contextIsJs: true }]
  }

  // Template literal in JSX expression container: className={`...`}
  // Already in JS context
  if (isJSXExpressionContainerWithESTemplateLiteral(value))
    return getLiteralsByJSXTemplateLiteral(ctx, value.expression)

  return []
}

const getStringLiteralByJSXStringLiteral = (
  ctx: Rule.RuleContext,
  node: ESSimpleStringLiteral,
): Literal | undefined => {

  const literal = getStringLiteralByESStringLiteral(ctx, node)
  const multilineQuotes = getMultilineQuotes(node)

  if (!literal)
    return

  return {
    ...literal,
    ...multilineQuotes,
  }
}

const getLiteralsByJSXTemplateLiteral = (
  ctx: Rule.RuleContext,
  node: ESTemplateLiteral,
): Array<Literal> => {

  const literals = getLiteralsByESTemplateLiteral(ctx, node)

  return literals.map(literal => {

    if (!hasESNodeParentExtension(node))
      return literal

    const multilineQuotes = getMultilineQuotes(node)

    return {
      ...literal,
      ...multilineQuotes,
    }
  })
}

const getMultilineQuotes = (
  node: ESBaseNode,
): { multilineQuotes?: Array<LiteralValueQuotes>; surroundingBraces?: boolean } => {

  if (!hasESNodeParentExtension(node))
    return {}

  const surroundingBraces = JSX_CONTAINER_TYPES_TO_INSERT_BRACES.includes(node.parent.type)
  const multilineQuotes: Array<LiteralValueQuotes> = JSX_CONTAINER_TYPES_TO_REPLACE_QUOTES.includes(node.parent.type)
    ? ['`']
    : []

  return {
    multilineQuotes,
    surroundingBraces,
  }
}


// =============================================================================
// Type Guards
// =============================================================================

const isJSXExpressionContainerWithESSimpleStringLiteral = (
  node: JSXBaseNode,
): node is JSXExpressionContainer & { expression: ESSimpleStringLiteral } => (

  node.type === 'JSXExpressionContainer' &&
  'expression' in node &&
  isESNode(node.expression) &&
  isESSimpleStringLiteral(node.expression)
)

const isJSXExpressionContainerWithESTemplateLiteral = (
  node: JSXBaseNode,
): node is JSXExpressionContainer & { expression: ESTemplateLiteral } => (

  node.type === 'JSXExpressionContainer' &&
  'expression' in node &&
  isESNode(node.expression) &&
  isESTemplateLiteral(node.expression)
)

const isJSXAttribute = (node: JSXBaseNode): node is JSXAttribute => (

  node.type === 'JSXAttribute'
)
