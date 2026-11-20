import { useConvexAuth, useQuery } from "convex/react"
import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { api } from "../../convex/_generated/api"
import { Loading, NotFound } from "./ui.tsx"

export function useMe() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip")
  return {
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

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { me, loading } = useMe()
  if (loading) return <Loading />
  if (!me?.isAdmin) return <NotFound />
  return children
}
