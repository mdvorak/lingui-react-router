import React from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useLingui } from '@lingui/react'
import type { LocalizedRouteParams } from './types'

interface LocalizedRedirectProps {
  to: string
  replace?: boolean
  state?: any
}

/**
 * Component that redirects to a localized version of a route
 * Automatically prepends the current locale to the target path
 */
export function LocalizedRedirect({ to, replace = false, state }: LocalizedRedirectProps) {
  const params = useParams<LocalizedRouteParams>()
  const { i18n } = useLingui()
  
  const locale = params.locale || i18n.locale
  const localizedPath = `/${locale}${to.startsWith('/') ? to : `/${to}`}`
  
  return <Navigate to={localizedPath} replace={replace} state={state} />
}