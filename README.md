# lingui-react-router

Integration between Lingui and React Router app

This TypeScript library provides utilities for integrating Lingui internationalization with React Router, compiled for both CommonJS and ESM environments.

## Installation

```bash
npm install lingui-react-router
```

## Usage

### Hooks

#### `useLocalizedNavigate()`

A hook that provides localized navigation functionality, combining React Router's navigation with Lingui's current locale.

```tsx
import { useLocalizedNavigate } from 'lingui-react-router'

function MyComponent() {
  const navigate = useLocalizedNavigate()
  
  const handleClick = () => {
    navigate('/about') // Navigates to /en/about if current locale is 'en'
  }
  
  return <button onClick={handleClick}>Go to About</button>
}
```

#### `useRouteLocale()`

A hook that returns the current locale from URL parameters.

```tsx
import { useRouteLocale } from 'lingui-react-router'

function MyComponent() {
  const locale = useRouteLocale()
  
  return <p>Current locale: {locale}</p>
}
```

### Components

#### `LocalizedRedirect`

A component that redirects to a localized version of a route, automatically prepending the current locale to the target path.

```tsx
import { LocalizedRedirect } from 'lingui-react-router'

function MyComponent() {
  return <LocalizedRedirect to="/home" replace />
}
```

## Package Structure

This package provides:
- **CommonJS**: `dist/index.cjs` - Compatible with Node.js `require()`
- **ESM**: `dist/index.mjs` - Compatible with modern `import` statements
- **TypeScript declarations**: `dist/index.d.ts` - Full TypeScript support
- **Source maps**: For debugging support
- **Source files**: Original TypeScript files included in `src/` directory

## Development

```bash
# Build the library
npm run build

# Watch mode for development
npm run dev
```

## Requirements

- React >= 16.8.0
- React Router DOM >= 6.0.0
- Lingui React >= 4.0.0
