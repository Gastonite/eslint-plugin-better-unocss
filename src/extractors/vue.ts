/**
 * Vue literal extraction.
 * Adapted from eslint-plugin-better-tailwindcss (MIT license).
 */

import type { Rule } from 'eslint'
import type { BaseNode as ESBaseNode, Node as ESNode } from 'estree'
import type { AST } from 'vue-eslint-parser'

import type { Literal, LiteralValueQuotes } from '../types/literal'
import type { AttributeSelector, SelectorMatcher } from '../types/selectors'
import { MatcherType } from '../types/selectors'

import {
  addAttribute,
  deduplicateLiterals,
  getContent,
  getIndentation,
  getQuotes,
  getWhitespace,
  matchesName,
} from '../utils/helpers'
import {
  getLiteralNodesByMatchers,
  isInsideConditionalExpressionTest,
  isInsideDisallowedBinaryExpression,
  isInsideLogicalExpressionLeft,
  isInsideMemberExpression,
  isInsideTaggedTemplateExpression,
  matchesPathPattern,
  type MatcherFunctions,
} from '../utils/matchers'
import { hasESNodeParentExtension } from '../utils/helpers'
import {
  ES_CONTAINER_TYPES_TO_REPLACE_QUOTES,
  getESObjectPath,
  getLiteralsByESLiteralNode,
  isESNode,
  isESObjectKey,
  isESStringLike,
  isInsideObjectValue,
} from './es'



// =============================================================================
// Constants
// =============================================================================

export const VUE_CONTAINER_TYPES_TO_REPLACE_QUOTES = [
  ...ES_CONTAINER_TYPES_TO_REPLACE_QUOTES,
]

export const VUE_CONTAINER_TYPES_TO_INSERT_BRACES: Array<string> = []


// =============================================================================
// Main Extraction Functions
// =============================================================================

/**
 * Get all attributes from a Vue start tag.
 */
export const getAttributesByVueStartTag = (
  _ctx: Rule.RuleContext,
  node: AST.VStartTag,
): Array<AST.VAttribute | AST.VDirective> => (

  node.attributes
)

/**
 * Extract literals from a Vue attribute.
 */
export const getLiteralsByVueAttribute = (
  ctx: Rule.RuleContext,
  attribute: AST.VAttribute | AST.VDirective,
  selectors: Array<AttributeSelector>,
): Array<Literal> => {

  if (attribute.value === null)
    return []

  const name = getVueAttributeName(attribute)
  const value = attribute.value

  const literals = selectors.reduce<Array<Literal>>((acc, selector) => {

    if (!matchesName(getVueBoundName(selector.name).toLowerCase(), name?.toLowerCase()))
      return acc

    if (!selector.match) {

      acc.push(...getLiteralsByVueLiteralNode(ctx, value as ESBaseNode))

      return acc
    }

    acc.push(...getLiteralsByVueMatchers(ctx, value as ESBaseNode, selector.match))

    return acc
  }, [])

  return literals
    .filter(deduplicateLiterals)
    .map(addAttribute(name))
}


// =============================================================================
// Literal Extraction Helpers
// =============================================================================

const getLiteralsByVueLiteralNode = (
  ctx: Rule.RuleContext,
  node: ESBaseNode,
): Array<Literal> => {

  if (!hasESNodeParentExtension(node))
    return []

  if (isVueLiteralNode(node)) {

    const literal = getStringLiteralByVueStringLiteral(ctx, node)

    return [literal]
  }

  if (isESStringLike(node))
    return getLiteralsByVueESLiteralNode(ctx, node)

  return []
}

const getLiteralsByVueMatchers = (
  ctx: Rule.RuleContext,
  node: ESBaseNode,
  matchers: Array<SelectorMatcher>,
): Array<Literal> => {

  const matcherFunctions = getVueMatcherFunctions(matchers)
  const literalNodes = getLiteralNodesByMatchers(ctx, node, matcherFunctions)
  const literals = literalNodes.flatMap(literalNode => getLiteralsByVueLiteralNode(ctx, literalNode))

  return literals.filter(deduplicateLiterals)
}

const getLiteralsByVueESLiteralNode = (
  ctx: Rule.RuleContext,
  node: ESBaseNode,
): Array<Literal> => {

  const literals = getLiteralsByESLiteralNode(ctx, node)

  return literals.map(literal => {

    const multilineQuotes = getMultilineQuotes(node)

    return {
      ...literal,
      ...multilineQuotes,
      contextIsJs: true, // JS expression in Vue binding, can convert to template literal
    }
  })
}

const getStringLiteralByVueStringLiteral = (
  ctx: Rule.RuleContext,
  node: AST.VLiteral,
): Literal => {

  const raw = ctx.sourceCode.getText(node as unknown as ESNode)
  const line = ctx.sourceCode.lines[node.loc.start.line - 1]

  const quotes = getQuotes(raw)
  const content = getContent(raw, quotes)
  const whitespaces = getWhitespace(content)
  const indentation = getIndentation(line)
  const multilineQuotes = getMultilineQuotes(node as unknown as ESBaseNode)

  return {
    ...whitespaces,
    ...quotes,
    ...multilineQuotes,
    content,
    contextIsJs: false, // Static HTML attribute, cannot convert to template literal
    indentation,
    loc: node.loc,
    priorLiterals: [],
    range: [node.range[0], node.range[1]],
    raw,
    supportsMultiline: true,
    type: 'StringLiteral',
  }
}

const getMultilineQuotes = (
  node: ESBaseNode,
): { multilineQuotes?: Array<LiteralValueQuotes>; surroundingBraces?: boolean } => {

  if (!hasESNodeParentExtension(node))
    return {}

  const surroundingBraces = VUE_CONTAINER_TYPES_TO_INSERT_BRACES.includes(node.parent.type)
  const multilineQuotes: Array<LiteralValueQuotes> = VUE_CONTAINER_TYPES_TO_REPLACE_QUOTES.includes(node.parent.type)
    ? ['`']
    : []

  return {
    multilineQuotes,
    surroundingBraces,
  }
}


// =============================================================================
// Name Helpers
// =============================================================================

const getVueBoundName = (name: string): string => (

  name.startsWith(':') ? `v-bind:${name.slice(1)}` : name
)

const getVueAttributeName = (attribute: AST.VAttribute | AST.VDirective): string | undefined => {

  if (isVueAttribute(attribute))
    return attribute.key.name

  if (isVueDirective(attribute)) {

    if (attribute.key.argument?.type === 'VIdentifier')
      return `v-${attribute.key.name.name}:${attribute.key.argument.name}`
  }
}


// =============================================================================
// Type Guards
// =============================================================================

const isVueAttribute = (attribute: AST.VAttribute | AST.VDirective): attribute is AST.VAttribute => (

  attribute.key.type === 'VIdentifier'
)

const isVueDirective = (attribute: AST.VAttribute | AST.VDirective): attribute is AST.VDirective => (

  attribute.key.type === 'VDirectiveKey'
)

const isVueLiteralNode = (node: ESBaseNode): node is AST.VLiteral => (

  node.type === 'VLiteral'
)


// =============================================================================
// Matcher Functions
// =============================================================================

/**
 * Check if a node is an indexed access literal.
 * Also handles cases like sizes[props.size ?? 'md'] where the string is inside an expression used as index.
 */
const isIndexedAccessLiteral = (node: ESNode): boolean => {

  if (!hasESNodeParentExtension(node))
    return false

  // Direct case: sizes['md']
  if (node.parent.type === 'MemberExpression') {

    const memberExpr = node.parent as ESNode & { property: ESNode; computed: boolean }

    return memberExpr.property === node && memberExpr.computed
  }

  // Indirect case: sizes[props.size ?? 'md'] or sizes[condition || 'md']
  // The string is inside an expression (LogicalExpression) that is used as index
  if (
    node.parent.type === 'LogicalExpression' ||
    node.parent.type === 'ConditionalExpression'
  )
    return isInsideMemberExpressionProperty(node.parent)

  return false
}

/**
 * Check if a node is used as the computed property of a MemberExpression.
 */
const isInsideMemberExpressionProperty = (node: ESNode): boolean => {

  if (!hasESNodeParentExtension(node))
    return false

  if (node.parent.type === 'MemberExpression') {

    const memberExpr = node.parent as ESNode & { property: ESNode; computed: boolean }

    return memberExpr.property === node && memberExpr.computed
  }

  // Keep going up through logical/conditional expressions
  if (
    node.parent.type === 'LogicalExpression' ||
    node.parent.type === 'ConditionalExpression'
  )
    return isInsideMemberExpressionProperty(node.parent)

  return false
}

const getVueMatcherFunctions = (matchers: Array<SelectorMatcher>): MatcherFunctions<ESBaseNode> => (

  matchers.reduce<MatcherFunctions<ESBaseNode>>((matcherFunctions, matcher) => {

    switch (matcher.type) {

      case MatcherType.String: {

        matcherFunctions.push((node): node is ESBaseNode => {

          if (
            !isESNode(node) ||
            !hasESNodeParentExtension(node) ||

            isInsideDisallowedBinaryExpression(node) ||
            isInsideConditionalExpressionTest(node) ||
            isInsideLogicalExpressionLeft(node) ||
            isIndexedAccessLiteral(node) ||
            isInsideTaggedTemplateExpression(node) || // Handled by TaggedTemplateExpression listener

            isESObjectKey(node) ||
            isInsideObjectValue(node)
          )
            return false

          return isESStringLike(node) || isVueLiteralNode(node)
        })
        break
      }

      case MatcherType.ObjectKey: {

        matcherFunctions.push((node): node is ESBaseNode => {

          if (
            !isESNode(node) ||
            !hasESNodeParentExtension(node) ||
            !isESObjectKey(node) ||

            isInsideDisallowedBinaryExpression(node) ||
            isInsideConditionalExpressionTest(node) ||
            isInsideLogicalExpressionLeft(node) ||
            isInsideMemberExpression(node) ||
            isIndexedAccessLiteral(node)
          )
            return false

          const path = getESObjectPath(node)

          if (!path || !matcher.path)
            return true

          return matchesPathPattern(path, matcher.path)
        })
        break
      }

      case MatcherType.ObjectValue: {

        matcherFunctions.push((node): node is ESBaseNode => {

          if (
            !isESNode(node) ||
            !hasESNodeParentExtension(node) ||
            !isInsideObjectValue(node) ||

            isInsideDisallowedBinaryExpression(node) ||
            isInsideConditionalExpressionTest(node) ||
            isInsideLogicalExpressionLeft(node) ||
            isESObjectKey(node) ||
            isIndexedAccessLiteral(node) ||

            (!isESStringLike(node) && !isVueLiteralNode(node))
          )
            return false

          const path = getESObjectPath(node)

          if (!path || !matcher.path)
            return true

          return matchesPathPattern(path, matcher.path)
        })
        break
      }
    }

    return matcherFunctions
  }, [])
)
