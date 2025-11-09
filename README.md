# lingui-react-router

Integration between [Lingui](https://lingui.dev/) and [React Router](https://reactrouter.com/) with
locale-aware routing, server middleware, and a streamlined client bootstrap for SSR-ready apps.

## Features

- i18n-aware route config helpers to generate routes per locale from a single source of truth.
- Server middleware to detect, normalize, and initialize locale with SSR support and locale-aware
  redirects.
- Client bootstraps to preload the initial catalog before hydration to avoid flicker or missing
  messages.
- Runtime hooks and a locale-aware Link that automatically prefixes paths with the active request
  locale.

## Requirements

- React ^19
- React Router ^7.9
- Lingui ^5.5
- Node.js >= 20

## Installation

Install the package plus required peer dependencies in the app.
These examples assume Vite and Lingui's Vite plugin for optimal DX and SSR support.

```shell
# Install required and peer dependencies
npm install -S react react-dom react-router isbot
npm install -S @lingui/core @lingui/react
npm install -D @react-router/dev @lingui/cli @lingui/conf @lingui/vite-plugin vite-plugin-babel-macros
# For Typescript, add
npm install -D typescript tsx vite-tsconfig-paths @types/react @types/react-dom
# Install this library
npm install -D lingui-react-router
```

Note that since this library is always inlined, it's only required as a dev dependency.

## Quick start

1. Configure vite and react router

   Enable React Router, Lingui, and macros in Vite for SSR and catalog compilation during
   development.
   Path alias resolution via tsconfigPaths is recommended for clean imports and consistent
   server/client builds.

    ```ts
    // vite.config.ts
    import { lingui } from "@lingui/vite-plugin"
    import { reactRouter } from "@react-router/dev/vite"
    import { linguiRouterPlugin } from "lingui-react-router/plugin"
    import { defineConfig } from "vite"
    import macrosPlugin from "vite-plugin-babel-macros"
    import tsconfigPaths from "vite-tsconfig-paths"

    export default defineConfig({
       plugins: [
         reactRouter(),
         macrosPlugin(),
         lingui(),
         linguiRouterPlugin({
           // Exclude paths that should not be treated as localized pages (optional)
           exclude: ["api", "health"],
         }),
         tsconfigPaths(),
       ],
    })
    ```

   Enable SSR and v8-style middleware in the React Router config to support server-side i18n
   initialization and redirects.
   This aligns server middleware with the app's route modules and the I18nApp layout for consistent
   SSR
   hydration.
   Configure prerendering for localized routes if needed.

    ```ts
    // react-router.config.ts
    import type { Config } from "@react-router/dev/config"
    import { localePaths } from "lingui-react-router/routes"
    import linguiConfig from "./lingui.config"

    export default {
      future: {
        v8_middleware: true,
      },
      prerender: ["/hello"].flatMap(path => localePaths(linguiConfig, path)),
    } satisfies Config
    ```

2. Add server middleware and wrap the app with I18nApp in the root layout route module.
   The middleware sets up the server-side i18n context, and the I18nApp provides hydration-safe i18n
   on the client and server.

    ```tsx
    // app/root.tsx
    import { useLingui } from "@lingui/react/macro"
    import { I18nApp, LocalePreload } from "lingui-react-router"
    import { localeMiddleware } from "lingui-react-router/server"
    import { type ReactNode } from "react"
    import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router"

    export const middleware = [localeMiddleware]

    function RootLayout({ children }: { children: ReactNode }) {
      const { i18n } = useLingui()

      return (
        <html lang={i18n.locale}>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <Meta />
          <Links />
          <LocalePreload />
        </head>
        <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        </body>
        </html>
      )
    }

    export function Layout({ children }: { children: ReactNode }) {
      return (
        <I18nApp>
          <RootLayout>{children}</RootLayout>
        </I18nApp>
      )
    }

    export default function App() {
      return <Outlet />
    }
    ```

3. Bootstrap the client by preloading the initial locale before hydrating the router.
   This ensures the correct messages are available at first paint and avoids hydration warnings.

    ```tsx
    // app/entry.client.tsx
    import { loadInitialLocale } from "lingui-react-router/client"
    import { startTransition, StrictMode } from "react"
    import { hydrateRoot } from "react-dom/client"
    import { HydratedRouter } from "react-router/dom"

    startTransition(async () => {
      await loadInitialLocale(location.pathname)

      hydrateRoot(
        document,
        <StrictMode>
          <HydratedRouter />
        </StrictMode>
      )
    })
    ```

4. Generate localized routes from the i18n config with the prefix helper.
   Define the default root and locale-scoped routes using React Router's prefix helper with an
   optional locale parameter.

    ```ts
    // app/routes.ts
    import { index, prefix, route, type RouteConfig } from "@react-router/dev/routes"

    export default [
      index("./routes/_index.tsx"),
      ...prefix(":locale?", [
        index("./routes/_index.tsx", { id: "locale-index" }),
        route("hello", "./routes/hello.tsx"),
      ]),
    ] satisfies RouteConfig
    ```

5. Use the locale-aware link and runtime hooks for current locale, request locale, and config.
   LocaleLink automatically prefixes the active locale and should receive locale-less paths for
   correctness.

    ```tsx
    import { LocaleLink, useRouteLocale, config } from "lingui-react-router"

    function Header() {
      const { locale, requestLocale } = useRouteLocale()
      return (
        <nav>
          <LocaleLink to="/hello">Hello</LocaleLink>
          <span>
            Active: {locale} (from URL: {requestLocale || "-"})
          </span>
          <span>Supported: {config.locales.join(", ")}</span>
        </nav>
      )
    }
    ```

   Notes about LocaleLink:

- Pass locale-less paths such as `to="/hello"` or an object pathname without a locale, and the
  locale prefix will be added automatically based on the current request locale.
- If the current URL has no locale segment (e.g., the default root), LocaleLink renders a normal
  Link without modification to preserve expected navigation.

6. Access server-side i18n and locale-aware redirects in loaders and actions with `useLinguiServer`.
   Redirects thrown from this helper are automatically prefixed with the current locale for
   consistent UX and SEO.

   ```tsx
   // app/routes/hello.tsx
   import { msg } from "@lingui/react/macro"
   import { data, type LoaderFunctionArgs, useLoaderData } from "react-router"
   import { useLinguiServer } from "lingui-react-router/server"

   export function loader({ context }: LoaderFunctionArgs) {
     const { _, redirect } = useLinguiServer(context)

     // Example of localized redirect
     if (someCondition) {
       throw redirect("/login")
     }

     const message = _(msg`Hello, World!`)
     return data({ message })
   }

   export default function Hello() {
     const { message } = useLoaderData<typeof loader>()

     return (
       <div>
         <h1>{message}</h1>
       </div>
     )
   }
   ```

## API Reference

### Main Exports (`lingui-react-router`)

#### Components

- **`I18nApp`**: Wraps the application and synchronizes the i18n instance across server and client
  boundaries for SSR. Must be used in the Layout component.
- **`LocaleLink`**: A drop-in replacement for react-router's Link that automatically prefixes the
  current locale. Always pass locale-less paths to ensure correct URL generation.
- **`LocalePreload`**: Preloads the locale script on the client. Add to your HTML `<head>` section.

#### Hooks

- **`useRouteLocale()`**: Runtime hook that returns the active locale context with:
  - `locale`: The resolved locale code (falls back to defaultLocale)
  - `requestLocale`: The locale explicitly requested from the URL (optional)
  - `requestPathname`: The pathname without the locale prefix
  - `changeLocale(locale)`: Navigate to a new locale while preserving the current path

#### Types

- **`RouteLocale`**: Type representing the locale information derived from the URL path
- **`LinguiRouterConfig`**: Runtime configuration for locale detection, routing, and fallbacks
- **`RedirectBehavior`**: Type for redirect policy (`"auto" | "always" | "never"`)

#### Runtime Utilities

- **`config`**: Runtime configuration object with locales, defaultLocale, exclude paths, and more
- **`defaultLocale`**: The default locale string
- **`userLocales`**: Array of user-defined locales (excludes pseudo-locale)
- **`findLocale(localeParam)`**: Finds and resolves the locale from a URL path segment
- **`stripPathnameLocalePrefix(pathname, localeParam)`**: Removes the locale prefix from a pathname
- **`normalizeLocaleKey(locale)`**: Normalizes a locale code (lowercase, hyphens)

### Client Exports (`lingui-react-router/client`)

- **`loadInitialLocale(pathname)`**: Preloads the correct catalog on the client before hydration
  based on the initial path. Use in `entry.client.tsx` before hydrating the router.

### Server Exports (`lingui-react-router/server`)

- **`localeMiddleware`**: React Router middleware that detects locale from the URL, normalizes
  paths, initializes i18n, and enables locale-aware redirects. Add to your root route module.
- **`useLinguiServer(context)`**: Hook for loaders and actions that returns:
  - `i18n`: The internationalization processing object
  - `_`: The translation function bound to the current i18n instance
  - `url`: The URL object for the current request
  - `locale`: The resolved locale code
  - `requestLocale`: The locale explicitly requested by the client (optional)
  - `requestPathname`: The pathname without the locale prefix
  - `redirect(to, init)`: Locale-aware redirect function
  - `changeLocale(locale)`: Change locale and redirect to the same path
- **`I18nRequestContext`**: Type for the server-side i18n context

### Plugin Exports (`lingui-react-router/plugin`)

- **`linguiRouterPlugin(config?)`**: Vite plugin that generates locale loaders and manifests. Add to
  your `vite.config.ts`.
- **`defineLinguiRouterConfig(config)`**: Helper to define plugin configuration with type safety
- **`LinguiRouterPluginConfig`**: Type for the plugin configuration

### Routes Exports (`lingui-react-router/routes`)

- **`localePaths(config, path, withDefault?)`**: Generate all locale-specific paths for a given base
  path. Useful for prerendering in `react-router.config.ts`.

### Test Exports (`lingui-react-router/test`)

- **`createRouteLocaleStub(routeConfig)`**: Creates a test wrapper that mounts your route under a
  localized parent route with `I18nApp` and `localeMiddleware`. Returns a component that accepts
  `initialEntries` prop for testing different locales.

## Testing components

This package provides a lightweight helper to test route modules and components with i18n and
locale context set up exactly like your app does in production.

- The `createRouteLocaleStub` test utility mounts your route under a localized parent route and
  wraps it with `I18nApp` and the server `localeMiddleware`.
- Import it from `lingui-react-router/test` and render with an initial URL such as `/hello` or
  `/en/hello`.

Install recommended testing deps (if you don't already use them):

```bash
npm install -D vitest @testing-library/react @testing-library/user-event happy-dom
```

Configure Vitest with the required plugins to support Lingui macros and locale routing:

```ts
// vitest.config.ts
import { lingui } from "@lingui/vite-plugin"
import { linguiRouterPlugin } from "lingui-react-router/plugin"
import { defineConfig } from "vitest/config"
import macrosPlugin from "vite-plugin-babel-macros"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [
    macrosPlugin(),
    lingui(),
    linguiRouterPlugin({
      // It's recommended to share the same plugin config as your main app
      exclude: ["api", "health"],
    }),
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    environment: "happy-dom",
    exclude: ["**/node_modules/**", "build/**", ".react-router/**"],
  },
})
```

**Important:** The same Vite plugins used in your main app except for `reactRouter`, must be
included in your Vitest config to ensure i18n messages compile correctly during tests.

Example: route module test with loader and i18n messages

```tsx
// hello.test.tsx
import { render } from "@testing-library/react"
import { createLocaleRouteStub } from "lingui-react-router/test"
import Hello, { loader as helloLoader } from "./hello"

it("navigates to /hello and shows Hello and loader text", async () => {
  const Stub = createLocaleRouteStub({
    path: "hello",
    Component: Hello,
    loader: helloLoader,
  })

  render(<Stub initialEntries={["/hello"]} />)

  await expect(screen.findByText(/Hello, World!/i)).resolves.toBeTruthy()
  await expect(screen.findByText(/From loader too!/i)).resolves.toBeTruthy()
})
```

Notes and tips:

- Provide locale-less paths to `<LocaleLink>` in tests just like in your app; the active locale is
  prefixed automatically.
- To test a specific locale from the URL, render with `initialEntries={["/it/hello"]}`.

## Plugin Configuration

The `linguiRouterPlugin` accepts an optional configuration object to customize its behavior. All
options are optional and have sensible defaults.

### Options

#### `defaultLocale`

- **Type:** `string`
- **Default:** First locale from `locales`
- **Description:** Default locale to use when no locale can be detected. Must be included in
  `locales`. By default, the first locale from the Lingui config is used.

#### `exclude`

- **Type:** `string | string[]`
- **Default:** `[]`
- **Description:** One or more root-level path prefixes that should NOT be treated as locales. This
  is useful for API routes, health check endpoints, or other non-localized paths.

#### `localeParamName`

- **Type:** `string`
- **Default:** `"locale"`
- **Description:** Name of the URL parameter used to specify the locale. Defaults to "locale", e.g.
  `"/:locale?/*"`. Change this if you need a different parameter name in your routes.

#### `detectLocale`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Whether to detect the user's preferred locale from the `Accept-Language` HTTP
  header. When enabled, the server middleware will attempt to determine the best matching locale
  based on the user's browser settings.

#### `redirect`

- **Type:** `"auto" | "always" | "never"`
- **Default:** `"auto"`
- **Description:** Controls the redirect behavior when a locale is detected from the
  `Accept-Language` header.

**Values:**

- `"auto"`: Redirect to the detected locale only if it's not the default locale. This provides a
  clean UX where the default locale doesn't require a URL prefix, but other locales do.
- `"always"`: Always redirect to the detected locale, even if it's the default locale. All users
  will see locale-prefixed URLs.
- `"never"`: Never redirect based on detected locale. Users remain on the URL they requested.

#### `localeMapping`

- **Type:** `Record<string, string>`
- **Default:** `{}`
- **Description:** Mapping of locale codes to fallback locale codes, used for locale detection and
  redirection. For example, `{ "fr-CA": "fr", "es-MX": "es" }` where your lingui config only
  includes `["fr", "es"]`. It's also possible to map to a different locale, e.g. `{ "de": "en" }`.

#### `defaultLocaleMapping`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Whether to enable default locale mapping according to CLDR data. When set to
  false, only identity mappings and custom `localeMapping` entries will be included, without
  automatic CLDR fallbacks. For example, mapping "en-GB" to "en", "pt-BR" to "pt", etc.

### Advanced Options

Normally you don't need to set these options unless you have a specific use case.

#### `linguiConfig`

- **Type:** `LinguiConfigNormalized`
- **Default:** Auto-loaded from project root
- **Description:** Explicit Lingui configuration to use. If not provided, the plugin will attempt to
  load the Lingui config from the project root.

#### `locales`

- **Type:** `string[]`
- **Default:** From Lingui config
- **Description:** Override locales list defined in Lingui config. Normally, you should not need to
  set this.

#### `pseudoLocale`

- **Type:** `string | undefined`
- **Default:** From Lingui config
- **Description:** Overrides the pseudo-locale defined in Lingui config. Normally, you should not
  need to set this.

#### `optimizeLocaleBundles`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Whether to optimize client locale bundle chunks by removing unused catalog
  variables. This can reduce bundle size and improve performance.

### Complete Example

```typescript
// vite.config.ts
import { lingui } from "@lingui/vite-plugin"
import { reactRouter } from "@react-router/dev/vite"
import { linguiRouterPlugin } from "lingui-react-router/plugin"
import { defineConfig } from "vite"
import macrosPlugin from "vite-plugin-babel-macros"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [
    reactRouter(),
    macrosPlugin(),
    lingui(),
    linguiRouterPlugin({
      defaultLocale: "en-US",
      // Exclude API and health check paths from locale handling
      exclude: ["api", "health"],
      // Only redirect non-default locales
      redirect: "always",
    }),
    tsconfigPaths(),
  ],
})
```

## Development

Run a full build and test to ensure catalogs, SSR, and middleware work together in the target
environment.
Use a modern Node.js runtime and verify Vite plugins are active to compile and load catalogs in dev
and prod.

```shell
# Build and run all tests
pnpm test:all
```

## License

MIT
