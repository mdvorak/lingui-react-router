import { getConfig } from "@lingui/conf"

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
    linguiRouterConfig: Readonly<LinguiRouterPluginConfigFull>
  }
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
  return {
    name: NAME,

    configResolved(config) {
      const linguiConfig = pluginConfig.linguiConfig ?? getConfig({ cwd: config.root })
      const locales = pluginConfig.locales ?? linguiConfig.locales
      const pseudoLocale = pluginConfig.pseudoLocale ?? linguiConfig.pseudoLocale

      // Build plugin config with defaults and normalization
      const localeMapping = Object.fromEntries(
        Object.entries(pluginConfig.localeMapping ?? {}).map(([k, v]) => [
          normalizeLocaleKey(k),
          normalizeLocaleKey(v),
        ])
      )

      config.linguiRouterConfig = {
        linguiConfig,
        exclude: pluginConfig.exclude ?? [],
        detectLocale: pluginConfig.detectLocale ?? true,
        redirect: pluginConfig.redirect ?? "auto",
        localeMapping,
        localeParamName: pluginConfig.localeParamName ?? "locale",
        defaultLocale: normalizeLocaleKey(pluginConfig.defaultLocale ?? locales[0] ?? "und"),
        locales: locales.map(normalizeLocaleKey),
        pseudoLocale: pseudoLocale ? normalizeLocaleKey(pseudoLocale) : undefined,
      }
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
      const linguiRouterConfig = config.linguiRouterConfig
      if (!linguiRouterConfig) throw new Error("linguiRouterConfig not loaded")

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
        const configObject = buildConfig(linguiRouterConfig, server)
        return server
          ? await generateLoaderModuleServer(linguiRouterConfig, configObject)
          : await generateLoaderModuleClient(linguiRouterConfig, configObject)
      }

      if (id.startsWith("\0" + VIRTUAL_PREFIX)) {
        const locale = id.replace("\0" + VIRTUAL_PREFIX, "")
        const module = await generateLocaleModule(locale, linguiRouterConfig)
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

function resolveLocale(locale: string, locales: string[]): string {
  const resolved = locales.find(l => normalizeLocaleKey(l) === locale)
  if (!resolved) {
    throw new Error(`Locale '${locale}' not found in Lingui configuration locales: ${locales}`)
  }
  return resolved
}

async function generateLoaderModuleServer(
  pluginConfig: Readonly<LinguiRouterPluginConfigFull>,
  configObject: LinguiRouterConfig
): Promise<string> {
  const lines: string[] = []

  lines.push(
    `import { setupI18n } from "@lingui/core"`,
    `export const config = ${JSON.stringify(configObject)}`
  )

  const loaderMap: string[] = []
  const messagesMap: string[] = []
  const bundleMap: string[] = []

  // For server builds, use static imports
  for (const locale of pluginConfig.locales) {
    const varName = `locale_${locale.replace(/-/g, "_")}`
    lines.push(`import { messages as ${varName} } from '${VIRTUAL_PREFIX}${locale}'`)

    loaderMap.push(`  '${locale}': () => Promise.resolve({messages: ${varName}}),`)
    messagesMap.push(`  '${locale}': ${varName},`)
    bundleMap.push(
      `  '${locale}': setupI18n({ locale: '${locale}', messages: localeMessages }),`
    )
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

  const allLocaleMapping: Record<string, string> = await buildLocaleMapping(
    pluginConfig.locales,
    pluginConfig.localeMapping
  )
  lines.push(`export const localeMapping = JSON.parse(\`${JSON.stringify(allLocaleMapping)}\`)`)

  return lines.join("\n")
}

async function generateLocaleModule(
  locale: string,
  pluginConfig: Readonly<LinguiRouterPluginConfigFull>
): Promise<string> {
  const linguiConfig = pluginConfig.linguiConfig
  const catalogs: { varName: string; path: string }[] = []
  let importIndex = 0

  // Use original lingui format for import
  const linguiLocale = resolveLocale(locale, linguiConfig.locales)

  // Note: catalogs are never empty in the normalized parsed config
  for (const catalogConfig of linguiConfig.catalogs!) {
    let catalogPath = catalogConfig.path
      .replace(/<rootDir>/g, linguiConfig.rootDir || process.cwd())
      .replace(/\{locale}/g, linguiLocale)
      .replace(/\{name}/g, "*")

    // Add .po extension for glob pattern
    const globPattern = `${catalogPath}.po`

    const poFiles = await fg(globPattern, {
      cwd: linguiConfig.rootDir || process.cwd(),
    })

    for (const poFile of poFiles) {
      const varName = `catalog${importIndex++}`
      // Resolve to an absolute path for import
      const absolutePath = path.resolve(linguiConfig.rootDir || process.cwd(), poFile)
      catalogs.push({ varName, path: absolutePath })
    }
  }

  if (catalogs.length > 1) {
    const imports = catalogs.map(c => `import {messages as ${c.varName}} from '${c.path}'`)
    const catalogVars = catalogs.map(c => c.varName)

    return `${imports.join("\n")}
export const messages = Object.assign({}, ${catalogVars.join(", ")})`
  } else if (catalogs.length === 1) {
    return `export * from '${catalogs[0].path}'`
  } else {
    return ""
  }
}

async function generateLoaderModuleClient(
  pluginConfig: Readonly<LinguiRouterPluginConfigFull>,
  configObject: LinguiRouterConfig
): Promise<string> {
  const lines: string[] = []

  lines.push(
    `export const config = ${JSON.stringify(configObject)}`,
    `export const localeLoaders = {`
  )

  // For client builds, use dynamic imports
  for (const locale of pluginConfig.locales) {
    lines.push(`  '${locale}': () => import('${VIRTUAL_PREFIX}${locale}'),`)
  }

  lines.push(`}`, generateGetI18nInstanceClient(), `export const localeMapping = undefined`)

  return lines.join("\n")
}

function buildConfig(
  pluginConfig: Readonly<LinguiRouterPluginConfigFull>,
  server: boolean
): LinguiRouterConfig {
  return {
    locales: pluginConfig.locales,
    pseudoLocale: pluginConfig.pseudoLocale,
    defaultLocale: pluginConfig.defaultLocale,
    exclude: pluginConfig.exclude,
    redirect: pluginConfig.redirect,
    runtimeEnv: server ? "server" : "client",
    localeParamName: pluginConfig.localeParamName,
  }
}

async function buildLocaleMapping(
  locales: string[],
  localeMap: Record<string, string>
): Promise<Record<string, string>> {
  const knownLocales = await getAllLocales()

  // Add existing locales to the result (all normalized)
  const result = new Map<string, string>(locales.map(l => [l, l]))

  // Add user-defined fallback locales
  for (const [locale, fallback] of Object.entries(localeMap)) {
    // Validate
    if (result.has(locale)) {
      throw new Error(`Mapped locale ${locale} is already defined in the Lingui configuration.`)
    }
    if (!locales.includes(fallback)) {
      throw new Error(
        `Fallback locale ${fallback} for locale ${locale} is not defined in the Lingui configuration.`
      )
    }
    // Add to result
    result.set(locale, fallback)
  }

  // Convert current locales to normalized keys for comparison
  // This will help in matching more specific locales first
  // Sort locale keys by descending length to prioritize more specific locales first
  const definedLocales = [...locales]
    .sort((a, b) => b.length - a.length)
    .map(locale => ({
      locale,
      prefix: locale + "-",
    }))

  // Find all more specific locales for each defined locale
  for (const cldrLocale of knownLocales) {
    // We must compare normalized keys
    const specificLocale = normalizeLocaleKey(cldrLocale)
    if (result.has(specificLocale)) {
      continue
    }

    // Skip if this locale is already explicitly defined
    const fallbackLocale = definedLocales.find(l => specificLocale.startsWith(l.prefix))
    if (fallbackLocale) {
      result.set(specificLocale, fallbackLocale.locale)
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
