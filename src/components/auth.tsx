import { useConvexAuth, useQuery } from "convex/react"
import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { api } from "../../convex/_generated/api"
import { ButtonLink, Heading, Loading, Page } from "./ui.tsx"

export function useMe() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip")
  return {
    isAuthenticated,
    me: isAuthenticated ? me : null,
    loading: isLoading || (isAuthenticated && me === undefined),
  }
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const location = useLocation()
  if (isLoading) return <Loading />
  if (!isAuthenticated)
    return (
      <Navigate
        to={`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  return children
}

export function RequireAdmin({
  children,
  signedOut,
}: {
  children: ReactNode
  signedOut: ReactNode
}) {
  const { isAuthenticated, me, loading } = useMe()
  if (loading) return <Loading />
  if (!isAuthenticated) return signedOut
  if (!me?.isAdmin) {
    return (
      <Page className="max-w-md space-y-4 py-24">
        <Heading>Admin access required</Heading>
        <p className="text-neutral-400">Sign in with an approved email to access the dashboard.</p>
        <ButtonLink to="/account">Go to your account</ButtonLink>
      </Page>
    )
  }
  return children
}
