- Use pnpm, vite, vitest, typescript, react-router, react and lingui
- Always format code with `pnpm format`, follow eslint rules
- Library is in the root directory, sources in `src/`, build with `pnpm unbuild`
- Run library tests via `pnpm vitest run`, specific test with `-t` parameter
- Test project is in `test/` subdirectory, before running anything in there, library must be
  rebuilt, if changed. Test project uses `dist/` build output.
- Unit tests have `.test.tsx?` suffix
- Whole project is tested with `pnpm test:all`
