// src/components.tsx
import { Navigate, useParams } from "react-router-dom";
import { useLingui } from "@lingui/react";
import { jsx } from "react/jsx-runtime";
function LocalizedRedirect({ to, replace = false, state }) {
  const params = useParams();
  const { i18n } = useLingui();
  const locale = params.locale || i18n.locale;
  const localizedPath = `/${locale}${to.startsWith("/") ? to : `/${to}`}`;
  return /* @__PURE__ */ jsx(Navigate, { to: localizedPath, replace, state });
}

// src/hooks.ts
import { useNavigate, useParams as useParams2 } from "react-router-dom";
import { useLingui as useLingui2 } from "@lingui/react";
function useLocalizedNavigate() {
  const navigate = useNavigate();
  const { i18n } = useLingui2();
  const params = useParams2();
  const localizedNavigate = (to, options = {}) => {
    const locale = options.locale || params.locale || i18n.locale;
    const localizedPath = `/${locale}${to.startsWith("/") ? to : `/${to}`}`;
    navigate(localizedPath, {
      replace: options.replace,
      state: options.state
    });
  };
  return localizedNavigate;
}
function useRouteLocale() {
  const params = useParams2();
  const { i18n } = useLingui2();
  return params.locale || i18n.locale;
}
export {
  LocalizedRedirect,
  useLocalizedNavigate,
  useRouteLocale
};
//# sourceMappingURL=index.mjs.map