import { getConfig, type LinguiConfigNormalized } from "@lingui/conf"
import fg from "fast-glob"
import * as fs from "node:fs/promises"
import path from "node:path"
import type { Plugin, ResolvedConfig, SSROptions, UserConfig } from "vite"
import type { LinguiRouterConfig } from "../config"

const NAME = "lingui-react-router"
const VIRTUAL_PREFIX = "virtual:lingui-router-locale-"
const VIRTUAL_MANIFEST = "virtual:lingui-router-manifest"
const VIRTUAL_LOADER = "virtual:lingui-router-loader"
const MANIFEST_PLACEHOLDER = "__$$_LINGUI_REACT_ROUTER_MANIFEST_PLACEHOLDER$$__"
const MANIFEST_CHUNK_NAME = "locale-manifest"
const LOCALE_MANIFEST_FILENAME = ".locale-manifest.json"

/**
 * Configuration passed from the consumer to wire up catalog loading and path exclusions.
 */
export type LinguiRouterPluginConfig = {
  /**
   * One or more root-level path prefixes that should NOT be treated as locales.
   * For example, ["api"].
   */
  exclude?: string | string[]
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
export function linguiRouterPlugin(pluginConfig: LinguiRouterPluginConfig = {}): Plugin {
  let linguiConfig: LinguiConfigNormalized

  return {
    name: NAME,

    configResolved(config) {
      linguiConfig = getConfig({ cwd: config.root })
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
        return generateLoaderModule(pluginConfig, linguiConfig, server)
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
      const manifestPath = resolveManifestPath(this.environment.config)

      if (this.environment.name === "client") {
        const base = this.environment.config.base
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
        this.info(`writing ${path.relative(this.environment.config.root, manifestPath)}`)
        const manifestJson = JSON.stringify(localeChunks, null, 2)
        await fs.mkdir(path.dirname(manifestPath))
        await fs.writeFile(manifestPath, manifestJson, { encoding: "utf8" })
      } else {
        // Parse and stringify to validate the JSON
        this.info(`reading ${path.relative(this.environment.config.root, manifestPath)}`)
        const manifestJson = JSON.parse(await fs.readFile(manifestPath, { encoding: "utf8" }))

        for (const chunk of Object.values(bundle)) {
          if (chunk.type === "chunk" && chunk.name === MANIFEST_CHUNK_NAME) {
            chunk.code = chunk.code.replace(MANIFEST_PLACEHOLDER, JSON.stringify(manifestJson))
            break
          }
        }
      }
    },

    configureServer(server) {
      server.watcher.on("change", file => {
        // Check if a changed file is a catalog
        if (file.endsWith(".po")) {
          // Invalidate virtual modules
          const mod = server.moduleGraph.getModuleById("\0" + VIRTUAL_MANIFEST)
          if (mod) {
            server.moduleGraph.invalidateModule(mod)
          }

          // Invalidate affected locale module
          for (const locale of linguiConfig.locales) {
            const localeModId = "\0" + VIRTUAL_PREFIX + locale
            const localeMod = server.moduleGraph.getModuleById(localeModId)
            if (localeMod) {
              server.moduleGraph.invalidateModule(localeMod)
            }
          }

          server.ws.send({ type: "full-reload" })
        }
      })
    },
  }
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

function generateLoaderModule(
  pluginConfig: LinguiRouterPluginConfig,
  linguiConfig: LinguiConfigNormalized,
  server: boolean
): string {
  const loaderMap: string[] = []
  const staticImports: string[] = []
  const bundleMap: string[] = []

  if (server) {
    staticImports.push(`import { buildI18n } from "${NAME}"`)

    // For server builds, use static imports
    for (const locale of linguiConfig.locales) {
      const varName = `locale_${locale.replace(/-/g, "_")}`
      staticImports.push(`import { messages as ${varName} } from '${VIRTUAL_PREFIX}${locale}'`)
      loaderMap.push(`  '${locale}': () => Promise.resolve({messages: ${varName}})`)
      bundleMap.push(`  '${locale}': buildI18n('${locale}', ${varName})`)
    }
  } else {
    // For client builds, use dynamic imports
    for (const locale of linguiConfig.locales) {
      loaderMap.push(`  '${locale}': () => import('${VIRTUAL_PREFIX}${locale}')`)
    }
  }

  const exclude =
    typeof pluginConfig.exclude === "string" ? [pluginConfig.exclude] : pluginConfig.exclude || []
  const configOutput = {
    locales: linguiConfig.locales,
    pseudoLocale: linguiConfig.pseudoLocale,
    sourceLocale: linguiConfig.sourceLocale,
    fallbackLocales: linguiConfig.fallbackLocales,
    defaultLocale: linguiConfig.fallbackLocales?.default || linguiConfig.locales[0] || "en",
    exclude,
  } satisfies LinguiRouterConfig

  //language=js
  return `
    import { buildUrlParserFunction } from "${NAME}"

    ${staticImports.join("\n")}

    export const localeLoaders = {
      ${loaderMap.join(",\n")},
    }

    export const config = ${JSON.stringify(configOutput)}
    export const parseUrlLocale = buildUrlParserFunction(config)

    ${generateGetI18nInstance(server, bundleMap)}
  `
}

function generateGetI18nInstance(server: boolean, bundleMap: string[]) {
  if (server) {
    //language=js
    return `
    const i18nInstances = {
      ${bundleMap.join(",\n")},
    }

    export function $getI18nInstance(locale) {
      const i18n = i18nInstances[locale]
      if (!i18n) {
        throw new Error("Unsupported locale: " + locale)
      }
      return i18n
    }
    `
  } else {
    //language=js
    return `
    import { i18n } from "@lingui/core"
    export function $getI18nInstance(_locale) {
      return i18n
    }`
  }
}

function addToNoExternal(userNoExternal: SSROptions["noExternal"], name: string) {
  let noExternal = userNoExternal ?? []

  // This library must be included, otherwise virtual imports won't work
  if (noExternal !== true) {
    if (noExternal instanceof Array) {
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
