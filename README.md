[![npm version](https://badge.fury.io/js/lingui-react-router.svg)](https://www.npmjs.com/package/lingui-react-router)

# lingui-react-router

Integration between [Lingui](https://lingui.dev/) and [React Router](https://reactrouter.com/).

This library provides a small set of helpers to make Lingui work seamlessly with React Router apps:

- i18n-aware route config helpers (generate routes for each locale)
- server middleware that detects/redirects locale and initializes Lingui
- client-side bootstrap to preload the correct catalog
- runtime hooks and a locale-aware Link component

It ships ESM and CJS builds with TypeScript types.

## Installation

```bash
npm install lingui-react-router
```

### Required Dependencies

This library requires the following dependencies to be installed in your project:

```bash
npm install -S @lingui/core @lingui/react
npm install -D vite @lingui/cli @lingui/vite-plugin vite-plugin-babel-macros vite-tsconfig-paths
```

This list does not include react-router dependencies, please
see [React Router Installation](https://reactrouter.com/start/framework/installation) for more info.

## Quick start

1) Define your i18n app config (wrapping your Lingui config)

Create `i18n.config.ts`:

```ts
import { defineConfig } from "lingui-react-router"
import linguiConfig from "./lingui.config"

export default defineConfig(linguiConfig, {
  // Optionally exclude top-level paths that are not locales (e.g., /api)
  exclude: "api",
  // IMPORTANT: use imported modules so the bundler can include catalogs
  catalogModules: import.meta.glob("./app/**/*.po"),
})
```

2) Add the server middleware

In your root route module (e.g. app/root.tsx):

```tsx
import {I18nApp} from "lingui-react-router"
import { createLocaleMiddleware } from "lingui-react-router/server"
import {useLingui} from "@lingui/react/macro"
import i18nConfig from "../i18n.config"

export const middleware = [createLocaleMiddleware(i18nConfig)]

function RootLayout({children}: { children: React.ReactNode }) {
  const {i18n} = useLingui()
  return (
    <html lang={i18n.locale}>
    <body>{children}</body>
    </html>
  )
}

export function Layout({children}: { children: React.ReactNode }) {
  return (
    <I18nApp config={i18nConfig}>
      <RootLayout>{children}</RootLayout>
    </I18nApp>
  )
}
```

3) Bootstrap the client

Create or edit app/entry.client.tsx:

```tsx
import { loadInitialLocale } from "lingui-react-router/client"
import { startTransition, StrictMode } from "react"
import { hydrateRoot } from "react-dom/client"
import { HydratedRouter } from "react-router/dom"
import i18nConfig from "../i18n.config"

startTransition(async () => {
  await loadInitialLocale(i18nConfig, location.pathname)
  hydrateRoot(document, (
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  ))
})
```

4) Generate localized routes

Create localized route helpers using your i18n config in app/routes.ts:

```ts
import { index, type RouteConfig } from "@react-router/dev/routes"
import { localeRoutes } from "lingui-react-router/routes"
import i18nConfig from "../i18n.config"

const locale = localeRoutes(i18nConfig)

export default [
  index("./routes/_index.tsx"), // default root ("/")
  ...locale.index("./routes/_index.tsx"), // "/en", "/fr", ...
  ...locale.route("hello", "./routes/hello.tsx"), // "/en/hello", ...
] satisfies RouteConfig
```

5) Use locale-aware links and hooks

```tsx
import { LocaleLink, useLocale, useI18nConfig } from "lingui-react-router"

function Header() {
  const { locale, requestLocale } = useLocale()
  const config = useI18nConfig()
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

- It is a drop-in replacement for react-router's Link that automatically prefixes the current
  request locale (e.g., "/en") to the target URL.
- Always pass locale-less paths to `to` (e.g., `to="/hello"` or
  `to={{ pathname: "/hello", search: "?x=1" }}`). The locale segment will be added for you.
- If there is no locale in the current URL (for example on the default root "/"), LocaleLink renders
  a normal Link without modification.

6) Use `useLinguiServer()` in loaders/actions

You can access the server-side i18n context inside route loaders and actions.
The redirect helper will automatically prefix paths with the current locale.

```ts
import { useLinguiServer } from "lingui-react-router/server"
import { msg } from "@lingui/core/macro"

export async function loader() {
  const {i18n, _, url, requestLocale, pathnamePrefix, redirect} = useLinguiServer()

  // Read locale info
  console.log("active:", i18n.locale, "from URL:", requestLocale)

  // Locale-aware redirect: this will become "/en/login" when locale is "en"
  if (url.searchParams.get("login") === "1") {
    throw redirect("/login")
  }

  // Translate on the server
  const title = _(msg`Welcome`)

  return Response.json({title, locale: i18n.locale, prefix: pathnamePrefix})
}
```

### Vite Configuration

To use this library with Vite, you'll need to configure the Lingui plugin in your `vite.config.ts`:

```ts
import {lingui} from "@lingui/vite-plugin"
import {reactRouter} from "@react-router/dev/vite"
import {defineConfig} from "vite"
import macrosPlugin from "vite-plugin-babel-macros"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [
    // tailwindcss(),
    reactRouter(),
    macrosPlugin(),
    lingui(),
    tsconfigPaths()
  ],
})
```

### React Router Configuration

Make sure your `react-router.config.ts` is properly configured for SSR with i18n support:

```ts
import type {Config} from "@react-router/dev/config"

export default {
  ssr: true,
  future: {v8_middleware: true},
  // Add any additional configuration options as needed
} satisfies Config
```

## Development

```bash
pnpm build
pnpm test
```

## Requirements

- [React](https://react.dev/) ^19
- [React Router](https://reactrouter.com/) ^7.9
- [Lingui](https://lingui.dev/) ^5.5
- [Node.js](https://nodejs.org/) >= 20
