import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSyncFn } from 'synckit'



const distDir = fileURLToPath(new URL('.', import.meta.url))

type SyncSort = (
  configPath: string | undefined,
  action: 'sort',
  classes: string,
  id: string | undefined,
) => string

/**
 * Synchronous wrapper around the async UnoCSS sort worker.
 */
export const syncSort: SyncSort = createSyncFn(join(distDir, 'worker.js'))

/**
 * Sort classes using UnoCSS engine (synchronous).
 */
export const sortWithUnocss = (
  classes: string,
  filename: string,
  configPath?: string,
): string => syncSort(configPath, 'sort', classes, filename)
