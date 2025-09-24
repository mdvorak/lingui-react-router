export interface LocalizedRouteParams extends Record<string, string | undefined> {
  locale?: string
}

export interface LocalizedNavigateOptions {
  locale?: string
  replace?: boolean
  state?: any
}