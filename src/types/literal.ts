/**
 * Literal type representing an extracted class string.
 * Adapted from eslint-plugin-better-tailwindcss (MIT license).
 */

export type LiteralValueQuotes = '\'' | '"' | '`'

export type LiteralType = 'StringLiteral' | 'TemplateLiteral'

export type BracesMeta = {
  openingBraces?: string
  closingBraces?: string
}

export type StringLiteral = Literal & { type: 'StringLiteral' }

export type Literal = {
  type: LiteralType
  /** The class string content (without quotes) */
  content: string
  /** The raw text including quotes */
  raw: string
  /** Source range [start, end] for fixes */
  range: [number, number]
  /** Source location for error reporting */
  loc: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
  /** Opening quote character */
  openingQuote?: LiteralValueQuotes
  /** Closing quote character */
  closingQuote?: LiteralValueQuotes
  /** Indentation level (number of spaces) */
  indentation: number
  /** The attribute name if from an attribute (class, className) */
  attribute?: string
  /** Whether inside template literal interpolation */
  isInterpolated?: boolean
  /** Whether content supports multiline */
  supportsMultiline?: boolean
  /** Leading whitespace before content */
  leadingWhitespace?: string
  /** Trailing whitespace after content */
  trailingWhitespace?: string
  /** Opening braces (for JSX expressions) */
  openingBraces?: string
  /** Closing braces (for JSX expressions) */
  closingBraces?: string
  /** Prior literals in concatenation */
  priorLiterals?: Array<Literal>
  /**
   * Whether the literal is in a JavaScript context where template literals are valid.
   * - true: Can be converted to template literal (e.g., `:class="'...'"`, `cn('...')`)
   * - false: Cannot be converted (e.g., `class="..."`, `className="..."`)
   * - undefined: Treated as true for backward compatibility
   */
  contextIsJs?: boolean
  /**
   * Existing tag name if from a TaggedTemplateExpression (e.g., "cn" for cn`...`).
   * Used to preserve the tag when reformatting.
   */
  existingTag?: string
  /**
   * Range of the full expression including the tag (for TaggedTemplateExpression).
   * Used by rules that need to replace the entire expression including the tag.
   */
  fullRange?: [number, number]
}
