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

  return createGenerator({
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
 * Main worker function.
 */
const run = (
  configPath: string | undefined,
  action: string,
  classes: string,
  id: string | undefined,
): Promise<string> => {

  switch (action) {

    case 'sort':
      return actionSort(configPath, classes, id)

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

runAsWorker(run)
