# Changelog

## [0.3.2](https://github.com/mdvorak/lingui-react-router/compare/v0.3.1...v0.3.2) (2025-10-24)


### Bug Fixes

* remove dependency on vite, don't leak vite Plugin ([110e773](https://github.com/mdvorak/lingui-react-router/commit/110e773d72d4f3616d9b1350922abd998e15ee8a))

## [0.3.1](https://github.com/mdvorak/lingui-react-router/compare/v0.3.0...v0.3.1) (2025-10-24)


### Bug Fixes

* **publish:** update npm before publish to fix OIDC publishing ([d397095](https://github.com/mdvorak/lingui-react-router/commit/d39709536d31ba8001c7ee1eb8bf5ed8bafe0221))

## [0.3.0](https://github.com/mdvorak/lingui-react-router/compare/v0.2.3...v0.3.0) (2025-10-24)


### Features

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
