import { getConfig, type LinguiConfigNormalized } from "@lingui/conf"
import fg from "fast-glob"
import path from "node:path"
import type { Plugin } from "vite"
import type { LinguiRouterConfig } from "../config"

const VIRTUAL_PREFIX = "virtual:lingui-router-locale-"
const VIRTUAL_MANIFEST = "virtual:lingui-router-manifest"
const VIRTUAL_LOADER = "virtual:lingui-router-loader"

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

export function linguiRouterPlugin(pluginConfig: LinguiRouterPluginConfig = {}): Plugin {
  let linguiConfig: LinguiConfigNormalized
  const localeChunks = new Map<string, string>()

  return {
    name: "vite-plugin-lingui-react-router",

    async configResolved(config) {
      linguiConfig = getConfig({ cwd: config.root })
    },

    config(config) {
      // Add virtual locale modules as additional inputs
      const localeInputs: Record<string, string> = {}

      // We'll populate this after config is resolved
      if (linguiConfig?.locales) {
        for (const locale of linguiConfig.locales) {
          localeInputs[`locale-${locale}`] = VIRTUAL_PREFIX + locale
        }
      }

      const rollupInput = config.build?.rollupOptions?.input

      return {
        build: {
          rollupOptions: {
            input: addToRollupInput(rollupInput, localeInputs),
            output: {
              manualChunks(id) {
                if (id.startsWith("\0" + VIRTUAL_PREFIX)) {
                  const locale = id.replace("\0" + VIRTUAL_PREFIX, "")
                  return `locale-${locale}`
                }
              },
            },
          },
        },
      }
    },

    resolveId(id) {
      if (id === VIRTUAL_MANIFEST || id === VIRTUAL_LOADER) {
        return "\0" + id
      }

      if (id.startsWith(VIRTUAL_PREFIX)) {
        return "\0" + id
      }
    },

    async load(id) {
      const server = this.environment.name === "ssr"

      if (id === "\0" + VIRTUAL_MANIFEST) {
        const manifest = Object.fromEntries(localeChunks)
        return `const manifest = JSON.parse('${JSON.stringify(manifest)}')\nexport default manifest`
      }

      if (id === "\0" + VIRTUAL_LOADER) {
        return generateLoaderModule(pluginConfig, linguiConfig, server)
      }

      if (id.startsWith("\0" + VIRTUAL_PREFIX)) {
        const locale = id.replace("\0" + VIRTUAL_PREFIX, "")
        return await generateLocaleModule(locale, linguiConfig)
      }
    },

    generateBundle(options, bundle) {
      localeChunks.clear()

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === "chunk" && chunk.name?.startsWith("locale-")) {
          const locale = chunk.name.replace("locale-", "")
          localeChunks.set(locale, `/${fileName}`)
        }
      }

      this.emitFile({
        type: "asset",
        fileName: "lingui-manifest.json",
        source: JSON.stringify(Object.fromEntries(localeChunks), null, 2),
      })
    },
  }
}

async function generateLocaleModule(locale: string, config: any): Promise<string> {
  const catalogs: { varName: string; path: string }[] = []

  let importIndex = 0

  for (const catalogConfig of config.catalogs) {
    let catalogPath = catalogConfig.path
      .replaceAll("<rootDir>", config.rootDir || process.cwd())
      .replaceAll("{locale}", locale)
      .replaceAll("{name}", "*")

    // Add .po extension for glob pattern
    const globPattern = `${catalogPath}.po`

    const poFiles = await fg(globPattern, {
      cwd: config.rootDir || process.cwd(),
    })

    for (const poFile of poFiles) {
      const varName = `catalog${importIndex++}`
      // Resolve to absolute path for import
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
    // TODO log warning
    return ""
  }
}

function addToRollupInput(
  rollupInput: string | string[] | Record<string, string> | undefined,
  newInput: Record<string, string>
) {
  switch (typeof rollupInput) {
    case "string":
      return Object.values(newInput).concat(rollupInput)
    case "object":
      if (rollupInput instanceof Array) {
        return Object.values(newInput).concat(rollupInput)
      } else {
        return {
          ...rollupInput,
          ...newInput,
        }
      }
    default:
      return newInput
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
    import { buildUrlParserFunction, buildI18n } from "lingui-react-router"
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
    export function $getI18nInstance(locale) {
      return i18n
    }`
  }
}
