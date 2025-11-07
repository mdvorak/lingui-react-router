import { useLingui } from "@lingui/react/macro"
import { usePathLocale, userLocales } from "lingui-react-router"
import { useNavigation } from "react-router"

export default function SelectLanguage() {
  const { t } = useLingui()
  const navigation = useNavigation()
  const { locale, changeLocale } = usePathLocale()

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <label>{t`Language`}</label>
      <select value={locale} onChange={e => changeLocale(e.target.value)}
              disabled={navigation.state !== "idle"}
              className="data-hover:outline-1 border-0!">
        {userLocales.map(loc => (
          <option key={loc} value={loc}>
            {loc.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  )
}
