import { useAction } from "convex/react"
import { useRef, useState } from "react"
import { useLocation } from "react-router"
import { api } from "../../convex/_generated/api"
import type { Doc } from "../../convex/_generated/dataModel"
import { errorText, longDate, time } from "../lib.ts"
import { useMe } from "./auth.tsx"
import { Alert, Button, ButtonLink } from "./ui.tsx"

type Dinner = Pick<
  Doc<"events">,
  | "_id"
  | "slug"
  | "startsAt"
  | "venue"
  | "address"
  | "capacity"
  | "sold"
  | "priceCents"
  | "published"
>

const MAX_SEATS = 10
const steps = ["Tickets", "Details", "Review"]
const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

export function DinnerFacts({ dinner }: { dinner: Dinner }) {
  const dateTime = new Date(dinner.startsAt).toISOString()
  return (
    <dl className="mt-6 flex flex-wrap items-start gap-x-6 gap-y-4 text-sm">
      <div className="relative pl-8">
        <dt className="sr-only">Date</dt>
        <dd className="font-medium text-paper">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="absolute top-0.5 left-0 size-5 text-muted"
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4m8-4v4" />
          </svg>
          <time dateTime={dateTime}>{longDate(dinner.startsAt)}</time>
        </dd>
      </div>
      <div className="relative pl-8">
        <dt className="sr-only">Time</dt>
        <dd className="font-medium text-paper">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="absolute top-0.5 left-0 size-5 text-muted"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <time dateTime={dateTime}>{time(dinner.startsAt)}</time>
        </dd>
      </div>
      <div className="relative pl-8">
        <dt className="sr-only">Location</dt>
        <dd className="font-medium text-paper">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="absolute top-0.5 left-0 size-5 text-muted"
          >
            <path d="M19 10c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {dinner.venue}
        </dd>
        <dd className="text-muted">{dinner.address}</dd>
      </div>
    </dl>
  )
}

export default function DinnerTickets({ dinner }: { dinner: Dinner }) {
  const location = useLocation()
  const { isAuthenticated, loading, me } = useMe()
  const checkout = useAction(api.stripe.checkout)
  const seatsLeft = Math.max(0, dinner.capacity - dinner.sold)
  const limit = Math.min(MAX_SEATS, seatsLeft)
  const [qty, setQty] = useState(() => {
    const qty = Number(new URLSearchParams(location.search).get("tickets"))
    return Number.isInteger(qty) && qty > 0 && qty <= MAX_SEATS ? qty : 0
  })
  const [step, setStep] = useState(() => (qty > 0 ? 1 : 0))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const canContinue = qty > 0 && qty <= limit
  const price = dollars.format(dinner.priceCents / 100)
  const subtotal = dollars.format((dinner.priceCents * qty) / 100)
  const returnParams = new URLSearchParams(location.search)
  returnParams.set("tickets", String(qty))
  if (location.pathname.startsWith("/titles/")) returnParams.set("dinner", dinner.slug)
  const signInPath = `/sign-in?next=${encodeURIComponent(`${location.pathname}?${returnParams}`)}`
  const ticketCount = `${qty} ${qty === 1 ? "ticket" : "tickets"}`

  function goTo(next: number) {
    setError(null)
    setStep(next)
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }))
  }

  if (dinner.startsAt <= Date.now()) {
    return <p className="mt-6 text-muted">This dinner already happened.</p>
  }
  if (!dinner.published) return null

  return (
    <section className="mt-8 max-w-2xl text-paper" aria-label="Ticket checkout">
      <ol
        aria-label="Checkout progress"
        className="mb-6 inline-flex flex-wrap items-center gap-2 rounded-full border border-line px-4 py-2 text-sm sm:gap-3"
      >
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={index === step ? "font-semibold text-paper" : "text-muted"}
          >
            {index > 0 && (
              <span aria-hidden="true" className="mr-2 text-muted sm:mr-3">
                ›
              </span>
            )}
            {label}
          </li>
        ))}
      </ol>

      <div>
        <div>
          <h2
            ref={heading}
            tabIndex={-1}
            className="mb-5 text-2xl font-semibold tracking-tight focus:outline-none"
          >
            {["Select tickets", "Contact details", "Review your order"][step]}
          </h2>
          {step === 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white/[0.025] px-4 py-5 sm:px-5">
              <div>
                <h3 className="text-lg font-semibold">General admission</h3>
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-lg font-semibold tabular-nums">{price}</span>
                  <span className="text-sm text-muted">
                    {seatsLeft > 0
                      ? `${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} available`
                      : "Sold out"}
                  </span>
                </p>
              </div>
              <div role="group" aria-label="Ticket quantity" className="flex items-center gap-1.5">
                <Button
                  type="button"
                  className="size-12 bg-neutral-500 p-0 text-2xl hover:bg-neutral-400"
                  aria-label="Remove one ticket"
                  disabled={qty === 0}
                  onClick={() => setQty(qty - 1)}
                >
                  −
                </Button>
                <output
                  aria-label="Selected tickets"
                  className="grid size-12 place-items-center rounded-md border border-line font-mono tabular-nums"
                >
                  {qty}
                </output>
                <Button
                  type="button"
                  className="size-12 p-0 text-2xl"
                  aria-label="Add one ticket"
                  disabled={qty >= limit}
                  onClick={() => setQty(qty + 1)}
                >
                  +
                </Button>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="rounded-xl border border-line p-4 text-sm">
              {loading ? (
                <p role="status" className="text-muted">
                  Checking your account…
                </p>
              ) : isAuthenticated ? (
                <>
                  <p className="font-medium">{me?.email ?? "Signed in"}</p>
                  <p className="mt-1 text-muted">
                    Your ticket confirmation goes to your account email.
                  </p>
                </>
              ) : (
                <p className="text-muted">
                  Sign in with your email to receive your ticket confirmation.
                </p>
              )}
            </div>
          )}
          {step === 2 && (
            <dl className="space-y-3 rounded-xl border border-line p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <dt>General admission</dt>
                <dd className="text-muted">
                  {ticketCount} · {price} each
                </dd>
              </div>
              {me?.email && (
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-line pt-3">
                  <dt>Confirmation email</dt>
                  <dd className="break-all text-muted">{me.email}</dd>
                </div>
              )}
            </dl>
          )}
          {error && (
            <div className="mt-4">
              <Alert>{error}</Alert>
            </div>
          )}
          {!busy && qty > limit && (
            <p role="status" className="mt-4 text-sm text-muted">
              {limit === 0
                ? "This screening is sold out."
                : `Reduce your selection to ${limit} ${limit === 1 ? "ticket" : "tickets"}.`}
            </p>
          )}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-line bg-white/[0.025] px-4 py-5 sm:px-5">
          <div aria-live="polite">
            <p className="font-medium">Subtotal</p>
            <p className="text-2xl font-semibold tabular-nums">{subtotal}</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {step > 0 && (
              <Button type="button" variant="ghost" disabled={busy} onClick={() => goTo(step - 1)}>
                Back
              </Button>
            )}
            {step > 0 && canContinue && !loading && !isAuthenticated ? (
              <ButtonLink to={signInPath}>Sign in</ButtonLink>
            ) : step < 2 ? (
              <Button
                type="button"
                className="min-h-12 min-w-28 sm:min-w-40"
                disabled={!canContinue || (step === 1 && loading)}
                onClick={() => goTo(step + 1)}
              >
                {limit > 0 && <span aria-hidden="true">→</span>}
                {limit === 0 ? "Sold out" : "Next"}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={busy || !canContinue || loading || !isAuthenticated}
                onClick={async () => {
                  setBusy(true)
                  setError(null)
                  try {
                    window.location.href = await checkout({ eventId: dinner._id, quantity: qty })
                  } catch (e) {
                    setError(errorText(e))
                    setBusy(false)
                  }
                }}
              >
                {busy ? "Opening checkout…" : "Continue to payment"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
