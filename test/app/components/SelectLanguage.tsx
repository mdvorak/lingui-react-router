import { useI18nConfig, useLocale } from "lingui-react-router"
import { type ChangeEvent } from "react"
import { useLocation, useNavigate } from "react-router"

export default function SelectLanguage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { locale, pathname } = useLocale(location)
  const { locales, pseudoLocale } = useI18nConfig()

  const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextLang = e.target.value
    const nextPath = `/${nextLang}${pathname}${location.search}${location.hash}`
    navigate(nextPath)
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <select value={locale} onChange={onChange} className="data-hover:outline-1 border-0!">
        {locales
          .filter(loc => loc !== pseudoLocale)
          .map(loc => (
            <option key={loc} value={loc}>
              {loc.toUpperCase()}
            </option>
          ))}
      </select>
    </div>
  )
}
