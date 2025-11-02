import fs from "node:fs/promises"
import path from "node:path"
import type { ModuleInfo, OutputBundle } from "rollup"
import type { ConfigPluginContext, ResolvedConfig } from "vite"
import { VIRTUAL_LOCALE_PREFIX } from "../plugin-config"

const LOCALE_MANIFEST_FILENAME = ".client-locale-manifest.json"
const MANIFEST_CHUNK_NAME = "locale-manifest"
const MANIFEST_PLACEHOLDER = "__$$_LINGUI_REACT_ROUTER_MANIFEST_PLACEHOLDER_$$__"
const EMPTY_DEFAULT_EXPORT = "export default {}"

/**
 * Generate the manifest module code for server builds in non-dev modes.
 *
 * @param server - Whether the build is for the server
 * @param mode - The current build mode (e.g., "dev", "production")
 * @returns The generated module code as a string
 */
export function generateManifestModule(server: boolean, mode: string) {
  if (server && mode !== "dev") {
    //language=js
    return `const manifest = JSON.parse(\`${MANIFEST_PLACEHOLDER}\`)
export default manifest
`
  } else {
    return EMPTY_DEFAULT_EXPORT
  }
}

/**
 * Determine the chunk name for the manifest module.
 *
 * @param info - Module information provided by Rollup
 * @returns The chunk name if applicable, otherwise undefined
 */
export function getManifestChunkName(info: ModuleInfo): string | undefined {
  // Don't split an empty chunk
  if (!info.code?.includes(EMPTY_DEFAULT_EXPORT)) {
    return MANIFEST_CHUNK_NAME
  }
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
  bundle: OutputBundle
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

/**
 * Generate the locale manifest for server builds.
 *
 * @param context - The Vite plugin context
 * @param config - The resolved Vite config
 * @param bundle - The Rollup output bundle
 */
export async function generateBundleServer(
  context: ConfigPluginContext,
  config: ResolvedConfig,
  bundle: OutputBundle
) {
  // Parse and stringify to validate the JSON
  const manifestPath = resolveManifestPath(config)
  context.info(`reading ${path.relative(config.root, manifestPath)}`)
  const manifestJson = JSON.parse(await fs.readFile(manifestPath, { encoding: "utf8" }))

  for (const chunk of Object.values(bundle)) {
    if (chunk.type === "chunk" && chunk.name === MANIFEST_CHUNK_NAME) {
      chunk.code = chunk.code.replace(MANIFEST_PLACEHOLDER, JSON.stringify(manifestJson))
      break
    }
  }
}

function resolveManifestPath(config: ResolvedConfig): string {
  // outDir always consists of buildDirectory/consumer
  return path
    .resolve(config.root, config.build.outDir, "..", LOCALE_MANIFEST_FILENAME)
    .replaceAll("\\", "/")
}
