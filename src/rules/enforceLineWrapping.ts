/**
 * Rule: enforce-line-wrapping
 * Enforce consistent line wrapping in class strings.
 */

import type { Literal } from '../types/literal'
import { createRule, type RuleOptionsWithSelectors } from '../utils/createRule'



// =============================================================================
// Types
// =============================================================================

export type GroupMode = 'emptyLine' | 'newLine' | 'never'

export type EnforceLineWrappingOptions = RuleOptionsWithSelectors & {
  classesPerLine?: number
  printWidth?: number
  group?: GroupMode
  indent?: number | 'tab'
  convertToTaggedTemplate?: string
}

type ClassGroup = {
  variant: string
  classes: Array<string>
}


// =============================================================================
// Helpers - Indentation
// =============================================================================

/**
 * Convert indent option to actual indent string.
 */
const resolveIndent = (indent: number | 'tab'): string => (

  indent === 'tab'
    ? '\t'
    : ' '.repeat(indent)
)

/**
 * Get the indentation (leading whitespace) of a line.
 */
const getLineIndent = (line: string): string => {

  const match = line.match(/^(\s*)/)

  return match?.[1] ?? ''
}


// =============================================================================
// Helpers - Class Parsing
// =============================================================================

/**
 * Parse content into classes, handling variant groups like hover:(bg-red text-white).
 */
const parseClasses = (content: string): Array<string> => {

  const classes: Array<string> = []
  let current = ''
  let parenDepth = 0

  for (const char of content) {

    if (char === '(') {

      parenDepth++
      current += char
    }
    else if (char === ')') {

      parenDepth--
      current += char
    }
    else if ((/\s/).test(char) && parenDepth === 0) {

      if (current.trim())
        classes.push(current.trim())

      current = ''
    }
    else {

      current += char
    }
  }

  if (current.trim())
    classes.push(current.trim())

  return classes
}

/**
 * Extract the variant prefix from a class.
 * e.g., "hover:bg-red" -> "hover:", "sm:hover:text-white" -> "sm:hover:", "flex" -> ""
 */
const getVariantPrefix = (className: string): string => {

  // Handle variant groups like hover:(bg-red text-white)
  const parenIndex = className.indexOf('(')

  if (parenIndex !== -1)
    return className.slice(0, parenIndex + 1)

  // Find the last colon that's part of a variant (not arbitrary value like bg-[#fff])
  const parts = className.split(':')

  if (parts.length === 1)
    return ''

  // Check if it's an arbitrary value (contains [ before :)
  const bracketIndex = className.indexOf('[')
  const colonIndex = className.indexOf(':')

  if (bracketIndex !== -1 && bracketIndex < colonIndex)
    return ''

  // Return all parts except the last one (which is the utility)
  return parts.slice(0, -1).join(':') + ':'
}

/**
 * Group classes by their variant prefix.
 */
const groupClassesByVariant = (classes: Array<string>): Array<ClassGroup> => {

  const groups: Array<ClassGroup> = []
  let currentGroup: ClassGroup | undefined

  for (const className of classes) {

    const variant = getVariantPrefix(className)

    if (!currentGroup || currentGroup.variant !== variant) {

      currentGroup = { variant, classes: [className] }
      groups.push(currentGroup)
    }
    else {

      currentGroup.classes.push(className)
    }
  }

  return groups
}


// =============================================================================
// Helpers - Formatting
// =============================================================================

/**
 * Format classes into lines based on classesPerLine and printWidth.
 */
const formatLines = (
  classes: Array<string>,
  classesPerLine: number,
  printWidth: number,
  lineStartWidth: number,
): Array<string> => {

  const lines: Array<string> = []
  let currentLine: Array<string> = []
  let currentWidth = lineStartWidth

  for (const className of classes) {

    const classWidth = className.length
    const spaceWidth = currentLine.length > 0 ? 1 : 0
    const newWidth = currentWidth + spaceWidth + classWidth

    // Check if we need to wrap
    const exceedsPrintWidth = printWidth > 0 && newWidth > printWidth && currentLine.length > 0
    const exceedsClassesPerLine = classesPerLine > 0 && currentLine.length >= classesPerLine

    if (exceedsPrintWidth || exceedsClassesPerLine) {

      lines.push(currentLine.join(' '))
      currentLine = [className]
      currentWidth = lineStartWidth + classWidth
    }
    else {

      currentLine.push(className)
      currentWidth = newWidth
    }
  }

  if (currentLine.length > 0)
    lines.push(currentLine.join(' '))

  return lines
}

/**
 * Format grouped classes with proper separators.
 */
const formatGroupedClasses = (
  groups: Array<ClassGroup>,
  groupMode: GroupMode,
  classesPerLine: number,
  printWidth: number,
  classIndent: string,
  indentWidth: number,
): Array<string> => {

  const lineStartWidth = indentWidth
  const allLines: Array<string> = []

  for (let i = 0; i < groups.length; i++) {

    const group = groups[i]
    const lines = formatLines(group.classes, classesPerLine, printWidth, lineStartWidth)

    // Add separator before group (except first)
    if (i > 0 && groupMode !== 'never') {

      if (groupMode === 'emptyLine')
        allLines.push('')
    }

    for (const line of lines)
      allLines.push(classIndent + line)
  }

  return allLines
}

/**
 * Check if a literal can be fixed (converted to multiline).
 * StringLiterals in non-JS contexts (like HTML attributes) cannot be converted.
 */
const canFixLiteral = (literal: Literal): boolean => {

  // Template literals can always be fixed (already use backticks)
  if (literal.type === 'TemplateLiteral')
    return true

  // StringLiterals in non-JS context cannot be converted to template literals
  if (literal.contextIsJs === false)
    return false

  return true
}

/**
 * Format the fixed literal with proper line wrapping.
 */
const formatFixedLiteral = (
  literal: Literal,
  classes: Array<string>,
  classesPerLine: number,
  printWidth: number,
  groupMode: GroupMode,
  baseIndent: string,
  indent: string,
  convertTag?: string,
): string => {

  const classIndent = baseIndent + indent
  const lineStartWidth = classIndent.length

  let lines: Array<string>

  if (groupMode === 'never') {

    // No grouping, just wrap by classesPerLine/printWidth
    lines = formatLines(classes, classesPerLine, printWidth, lineStartWidth)
      .map(line => classIndent + line)
  }
  else {

    // Group by variant
    const groups = groupClassesByVariant(classes)
    lines = formatGroupedClasses(groups, groupMode, classesPerLine, printWidth, classIndent, lineStartWidth)
  }

  const formatted = '\n' + lines.join('\n') + '\n' + baseIndent

  // Use existing tag if present (from TaggedTemplateExpression), otherwise use convertTag
  const tag = literal.existingTag ?? convertTag ?? ''

  return `${tag}\`${formatted}\``
}


// =============================================================================
// Helpers - Validation
// =============================================================================

/**
 * Check if content is already correctly formatted.
 */
const isCorrectlyFormatted = (
  content: string,
  classes: Array<string>,
  classesPerLine: number,
  printWidth: number,
  groupMode: GroupMode,
  baseIndent: string,
  indent: string,
): boolean => {

  // Single line is OK if few enough classes and short enough
  if (!content.includes('\n')) {

    if (classesPerLine > 0 && classes.length > classesPerLine)
      return false

    if (printWidth > 0 && content.length > printWidth)
      return false

    return true
  }

  // For multiline, check if it matches expected format
  const classIndent = baseIndent + indent
  const lineStartWidth = classIndent.length

  const contentLines = content.split('\n').filter(l => l.trim().length > 0)

  // Check indentation of each line
  for (const line of contentLines) {

    if (!line.startsWith(classIndent))
      return false

    const lineContent = line.slice(classIndent.length)
    const lineClasses = parseClasses(lineContent)

    // Check classesPerLine
    if (classesPerLine > 0 && lineClasses.length > classesPerLine)
      return false

    // Check printWidth
    if (printWidth > 0 && (lineStartWidth + lineContent.length) > printWidth)
      return false
  }

  // Check grouping if needed
  if (groupMode !== 'never') {

    const groups = groupClassesByVariant(classes)

    if (groups.length > 1) {

      // Need to verify group separators
      const rawLines = content.split('\n')
      let emptyLineCount = 0

      for (const line of rawLines) {

        if (line.trim() === '')
          emptyLineCount++
      }

      if (groupMode === 'emptyLine' && emptyLineCount < groups.length - 1)
        return false
    }
  }

  return true
}


// =============================================================================
// Rule
// =============================================================================

export const enforceLineWrappingRule = createRule<'incorrectWrapping', EnforceLineWrappingOptions>({
  name: 'enforce-line-wrapping',

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
          selectors: {
            type: 'array',
            description: 'Custom selectors configuration',
          },
          classesPerLine: {
            type: 'number',
            default: 0,
            minimum: 0,
            description: 'Maximum classes per line (0 to disable)',
          },
          printWidth: {
            type: 'number',
            default: 80,
            minimum: 0,
            description: 'Maximum line width (0 to disable)',
          },
          group: {
            type: 'string',
            enum: ['emptyLine', 'newLine', 'never'],
            default: 'newLine',
            description: 'How to separate groups of classes with different variants',
          },
          indent: {
            oneOf: [
              { type: 'number', minimum: 0 },
              { type: 'string', enum: ['tab'] },
            ],
            default: 2,
            description: 'Indentation (number of spaces or "tab")',
          },
          convertToTaggedTemplate: {
            type: 'string',
            description: 'Tag name for converting strings to tagged templates (e.g., "cn")',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      incorrectWrapping: 'Incorrect line wrapping',
    },
  },

  defaultOptions: {
    classesPerLine: 0,
    printWidth: 80,
    group: 'newLine' as GroupMode,
    indent: 2,
  },

  lintLiterals(ctx, literals, options) {

    const classesPerLine = options.classesPerLine ?? 0
    const printWidth = options.printWidth ?? 80
    const groupMode = options.group ?? 'newLine'
    const indent = resolveIndent(options.indent ?? 2)
    const convertTag = options.convertToTaggedTemplate

    for (const literal of literals) {

      const content = literal.content
      const classes = parseClasses(content)

      if (classes.length === 0)
        continue

      // Get the indentation of the line where the literal starts
      const line = ctx.sourceCode.lines[literal.loc.start.line - 1]
      const baseIndent = getLineIndent(line)

      if (isCorrectlyFormatted(content, classes, classesPerLine, printWidth, groupMode, baseIndent, indent))
        continue

      // Only provide fix if the literal can be converted (JS context)
      const fixable = canFixLiteral(literal)

      ctx.report({
        loc: literal.loc,
        messageId: 'incorrectWrapping',
        fix: fixable
          ? (fixer) => {

            const fixed = formatFixedLiteral(
              literal,
              classes,
              classesPerLine,
              printWidth,
              groupMode,
              baseIndent,
              indent,
              convertTag,
            )
            // Use fullRange if available (for TaggedTemplateExpression) to include the tag
            const range = literal.fullRange ?? literal.range

            return fixer.replaceTextRange(range, fixed)
          }
          : undefined,
      })
    }
  },
})
