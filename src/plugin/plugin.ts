import { getConfig } from "@lingui/conf"
import { type Environment, type Plugin, type UserConfig } from "vite"
import { normalizeLocaleKey } from "../config"
import {
  buildConfig,
  generateDetectLocale,
  generateEmptyLocaleMapping,
  generateLoaderModuleClient,
  generateLoaderModuleServer,
  generateLocaleMapping,
} from "./generators/loader-module"
import { generateLocaleModule } from "./generators/locale-module"
import { parseLocaleModuleChunk, replaceCatalogVariables } from "./generators/locale-module-parser"
import {
  generateBundleClient,
  generateEmptyManifestModule,
  generateManifestModule,
} from "./generators/manifest-module"
import {
  type LinguiRouterPluginConfig,
  type LinguiRouterPluginConfigFull,
  PLUGIN_NAME,
  pluginConfigDefaults,
  VIRTUAL_LOADER,
  VIRTUAL_LOCALE_PREFIX,
  VIRTUAL_MANIFEST,
} from "./plugin-config"

const SERVER_ENVIRONMENT_NAME = "ssr"

declare module "vite" {
  interface ResolvedConfig {
    /** Lingui Router plugin configuration */
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
    name: PLUGIN_NAME,

    configResolved: function(config) {
      const linguiConfig = pluginConfig.linguiConfig ?? getConfig({ cwd: config.root })
      const locales = pluginConfig.locales ?? linguiConfig.locales ?? []
      const pseudoLocale = pluginConfig.pseudoLocale ?? linguiConfig.pseudoLocale

      // Build plugin config with defaults and normalization
      const localeMapping = Object.fromEntries(
        Object.entries(pluginConfig.localeMapping ?? pluginConfigDefaults.localeMapping).map(([k, v]) => [
          normalizeLocaleKey(k),
          normalizeLocaleKey(v),
        ]),
      )

      const defaultLocale = normalizeLocaleKey(pluginConfig.defaultLocale
        ?? locales[0]
        ?? pluginConfigDefaults.defaultLocale)

      config.linguiRouterConfig = {
        ...pluginConfigDefaults,
        ...pluginConfig,
        linguiConfig,
        localeMapping,
        defaultLocale,
        locales: locales.map(normalizeLocaleKey),
        pseudoLocale: pseudoLocale ? normalizeLocaleKey(pseudoLocale) : undefined,
      }
    },

    config(config) {
      const isClientBuild = !config?.build?.ssr

      return {
        resolve: {
          dedupe: [PLUGIN_NAME],
        },
        build: {
          rollupOptions: {
            output: isClientBuild ? {
              manualChunks(id) {
                if (id.startsWith("\0" + VIRTUAL_LOCALE_PREFIX)) {
                  const locale = id.replace("\0" + VIRTUAL_LOCALE_PREFIX, "")
                  return `locale-${locale}`
                }
              },
            } : undefined,
          },
        },
        ssr: {
          // This library must be included, otherwise virtual imports won't work
          noExternal: config.ssr?.noExternal === true || [PLUGIN_NAME],
          optimizeDeps: {
            include: ["negotiator"],
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

      if (id.startsWith(VIRTUAL_LOCALE_PREFIX)) {
        return "\0" + id
      }
    },

    async load(id) {
      const server = this.environment.name === SERVER_ENVIRONMENT_NAME
      const { linguiRouterConfig } = this.environment.config
      if (!linguiRouterConfig) throw new Error("linguiRouterConfig not loaded")

      if (id === "\0" + VIRTUAL_MANIFEST) {
        if (server && this.environment.mode !== "dev") {
          return await generateManifestModule(this, this.environment.config)
        } else {
          return generateEmptyManifestModule()
        }
      }

      if (id === "\0" + VIRTUAL_LOADER) {
        return await generateLoaderModule(linguiRouterConfig, this.environment)
      }

      if (id.startsWith("\0" + VIRTUAL_LOCALE_PREFIX)) {
        const locale = id.replace("\0" + VIRTUAL_LOCALE_PREFIX, "")
        const module = await generateLocaleModule(locale, linguiRouterConfig)
        if (!module) {
          this.warn(
            `No message catalogs found for locale '${locale}'. Please check your Lingui configuration.`,
          )
        }
        return module
      }
    },

    async renderChunk(code, chunk) {
      if (chunk.facadeModuleId?.startsWith("\0" + VIRTUAL_LOCALE_PREFIX)
        && code.includes("Object.assign({},")) {
        try {
          const ast = this.parse(code)
          const result = parseLocaleModuleChunk(ast)

          if (result) {
            return replaceCatalogVariables(code, result)
          }

        } catch (error) {
          // If parsing fails, just return the original code
          this.warn(`Failed to optimize locale chunk ${chunk.facadeModuleId}: ${error}`)
        }
      }
    },

    async generateBundle(_options, bundle) {
      if (this.environment.name === "client") {
        await generateBundleClient(this, this.environment.config, bundle)
      }
    },
  } satisfies Plugin
}

async function generateLoaderModule(pluginConfig: Readonly<LinguiRouterPluginConfigFull>,
                                    environment: Readonly<Environment>) {
  const isServer = environment.name === SERVER_ENVIRONMENT_NAME

  const configObject = buildConfig(pluginConfig, isServer)
  const lines = isServer
    ? await generateLoaderModuleServer(pluginConfig, configObject)
    : await generateLoaderModuleClient(pluginConfig, configObject)

  if (isServer || environment.mode === "dev") {
    lines.push(...await generateLocaleMapping(pluginConfig))
  } else {
    lines.push(...generateEmptyLocaleMapping())
  }
  lines.push(
    ...generateDetectLocale(isServer && pluginConfig.detectLocale),
  )

  return lines.join("\n")
}

