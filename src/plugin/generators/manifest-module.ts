import fs from "node:fs/promises"
import path from "node:path"
import type { OutputBundle } from "rollup"
import type { ConfigPluginContext, ResolvedConfig } from "vite"
import {
  LOCALE_MANIFEST_FILENAME,
  MANIFEST_CHUNK_NAME,
  MANIFEST_PLACEHOLDER,
  VIRTUAL_LOCALE_PREFIX,
} from "../plugin-config"

export function generateManifestModule(enabled: boolean) {
  if (enabled) {
    //language=js
    return `const manifest = JSON.parse(\`${MANIFEST_PLACEHOLDER}\`)
export default manifest
`
  } else {
    //language=js
    return "export default {}"
  }
}

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
  return path.resolve(config.root, config.build.outDir, "..", LOCALE_MANIFEST_FILENAME)
}
