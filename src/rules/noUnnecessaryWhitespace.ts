import { type Rule } from 'eslint'
import { type CallExpression, type Literal, type TaggedTemplateExpression } from 'estree'



type RuleOptions = {
  tags: Array<string>
  functions: Array<string>
  allowMultiline: boolean
}

const DEFAULT_OPTIONS: RuleOptions = {
  tags: ['tw', 'cn', 'clsx', 'classnames'],
  functions: ['cn', 'clsx', 'classnames', 'twMerge', 'cva'],
  allowMultiline: true,
}

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

export const noUnnecessaryWhitespaceRule: Rule.RuleModule = {
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
          allowMultiline: {
            type: 'boolean',
            default: DEFAULT_OPTIONS.allowMultiline,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unnecessaryWhitespace: 'Unnecessary whitespace in class string',
    },
  },

  create(context) {

    const options: RuleOptions = {
      ...DEFAULT_OPTIONS,
      ...context.options[0],
    }

    const tagSet = new Set(options.tags)
    const functionSet = new Set(options.functions)

    const isStringLiteral = (node: CallExpression['arguments'][number]): node is Literal & { value: string } => (

      node.type === 'Literal' && typeof node.value === 'string'
    )

    const getFunctionName = (callee: CallExpression['callee']): string | undefined => {

      if (callee.type === 'Identifier')
        return callee.name

      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier')
        return callee.property.name

      return undefined
    }

    return {
      CallExpression(node: CallExpression) {

        const functionName = getFunctionName(node.callee)
        if (!functionName || !functionSet.has(functionName))
          return

        for (const arg of node.arguments) {

          if (!isStringLiteral(arg))
            continue

          if (!hasUnnecessaryWhitespace(arg.value, options.allowMultiline))
            continue

          context.report({
            node: arg,
            messageId: 'unnecessaryWhitespace',
            fix(fixer) {

              const normalized = normalizeWhitespace(arg.value, options.allowMultiline)
              const quote = arg.raw?.startsWith('\'')
                ? '\''
                : '"'

              return fixer.replaceText(arg, quote + normalized + quote)
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

        // For tagged templates with multiline allowed, we don't report
        // because the order rule handles formatting
        if (options.allowMultiline && content.includes('\n'))
          return

        if (!hasUnnecessaryWhitespace(content, options.allowMultiline))
          return

        context.report({
          node,
          messageId: 'unnecessaryWhitespace',
          fix(fixer) {

            const normalized = normalizeWhitespace(content, options.allowMultiline)
            return fixer.replaceText(quasi, '`' + normalized + '`')
          },
        })
      },
    }
  },
}
