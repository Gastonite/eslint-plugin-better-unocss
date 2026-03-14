/**
 * Matcher utilities for finding literal nodes in AST.
 * Adapted from eslint-plugin-better-tailwindcss (MIT license).
 */

import type { Rule } from 'eslint'
import type { Node as ESNode } from 'estree'

import { hasESNodeParentExtension, isGenericNodeWithParent, type GenericNodeWithParent } from './helpers'



// =============================================================================
// Types
// =============================================================================

export type MatcherFunction<Node> = (node: unknown) => node is Node
export type MatcherFunctions<Node> = Array<MatcherFunction<Node>>

export type WithParent<T> = T & { parent: WithParent<T> }


// =============================================================================
// Core Matching Functions
// =============================================================================

/**
 * Get all literal nodes that match the given matcher functions.
 */
export const getLiteralNodesByMatchers = <Node>(
  _ctx: Rule.RuleContext,
  node: unknown,
  matcherFunctions: MatcherFunctions<Node>,
  deadEnd?: (node: unknown) => boolean,
): Array<Node> => {

  if (!isGenericNodeWithParent(node))
    return []

  const nestedLiterals = findMatchingNestedNodes<Node>(node, matcherFunctions, deadEnd)
  const self = nodeMatches<Node>(node, matcherFunctions) ? [node] : []

  return [...nestedLiterals, ...self]
}

/**
 * Find all nested nodes that match the given matcher functions.
 */
export const findMatchingNestedNodes = <Node>(
  node: GenericNodeWithParent,
  matcherFunctions: MatcherFunctions<Node>,
  deadEnd?: (node: unknown) => boolean,
): Array<Node> => (

  Object.entries(node).reduce<Array<Node>>((matchedNodes, [key, value]) => {

    if (!value || typeof value !== 'object' || key === 'parent')
      return matchedNodes

    if (deadEnd?.(value))
      return matchedNodes

    if (nodeMatches(value, matcherFunctions))
      matchedNodes.push(value)

    // Handle arrays (e.g., arguments, elements)
    if (Array.isArray(value)) {

      for (const item of value) {

        if (nodeMatches(item, matcherFunctions))
          matchedNodes.push(item)

        if (isGenericNodeWithParent(item))
          matchedNodes.push(...findMatchingNestedNodes(item, matcherFunctions, deadEnd))
      }
    }
    else if (isGenericNodeWithParent(value)) {

      matchedNodes.push(...findMatchingNestedNodes(value, matcherFunctions, deadEnd))
    }

    return matchedNodes
  }, [])
)

/**
 * Find parent nodes that match the given matcher functions.
 */
export const findMatchingParentNodes = <Node>(
  node: Partial<GenericNodeWithParent>,
  matcherFunctions: MatcherFunctions<Node>,
): Array<Node> => {

  if (!isGenericNodeWithParent(node))
    return []

  if (nodeMatches(node.parent, matcherFunctions))
    return [node.parent]

  return findMatchingParentNodes(node.parent, matcherFunctions)
}

/**
 * Check if a node matches any of the matcher functions.
 */
export const nodeMatches = <Node>(
  node: unknown,
  matcherFunctions: MatcherFunctions<Node>,
): node is Node => {

  for (const matcherFunction of matcherFunctions) {

    if (matcherFunction(node))
      return true
  }

  return false
}


// =============================================================================
// Path Matching
// =============================================================================

/**
 * Check if a path matches a regex pattern.
 */
export const matchesPathPattern = (path: string, pattern: string): boolean => {

  const regex = new RegExp(pattern)

  return regex.test(path)
}


// =============================================================================
// Expression Position Checks
// =============================================================================

/**
 * Check if node is inside a conditional expression test (the condition part).
 */
export const isInsideConditionalExpressionTest = (node: ESNode): boolean => {

  if (!hasESNodeParentExtension(node))
    return false

  if (node.parent.type === 'ConditionalExpression' && node.parent.test === node)
    return true

  return isInsideConditionalExpressionTest(node.parent)
}

/**
 * Check if node is inside a disallowed binary expression (not string concat).
 */
export const isInsideDisallowedBinaryExpression = (node: ESNode): boolean => {

  if (!hasESNodeParentExtension(node))
    return false

  if (
    node.parent.type === 'BinaryExpression' &&
    node.parent.operator !== '+' // allow string concatenation
  )
    return true

  return isInsideDisallowedBinaryExpression(node.parent)
}

/**
 * Check if node is on the left side of a logical expression.
 */
export const isInsideLogicalExpressionLeft = (node: ESNode): boolean => {

  if (!hasESNodeParentExtension(node))
    return false

  if (node.parent.type === 'LogicalExpression' && node.parent.left === node)
    return true

  return isInsideLogicalExpressionLeft(node.parent)
}

/**
 * Check if node is inside a member expression.
 */
export const isInsideMemberExpression = (node: ESNode): boolean => {

  if (!hasESNodeParentExtension(node))
    return false

  if (node.parent.type === 'MemberExpression')
    return true

  return isInsideMemberExpression(node.parent)
}

/**
 * Check if node is a TemplateElement/TemplateLiteral inside a TaggedTemplateExpression.
 * These are handled by the TaggedTemplateExpression listener, not attribute matchers.
 */
export const isInsideTaggedTemplateExpression = (node: ESNode): boolean => {

  if (!hasESNodeParentExtension(node))
    return false

  // TemplateElement -> TemplateLiteral -> TaggedTemplateExpression
  if (node.type === 'TemplateElement' && node.parent.type === 'TemplateLiteral') {

    const templateLiteral = node.parent

    if (hasESNodeParentExtension(templateLiteral) && templateLiteral.parent.type === 'TaggedTemplateExpression')
      return true
  }

  // TemplateLiteral -> TaggedTemplateExpression
  if (node.type === 'TemplateLiteral' && node.parent.type === 'TaggedTemplateExpression')
    return true

  return false
}
