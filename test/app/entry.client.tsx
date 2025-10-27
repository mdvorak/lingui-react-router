import { loadInitialLocale } from "lingui-react-router/client"
import { startTransition, StrictMode } from "react"
import { hydrateRoot } from "react-dom/client"
import { HydratedRouter } from "react-router/dom"

startTransition(async () => {
  await loadInitialLocale(location.pathname)
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  )
})
