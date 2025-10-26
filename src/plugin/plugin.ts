import { getConfig, type LinguiConfigNormalized } from "@lingui/conf"

import fg from "fast-glob"
import * as fs from "node:fs/promises"
import path from "node:path"
import type { OutputBundle } from "rollup"
import type { ConfigPluginContext, Plugin, ResolvedConfig, SSROptions, UserConfig } from "vite"
import { type LinguiRouterConfig, normalizeLocaleKey } from "../config"
import { getAllLocales } from "./cldr"
import type { LinguiRouterPluginConfig, LinguiRouterPluginConfigFull } from "./config"

const NAME = "lingui-react-router"
const VIRTUAL_PREFIX = "virtual:lingui-router-locale-"
const VIRTUAL_MANIFEST = "virtual:lingui-router-manifest"
const VIRTUAL_LOADER = "virtual:lingui-router-loader"
const MANIFEST_PLACEHOLDER = "__$$_LINGUI_REACT_ROUTER_MANIFEST_PLACEHOLDER$$__"
const MANIFEST_CHUNK_NAME = "locale-manifest"
const LOCALE_MANIFEST_FILENAME = ".client-locale-manifest.json"

declare module "vite" {
  interface ResolvedConfig {
    linguiConfig?: Readonly<LinguiConfigNormalized>
  }
}

const DEFAULT_CONFIG: LinguiRouterPluginConfigFull = {
  exclude: [],
  detectLocale: true,
  redirect: "auto",
}

/**
 * Vite plugin for Lingui React Router that handles internationalization with automatic
 * code splitting by locale and optimized asset loading.
 *
 * This plugin creates virtual modules for locale manifests and message catalogs,
 * enabling efficient client-side loading and SSR support.
 *
 * @param pluginConfig - Configuration options for the plugin
 * @returns Vite plugin object with hooks for build and dev server integration
 */
export function linguiRouterPlugin(pluginConfig: LinguiRouterPluginConfig = {}): any {
  const normalizedConfig = {
    ...DEFAULT_CONFIG,
    ...pluginConfig,
  }
  return {
    name: NAME,

    configResolved(config) {
      config.linguiConfig = getConfig({ cwd: config.root })
    },

    config(config) {
      return {
        resolve: {
          dedupe: (config.resolve?.dedupe ?? []).concat(NAME),
        },
        build: {
          rollupOptions: {
            output: {
              manualChunks(id, { getModuleInfo }) {
                if (id === "\0" + VIRTUAL_MANIFEST) {
                  const info = getModuleInfo(id)
                  // Don't split an empty chunk
                  if (!info?.code?.includes("export default {}")) {
                    return MANIFEST_CHUNK_NAME
                  }
                }
                if (id.startsWith("\0" + VIRTUAL_PREFIX)) {
                  const locale = id.replace("\0" + VIRTUAL_PREFIX, "")
                  return `locale-${locale}`
                }
              },
            },
          },
        },
        ssr: {
          noExternal: addToNoExternal(config.ssr?.noExternal, NAME),
          optimizeDeps: {
            include: ["negotiator"].concat(config.ssr?.optimizeDeps?.include ?? []),
          },
        },
      } satisfies UserConfig
    },

    resolveId(id) {
      if (id === VIRTUAL_MANIFEST) {
        return "\0" + id
      }

      if (id === VIRTUAL_LOADER) {
        return "\0" + id
      }

      if (id.startsWith(VIRTUAL_PREFIX)) {
        return "\0" + id
      }
    },

    async load(id) {
      const server = this.environment.name === "ssr"
      const config = this.environment.config
      const linguiConfig = config.linguiConfig
      if (!linguiConfig) throw new Error("linguiConfig not loaded")

      if (id === "\0" + VIRTUAL_MANIFEST) {
        if (server && this.environment.mode !== "dev") {
          return `
          const manifest = ${MANIFEST_PLACEHOLDER}
          export default manifest
        `
        } else {
          return "export default {}"
        }
      }

      if (id === "\0" + VIRTUAL_LOADER) {
        return await generateLoaderModule(normalizedConfig, linguiConfig, server)
      }

      if (id.startsWith("\0" + VIRTUAL_PREFIX)) {
        const locale = id.replace("\0" + VIRTUAL_PREFIX, "")
        const module = await generateLocaleModule(locale, linguiConfig)
        if (!module) {
          this.warn(
            `No message catalogs found for locale '${locale}'. Please check your Lingui configuration.`
          )
        }
        return module
      }
    },

    async generateBundle(options, bundle) {
      if (this.environment.name === "client") {
        await generateBundleClient(this, this.environment.config, bundle)
      } else {
        await generateBundleServer(this, this.environment.config, bundle)
      }
    },
  } satisfies Plugin
}

async function generateLocaleModule(
  locale: string,
  config: LinguiConfigNormalized
): Promise<string> {
  const catalogs: { varName: string; path: string }[] = []

  let importIndex = 0

  // Note: catalogs are never empty in the normalized parsed config
  for (const catalogConfig of config.catalogs!) {
    let catalogPath = catalogConfig.path
      .replace(/<rootDir>/g, config.rootDir || process.cwd())
      .replace(/\{locale}/g, locale)
      .replace(/\{name}/g, "*")

    // Add .po extension for glob pattern
    const globPattern = `${catalogPath}.po`

    const poFiles = await fg(globPattern, {
      cwd: config.rootDir || process.cwd(),
    })

    for (const poFile of poFiles) {
      const varName = `catalog${importIndex++}`
      // Resolve to an absolute path for import
      const absolutePath = path.resolve(config.rootDir || process.cwd(), poFile)
      catalogs.push({ varName, path: absolutePath })
    }
  }

  if (catalogs.length > 1) {
    const imports = catalogs.map(c => `import {messages as ${c.varName}} from '${c.path}'`)
    const catalogVars = catalogs.map(c => c.varName)

    return `
${imports.join("\n")}

export const messages = Object.assign({}, ${catalogVars.join(", ")})
`
  } else if (catalogs.length === 1) {
    return `export * from '${catalogs[0].path}'`
  } else {
    return ""
  }
}

async function generateLoaderModule(
  pluginConfig: LinguiRouterPluginConfigFull,
  linguiConfig: LinguiConfigNormalized,
  server: boolean
): Promise<string> {
  const lines: string[] = []
  const configObject = buildConfig(pluginConfig, linguiConfig, server)

  lines.push(`export const config = ${JSON.stringify(configObject)}`)

  if (server) {
    lines.push(`import { setupI18n } from "@lingui/core"`)

    const loaderMap: string[] = []
    const messagesMap: string[] = []
    const bundleMap: string[] = []

    // For server builds, use static imports
    for (const locale of linguiConfig.locales) {
      const varName = `locale_${locale.replace(/-/g, "_")}`
      lines.push(`import { messages as ${varName} } from '${VIRTUAL_PREFIX}${locale}'`)

      loaderMap.push(`  '${locale}': () => Promise.resolve({messages: ${varName}}),`)
      messagesMap.push(`  '${locale}': ${varName},`)
      bundleMap.push(`  '${locale}': setupI18n({ locale: '${locale}', messages: localeMessages }),`)
    }

    lines.push(
      `export const localeLoaders = {`,
      ...loaderMap,
      `}`,
      `const localeMessages = {`,
      ...messagesMap,
      `}`,
      `const i18nInstances = {`,
      ...bundleMap,
      `}`,
      generateGetI18nInstanceServer()
    )

    if (pluginConfig.detectLocale) {
      lines.push(
        `import { negotiateClientLocale } from "${NAME}/negotiate"`,
        `export const $detectLocale = negotiateClientLocale`
      )
    } else {
      lines.push(`export const $detectLocale = () => undefined`)
    }

    const fallbackLocaleMap: Record<string, string> = await findFallbackLocales(linguiConfig.locales)
    lines.push(
      `export const fallbackLocales = JSON.parse(\`${JSON.stringify(fallbackLocaleMap)}\`)`,
    )
  } else {
    lines.push(`export const localeLoaders = {`)

    // For client builds, use dynamic imports
    for (const locale of linguiConfig.locales) {
      lines.push(`  '${locale}': () => import('${VIRTUAL_PREFIX}${locale}'),`)
    }

    lines.push(`}`, generateGetI18nInstanceClient(), `export const fallbackLocales = undefined`)
  }

  return lines.join("\n")
}

function buildConfig(
  pluginConfig: LinguiRouterPluginConfigFull,
  linguiConfig: LinguiConfigNormalized,
  server: boolean
): LinguiRouterConfig {
  const exclude =
    typeof pluginConfig.exclude === "string" ? [pluginConfig.exclude] : pluginConfig.exclude || []
  const fallbackLocales = linguiConfig.fallbackLocales
  const defaultLocale =
    typeof fallbackLocales?.default === "string" ? fallbackLocales.default : undefined

  return {
    locales: linguiConfig.locales,
    pseudoLocale: linguiConfig.pseudoLocale,
    sourceLocale: linguiConfig.sourceLocale,
    defaultLocale: defaultLocale || linguiConfig.locales[0] || "en",
    exclude,
    redirect: pluginConfig.redirect ?? "auto",
    runtimeEnv: server ? "server" : "client",
  }
}

async function findFallbackLocales(locales: string[]): Promise<Record<string, string>> {
  const allLocales = await getAllLocales()
  const result = new Map<string, string>()

  // Convert current locales to normalized keys for comparison
  // This will help in matching more specific locales first
  const localeKeys = locales.map(normalizeLocaleKey).sort().reverse()

  // Find all more specific locales for each defined locale
  for (const cldrLocale of allLocales) {
    // We must compare normalized keys
    const specificLocale = normalizeLocaleKey(cldrLocale)
    const fallbackLocale = localeKeys.find(l => specificLocale.startsWith(l + "-"))
    if (fallbackLocale) {
      result.set(specificLocale, fallbackLocale)
    }
  }

  return Object.fromEntries(result)
}

function generateGetI18nInstanceServer() {
  return `
export function $getI18nInstance(locale) {
  const i18n = i18nInstances[locale]
  if (!i18n) {
    throw new Error("Unsupported locale: " + locale)
  }
  return i18n
}
`
}

function generateGetI18nInstanceClient() {
  //language=js
  return `
import { i18n } from "@lingui/core"
export function $getI18nInstance(_locale) {
  return i18n
}`
}

function addToNoExternal(userNoExternal: SSROptions["noExternal"], name: string) {
  let noExternal = userNoExternal ?? []

  // This library must be included, otherwise virtual imports won't work
  if (noExternal !== true) {
    if (Array.isArray(noExternal)) {
      noExternal = [...noExternal, name]
    } else {
      noExternal = [noExternal, name]
    }
  }
  return noExternal
}

function resolveManifestPath(config: ResolvedConfig): string {
  // outDir always consists of buildDirectory/consumer
  return path.resolve(config.root, config.build.outDir, "..", LOCALE_MANIFEST_FILENAME)
}

async function generateBundleClient(
  context: ConfigPluginContext,
  config: ResolvedConfig,
  bundle: OutputBundle
) {
  const manifestPath = resolveManifestPath(config)
  const base = config.base
  const modulePrefix = "\0" + VIRTUAL_PREFIX

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

async function generateBundleServer(
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
