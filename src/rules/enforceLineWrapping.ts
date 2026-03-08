import { type Rule } from 'eslint'
import { type TaggedTemplateExpression } from 'estree'



type RuleOptions = {
  tags: Array<string>
  classesPerLine: number
  indent: string
}

const DEFAULT_OPTIONS: RuleOptions = {
  tags: ['tw', 'cn', 'clsx', 'classnames'],
  classesPerLine: 1,
  indent: '  ',
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
 * Detect the base indentation from the template literal position.
 */
const detectBaseIndentation = (content: string): string => {

  const lines = content.split('\n')

  for (const line of lines) {

    const match = line.match(/^(\s+)\S/)
    if (match?.[1]) {

      // Return one level less for the closing backtick
      const indent = match[1]

      if (indent.startsWith('  '))
        return indent.slice(2)

      if (indent.startsWith('\t'))
        return indent.slice(1)

      return ''
    }
  }

  return ''
}

/**
 * Check if content follows the line wrapping rule.
 */
const isCorrectlyWrapped = (
  classes: Array<string>,
  content: string,
  classesPerLine: number,
): boolean => {

  if (classes.length <= classesPerLine)
    return true // No wrapping needed

  // Should be multiline
  if (!content.includes('\n'))
    return false

  const lines = content.split('\n').filter(l => l.trim().length > 0)

  for (const line of lines) {

    const lineClasses = parseClasses(line)

    if (lineClasses.length > classesPerLine)
      return false
  }

  return true
}

export const enforceLineWrappingRule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Enforce consistent line wrapping in class strings',
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
          classesPerLine: {
            type: 'number',
            default: DEFAULT_OPTIONS.classesPerLine,
            minimum: 1,
          },
          indent: {
            type: 'string',
            default: DEFAULT_OPTIONS.indent,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      incorrectWrapping: 'Classes should have at most {{classesPerLine}} per line',
    },
  },

  create(context) {

    const options: RuleOptions = {
      ...DEFAULT_OPTIONS,
      ...context.options[0],
    }

    const tagSet = new Set(options.tags)

    return {
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

        if (classes.length === 0)
          return

        if (isCorrectlyWrapped(classes, content, options.classesPerLine))
          return

        context.report({
          node,
          messageId: 'incorrectWrapping',
          data: { classesPerLine: String(options.classesPerLine) },
          fix(fixer) {

            const baseIndent = detectBaseIndentation(content) || ''
            const classIndent = baseIndent + options.indent

            // Group classes by classesPerLine
            const lines: Array<string> = []

            for (let i = 0; i < classes.length; i += options.classesPerLine) {

              const lineClasses = classes.slice(i, i + options.classesPerLine)
              lines.push(classIndent + lineClasses.join(' '))
            }

            const formatted = '\n' + lines.join('\n') + '\n' + baseIndent
            return fixer.replaceText(quasi, '`' + formatted + '`')
          },
        })
      },
    }
  },
}
