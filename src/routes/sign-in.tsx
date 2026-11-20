import { useSendEmailMagicLink } from "@convex-dev/auth/methods/email-magic-link/react"
import { useConvexAuth } from "convex/react"
import { useEffect, useState } from "react"
import { Navigate, useSearchParams } from "react-router"
import { api } from "../../convex/_generated/api"
import { Alert, Button, Field, Heading, Input, Loading, Page } from "../components/ui.tsx"
import { NEXT_KEY } from "../lib.ts"

export default function SignIn() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const [params] = useSearchParams()
  const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/account"
  const { sendMagicLink, pending } = useSendEmailMagicLink(api.auth)
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  useEffect(() => sessionStorage.setItem(NEXT_KEY, next), [next])

  if (isLoading) return <Loading />
  if (isAuthenticated) return <Navigate to={next} replace />

  return (
    <Page className="max-w-md py-24">
      {sentTo ? (
        <div className="space-y-4">
          <Heading>Check your email</Heading>
          <p className="text-neutral-300">
            We sent a sign-in link to <span className="text-paper">{sentTo}</span>. It works for 10
            minutes.
          </p>
          <p className="text-neutral-400">
            Open it in this browser. The link only works where you asked for it.
          </p>
          <Button variant="ghost" onClick={() => setSentTo(null)}>
            Use another email
          </Button>
        </div>
      ) : (
        <form
          className="space-y-6"
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)
            const result = await sendMagicLink({ email })
            if (result.success) {
              setSentTo(email)
              return
            }
            const err = result.userError
            switch (err.error) {
              case "INVALID_EMAIL":
                setError("That email doesn't look right.")
                break
              case "RATE_LIMITED":
                setError(
                  `Too many tries. Try again in ${Math.ceil(err.retryAfterMs / 60_000)} minutes.`,
                )
                break
              case "OTHER_ERROR":
                console.error(err.cause)
                setError("Something went wrong. Try again.")
                break
              default:
                err satisfies never
            }
          }}
        >
          <div className="space-y-3">
            <Heading>Take a seat</Heading>
            <p className="text-neutral-400">We'll email you a link. No password needed.</p>
          </div>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={pending}
              autoFocus
            />
          </Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Sending" : "Email me a link"}
          </Button>
        </form>
      )}
    </Page>
  )
}
