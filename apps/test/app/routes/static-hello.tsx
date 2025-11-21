import { useLoaderData } from "react-router"

export function loader() {
  return { test: "Tsssss..." }
}

export default function StaticHello() {
  const { test } = useLoaderData<typeof loader>()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1>Static Page</h1>
      <p>This is a static page without localization.</p>
      <p>{test}</p>
    </div>
  )
}
