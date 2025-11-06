import { useLingui } from "@lingui/react/macro"
import { config, usePathLocale } from "lingui-react-router"
import { type ChangeEvent } from "react"

export default function SelectLanguage() {
  const { t } = useLingui()
  const { locale, changeLocale } = usePathLocale()
  const { locales, pseudoLocale } = config

  const onChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    await changeLocale(e.target.value)
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
