import { type Rule } from 'eslint'
import { type CallExpression, type Literal, type TaggedTemplateExpression } from 'estree'



type RuleOptions = {
  tags: Array<string>
  functions: Array<string>
}

const DEFAULT_OPTIONS: RuleOptions = {
  tags: ['tw', 'cn', 'clsx', 'classnames'],
  functions: ['cn', 'clsx', 'classnames', 'twMerge', 'cva'],
}

/**
 * Parse content into classes, handling variant groups.
 */
const parseClasses = (content: string): Array<string> => {

  const classes: Array<string> = []
  let current = ''
  let parenDepth = 0

  for (const char of content) {

    if (char === '(') {

      parenDepth++
      current += char
    } else if (char === ')') {

      parenDepth--
      current += char
    } else if ((/\s/).test(char) && parenDepth === 0) {

      if (current.trim())
        classes.push(current.trim())

      current = ''
    } else {

      current += char
    }
  }

  if (current.trim())
    classes.push(current.trim())

  return classes
}

/**
 * Find duplicate classes in an array.
 */
const findDuplicates = (classes: Array<string>): Array<string> => {

  const seen = new Set<string>()
  const duplicates: Array<string> = []

  for (const cls of classes) {

    if (seen.has(cls))
      duplicates.push(cls)
    else
      seen.add(cls)
  }

  return duplicates
}

/**
 * Remove duplicates, keeping first occurrence.
 */
const removeDuplicates = (classes: Array<string>): Array<string> => {

  const seen = new Set<string>()
  const result: Array<string> = []

  for (const cls of classes) {

    if (!seen.has(cls)) {

      seen.add(cls)
      result.push(cls)
    }
  }

  return result
}

export const noDuplicateClassesRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow duplicate classes',
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
        },
        additionalProperties: false,
      },
    ],
    messages: {
      duplicate: 'Duplicate class: {{className}}',
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

          const classes = parseClasses(arg.value)
          const duplicates = findDuplicates(classes)

          if (duplicates.length === 0)
            continue

          context.report({
            node: arg,
            messageId: 'duplicate',
            data: { className: duplicates.join(', ') },
            fix(fixer) {

              const unique = removeDuplicates(classes)
              const quote = arg.raw?.startsWith('\'')
                ? '\''
                : '"'

              return fixer.replaceText(arg, quote + unique.join(' ') + quote)
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
        const classes = parseClasses(content)
        const duplicates = findDuplicates(classes)

        if (duplicates.length === 0)
          return

        const multiline = content.includes('\n')

        context.report({
          node,
          messageId: 'duplicate',
          data: { className: duplicates.join(', ') },
          fix(fixer) {

            const unique = removeDuplicates(classes)

            if (!multiline)
              return fixer.replaceText(quasi, '`' + unique.join(' ') + '`')

            // Preserve multiline format
            const lines = content.split('\n')
            let indentation = '  '

            for (const line of lines) {

              const match = line.match(/^(\s+)\S/)
              if (match?.[1]) {

                indentation = match[1]
                break
              }
            }

            const baseIndent = indentation.startsWith('  ')
              ? indentation.slice(2)
              : indentation.startsWith('\t')
                ? indentation.slice(1)
                : ''

            const formatted = '\n' + unique.map(c => indentation + c).join('\n') + '\n' + baseIndent
            return fixer.replaceText(quasi, '`' + formatted + '`')
          },
        })
      },
    }
  },
}
