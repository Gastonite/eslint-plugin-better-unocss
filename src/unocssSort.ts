import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSyncFn } from 'synckit'



const distDir = fileURLToPath(new URL('.', import.meta.url))

export type ConflictingClasses = {
  conflicts: Array<{
    property: string
    classes: Array<string>
  }>
}

type SyncFn = (
  configPath: string | undefined,
  action: 'sort' | 'conflicts' | 'validate',
  classes: string,
  id: string | undefined,
) => string | ConflictingClasses | Array<string>

/**
 * Synchronous wrapper around the async UnoCSS worker.
 */
const syncFn: SyncFn = createSyncFn(join(distDir, 'worker.js'))

/**
 * Sort classes using UnoCSS engine (synchronous).
 */
export const sortWithUnocss = (
  classes: string,
  filename: string,
  configPath?: string,
): string => syncFn(configPath, 'sort', classes, filename) as string

/**
 * Get conflicting classes (same CSS property).
 */
export const getConflicts = (
  classes: string,
  filename: string,
  configPath?: string,
): ConflictingClasses => syncFn(configPath, 'conflicts', classes, filename) as ConflictingClasses

/**
 * Get unknown classes (not recognized by UnoCSS).
 */
export const getUnknownClasses = (
  classes: string,
  filename: string,
  configPath?: string,
): Array<string> => syncFn(configPath, 'validate', classes, filename) as Array<string>
