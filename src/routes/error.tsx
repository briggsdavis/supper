import { isRouteErrorResponse, useRouteError } from "react-router"

export default function ErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unknown error"

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-gray-600">{message}</p>
    </div>
  )
}
