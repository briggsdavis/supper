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
  ButtonLink,
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
                <Link to="/dinners" className="text-paper underline underline-offset-4">
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
          <Profile firstName={me.firstName} lastName={me.lastName} alerts={me.alerts} />
          <div className="flex flex-wrap gap-3">
            {me.isAdmin && <ButtonLink to="/admin">Admin</ButtonLink>}
            <Button variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </section>
      </div>
    </Page>
  )
}

function Ticket({ order }: { order: FunctionReturnType<typeof api.orders.mine>[number] }) {
  if (!order.event) return null
  return (
    <Link
      to={`/dinners/${order.event.slug}`}
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
        <p className="text-sm text-neutral-400">{order.event.address}</p>
        <p className="mt-2 text-sm text-paper">
          {order.quantity} {order.quantity === 1 ? "seat" : "seats"}
          {order.checkedIn && <span className="text-neutral-500"> · Checked in</span>}
        </p>
      </div>
    </Link>
  )
}

function Profile({
  firstName,
  lastName,
  alerts,
}: {
  firstName: string
  lastName: string
  alerts: boolean
}) {
  const setName = useMutation(api.users.setName)
  const setAlerts = useMutation(api.users.setAlerts)
  const [name, setNameDraft] = useState({ firstName, lastName })
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle")
  const [error, setError] = useState<string | null>(null)
  const ready = !!name.firstName.trim() && !!name.lastName.trim()
  const changed = name.firstName.trim() !== firstName || name.lastName.trim() !== lastName

  const save = async (fn: () => Promise<unknown>) => {
    setState("saving")
    setError(null)
    try {
      await fn()
      setState("saved")
    } catch (err) {
      setError(errorText(err))
      setState("idle")
    }
  }

  useEffect(() => {
    if (!ready || !changed) return
    const timer = setTimeout(() => void save(() => setName(name)), 600)
    return () => clearTimeout(timer)
  }, [name, ready, changed])

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-3xl text-paper">Profile</h2>
        <p role="status" className="text-sm text-muted">
          {state === "saving" ? "Saving…" : state === "saved" && !changed ? "Saved" : ""}
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name">
          <Input
            value={name.firstName}
            onChange={(e) => setNameDraft({ ...name, firstName: e.target.value })}
            autoComplete="given-name"
            maxLength={40}
            required
          />
        </Field>
        <Field label="Last name">
          <Input
            value={name.lastName}
            onChange={(e) => setNameDraft({ ...name, lastName: e.target.value })}
            autoComplete="family-name"
            maxLength={40}
            required
          />
        </Field>
      </div>
      <p className="-mt-2 text-sm text-muted">
        {ready
          ? "Needed to buy tickets. Shown on your suggestions and the guest list."
          : "Add your first and last name to buy tickets."}
      </p>
      <label className="flex items-center gap-3 text-neutral-300">
        <input
          type="checkbox"
          checked={alerts}
          onChange={(e) => void save(() => setAlerts({ alerts: e.target.checked }))}
          className="size-4 accent-[#f4efe6]"
        />
        Email me when new dinners open
      </label>
      {error && <Alert>{error}</Alert>}
    </div>
  )
}
