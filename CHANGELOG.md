# Changelog

## [1.1.1](https://github.com/mdvorak/lingui-react-router/compare/v1.1.0...v1.1.1) (2025-11-08)


### Bug Fixes

* don't force the client to the join multiple catalogs ([6dd7044](https://github.com/mdvorak/lingui-react-router/commit/6dd7044518982e918a0fb34d49037fd223bb7af9))
* don't generate chunks for server ([0ea6858](https://github.com/mdvorak/lingui-react-router/commit/0ea68588472e55bb88cfe8bf925190301f46e425))

## [1.1.0](https://github.com/mdvorak/lingui-react-router/compare/v1.0.1...v1.1.0) (2025-11-07)


### Features

* add changeLocale function to handle locale changes and redirects ([9234ef7](https://github.com/mdvorak/lingui-react-router/commit/9234ef7abeaa0d9c793928760cdceae354f85a47))
* add changeLocale to RouteLocale object ([1693905](https://github.com/mdvorak/lingui-react-router/commit/16939053f38aca50b8ea6266f2a09f2f924a582c)), closes [#85](https://github.com/mdvorak/lingui-react-router/issues/85)
* expose userLocales property ([4e80d14](https://github.com/mdvorak/lingui-react-router/commit/4e80d14a75ca56a5d838e4673a7e506dfd88f9e1))
* rename usePathLocale to useRouteLocale, deprecate usePathLocale ([978dc70](https://github.com/mdvorak/lingui-react-router/commit/978dc70fcc01a768122b0f82fb31417e7c142c89))


### Bug Fixes

* add support for custom useLingui module configuration ([8c66dcc](https://github.com/mdvorak/lingui-react-router/commit/8c66dcc35bfdf4edd1a8be1b3c93b6c2a71cde87))
* correct locale normalization in URL redirect ([c5626c3](https://github.com/mdvorak/lingui-react-router/commit/c5626c3fae1e169ef43c33166f31bb94fcc0fd3d))
* enhance i18n handling in I18nApp and usePathLocale ([6a362c6](https://github.com/mdvorak/lingui-react-router/commit/6a362c6b197f7b4ea38cd5c5d1730002f5689857))
* fix minified code build and backticks in locales ([036f465](https://github.com/mdvorak/lingui-react-router/commit/036f46598cc93e7fb813b4a9cc3983c24ff002f3))
* further optimize usePathLocale, main logic now moved to I18nApp component ([4815ff0](https://github.com/mdvorak/lingui-react-router/commit/4815ff095f0061cbe1ac0e20a0dd567915d40924))
* remove I18nApp dependency on usePathLocale ([d9a6fd9](https://github.com/mdvorak/lingui-react-router/commit/d9a6fd9cff6cb782e2769f49310c3c7d0e581fcf))
* remove identity mappings from localeMapping ([6c9ce2e](https://github.com/mdvorak/lingui-react-router/commit/6c9ce2ef27339c1bd8ac3118a45cdc76625d0f0a))

## [1.0.1](https://github.com/mdvorak/lingui-react-router/compare/v1.0.0...v1.0.1) (2025-11-04)


### Bug Fixes

* move cldr-core dependency to direct dependencies ([b8f504d](https://github.com/mdvorak/lingui-react-router/commit/b8f504d184bd4bbceb57ac7a240cf5c9666aec4a))

## [1.0.0](https://github.com/mdvorak/lingui-react-router/compare/v0.3.2...v1.0.0) (2025-11-04)


### ⚠ BREAKING CHANGES

* removed localeRoutes from lingui-react-router

### Features

* add defaultLocaleMapping plugin config ([d0664a3](https://github.com/mdvorak/lingui-react-router/commit/d0664a3d4ecd7070bd8f541767a632e7537c9f33))
* add defineLinguiRouterConfig function ([400a802](https://github.com/mdvorak/lingui-react-router/commit/400a802e3f078db6e6093dcf6a0a0d3f05ca3ee1))
* add locale mapping configuration for improved locale detection ([d2c7527](https://github.com/mdvorak/lingui-react-router/commit/d2c752748d3e301a587ef39e415d75b7b6fea99a))
* add locale normalization and parent locale mapping ([9037056](https://github.com/mdvorak/lingui-react-router/commit/90370564e3c95786ee8b51a75ef078f4d81e7983))
* add locale parameter name configuration for improved locale handling ([5cf9615](https://github.com/mdvorak/lingui-react-router/commit/5cf961587cf816ba8e6c70f698c74afd3110c491))
* add support for custom catalog extensions in locale module ([2837a6e](https://github.com/mdvorak/lingui-react-router/commit/2837a6e379b9a17a0194abde6c781c02194c72ba))
* add support for custom runtimeConfigModule i18n config ([9db65c0](https://github.com/mdvorak/lingui-react-router/commit/9db65c0e3b8ed56c1f7661fbd59eddebaa2be199))
* enhance locale handling and configuration ([edece57](https://github.com/mdvorak/lingui-react-router/commit/edece5783432d21a2b7097e30f3de0ba28ed9b38))
* enhance localization support and configuration ([b19722a](https://github.com/mdvorak/lingui-react-router/commit/b19722ad41ccc04c4be56609fdbc6e63e4fc5531)), closes [#22](https://github.com/mdvorak/lingui-react-router/issues/22)
* enhance testing support with createLocaleRouteStub function ([7655d0e](https://github.com/mdvorak/lingui-react-router/commit/7655d0e70401c20f435b97824b92eaae88cb4642))
* removed localeRoutes from lingui-react-router ([828313c](https://github.com/mdvorak/lingui-react-router/commit/828313ce8106951276fe375d8556785fde7715e2))
* support fallback locales ([96ca054](https://github.com/mdvorak/lingui-react-router/commit/96ca054b91e6b40baaf0682c90f67f04b8b0ec92))


### Bug Fixes

* add cycle detection to localeMapping resolution ([b252432](https://github.com/mdvorak/lingui-react-router/commit/b2524322d7d5bfb499203d247723d6bda616d46a))
* don't add user defined locales  to fallbackLocales ([6d70822](https://github.com/mdvorak/lingui-react-router/commit/6d708229bcdd2752f80a608ecdb114c1746dd223))
* fix unknown locale handling ([cb7c3a8](https://github.com/mdvorak/lingui-react-router/commit/cb7c3a849ed7a4099a8d7df98cec6e89078d143b))
* loadInitialLocale should respect lingui runtimeConfigModule config ([3d80aaf](https://github.com/mdvorak/lingui-react-router/commit/3d80aafa55ac50d3b253af32f4a63e1efd59bb7b))
* resolve catalog path properly ([ff114aa](https://github.com/mdvorak/lingui-react-router/commit/ff114aa53a0a5fa078a19a6caee3539111f98cac))

## [0.3.2](https://github.com/mdvorak/lingui-react-router/compare/v0.3.1...v0.3.2) (2025-10-24)

### ⚠ BREAKING CHANGES

- `useLinguiServer()` now requires router context explicitly

### Bug Fixes

* remove dependency on vite, don't leak vite Plugin ([110e773](https://github.com/mdvorak/lingui-react-router/commit/110e773d72d4f3616d9b1350922abd998e15ee8a))
* **publish:** update npm before publish to fix OIDC publishing ([d397095](https://github.com/mdvorak/lingui-react-router/commit/d39709536d31ba8001c7ee1eb8bf5ed8bafe0221))
* moved server context to explicit RouterContextProvider, which useLinguiServer now requires ([09a2d89](https://github.com/mdvorak/lingui-react-router/commit/09a2d89ea4ab310a16c435c688e160867cd44c21))

## [0.2.3](https://github.com/mdvorak/lingui-react-router/compare/v0.2.2...v0.2.3) (2025-10-10)


### Bug Fixes

* **plugin:** added missing recursive flag to mkdir ([6b6d27b](https://github.com/mdvorak/lingui-react-router/commit/6b6d27bf45417407eaae1eff3ad69370ff4b741a))

## [0.2.2](https://github.com/mdvorak/lingui-react-router/compare/v0.2.1...v0.2.2) (2025-10-10)


### Bug Fixes

* support for locale preloading ([c4fd719](https://github.com/mdvorak/lingui-react-router/commit/c4fd719053df2a3beba668fe6e517bbf805c18ac)), closes [#18](https://github.com/mdvorak/lingui-react-router/issues/18)

## [0.2.1](https://github.com/mdvorak/lingui-react-router/compare/v0.2.0...v0.2.1) (2025-10-03)


### Bug Fixes

* add automatically lingui-react-router to ssr.noExternal ([51107f6](https://github.com/mdvorak/lingui-react-router/commit/51107f69d2ebc5f02be451625be6bec742d46ee6))

## [0.2.0](https://github.com/mdvorak/lingui-react-router/compare/v0.1.9...v0.2.0) (2025-10-03)


### Features

* introducing linguiRouterPlugin ([3a97551](https://github.com/mdvorak/lingui-react-router/commit/3a97551f2c70166c0f57c80b2c5d4cfb84b445ef))
* introducing linguiRouterPlugin ([f394f9f](https://github.com/mdvorak/lingui-react-router/commit/f394f9ff924bf95dc2daf2e74bdb7e5ba2670277))

## [0.1.9](https://github.com/mdvorak/lingui-react-router/compare/v0.1.8...v0.1.9) (2025-09-29)


### Bug Fixes

* reorganize package.json metadata and add repository link ([17c60ba](https://github.com/mdvorak/lingui-react-router/commit/17c60ba0ee4a49b692cd2fd4413a419edcdf2ae7))

## [0.1.8](https://github.com/mdvorak/lingui-react-router/compare/v0.1.7...v0.1.8) (2025-09-29)


### Bug Fixes

* improve route ID generation with locale prefix handling ([346dad1](https://github.com/mdvorak/lingui-react-router/commit/346dad16a7c92572d641a4cdef427d1b3e01b25a))

## [0.1.7](https://github.com/mdvorak/lingui-react-router/compare/v0.1.6...v0.1.7) (2025-09-29)


### Bug Fixes

* fixed root layout lingui usage, added docs for I18nApp component ([5ccec96](https://github.com/mdvorak/lingui-react-router/commit/5ccec96b416964897a9e96e7fe1ed5dc6fc6061e))

## [0.1.6](https://github.com/mdvorak/lingui-react-router/compare/v0.1.5...v0.1.6) (2025-09-29)


### Bug Fixes

* **ci:** use custom token for release-please ([f98927f](https://github.com/mdvorak/lingui-react-router/commit/f98927f29e27ad45f58e4bacf9b2842ad6ecc1d0))

## [0.1.5](https://github.com/mdvorak/lingui-react-router/compare/v0.1.4...v0.1.5) (2025-09-29)


### Bug Fixes

* extract localized routing into separate module and simplify config ([612596b](https://github.com/mdvorak/lingui-react-router/commit/612596b24c762a13c57219b8a0fa84e222939ab8))
* set global i18n in middleware only ([0095332](https://github.com/mdvorak/lingui-react-router/commit/00953328509533de21828a1a1c5d064521508ad6))
