import { useNavigate, useParams } from 'react-router-dom'
import { useLingui } from '@lingui/react'
import type { LocalizedRouteParams, LocalizedNavigateOptions } from './types'

/**
 * Hook that provides localized navigation functionality
 * Combines React Router's navigation with Lingui's current locale
 */
export function useLocalizedNavigate() {
  const navigate = useNavigate()
  const { i18n } = useLingui()
  const params = useParams<LocalizedRouteParams>()

  const localizedNavigate = (
    to: string,
    options: LocalizedNavigateOptions = {}
  ) => {
    const locale = options.locale || params.locale || i18n.locale
    const localizedPath = `/${locale}${to.startsWith('/') ? to : `/${to}`}`
    
    navigate(localizedPath, {
      replace: options.replace,
      state: options.state
    })
  }

  return localizedNavigate
}

/**
 * Hook that returns the current locale from URL parameters
 */
export function useRouteLocale(): string {
  const params = useParams<LocalizedRouteParams>()
  const { i18n } = useLingui()
  
  return params.locale || i18n.locale
}