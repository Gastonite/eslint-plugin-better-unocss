import { type Rule } from 'eslint'
import { type CallExpression, type Literal, type TaggedTemplateExpression } from 'estree'
import { sortWithUnocss } from '../unocssSort'



type RuleOptions = {
  tags: Array<string>
  functions: Array<string>
}

const DEFAULT_OPTIONS: RuleOptions = {
  tags: ['tw', 'cn', 'clsx', 'classnames'],
  functions: ['cn', 'clsx', 'classnames', 'twMerge', 'cva'],
}

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
    } else if (char === ')') {

      parenDepth--
      current += char
    } else if ((/\s/).test(char) && parenDepth === 0) {

      if (current.trim())
        tokens.push(current.trim())

      current = ''
    } else {

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

export const orderRule: Rule.RuleModule = {
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
          tags: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_OPTIONS.tags,
          },
          functions: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_OPTIONS.functions,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unordered: 'Classes should be sorted',
    },
  },

  create(context) {

    const options: RuleOptions = {
      ...DEFAULT_OPTIONS,
      ...context.options[0],
    }

    const tagSet = new Set(options.tags)
    const functionSet = new Set(options.functions)
    const filename = context.filename

    /**
     * Sort classes using UnoCSS engine.
     */
    const sort = (classes: string): string => sortWithUnocss(classes, filename)

    /**
     * Get function name from callee.
     */
    const getFunctionName = (callee: CallExpression['callee']): string | undefined => {

      if (callee.type === 'Identifier')
        return callee.name

      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier')
        return callee.property.name

      return undefined
    }

    /**
     * Check if a node is a string literal.
     */
    const isStringLiteral = (node: CallExpression['arguments'][number]): node is Literal & { value: string } => (

      node.type === 'Literal' && typeof node.value === 'string'
    )

    return {
      CallExpression(node: CallExpression) {

        const functionName = getFunctionName(node.callee)
        if (!functionName || !functionSet.has(functionName))
          return

        for (const arg of node.arguments) {

          if (!isStringLiteral(arg))
            continue

          const content = arg.value.trim()
          if (!content || !content.includes(' '))
            continue

          const sorted = sort(content)

          if (sorted === content)
            continue

          context.report({
            node: arg,
            messageId: 'unordered',
            fix(fixer) {

              const quote = arg.raw?.startsWith('\'')
                ? '\''
                : '"'

              return fixer.replaceText(arg, quote + sorted + quote)
            },
          })
        }
      },

      TaggedTemplateExpression(node: TaggedTemplateExpression) {

        const tag = node.tag
        let tagName: string | undefined

        if (tag.type === 'Identifier')
          tagName = tag.name
        else if (tag.type === 'MemberExpression' && tag.property.type === 'Identifier')
          tagName = tag.property.name

        if (!tagName || !tagSet.has(tagName))
          return

        if (node.quasi.expressions.length > 0)
          return

        const quasi = node.quasi.quasis[0]
        if (!quasi)
          return

        const content = quasi.value.raw
        // Normalize: trim and collapse whitespace to single spaces
        const normalized = content.trim().split(/\s+/).filter(c => c.length > 0).join(' ')

        if (!normalized || !normalized.includes(' '))
          return

        const sorted = sort(normalized)
        const multiline = isMultiline(content)
        const indentation = multiline
          ? detectIndentation(content)
          : ''

        const formatted = multiline
          ? formatMultiline(sorted, indentation)
          : sorted

        // Compare with original content to catch both order and formatting issues
        if (content === formatted)
          return

        context.report({
          node,
          messageId: 'unordered',
          fix(fixer) {

            return fixer.replaceText(quasi, '`' + formatted + '`')
          },
        })
      },
    }
  },
}
