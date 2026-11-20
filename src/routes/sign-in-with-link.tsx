import { useSignInWithEmailMagicLink } from "@convex-dev/auth/methods/email-magic-link/react"
import type { ReactNode } from "react"
import { Navigate, useSearchParams } from "react-router"
import { api } from "../../convex/_generated/api"
import { ButtonLink, Heading, Loading, Page } from "../components/ui.tsx"
import { NEXT_KEY } from "../lib.ts"

export default function SignInWithLink() {
  const [params] = useSearchParams()
  const code = params.get("code")
  if (code === null) return <Failed>This link is incomplete. Use the link from your email.</Failed>
  return <WithCode emailCode={code} />
}

function WithCode({ emailCode }: { emailCode: string }) {
  const state = useSignInWithEmailMagicLink(api.auth, { emailCode })
  if (state.status === "loading") return <Loading />
  if (state.status === "complete") {
    const next = sessionStorage.getItem(NEXT_KEY) ?? "/account"
    sessionStorage.removeItem(NEXT_KEY)
    return <Navigate to={next.startsWith("/") ? next : "/account"} replace />
  }
  const err = state.userError
  switch (err.error) {
    case "MISSING_SECRET":
      return <Failed>This link only works once, in the browser where you asked for it.</Failed>
    case "INVALID_CHALLENGE":
      return <Failed>This link expired or was already used.</Failed>
    case "INCORRECT_CODE":
      return <Failed>This isn't the latest link. Open the newest email we sent.</Failed>
    case "OTHER_ERROR":
      console.error(err.cause)
      return <Failed>Something went wrong. Reload to try again.</Failed>
    default:
      err satisfies never
      return null
  }
}

function Failed({ children }: { children: ReactNode }) {
  return (
    <Page className="max-w-md space-y-4 py-24">
      <Heading>Couldn't sign you in</Heading>
      <p role="alert" className="text-neutral-300">
        {children}
      </p>
      <ButtonLink to="/sign-in">Get a new link</ButtonLink>
    </Page>
  )
}
