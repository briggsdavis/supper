import {
  ArrowRight,
  CalendarBlank,
  CaretRight,
  Clock,
  MapPin,
  Minus,
  Plus,
  type Icon,
} from "@phosphor-icons/react"
import { useAction, useMutation } from "convex/react"
import { useRef, useState, type ReactNode } from "react"
import { useLocation } from "react-router"
import { api } from "../../convex/_generated/api"
import type { Doc } from "../../convex/_generated/dataModel"
import { errorText, longDate, time } from "../lib.ts"
import { useMe } from "./auth.tsx"
import { Alert, Button, ButtonLink, Field, Input } from "./ui.tsx"

type Dinner = Pick<
  Doc<"events">,
  "_id" | "slug" | "startsAt" | "address" | "capacity" | "sold" | "priceCents" | "published"
>

const MAX_SEATS = 10
const steps = ["Tickets", "Details", "Review"]
const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

function Fact({ label, icon: Icon, children }: { label: string; icon: Icon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <dt className="shrink-0 text-muted">
        <Icon size={20} role="img" aria-label={label} />
      </dt>
      <dd className="font-medium text-paper">{children}</dd>
    </div>
  )
}

export function DinnerFacts({ dinner }: { dinner: Dinner }) {
  const dateTime = new Date(dinner.startsAt).toISOString()
  return (
    <dl className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
      <Fact label="Date" icon={CalendarBlank}>
        <time dateTime={dateTime}>{longDate(dinner.startsAt)}</time>
      </Fact>
      <Fact label="Time" icon={Clock}>
        <time dateTime={dateTime}>{time(dinner.startsAt)}</time>
      </Fact>
      <Fact label="Address" icon={MapPin}>
        {dinner.address}
      </Fact>
    </dl>
  )
}

export default function DinnerTickets({ dinner }: { dinner: Dinner }) {
  const location = useLocation()
  const { isAuthenticated, loading, me } = useMe()
  const checkout = useAction(api.square.checkout)
  const setName = useMutation(api.users.setName)
  const [name, setNameDraft] = useState<{ firstName: string; lastName: string } | null>(null)
  const draft = name ?? { firstName: me?.firstName ?? "", lastName: me?.lastName ?? "" }
  const nameReady = !!draft.firstName.trim() && !!draft.lastName.trim()
  const seatsLeft = Math.max(0, dinner.capacity - dinner.sold)
  const limit = Math.min(MAX_SEATS, seatsLeft)
  const [initialQty] = useState(() => {
    const qty = Number(new URLSearchParams(location.search).get("tickets"))
    return Number.isInteger(qty) && qty > 0 && qty <= MAX_SEATS ? qty : null
  })
  const [qty, setQty] = useState(initialQty ?? 1)
  const [step, setStep] = useState(initialQty ? 1 : 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const canContinue = qty > 0 && qty <= limit
  const price = dollars.format(dinner.priceCents / 100)
  const subtotal = dollars.format((dinner.priceCents * qty) / 100)
  const returnParams = new URLSearchParams(location.search)
  returnParams.set("tickets", String(qty))
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
              <CaretRight
                aria-hidden="true"
                size={12}
                className="mr-2 inline-block align-[-0.05em] text-muted sm:mr-3"
              />
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
                  className="size-14 bg-neutral-500 p-0 text-2xl hover:bg-neutral-400"
                  aria-label="Remove one ticket"
                  disabled={qty <= 1}
                  onClick={() => setQty(Math.max(1, qty - 1))}
                >
                  <Minus size={34} weight="bold" aria-hidden="true" />
                </Button>
                <output
                  aria-label="Selected tickets"
                  className="grid size-14 place-items-center rounded-md border border-line font-mono text-lg tabular-nums"
                >
                  {qty}
                </output>
                <Button
                  type="button"
                  className="size-14 p-0 text-2xl"
                  aria-label="Add one ticket"
                  disabled={qty >= limit}
                  onClick={() => setQty(qty + 1)}
                >
                  <Plus size={34} weight="bold" aria-hidden="true" />
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
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="First name">
                      <Input
                        value={draft.firstName}
                        onChange={(e) => setNameDraft({ ...draft, firstName: e.target.value })}
                        autoComplete="given-name"
                        maxLength={40}
                        required
                      />
                    </Field>
                    <Field label="Last name">
                      <Input
                        value={draft.lastName}
                        onChange={(e) => setNameDraft({ ...draft, lastName: e.target.value })}
                        autoComplete="family-name"
                        maxLength={40}
                        required
                      />
                    </Field>
                  </div>
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
              {me?.firstName && (
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-line pt-3">
                  <dt>Name</dt>
                  <dd className="text-muted">
                    {me.firstName} {me.lastName}
                  </dd>
                </div>
              )}
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
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.025] px-4 py-5 sm:px-5">
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
                disabled={busy || !canContinue || (step === 1 && (loading || !nameReady))}
                onClick={async () => {
                  if (step !== 1) return goTo(step + 1)
                  setBusy(true)
                  setError(null)
                  try {
                    await setName(draft)
                    setNameDraft(null)
                    goTo(2)
                  } catch (e) {
                    setError(errorText(e))
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {limit === 0 ? "Sold out" : "Next"}
                {limit > 0 && <ArrowRight size={16} weight="bold" aria-hidden="true" />}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={busy || !canContinue || loading || !isAuthenticated || !me?.hasFullName}
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
