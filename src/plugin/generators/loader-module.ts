import type { LinguiConfigNormalized } from "@lingui/conf"
import { type LinguiRouterConfig, normalizeLocaleKey } from "../../config"
import {
  type LinguiRouterPluginConfigFull,
  PLUGIN_NAME,
  VIRTUAL_LOCALE_PREFIX,
} from "../plugin-config"
import { getAllLocales } from "./cldr"

/**
 * Generate the loader module for server builds.
 *
 * @param pluginConfig Plugin configuration
 * @param configObject Lingui router configuration object
 */
export async function generateLoaderModuleServer(
  pluginConfig: Readonly<LinguiRouterPluginConfigFull>,
  configObject: LinguiRouterConfig,
): Promise<string[]> {
  const lines: string[] = []

  lines.push(
    `import { setupI18n } from "@lingui/core"`,
    `export const config = ${JSON.stringify(configObject)}`,
  )

  const loaderMap: string[] = []
  const messagesMap: string[] = []
  const bundleMap: string[] = []

  // For server builds, use static imports
  for (const locale of pluginConfig.locales) {
    const varName = `locale_${locale.replaceAll("-", "_")}`
    lines.push(`import { messages as ${varName} } from '${VIRTUAL_LOCALE_PREFIX}${locale}'`)

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
    generateGetI18nInstanceServer(),
  )

  return lines
}

/**
 * Generate the loader module for client builds.
 *
 * @param pluginConfig Plugin configuration
 * @param configObject Lingui router configuration object
 */
export async function generateLoaderModuleClient(
  pluginConfig: Readonly<LinguiRouterPluginConfigFull>,
  configObject: LinguiRouterConfig,
): Promise<string[]> {
  const lines: string[] = []

  lines.push(
    `export const config = ${JSON.stringify(configObject)}`,
    `export const localeLoaders = {`,
  )

  // For client builds, use dynamic imports
  for (const locale of pluginConfig.locales) {
    lines.push(`  '${locale}': () => import('${VIRTUAL_LOCALE_PREFIX}${locale}'),`)
  }

  lines.push(
    `}`,
    generateGetI18nInstanceClient(pluginConfig.linguiConfig),
  )

  return lines
}

/**
 * Build the Lingui router configuration object.
 *
 * @param pluginConfig Plugin configuration
 * @param server Whether the build is for server-side rendering
 */
export function buildConfig(
  pluginConfig: Readonly<LinguiRouterPluginConfigFull>,
  server: boolean,
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

export async function buildLocaleMapping(
  locales: string[],
  localeMap: Record<string, string>,
  defaultLocaleMapping: boolean,
): Promise<Record<string, string>> {
  const knownLocales = defaultLocaleMapping ? await getAllLocales() : new Set<string>()

  // Add existing locales to the result (all normalized)
  const result = new Map<string, string>(locales.map(l => [l, l]))

  // Add user-defined fallback locales
  for (const [locale, fallback] of Object.entries(localeMap)) {
    // Validate
    if (result.has(locale)) {
      throw new Error(`Mapped locale '${locale}' is already defined in the Lingui configuration.`)
    }
    if (!locales.includes(fallback)) {
      throw new Error(
        `Fallback locale '${fallback}' for locale '${locale}' is not defined in the Lingui configuration.`,
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

function generateGetI18nInstanceClient(linguiConfig: Readonly<LinguiConfigNormalized>) {
  // modulePath can be specified without an importName
  const [modulePath, importName] = linguiConfig.runtimeConfigModule?.i18n ?? []

  return `import { ${importName || "i18n"} as i18n } from "${modulePath || "@lingui/core"}"
export function $getI18nInstance(_locale) {
  return i18n
}`
}

export async function generateLocaleMapping(pluginConfig: Readonly<LinguiRouterPluginConfigFull>) {
  const allLocaleMapping: Record<string, string> = await buildLocaleMapping(
    pluginConfig.locales,
    pluginConfig.localeMapping,
    pluginConfig.defaultLocaleMapping,
  )
  return [`export const localeMapping = JSON.parse(\`${JSON.stringify(allLocaleMapping)}\`)`]
}

export function generateEmptyLocaleMapping() {
  return [`export const localeMapping = undefined`]
}

export function generateDetectLocale(enabled: boolean) {
  if (enabled) {
    return [
      `import { negotiateClientLocale } from "${PLUGIN_NAME}/negotiate"`,
      `export const $detectLocale = negotiateClientLocale`,
    ]
  } else {
    return [`export const $detectLocale = () => undefined`]
  }
}
