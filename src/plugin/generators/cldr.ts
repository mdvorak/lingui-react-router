import * as fs from "node:fs/promises"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

async function loadModuleJson(path: string): Promise<any> {
  const data = await fs.readFile(require.resolve(path), "utf-8")
  return JSON.parse(data)
}

async function loadAllLocales(): Promise<Set<string>> {
  const lists = await Promise.all([
    loadModuleJson("cldr-core/availableLocales.json").then(
      obj => obj.availableLocales.full as string[]
    ),
    loadModuleJson("cldr-core/defaultContent.json").then(obj => obj.defaultContent as string[]),
  ])
  return new Set<string>(lists.flat())
}

// One-time loaded
let cachedLocales: Promise<Set<string>> | undefined

/**
 * Get all available locales from CLDR data.
 */
export function getAllLocales(): Promise<Set<string>> {
  // cachedLocales ??= is a synchronous operation, so concurrent calls
  // will all receive the same Promise instance without race conditions
  cachedLocales ??= loadAllLocales()
  return cachedLocales
}
