import { getConfig } from "@lingui/conf"
import type { Plugin, SSROptions, UserConfig } from "vite"
import { normalizeLocaleKey } from "../config"
import {
  buildConfig,
  generateLoaderModuleClient,
  generateLoaderModuleServer,
} from "./generators/loader-module"
import { generateLocaleModule } from "./generators/locale-module"
import {
  type LinguiRouterPluginConfig,
  type LinguiRouterPluginConfigFull,
  MANIFEST_CHUNK_NAME,
  PLUGIN_NAME,
  VIRTUAL_LOADER,
  VIRTUAL_LOCALE_PREFIX,
  VIRTUAL_MANIFEST,
} from "./plugin-config"
import {
  generateBundleClient,
  generateBundleServer,
  generateManifestModule,
} from "./generators/manifest-module"

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
    name: PLUGIN_NAME,

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
          dedupe: (config.resolve?.dedupe ?? []).concat(PLUGIN_NAME),
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
                if (id.startsWith("\0" + VIRTUAL_LOCALE_PREFIX)) {
                  const locale = id.replace("\0" + VIRTUAL_LOCALE_PREFIX, "")
                  return `locale-${locale}`
                }
              },
            },
          },
        },
        ssr: {
          noExternal: addToNoExternal(config.ssr?.noExternal, PLUGIN_NAME),
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

      if (id.startsWith(VIRTUAL_LOCALE_PREFIX)) {
        return "\0" + id
      }
    },

    async load(id) {
      const server = this.environment.name === "ssr"
      const { linguiRouterConfig } = this.environment.config
      if (!linguiRouterConfig) throw new Error("linguiRouterConfig not loaded")

      if (id === "\0" + VIRTUAL_MANIFEST) {
        return generateManifestModule(server && this.environment.mode !== "dev")
      }

      if (id === "\0" + VIRTUAL_LOADER) {
        const configObject = buildConfig(linguiRouterConfig, server)
        return server
          ? await generateLoaderModuleServer(linguiRouterConfig, configObject)
          : await generateLoaderModuleClient(linguiRouterConfig, configObject)
      }

      if (id.startsWith("\0" + VIRTUAL_LOCALE_PREFIX)) {
        const locale = id.replace("\0" + VIRTUAL_LOCALE_PREFIX, "")
        const module = await generateLocaleModule(locale, linguiRouterConfig)
        if (!module) {
          this.warn(
            `No message catalogs found for locale '${locale}'. Please check your Lingui configuration.`
          )
        }
        return module
      }
    },

    async generateBundle(_options, bundle) {
      if (this.environment.name === "client") {
        await generateBundleClient(this, this.environment.config, bundle)
      } else {
        await generateBundleServer(this, this.environment.config, bundle)
      }
    },
  } satisfies Plugin
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
