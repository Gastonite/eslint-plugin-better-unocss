/**
 * ES/JavaScript literal extraction.
 * Adapted from eslint-plugin-better-tailwindcss (MIT license).
 */

import type { Rule } from 'eslint'
import type {
  ArrowFunctionExpression as ESArrowFunctionExpression,
  BaseNode as ESBaseNode,
  CallExpression as ESCallExpression,
  Expression as ESExpression,
  FunctionExpression as ESFunctionExpression,
  Identifier as ESIdentifier,
  MemberExpression as ESMemberExpression,
  Node as ESNode,
  SimpleLiteral as ESSimpleLiteral,
  SpreadElement as ESSpreadElement,
  TaggedTemplateExpression as ESTaggedTemplateExpression,
  TemplateElement as ESTemplateElement,
  TemplateLiteral as ESTemplateLiteral,
  VariableDeclarator as ESVariableDeclarator,
} from 'estree'

import type { Literal, LiteralValueQuotes } from '../types/literal'
import type {
  CalleeSelector,
  CallTarget,
  SelectorMatcher,
  TagSelector,
  VariableSelector,
} from '../types/selectors'
import { MatcherType } from '../types/selectors'

import {
  createObjectPathElement,
  deduplicateLiterals,
  getContent,
  getIndentation,
  getQuotes,
  getWhitespace,
  hasESNodeParentExtension,
  matchesName,
} from '../utils/helpers'
import {
  findMatchingParentNodes,
  getLiteralNodesByMatchers,
  isInsideConditionalExpressionTest,
  isInsideDisallowedBinaryExpression,
  isInsideLogicalExpressionLeft,
  isInsideMemberExpression,
  isInsideTaggedTemplateExpression,
  matchesPathPattern,
  type MatcherFunctions,
} from '../utils/matchers'



// =============================================================================
// Constants
// =============================================================================

export const ES_CONTAINER_TYPES_TO_REPLACE_QUOTES: Array<string> = [
  'ArrayExpression',
  'Property',
  'CallExpression',
  'VariableDeclarator',
  'ConditionalExpression',
  'LogicalExpression',
]


// =============================================================================
// Main Extraction Functions
// =============================================================================

/**
 * Extract literals from a variable declarator.
 */
export const getLiteralsByESVariableDeclarator = (
  ctx: Rule.RuleContext,
  node: ESVariableDeclarator,
  selectors: Array<VariableSelector>,
): Array<Literal> => {

  const literals = selectors.reduce<Array<Literal>>((acc, selector) => {

    if (!node.init)
      return acc

    if (!isESVariableSymbol(node.id))
      return acc

    if (!matchesName(selector.name, node.id.name))
      return acc

    if (!selector.match) {

      acc.push(...getLiteralsByESExpression(ctx, [node.init]))

      return acc
    }

    if (isESArrowFunctionExpression(node.init) || isESCallExpression(node.init) || isESFunctionExpression(node.init))
      return acc

    acc.push(...getLiteralsByESMatchers(ctx, node.init, selector.match))

    return acc
  }, [])

  return literals.filter(deduplicateLiterals)
}

/**
 * Extract literals from a call expression.
 */
export const getLiteralsByESCallExpression = (
  ctx: Rule.RuleContext,
  node: ESCallExpression,
  selectors: Array<CalleeSelector>,
): Array<Literal> => {

  if (isNestedCurriedCall(node))
    return []

  const callChain = getCurriedCallChain(node)

  if (!callChain)
    return []

  const { baseCalleeName, calls } = callChain

  const literals = selectors.reduce<Array<Literal>>((acc, selector) => {

    const selectorName = selector.path ?? selector.name

    if (!selectorName || !matchesName(selectorName, baseCalleeName))
      return acc

    const targetCalls = getTargetCalls(calls, selector.callTarget)

    for (const targetCall of targetCalls) {

      if (!selector.match) {

        acc.push(...getLiteralsByESExpression(ctx, targetCall.arguments))
        continue
      }

      acc.push(...getLiteralsByESMatchers(ctx, targetCall, selector.match))
    }

    return acc
  }, [])

  return literals.filter(deduplicateLiterals)
}

/**
 * Extract literals from a tagged template expression.
 */
export const getLiteralsByTaggedTemplateExpression = (
  ctx: Rule.RuleContext,
  node: ESTaggedTemplateExpression,
  selectors: Array<TagSelector>,
): Array<Literal> => {

  const literals = selectors.reduce<Array<Literal>>((acc, selector) => {

    if (!isTaggedTemplateSymbol(node.tag))
      return acc

    if (!matchesName(selector.name, node.tag.name))
      return acc

    if (!selector.match) {

      // Get the tag name and store full range (including tag) separately
      const tagName = node.tag.name
      const taggedLiterals = getLiteralsByESTemplateLiteral(ctx, node.quasi).map(literal => ({
        ...literal,
        existingTag: tagName,
        // Store full range for rules that need to replace the entire expression
        fullRange: node.range as [number, number],
      }))

      acc.push(...taggedLiterals)

      return acc
    }

    acc.push(...getLiteralsByESMatchers(ctx, node, selector.match))

    return acc
  }, [])

  return literals.filter(deduplicateLiterals)
}


// =============================================================================
// Literal Extraction Helpers
// =============================================================================

/**
 * Extract literals from any literal node type.
 */
export const getLiteralsByESLiteralNode = (
  ctx: Rule.RuleContext,
  node: ESBaseNode,
): Array<Literal> => {

  if (isESSimpleStringLiteral(node)) {

    const literal = getStringLiteralByESStringLiteral(ctx, node)

    return literal ? [literal] : []
  }

  if (isESTemplateLiteral(node))
    return getLiteralsByESTemplateLiteral(ctx, node)

  if (isESTemplateElement(node) && hasESNodeParentExtension(node)) {

    // Skip if parent TemplateLiteral has expressions (interpolations)
    const parent = node.parent
    if (parent && isESTemplateLiteral(parent) && parent.expressions.length > 0)
      return []

    const literal = getLiteralByESTemplateElement(ctx, node)

    return literal ? [literal] : []
  }

  return []
}

/**
 * Extract literals using matchers.
 */
export const getLiteralsByESMatchers = (
  ctx: Rule.RuleContext,
  node: ESBaseNode,
  matchers: Array<SelectorMatcher>,
): Array<Literal> => {

  const matcherFunctions = getESMatcherFunctions(matchers)
  const literalNodes = getLiteralNodesByMatchers(ctx, node, matcherFunctions)
  const literals = literalNodes.flatMap(literalNode => getLiteralsByESLiteralNode(ctx, literalNode))

  return literals.filter(deduplicateLiterals)
}

/**
 * Extract a StringLiteral from an ES string literal node.
 */
export const getStringLiteralByESStringLiteral = (
  ctx: Rule.RuleContext,
  node: ESSimpleStringLiteral,
): Literal | undefined => {

  const raw = node.raw

  if (!raw || !node.loc || !node.range || !node.parent.loc || !node.parent.range)
    return

  const line = ctx.sourceCode.lines[node.loc.start.line - 1]

  const quotes = getQuotes(raw)
  const priorLiterals = findPriorLiterals(ctx, node)
  const content = getContent(raw, quotes)
  const whitespaces = getWhitespace(content)
  const indentation = getIndentation(line)
  const multilineQuotes = getMultilineQuotes(node)
  const supportsMultiline = !isESObjectKey(node)
  const concatenation = getStringConcatenationMeta(node)

  return {
    ...quotes,
    ...whitespaces,
    ...multilineQuotes,
    ...concatenation,
    content,
    contextIsJs: true,
    indentation,
    isInterpolated: false,
    loc: node.loc,
    priorLiterals,
    range: node.range,
    raw,
    supportsMultiline,
    type: 'StringLiteral',
  }
}

/**
 * Extract a TemplateLiteral from an ES template element.
 */
const getLiteralByESTemplateElement = (
  ctx: Rule.RuleContext,
  node: ESTemplateElement & Rule.Node,
): Literal | undefined => {

  const raw = ctx.sourceCode.getText(node)

  if (!raw || !node.loc || !node.range || !node.parent.loc || !node.parent.range)
    return

  const line = ctx.sourceCode.lines[node.parent.loc.start.line - 1]

  const quotes = getQuotes(raw)
  const braces = getBracesByString(raw)
  const isInterpolated = getIsInterpolated(raw)
  const priorLiterals = findPriorLiterals(ctx, node)
  const content = getContent(raw, quotes, braces)
  const whitespaces = getWhitespace(content)
  const indentation = getIndentation(line)
  const multilineQuotes = getMultilineQuotes(node)
  const concatenation = getStringConcatenationMeta(node)

  return {
    ...whitespaces,
    ...quotes,
    ...braces,
    ...multilineQuotes,
    ...concatenation,
    content,
    contextIsJs: true,
    indentation,
    isInterpolated,
    loc: node.loc,
    priorLiterals,
    range: node.range,
    raw,
    supportsMultiline: true,
    type: 'TemplateLiteral',
  }
}

/**
 * Get multiline quote metadata.
 */
const getMultilineQuotes = (
  node: ESNode & Rule.NodeParentExtension,
): { multilineQuotes?: Array<LiteralValueQuotes>; surroundingBraces?: boolean } => {

  const surroundingBraces = false
  const multilineQuotes: Array<LiteralValueQuotes> = ES_CONTAINER_TYPES_TO_REPLACE_QUOTES.includes(node.parent.type)
    ? ['`']
    : []

  return {
    multilineQuotes,
    surroundingBraces,
  }
}

/**
 * Extract literals from expressions.
 */
const getLiteralsByESExpression = (
  ctx: Rule.RuleContext,
  args: Array<ESExpression | ESSpreadElement>,
): Array<Literal> => (

  args.reduce<Array<Literal>>((acc, node) => {

    if (node.type === 'SpreadElement')
      return acc

    acc.push(...getLiteralsByESLiteralNode(ctx, node))

    return acc
  }, [])
)

/**
 * Extract literals from a template literal.
 * Skip template literals with expressions (interpolations) as they're too complex to handle.
 */
export const getLiteralsByESTemplateLiteral = (
  ctx: Rule.RuleContext,
  node: ESTemplateLiteral,
): Array<Literal> => {

  // Skip template literals with interpolations - too complex to lint/fix safely
  if (node.expressions.length > 0)
    return []

  return node.quasis
    .map(quasi => {

      if (!hasESNodeParentExtension(quasi))
        return

      return getLiteralByESTemplateElement(ctx, quasi)
    })
    .filter((literal): literal is Literal => literal !== undefined)
}

/**
 * Find the parent template literal of a template element.
 */
export const findParentESTemplateLiteralByESTemplateElement = (
  node: ESNode,
): ESTemplateLiteral | undefined => {

  if (!hasESNodeParentExtension(node))
    return

  const parent = node.parent as ESNode

  if (parent.type === 'TemplateLiteral')
    return parent as ESTemplateLiteral

  return findParentESTemplateLiteralByESTemplateElement(parent)
}

/**
 * Find prior literals in concatenation.
 */
const findPriorLiterals = (
  ctx: Rule.RuleContext,
  node: ESNode,
): Array<Literal> | undefined => {

  if (!hasESNodeParentExtension(node))
    return

  const priorLiterals: Array<Literal> = []
  let currentNode: ESNode = node

  while (hasESNodeParentExtension(currentNode)) {

    const parent = currentNode.parent

    if (isESCallExpression(parent))
      break

    if (isESArrowFunctionExpression(parent))
      break

    if (isESFunctionExpression(parent))
      break

    if (isESVariableDeclarator(parent))
      break

    if (parent.type === 'TemplateLiteral') {

      for (const quasi of parent.quasis) {

        if (quasi.range === node.range)
          break

        if (quasi.type === 'TemplateElement' && hasESNodeParentExtension(quasi)) {

          const literal = getLiteralByESTemplateElement(ctx, quasi)

          if (!literal)
            continue

          priorLiterals.push(literal)
        }
      }
    }

    if (parent.type === 'TemplateElement') {

      const literal = getLiteralByESTemplateElement(ctx, parent)

      if (!literal)
        continue

      priorLiterals.push(literal)
    }

    if (parent.type === 'Literal') {

      const literal = getLiteralsByESLiteralNode(ctx, parent)

      if (!literal)
        continue

      priorLiterals.push(...literal)
    }

    currentNode = parent
  }

  return priorLiterals
}


// =============================================================================
// Object Path
// =============================================================================

/**
 * Get the object path for a node (for CVA variants matching).
 */
export const getESObjectPath = (node: ESNode): string | undefined => {

  if (!hasESNodeParentExtension(node))
    return

  if (
    node.type !== 'Property' &&
    node.type !== 'ObjectExpression' &&
    node.type !== 'ArrayExpression' &&
    node.type !== 'Identifier' &&
    node.type !== 'Literal' &&
    node.type !== 'TemplateElement'
  )
    return

  const paths: Array<string | undefined> = []

  if (node.type === 'Property') {

    const propertyNode = node as ESNode & { key: ESNode & { name?: string; value?: unknown; raw?: string } }

    if (propertyNode.key.type === 'Identifier')
      paths.unshift(createObjectPathElement(propertyNode.key.name))
    else if (propertyNode.key.type === 'Literal')
      paths.unshift(createObjectPathElement(propertyNode.key.value?.toString() ?? propertyNode.key.raw))
    else
      return ''
  }

  if (isESStringLike(node) && isInsideObjectValue(node)) {

    // Note: cast needed due to ESLint/estree type incompatibility
    const property = findMatchingParentNodes<ESNode>(node as unknown as { parent: object }, [(n): n is ESNode => (
      isESNode(n) && n.type === 'Property'
    )])[0]

    if (property)
      return getESObjectPath(property)

    return
  }

  if (isESObjectKey(node)) {

    const property = node.parent as ESNode

    return getESObjectPath(property)
  }

  const parent = node.parent as ESNode

  if (parent.type === 'ArrayExpression' && node.type !== 'Property' && node.type !== 'TemplateElement') {

    const arrayParent = parent as ESNode & { elements: Array<ESNode> }
    const index = arrayParent.elements.indexOf(node)
    paths.unshift(`[${index}]`)
  }

  paths.unshift(getESObjectPath(parent))

  return paths.reduce<Array<string>>((acc, currentPath) => {

    if (!currentPath)
      return acc

    if (acc.length === 0)
      return [currentPath]

    if (currentPath.startsWith('[') && currentPath.endsWith(']'))
      return [...acc, currentPath]

    return [...acc, '.', currentPath]
  }, []).join('')
}


// =============================================================================
// Type Guards
// =============================================================================

export type ESSimpleStringLiteral = Rule.NodeParentExtension & ESSimpleLiteral & {
  value: string
}

export const isESObjectKey = (node: ESBaseNode): boolean => {

  if (!hasESNodeParentExtension(node))
    return false

  const parent = node.parent as ESNode & { key?: ESNode; parent?: ESNode & { type?: string } }

  return (
    parent.type === 'Property' &&
    parent.parent?.type === 'ObjectExpression' &&
    parent.key === node
  )
}

export const isInsideObjectValue = (node: ESNode): boolean => {

  if (!hasESNodeParentExtension(node))
    return false

  // Allow call expressions as object values
  if (isESCallExpression(node))
    return false

  if (isESArrowFunctionExpression(node))
    return false

  if (isESFunctionExpression(node))
    return false

  const parent = node.parent as ESNode & { value?: ESNode; parent?: ESNode & { type?: string } }

  if (
    parent.type === 'Property' &&
    parent.parent?.type === 'ObjectExpression' &&
    parent.value === node
  )
    return true

  return isInsideObjectValue(node.parent)
}

export const isESSimpleStringLiteral = (node: ESBaseNode): node is ESSimpleStringLiteral => (

  node.type === 'Literal' &&
  'value' in node &&
  typeof node.value === 'string'
)

export const isESStringLike = (node: ESBaseNode): node is ESSimpleStringLiteral | ESTemplateElement => (

  isESSimpleStringLiteral(node) || isESTemplateElement(node)
)

export const isESTemplateLiteral = (node: ESBaseNode): node is ESTemplateLiteral => (

  node.type === 'TemplateLiteral'
)

export const isESTemplateElement = (node: ESBaseNode): node is ESTemplateElement => (

  node.type === 'TemplateElement'
)

export const isESNode = (node: unknown): node is ESNode => (

  node !== null &&
  typeof node === 'object' &&
  'type' in node
)

export const isESCallExpression = (node: ESBaseNode): node is ESCallExpression => (

  node.type === 'CallExpression'
)

export const isESArrowFunctionExpression = (node: ESBaseNode): node is ESArrowFunctionExpression => (

  node.type === 'ArrowFunctionExpression'
)

export const isESFunctionExpression = (node: ESBaseNode): node is ESFunctionExpression => (

  node.type === 'FunctionExpression'
)

export const isESVariableDeclarator = (node: ESBaseNode): node is ESVariableDeclarator => (

  node.type === 'VariableDeclarator'
)

// =============================================================================
// Callee Helpers
// =============================================================================

const getESMemberExpressionPropertyName = (node: ESMemberExpression): string | undefined => {

  if (!node.computed && node.property.type === 'Identifier')
    return node.property.name

  if (node.computed && isESSimpleStringLiteral(node.property))
    return node.property.value
}

const getESCalleeName = (node: ESBaseNode): string | undefined => {

  if (node.type === 'Identifier' && 'name' in node && typeof node.name === 'string')
    return node.name

  if (node.type === 'MemberExpression' && 'object' in node) {

    const memberNode = node as ESMemberExpression

    if (memberNode.object.type === 'Super')
      return

    const object = getESCalleeName(memberNode.object as ESBaseNode)
    const property = getESMemberExpressionPropertyName(memberNode)

    if (!object || !property)
      return

    return `${object}.${property}`
  }

  if (node.type === 'ChainExpression' && 'expression' in node)
    return getESCalleeName(node.expression as ESBaseNode)
}

const isNestedCurriedCall = (node: ESCallExpression): boolean => (

  hasESNodeParentExtension(node) && isESCallExpression(node.parent) && node.parent.callee === node
)

const getCurriedCallChain = (
  node: ESCallExpression,
): { baseCalleeName: string; calls: Array<ESCallExpression> } | undefined => {

  const calls: Array<ESCallExpression> = [node]
  let currentCall: ESCallExpression = node

  while (isESCallExpression(currentCall.callee)) {

    currentCall = currentCall.callee
    calls.unshift(currentCall)
  }

  const baseCalleeName = getESCalleeName(currentCall.callee)

  if (!baseCalleeName)
    return

  return {
    baseCalleeName,
    calls,
  }
}

const getTargetCalls = (
  calls: Array<ESCallExpression>,
  callTarget: CallTarget | undefined,
): Array<ESCallExpression> => {

  if (calls.length === 0)
    return []

  if (callTarget === 'all')
    return calls

  if (callTarget === 'last')
    return [calls[calls.length - 1]]

  if (callTarget === undefined || callTarget === 'first')
    return [calls[0]]

  const index = callTarget >= 0
    ? callTarget
    : calls.length + callTarget

  if (index < 0 || index >= calls.length)
    return []

  return [calls[index]]
}

const isTaggedTemplateExpression = (node: ESBaseNode): node is ESTaggedTemplateExpression => (

  node.type === 'TaggedTemplateExpression'
)

const isTaggedTemplateSymbol = (node: ESBaseNode & Partial<Rule.NodeParentExtension>): node is ESIdentifier => (

  node.type === 'Identifier' && !!node.parent && isTaggedTemplateExpression(node.parent)
)

const isESVariableSymbol = (node: ESBaseNode & Partial<Rule.NodeParentExtension>): node is ESIdentifier => (

  node.type === 'Identifier' && !!node.parent && isESVariableDeclarator(node.parent)
)


// =============================================================================
// Braces & Interpolation
// =============================================================================

const getBracesByString = (raw: string): {
  closingBraces?: string
  openingBraces?: string
} => {

  const closingBraces = raw.trim().startsWith('}') ? '}' : undefined
  const openingBraces = raw.trim().endsWith('${') ? '${' : undefined

  return {
    closingBraces,
    openingBraces,
  }
}

const getIsInterpolated = (raw: string): boolean => {

  const braces = getBracesByString(raw)

  return !!braces.closingBraces || !!braces.openingBraces
}

const getStringConcatenationMeta = (
  node: ESNode,
  isConcatenatedLeft = false,
  isConcatenatedRight = false,
): { isConcatenatedLeft: boolean; isConcatenatedRight: boolean } => {

  if (!hasESNodeParentExtension(node)) {

    return {
      isConcatenatedLeft,
      isConcatenatedRight,
    }
  }

  const parent = node.parent

  if (parent.type === 'BinaryExpression' && parent.operator === '+') {

    return getStringConcatenationMeta(
      parent,
      isConcatenatedLeft || parent.right === node,
      isConcatenatedRight || parent.left === node,
    )
  }

  return getStringConcatenationMeta(parent, isConcatenatedLeft, isConcatenatedRight)
}


// =============================================================================
// Matcher Functions
// =============================================================================

const getESMatcherFunctions = (matchers: Array<SelectorMatcher>): MatcherFunctions<ESNode> => (

  matchers.reduce<MatcherFunctions<ESNode>>((matcherFunctions, matcher) => {

    switch (matcher.type) {

      case MatcherType.String: {

        matcherFunctions.push((node): node is ESNode => {

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

          return isESStringLike(node)
        })
        break
      }

      case MatcherType.ObjectKey: {

        matcherFunctions.push((node): node is ESNode => {

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

        matcherFunctions.push((node): node is ESNode => {

          if (
            !isESNode(node) ||
            !hasESNodeParentExtension(node) ||
            !isInsideObjectValue(node) ||

            isInsideDisallowedBinaryExpression(node) ||
            isInsideConditionalExpressionTest(node) ||
            isInsideLogicalExpressionLeft(node) ||
            isESObjectKey(node) ||
            isIndexedAccessLiteral(node) ||

            !isESStringLike(node)
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

/**
 * Check if a node is an indexed access literal.
 */
const isIndexedAccessLiteral = (node: ESNode): boolean => {

  if (!hasESNodeParentExtension(node))
    return false

  if (node.parent.type !== 'MemberExpression')
    return false

  const memberExpr = node.parent as ESNode & { property: ESNode }

  return memberExpr.property === node && isESSimpleStringLiteral(node)
}
