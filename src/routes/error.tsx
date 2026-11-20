import { isRouteErrorResponse, useRouteError } from "react-router"

export default function ErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unknown error"

  return (
    <div>
      <h1>Something went wrong</h1>
      <p>{message}</p>
    </div>
  )
}
