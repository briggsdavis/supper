import { useAction, useQuery } from "convex/react"
import { useEffect } from "react"
import { useSearchParams } from "react-router"
import { api } from "../../convex/_generated/api"
import { RequireAuth } from "../components/auth.tsx"
import { ButtonLink, Heading, Loading, Page } from "../components/ui.tsx"
import { longDate, time } from "../lib.ts"

export default function CheckoutSuccess() {
  return (
    <RequireAuth>
      <Success />
    </RequireAuth>
  )
}

function Success() {
  const [params] = useSearchParams()
  const sessionId = params.get("session_id") ?? ""
  const confirm = useAction(api.stripe.confirm)
  const order = useQuery(api.orders.bySession, { sessionId })

  useEffect(() => {
    if (sessionId) confirm({ sessionId }).catch(console.error)
  }, [sessionId, confirm])

  if (order === undefined) return <Loading />
  if (order === null) {
    return (
      <Page className="max-w-xl py-24">
        <Heading>Order not found</Heading>
        <ButtonLink to="/account" className="mt-8">
          Your tickets
        </ButtonLink>
      </Page>
    )
  }
  const paid = order.status === "paid"

  return (
    <Page className="max-w-xl py-24">
      <Heading>{order.title?.name ?? "Dinner"}</Heading>
      {order.event && (
        <p className="mt-6 text-lg text-neutral-300">
          {order.quantity} {order.quantity === 1 ? "seat" : "seats"} ·{" "}
          {longDate(order.event.startsAt)} · {time(order.event.startsAt)}
          <br />
          <span className="text-neutral-400">{order.event.venue}</span>
        </p>
      )}
      <p className="mt-6 text-neutral-400">
        {paid
          ? "You're in. We emailed you a confirmation."
          : "Confirming your payment. This takes a few seconds."}
      </p>
      <div className="mt-8 flex gap-3">
        <ButtonLink to="/account">Your tickets</ButtonLink>
        {order.event && (
          <ButtonLink to={`/events/${order.event.slug}`} variant="ghost">
            Dinner details
          </ButtonLink>
        )}
      </div>
    </Page>
  )
}
