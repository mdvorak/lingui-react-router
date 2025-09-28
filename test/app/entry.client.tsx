import { loadInitialLocale } from "lingui-react-router/client"
import { startTransition, StrictMode } from "react"
import { hydrateRoot } from "react-dom/client"
import { HydratedRouter } from "react-router/dom"
import i18nConfig from "../i18n.config"

startTransition(async () => {
  await loadInitialLocale(i18nConfig, location.pathname)

  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  )
})
