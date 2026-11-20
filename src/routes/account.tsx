import { useAuthActions } from "@convex-dev/auth/react"
import { useMutation, useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { useEffect, useState } from "react"
import { Link } from "react-router"
import { api } from "../../convex/_generated/api"
import { RequireAuth, useMe } from "../components/auth.tsx"
import {
  Alert,
  Button,
  Empty,
  Field,
  Heading,
  Input,
  Loading,
  Page,
  Poster,
} from "../components/ui.tsx"
import { errorText, longDate, time } from "../lib.ts"

export default function Account() {
  return (
    <RequireAuth>
      <AccountPage />
    </RequireAuth>
  )
}

function AccountPage() {
  const { me } = useMe()
  const orders = useQuery(api.orders.mine)
  const { signOut } = useAuthActions()
  if (!me) return <Loading />
  const upcoming = orders?.filter((o) => (o.event?.startsAt ?? 0) > Date.now()) ?? []
  const past = orders?.filter((o) => (o.event?.startsAt ?? 0) <= Date.now()) ?? []

  return (
    <Page>
      <Heading>{me.name ? `Hi, ${me.name}` : "Your account"}</Heading>
      <p className="mt-3 text-neutral-500">{me.email}</p>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="font-display text-3xl text-paper">Your tickets</h2>
          <div className="mt-6 space-y-4">
            {orders === undefined ? (
              <Loading />
            ) : upcoming.length === 0 ? (
              <Empty>
                No upcoming tickets.{" "}
                <Link to="/events" className="text-paper underline underline-offset-4">
                  See dinners
                </Link>
              </Empty>
            ) : (
              upcoming.map((o) => <Ticket key={o._id} order={o} />)
            )}
            {past.length > 0 && (
              <>
                <h3 className="pt-6 font-display text-2xl text-neutral-400">Past</h3>
                {past.map((o) => (
                  <Ticket key={o._id} order={o} />
                ))}
              </>
            )}
          </div>
        </section>
        <section className="space-y-10">
          <Profile name={me.name} alerts={me.alerts} />
          <Button variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
        </section>
      </div>
    </Page>
  )
}

function Ticket({ order }: { order: FunctionReturnType<typeof api.orders.mine>[number] }) {
  if (!order.event) return null
  return (
    <Link
      to={`/events/${order.event.slug}`}
      className="flex gap-4 rounded-2xl border border-white/10 p-4 hover:border-white/30"
    >
      <Poster
        url={order.title?.posterUrl}
        name={order.title?.name ?? ""}
        className="w-16 shrink-0 text-xs"
      />
      <div>
        <p className="font-display text-2xl text-paper">{order.title?.name}</p>
        <p className="text-sm text-neutral-400">
          {longDate(order.event.startsAt)} · {time(order.event.startsAt)}
        </p>
        <p className="text-sm text-neutral-400">{order.event.venue}</p>
        <p className="mt-2 text-sm text-paper">
          {order.quantity} {order.quantity === 1 ? "seat" : "seats"}
          {order.checkedIn && <span className="text-neutral-500"> · Checked in</span>}
        </p>
      </div>
    </Link>
  )
}

function Profile({ name, alerts }: { name: string; alerts: boolean }) {
  const update = useMutation(api.users.update)
  const [draft, setDraft] = useState({ name, alerts })
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle")
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setDraft({ name, alerts }), [name, alerts])

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault()
        setState("saving")
        setError(null)
        try {
          await update(draft)
          setState("saved")
        } catch (err) {
          setError(errorText(err))
          setState("idle")
        }
      }}
    >
      <h2 className="font-display text-3xl text-paper">Profile</h2>
      <Field label="Name" hint="Shown on your comments and the guest list.">
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          maxLength={60}
        />
      </Field>
      <label className="flex items-center gap-3 text-neutral-300">
        <input
          type="checkbox"
          checked={draft.alerts}
          onChange={(e) => setDraft({ ...draft, alerts: e.target.checked })}
          className="size-4 accent-[#f4efe6]"
        />
        Email me when new dinners open
      </label>
      {error && <Alert>{error}</Alert>}
      <Button disabled={state === "saving"}>{state === "saved" ? "Saved" : "Save"}</Button>
    </form>
  )
}
