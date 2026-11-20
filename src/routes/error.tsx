import { isRouteErrorResponse, useRouteError } from "react-router"

export default function ErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unknown error"

  return (
    <div className="grid min-h-screen place-items-center bg-neutral-950 p-6 text-center text-neutral-300">
      <div>
        <h1 className="font-display text-5xl text-[#f4efe6]">Something went wrong</h1>
        <p className="mt-4 text-neutral-500">{message}</p>
        <a href="/" className="mt-8 inline-block text-[#f4efe6] underline underline-offset-4">
          Back home
        </a>
      </div>
    </div>
  )
}
