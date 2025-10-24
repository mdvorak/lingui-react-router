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

1) Configure vite and react router

Enable React Router, Lingui, and macros in Vite for SSR and catalog compilation during development.
Path alias resolution via tsconfigPaths is recommended for clean imports and consistent
server/client builds.

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
      // Exclude paths that should not be treated as localized pages (optional)
      exclude: ["api", "health"],
    }),
    tsconfigPaths(),
  ],
})
 ```

Enable SSR and v8-style middleware in the React Router config to support server-side i18n
initialization and redirects.
This aligns server middleware with the app's route modules and the I18nApp layout for consistent SSR
hydration.
Configure prerendering for localized routes if needed.

 ```ts
// react-router.config.ts
import type { Config } from "@react-router/dev/config"
import linguiConfig from "./lingui.config"

const { locales } = linguiConfig
const langPrerender = ["hello"] // Add your localized paths here

export default {
  future: {
    v8_middleware: true,
  },
  prerender: [...langPrerender.flatMap(path => locales.map(lang => `/${lang}/${path}`))],
} satisfies Config
 ```

2) Add server middleware and wrap the app with I18nApp in the root layout route module.
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

3) Bootstrap the client by preloading the initial locale before hydrating the router.
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

4) Generate localized routes from the i18n config with localeRoutes helpers.
   Define the default root and locale-scoped routes in a single config to keep paths maintainable.

   ```ts
   // app/routes.ts
   import { index, type RouteConfig } from "@react-router/dev/routes"
   import { localeRoutes } from "lingui-react-router/routes"
   import linguiConfig from "../lingui.config"

   const locale = localeRoutes(linguiConfig)

   export default [
     index("./routes/_index.tsx"),
     ...locale.index("./routes/_index.tsx"),
     ...locale.route("hello", "./routes/hello.tsx"),
   ] satisfies RouteConfig
   ```

5) Use the locale-aware link and runtime hooks for current locale, request locale, and config.
   LocaleLink automatically prefixes the active locale and should receive locale-less paths for
   correctness.

```tsx
import { LocaleLink, usePathLocale, config } from "lingui-react-router"

function Header() {
  const { locale, requestLocale } = usePathLocale()
  return (
    <nav>
      <LocaleLink to="/hello">Hello</LocaleLink>
      <span>Active: {locale} (from URL: {requestLocale || "-"})</span>
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

6) Access server-side i18n and locale-aware redirects in loaders and actions with `useLinguiServer`.
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

## API summary

- `I18nApp`: wraps the application and synchronizes the i18n instance across server and client
  boundaries for SSR.
- `localeMiddleware`: detects locale from the URL, normalizes paths, initializes i18n, and enables
  locale-aware redirects.
- `loadInitialLocale`: preloads the correct catalog on the client before hydration based on the
  initial path.
- `localeRoutes`: generates localized route entries and helpers for index and child routes from a
  single i18n config.
- `LocaleLink`: a Link drop-in that prefixes locale automatically; always pass locale-less paths to
  ensure correct URL generation.
- `usePathLocale`: runtime hook for the active locale, requestLocale, and path information.
- `useLinguiServer`: loader/action helper with i18n instance, request locale, localized redirect,
  and convenience values like pathnamePrefix.

## Development

Run a full build and test to ensure catalogs, SSR, and middleware work together in the target
environment.
Use a modern Node.js runtime and verify Vite plugins are active to compile and load catalogs in dev
and prod.

```
pnpm build
pnpm test
```

## License

MIT
