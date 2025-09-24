import * as react_jsx_runtime from 'react/jsx-runtime';

interface LocalizedRedirectProps {
    to: string;
    replace?: boolean;
    state?: any;
}
/**
 * Component that redirects to a localized version of a route
 * Automatically prepends the current locale to the target path
 */
declare function LocalizedRedirect({ to, replace, state }: LocalizedRedirectProps): react_jsx_runtime.JSX.Element;

interface LocalizedRouteParams extends Record<string, string | undefined> {
    locale?: string;
}
interface LocalizedNavigateOptions {
    locale?: string;
    replace?: boolean;
    state?: any;
}

/**
 * Hook that provides localized navigation functionality
 * Combines React Router's navigation with Lingui's current locale
 */
declare function useLocalizedNavigate(): (to: string, options?: LocalizedNavigateOptions) => void;
/**
 * Hook that returns the current locale from URL parameters
 */
declare function useRouteLocale(): string;

export { type LocalizedNavigateOptions, LocalizedRedirect, type LocalizedRouteParams, useLocalizedNavigate, useRouteLocale };
