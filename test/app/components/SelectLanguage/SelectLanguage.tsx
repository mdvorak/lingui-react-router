import { useLingui } from "@lingui/react/macro"
import { config, usePathLocale } from "lingui-react-router"
import { type ChangeEvent } from "react"
import { useLocation, useNavigate } from "react-router"

export default function SelectLanguage() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const location = useLocation()
  const { locale, pathname } = usePathLocale(location)
  const { locales, pseudoLocale } = config

  const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextLang = e.target.value
    const nextPath = `/${nextLang}${pathname}${location.search}${location.hash}`
    navigate(nextPath)
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <label>{t`Language`}</label>
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
