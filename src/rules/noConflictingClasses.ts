/**
 * Rule: no-conflicting-classes
 * Disallow classes that generate the same CSS property.
 */

import type { Literal } from '../types/literal'
import { getConflicts } from '../unocssSort'
import { createRule, type RuleOptionsWithSelectors } from '../utils/createRule'



// =============================================================================
// Types
// =============================================================================

export type NoConflictingClassesOptions = RuleOptionsWithSelectors


// =============================================================================
// Helpers
// =============================================================================

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
 * Remove classes that should be removed (earlier occurrences in conflicts).
 */
const removeConflicts = (
  classes: Array<string>,
  classesToRemove: Set<string>,
): Array<string> => {

  const result: Array<string> = []

  for (const cls of classes) {

    if (!classesToRemove.has(cls))
      result.push(cls)
  }

  return result
}

/**
 * Format the fixed literal with resolved classes.
 */
const formatFixedLiteral = (literal: Literal, fixedClasses: Array<string>): string => {

  const content = literal.content
  const multiline = content.includes('\n')

  if (!multiline) {

    const quote = literal.openingQuote ?? '"'
    return quote + fixedClasses.join(' ') + quote
  }

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

  const quote = literal.openingQuote ?? '"'
  const formatted = '\n' + fixedClasses.map(c => indentation + c).join('\n') + '\n' + baseIndent

  return quote + formatted + quote
}


// =============================================================================
// Rule
// =============================================================================

export const noConflictingClassesRule = createRule<'conflict', NoConflictingClassesOptions>({
  name: 'no-conflicting-classes',

  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow classes that generate the same CSS property',
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
        },
        additionalProperties: false,
      },
    ],
    messages: {
      conflict: 'Conflicting classes for {{property}}: {{classes}}',
    },
  },

  defaultOptions: {},

  lintLiterals(ctx, literals, _options) {

    for (const literal of literals) {

      const classes = parseClasses(literal.content)

      if (classes.length === 0)
        continue

      const classesString = classes.join(' ')
      const { conflicts } = getConflicts(classesString, ctx.filename)

      if (conflicts.length === 0)
        continue

      // Group conflicts by the set of classes involved (to avoid duplicate reports)
      // e.g., text-red-500 + text-blue-500 may conflict on both 'color' and '--un-text-opacity'
      // Use sorted key for grouping but keep original order for reporting
      const classGroupToConflict = new Map<string, {
        properties: Array<string>
        classes: Array<string>
      }>()

      for (const { property, classes: conflictGroup } of conflicts) {

        const key = [...conflictGroup].sort().join(',')
        const existing = classGroupToConflict.get(key)

        if (existing)
          existing.properties.push(property)
        else
          classGroupToConflict.set(key, { properties: [property], classes: conflictGroup })
      }

      // Collect all classes that should be removed
      const classesToRemove = new Set<string>()

      for (const { classes: conflictClasses } of classGroupToConflict.values()) {

        // Remove all but the last occurrence (keep last = CSS cascade behavior)
        for (let i = 0; i < conflictClasses.length - 1; i++)
          classesToRemove.add(conflictClasses[i])
      }

      // Report each unique conflict group
      for (const { properties, classes: conflictClasses } of classGroupToConflict.values()) {

        ctx.report({
          loc: literal.loc,
          messageId: 'conflict',
          data: {
            property: properties.join(', '),
            classes: conflictClasses.join(', '),
          },
          fix(fixer) {

            const fixed = removeConflicts(classes, classesToRemove)
            const fixedText = formatFixedLiteral(literal, fixed)

            return fixer.replaceTextRange(literal.range, fixedText)
          },
        })
      }
    }
  },
})
