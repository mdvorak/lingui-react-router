import { useLingui } from "@lingui/react/macro"
import { userLocales, useRouteLocale } from "lingui-react-router"
import { useNavigation } from "react-router"

export default function SelectLanguage(props: Readonly<{ id: string }>) {
  const { t } = useLingui()
  const navigation = useNavigation()
  const { locale, changeLocale } = useRouteLocale()

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <label htmlFor={props.id}>{t`Language`}</label>
      <select id={props.id} value={locale}
              onChange={e => changeLocale(e.target.value)}
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
