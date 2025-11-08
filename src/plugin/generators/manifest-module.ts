import fs from "node:fs/promises"
import path from "node:path"
import type { OutputBundle } from "rollup"
import type { ConfigPluginContext, ResolvedConfig } from "vite"
import { VIRTUAL_LOCALE_PREFIX } from "../plugin-config"
import { resolveImportPath } from "./import-path"
import { stringifyJsonToString } from "./json-helper"

const LOCALE_MANIFEST_FILENAME = ".client-locale-manifest.json"
const EMPTY_DEFAULT_EXPORT = "export default {}"

/**
 * Generate the manifest module code for server builds in non-dev modes.
 *
 * @param context - The Vite plugin context
 * @param config - The resolved Vite config
 * @returns The generated module code as a string
 */
export async function generateManifestModule(context: ConfigPluginContext, config: ResolvedConfig) {
  // Parse and stringify to validate the JSON
  const manifestPath = resolveManifestPath(config)
  context.info(`reading ${path.relative(config.root, manifestPath)}`)
  const manifestJson = JSON.parse(await fs.readFile(manifestPath, { encoding: "utf8" }))

  const finalJson = stringifyJsonToString(manifestJson)
  return `export default JSON.parse(${finalJson})`
}

export function generateEmptyManifestModule() {
  return EMPTY_DEFAULT_EXPORT
}

/**
 * Generate the locale manifest for client builds.
 *
 * @param context - The Vite plugin context
 * @param config - The resolved Vite config
 * @param bundle - The Rollup output bundle
 */
export async function generateBundleClient(
  context: ConfigPluginContext,
  config: ResolvedConfig,
  bundle: OutputBundle,
) {
  const manifestPath = resolveManifestPath(config)
  const base = config.base
  const modulePrefix = "\0" + VIRTUAL_LOCALE_PREFIX

  const localeChunks: Record<string, string> = {}

  for (const [fileName, chunk] of Object.entries(bundle)) {
    if (chunk.type === "chunk" && chunk.isDynamicEntry) {
      const moduleId = chunk.moduleIds.find(modId => modId.startsWith(modulePrefix))
      if (moduleId) {
        const locale = moduleId.replace(modulePrefix, "")
        localeChunks[locale] = `${base}${fileName}`
      }
    }
  }

  // Write locale manifest JSON
  context.info(`writing ${path.relative(config.root, manifestPath)}`)
  const manifestJson = JSON.stringify(localeChunks, null, 2)
  await fs.mkdir(path.dirname(manifestPath), { recursive: true })
  await fs.writeFile(manifestPath, manifestJson, { encoding: "utf8" })
}

function resolveManifestPath(config: ResolvedConfig): string {
  // outDir always consists of buildDirectory/consumer
  return resolveImportPath(config.root, config.build.outDir, "..", LOCALE_MANIFEST_FILENAME)
}
