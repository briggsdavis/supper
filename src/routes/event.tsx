import { useAction, useConvexAuth, useQuery } from "convex/react"
import { useState } from "react"
import { Link, useParams } from "react-router"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import Comments from "../components/comments.tsx"
import {
  Alert,
  Button,
  ButtonLink,
  Loading,
  NotFound,
  Page,
  Poster,
  Select,
} from "../components/ui.tsx"
import { errorText, longDate, money, time } from "../lib.ts"

const MAX = 10

export default function Event() {
  const { slug = "" } = useParams()
  const event = useQuery(api.events.get, { slug })
  if (event === undefined) return <Loading />
  if (event === null) return <NotFound what="dinner" />

  const name = event.title?.name ?? "Dinner"
  const left = Math.max(0, event.capacity - event.sold)
  const past = event.startsAt < Date.now()

  return (
    <Page>
      {!event.published && (
        <p className="mb-6 rounded-xl bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          Draft. Only admins can see this.
        </p>
      )}
      <div className="grid gap-10 md:grid-cols-[18rem_1fr]">
        <Poster url={event.title?.posterUrl} name={name} className="w-56 md:w-72" />
        <div>
          <h1 className="font-display text-6xl leading-none text-paper md:text-7xl">{name}</h1>
          {event.title?.year && (
            <p className="mt-2 font-mono text-neutral-500">{event.title.year}</p>
          )}
          <p className="mt-4 font-mono text-base text-paper">
            {longDate(event.startsAt)} · {time(event.startsAt)}
          </p>
          <p className="mt-6 max-w-2xl text-lg text-neutral-300">{event.title?.synopsis}</p>
          {event.note && <p className="mt-4 max-w-2xl text-neutral-400">{event.note}</p>}

          <dl className="mt-8 grid max-w-xl grid-cols-2 gap-6 font-mono text-sm">
            <div>
              <dt className="text-neutral-500">Where</dt>
              <dd className="mt-1 text-paper">{event.venue}</dd>
              <dd className="text-neutral-400">{event.address}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Ticket</dt>
              <dd className="mt-1 text-paper">{money(event.priceCents)} per seat</dd>
              <dd className="text-neutral-400">
                {left > 0 ? `${left} of ${event.capacity} seats left` : "Sold out"}
              </dd>
            </div>
          </dl>

          <div className="mt-8">
            {past ? (
              <p className="text-neutral-500">This dinner already happened.</p>
            ) : (
              <Buy eventId={event._id} left={left} price={event.priceCents} />
            )}
          </div>
        </div>
      </div>

      {event.menu.length > 0 && (
        <section className="mt-16 border-t border-white/10 pt-12">
          <h2 className="font-display text-3xl text-paper">The menu</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {event.menu.map((c, i) => (
              <li key={i} className="rounded-2xl border border-white/10 p-6">
                <p className="font-display text-2xl text-paper">{c.dish}</p>
                <p className="mt-1 font-mono text-sm text-neutral-500">{c.course}</p>
              </li>
            ))}
          </ol>
          {event.title && (
            <Link
              to={`/titles/${event.title.slug}`}
              className="mt-6 inline-block text-sm text-neutral-400 underline-offset-4 hover:text-paper hover:underline"
            >
              Recipes from {name}
            </Link>
          )}
        </section>
      )}

      <div className="mt-16 max-w-2xl border-t border-white/10 pt-12">
        <Comments target={{ eventId: event._id }} prompt="What do you want to eat from this one?" />
      </div>
    </Page>
  )
}

function Buy({ eventId, left, price }: { eventId: Id<"events">; left: number; price: number }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const checkout = useAction(api.stripe.checkout)
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { slug = "" } = useParams()

  if (left === 0) return <Button disabled>Sold out</Button>
  if (isLoading) return null
  if (!isAuthenticated) {
    return (
      <ButtonLink to={`/sign-in?next=${encodeURIComponent(`/events/${slug}`)}`}>
        Sign in to get tickets
      </ButtonLink>
    )
  }
  const options = Array.from({ length: Math.min(MAX, left) }, (_, i) => i + 1)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="w-32"
          aria-label="Seats"
        >
          {options.map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "seat" : "seats"}
            </option>
          ))}
        </Select>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setError(null)
            try {
              window.location.href = await checkout({ eventId, quantity: qty })
            } catch (e) {
              setError(errorText(e))
              setBusy(false)
            }
          }}
        >
          {busy ? "Opening checkout" : `Buy for ${money(price * qty)}`}
        </Button>
      </div>
      {error && <Alert>{error}</Alert>}
      <p className="text-xs text-neutral-500">Seats are held for 30 minutes while you check out.</p>
    </div>
  )
}
