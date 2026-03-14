import { dirname } from 'node:path'
import process from 'node:process'
import { loadConfig } from '@unocss/config'
import {
  collapseVariantGroup,
  createGenerator,
  notNull,
  parseVariantGroup,
  type UnoGenerator,
} from '@unocss/core'
import { runAsWorker } from 'synckit'



type SortResult = [number, string]

type ConflictingClasses = {
  conflicts: Array<{
    property: string
    classes: Array<string>
  }>
}

const generators = new Map<string, Promise<UnoGenerator>>()

/**
 * Get search directory for config from file ID.
 */
const getSearchCwd = (id: string): string => {

  if (id.match(/\.\w+\/[^/]+$/))
    return dirname(id.slice(0, id.lastIndexOf('/')))

  return dirname(id)
}

/**
 * Create a UnoCSS generator from config.
 */
const createUnoGenerator = async (configPath: string | undefined, id: string | undefined): Promise<UnoGenerator> => {

  const cwd = configPath
    ? process.cwd()
    : id
      ? getSearchCwd(id)
      : process.cwd()

  const { config, sources } = await loadConfig(cwd, configPath)

  if (!sources.length)
    throw new Error('[eslint-plugin-better-unocss] No UnoCSS config found. Create uno.config.ts in your project.')

  return await createGenerator({
    ...config,
    warn: false,
  })
}

/**
 * Get cache key for generator.
 */
const getCacheKey = (configPath: string | undefined, id: string | undefined): string => {

  if (configPath)
    return `config:${configPath}`

  if (id)
    return `dir:${getSearchCwd(id)}`

  return `cwd:${process.cwd()}`
}

/**
 * Get or create a generator (cached).
 */
const getGenerator = async (configPath: string | undefined, id: string | undefined): Promise<UnoGenerator> => {

  const cacheKey = getCacheKey(configPath, id)
  let promise = generators.get(cacheKey)

  if (!promise) {

    promise = createUnoGenerator(configPath, id)
    generators.set(cacheKey, promise)
  }

  return promise
}

/**
 * Sort classes using UnoCSS engine.
 * Based on @unocss/eslint-plugin implementation.
 */
const sortClasses = async (
  classes: string,
  uno: UnoGenerator,
): Promise<string> => {

  const unknown: Array<string> = []

  // Enable details for variant handling
  if (!uno.config.details)
    uno.config.details = true

  // Parse variant groups (e.g., hover:(bg-red text-white))
  const expandedResult = parseVariantGroup(classes)
  const expanded = expandedResult.expanded

  const result: Array<SortResult | undefined> = []
  const tokens = expanded.split(/\s+/g)

  for (const token of tokens) {

    if (!token)
      continue

    const parsed = await uno.parseToken(token)

    if (!parsed) {

      unknown.push(token)
      result.push(undefined)
      continue
    }

    // Calculate order: base order + variant rank
    const variantHandlers = parsed[0]?.[5]?.variantHandlers
    const variantRank = (variantHandlers?.length ?? 0) * 100000
    const order = (parsed[0]?.[0] ?? 0) + variantRank

    result.push([order, token])
  }

  // Sort by order, then alphabetically
  let sorted = result
    .filter(notNull)
    .sort((a, b) => {

      const orderDiff = a[0] - b[0]

      if (orderDiff !== 0)
        return orderDiff

      return a[1].localeCompare(b[1])
    })
    .map(item => item[1])
    .join(' ')

  // Collapse variant groups back if they were expanded
  if (expandedResult.prefixes.length)
    sorted = collapseVariantGroup(sorted, expandedResult.prefixes)

  // Unknown classes go first
  return [...unknown, sorted].join(' ').trim()
}

/**
 * Worker action: sort classes.
 */
const actionSort = async (
  configPath: string | undefined,
  classes: string,
  id: string | undefined,
): Promise<string> => {

  const uno = await getGenerator(configPath, id)
  return sortClasses(classes, uno)
}

/**
 * Check if body is a @property definition (not regular CSS).
 */
const isPropertyDefinition = (body: string): boolean =>
  body.includes('syntax:') || body.includes('inherits:')

/**
 * Extract CSS property names from a CSS body string.
 */
const extractPropertyNames = (body: string): Array<string> => {

  // Skip @property definitions (infrastructure, not styling)
  if (isPropertyDefinition(body))
    return []

  const properties: Array<string> = []

  for (const line of body.split(';')) {

    const match = line.match(/^\s*([a-z-]+)\s*:/i)

    if (match)
      properties.push(match[1])
  }

  return properties
}

/**
 * Extract variant prefix from a class (e.g., "hover:bg-red" -> "hover:")
 */
const extractVariantPrefix = (className: string): string => {

  const colonIndex = className.lastIndexOf(':')

  if (colonIndex === -1)
    return ''

  return className.slice(0, colonIndex + 1)
}

/**
 * Normalize a selector to extract the "context" (dark mode, media queries, etc.)
 * Removes the class name itself to get just the context.
 */
const extractSelectorContext = (selector: string, className: string): string => {

  // Remove the class name to get just the context
  // .dark .text-base -> .dark
  // .text-base -> (empty)
  // .hover\:flex:hover -> :hover
  // @media (min-width: 768px) .text-base -> @media (min-width: 768px)

  // Escape special regex chars, and handle CSS escaping of colons
  const escaped = className
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:/g, '\\\\?:') // Colon may be escaped as \: in CSS selector

  const regex = new RegExp(`\\.${escaped}`, 'g')
  return selector.replace(regex, '').trim()
}

/**
 * Get the "signature" of a class: contexts + sorted CSS properties.
 * Classes only conflict if they have the exact same signature.
 */
const getClassSignature = (
  contexts: Array<string>,
  properties: Array<string>,
  variantPrefix: string,
): string => {

  const sortedContexts = [...contexts].sort()
  const sortedProps = [...properties].sort()
  return `${variantPrefix}contexts:[${sortedContexts.join('|')}]props:[${sortedProps.join(',')}]`
}

/**
 * Worker action: find conflicting classes.
 * Two classes conflict only if they generate the exact same set of CSS properties
 * in the exact same contexts (dark mode, media queries, etc.)
 */
const actionConflicts = async (
  configPath: string | undefined,
  classes: string,
  id: string | undefined,
): Promise<ConflictingClasses> => {

  const uno = await getGenerator(configPath, id)

  if (!uno.config.details)
    uno.config.details = true

  const tokens = classes.split(/\s+/g).filter(Boolean)

  // Map: "signature" -> [{ className, properties }, ...]
  const signatureMap = new Map<string, Array<{ className: string; properties: Array<string> }>>()

  for (const token of tokens) {

    const parsed = await uno.parseToken(token)

    if (!parsed || parsed.length === 0)
      continue

    const variantPrefix = extractVariantPrefix(token)

    // Collect all properties and contexts from all entries for this class
    const allProperties: Array<string> = []
    const allContexts: Array<string> = []

    for (const entry of parsed) {

      const selector = entry[1] as string
      const body = entry[2]

      if (!body)
        continue

      const properties = extractPropertyNames(body)

      if (properties.length === 0)
        continue

      allProperties.push(...properties)

      // Extract context from selector (dark mode, media queries, etc.)
      const context = extractSelectorContext(selector, token)
      allContexts.push(context)
    }

    if (allProperties.length === 0)
      continue

    // Dedupe
    const uniqueProperties = [...new Set(allProperties)]
    const uniqueContexts = [...new Set(allContexts)]
    const signature = getClassSignature(uniqueContexts, uniqueProperties, variantPrefix)

    const existing = signatureMap.get(signature)

    if (existing) {

      // Don't add duplicate class names (duplicates are handled by no-duplicate-classes)
      if (!existing.some(c => c.className === token))
        existing.push({ className: token, properties: uniqueProperties })
    }
    else {

      signatureMap.set(signature, [{ className: token, properties: uniqueProperties }])
    }
  }

  // Filter to only signatures with multiple classes (conflicts)
  const conflicts: Array<{ property: string; classes: Array<string> }> = []

  for (const classList of signatureMap.values()) {

    if (classList.length > 1) {

      // Use first class's properties for the message
      const propertyNames = classList[0].properties.join(', ')
      const classNames = classList.map(c => c.className)

      conflicts.push({ property: propertyNames, classes: classNames })
    }
  }

  return { conflicts }
}

/**
 * Worker action: validate classes (find unknown ones).
 */
const actionValidate = async (
  configPath: string | undefined,
  classes: string,
  id: string | undefined,
): Promise<Array<string>> => {

  const uno = await getGenerator(configPath, id)
  const tokens = classes.split(/\s+/g).filter(Boolean)
  const unknown: Array<string> = []

  for (const token of tokens) {

    const parsed = await uno.parseToken(token)

    if (!parsed)
      unknown.push(token)
  }

  return unknown
}

/**
 * Main worker function.
 */
const run = (
  configPath: string | undefined,
  action: string,
  classes: string,
  id: string | undefined,
): Promise<string | ConflictingClasses | Array<string>> => {

  switch (action) {

    case 'sort':
      return actionSort(configPath, classes, id)

    case 'conflicts':
      return actionConflicts(configPath, classes, id)

    case 'validate':
      return actionValidate(configPath, classes, id)

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

runAsWorker(run)
