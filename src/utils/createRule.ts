/**
 * Factory for creating ESLint rules with unified selector extraction.
 * Handles all visitors automatically (ES, JSX, Vue).
 */

import type { Rule } from 'eslint'
import type { CallExpression, TaggedTemplateExpression, VariableDeclarator } from 'estree'
import type { JSXAttribute } from 'estree-jsx'
import type { AST as VAST } from 'vue-eslint-parser'

import type { Literal } from '../types/literal'
import type {
  AttributeSelector,
  CalleeSelector,
  Selector,
  TagSelector,
  VariableSelector,
} from '../types/selectors'
import { SelectorKind } from '../types/selectors'

import {
  getLiteralsByESCallExpression,
  getLiteralsByESVariableDeclarator,
  getLiteralsByTaggedTemplateExpression,
} from '../extractors/es'
import { getLiteralsByJSXAttribute } from '../extractors/jsx'
import { getLiteralsByVueAttribute } from '../extractors/vue'
import { DEFAULT_SELECTORS } from '../selectors/defaults'



// =============================================================================
// Types
// =============================================================================

export type CreateRuleOptions<
  TMessageIds extends string,
  TOptions extends object,
> = {
  name: string
  meta: {
    type: 'layout' | 'problem' | 'suggestion'
    docs: {
      description: string
      recommended?: boolean
    }
    fixable?: 'code' | 'whitespace'
    messages: Record<TMessageIds, string>
    schema: Array<Record<string, unknown>>
  }
  defaultOptions: TOptions
  /**
   * Optional initialization hook.
   * Called once when the rule is created, before any linting.
   * Use for setup that should happen once (e.g., loading config, creating caches).
   */
  initialize?: (ctx: Rule.RuleContext, options: TOptions) => void
  /**
   * Main callback that receives extracted literals.
   * Implement your linting logic here.
   */
  lintLiterals: (
    ctx: Rule.RuleContext,
    literals: Array<Literal>,
    options: TOptions,
  ) => void
}

export type RuleOptionsWithSelectors = {
  selectors?: Array<Selector>
}


// =============================================================================
// Selector Filtering
// =============================================================================

const filterByKind = <T extends Selector>(
  selectors: Array<Selector>,
  kind: SelectorKind,
): Array<T> => (

  selectors.filter(s => s.kind === kind) as Array<T>
)


// =============================================================================
// Main Factory
// =============================================================================

export const createRule = <
  TMessageIds extends string,
  TOptions extends RuleOptionsWithSelectors,
>(
  opts: CreateRuleOptions<TMessageIds, TOptions>,
): Rule.RuleModule => ({

  meta: opts.meta,

  create(context) {

    const userOptions = context.options[0] as Partial<TOptions> | undefined
    const options: TOptions = {
      ...opts.defaultOptions,
      ...userOptions,
    }

    // Call initialize hook if provided
    if (opts.initialize)
      opts.initialize(context, options)

    const selectors = options.selectors ?? DEFAULT_SELECTORS

    // Filter selectors by kind
    const calleeSelectors = filterByKind<CalleeSelector>(selectors, SelectorKind.Callee)
    const tagSelectors = filterByKind<TagSelector>(selectors, SelectorKind.Tag)
    const attributeSelectors = filterByKind<AttributeSelector>(selectors, SelectorKind.Attribute)
    const variableSelectors = filterByKind<VariableSelector>(selectors, SelectorKind.Variable)

    /**
     * Process literals: call the user's lintLiterals callback.
     */
    const processLiterals = (literals: Array<Literal>): void => {

      if (literals.length > 0)
        opts.lintLiterals(context, literals, options)
    }

    /**
     * Script visitors (ES, JSX).
     */
    const scriptVisitors: Rule.RuleListener = {

      CallExpression(node: CallExpression) {

        if (calleeSelectors.length === 0)
          return

        const literals = getLiteralsByESCallExpression(context, node, calleeSelectors)
        processLiterals(literals)
      },

      TaggedTemplateExpression(node: TaggedTemplateExpression) {

        if (tagSelectors.length === 0)
          return

        const literals = getLiteralsByTaggedTemplateExpression(context, node, tagSelectors)
        processLiterals(literals)
      },

      VariableDeclarator(node: VariableDeclarator) {

        if (variableSelectors.length === 0)
          return

        const literals = getLiteralsByESVariableDeclarator(context, node, variableSelectors)
        processLiterals(literals)
      },

      JSXAttribute(node: JSXAttribute) {

        if (attributeSelectors.length === 0)
          return

        const literals = getLiteralsByJSXAttribute(context, node as JSXAttribute, attributeSelectors)
        processLiterals(literals)
      },
    }

    /**
     * Vue template visitors.
     * Note: TaggedTemplateExpression and CallExpression in template expressions
     * need to be handled here too, not just in scriptVisitors.
     */
    const templateVisitors: Rule.RuleListener = {

      VAttribute(node: unknown) {

        if (attributeSelectors.length === 0)
          return

        const literals = getLiteralsByVueAttribute(context, node as VAST.VAttribute | VAST.VDirective, attributeSelectors)
        processLiterals(literals)
      },

      TaggedTemplateExpression(node: TaggedTemplateExpression) {

        if (tagSelectors.length === 0)
          return

        const literals = getLiteralsByTaggedTemplateExpression(context, node, tagSelectors)
        processLiterals(literals)
      },

      CallExpression(node: CallExpression) {

        if (calleeSelectors.length === 0)
          return

        const literals = getLiteralsByESCallExpression(context, node, calleeSelectors)
        processLiterals(literals)
      },
    }

    // Vue: use defineTemplateBodyVisitor if available
    const parserServices = context.sourceCode?.parserServices as {
      defineTemplateBodyVisitor?: (
        templateVisitors: Rule.RuleListener,
        scriptVisitors: Rule.RuleListener,
      ) => Rule.RuleListener
    } | undefined

    if (parserServices?.defineTemplateBodyVisitor)
      return parserServices.defineTemplateBodyVisitor(templateVisitors, scriptVisitors)

    return scriptVisitors
  },
})
