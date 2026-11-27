import { Plus, X } from "@phosphor-icons/react"
import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { api } from "../../../convex/_generated/api"
import type { Doc, Id } from "../../../convex/_generated/dataModel"
import { Alert, Button, Field, Input, Loading, Select, Textarea } from "../../components/ui.tsx"
import { errorText, fromZonedInput, toZonedInput } from "../../lib.ts"

const COURSES = [
  { course: "To start", dish: "" },
  { course: "Main", dish: "" },
  { course: "Dessert", dish: "" },
]

export default function AdminEventForm() {
  const id = useParams().id as Id<"events"> | undefined
  const event = useQuery(api.events.byId, id ? { id } : "skip")
  const titles = useQuery(api.titles.all)
  if (titles === undefined || (id && event === undefined)) return <Loading />
  if (titles.length === 0) {
    return (
      <p className="text-neutral-400">
        Add a{" "}
        <Link to="/admin/movies/new" className="text-paper underline">
          title
        </Link>{" "}
        first.
      </p>
    )
  }
  return <Form key={id ?? "new"} event={event ?? null} titles={titles} />
}

function Form({ event, titles }: { event: Doc<"events"> | null; titles: Doc<"titles">[] }) {
  const save = useMutation(api.events.save)
  const remove = useMutation(api.events.remove)
  const navigate = useNavigate()
  const [f, setF] = useState({
    titleId: event?.titleId ?? titles[0]._id,
    startsAt: event ? toZonedInput(event.startsAt) : "",
    address: event?.address ?? "",
    price: event ? String(event.priceCents / 100) : "",
    capacity: event ? String(event.capacity) : "",
    note: event?.note ?? "",
    menu: event?.menu.length ? event.menu : COURSES,
    published: event?.published ?? false,
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<typeof f>) => setF((old) => ({ ...old, ...patch }))
  const setCourse = (i: number, patch: Partial<(typeof f.menu)[number]>) =>
    set({ menu: f.menu.map((c, n) => (n === i ? { ...c, ...patch } : c)) })

  return (
    <form
      className="max-w-2xl space-y-6"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
          await save({
            id: event?._id,
            titleId: f.titleId,
            startsAt: fromZonedInput(f.startsAt),
            address: f.address,
            priceCents: Math.round(Number(f.price) * 100),
            capacity: Number(f.capacity),
            note: f.note,
            menu: f.menu,
            published: f.published,
          })
          navigate("/admin/dinners")
        } catch (err) {
          setError(errorText(err))
          setBusy(false)
        }
      }}
    >
      <h1 className="font-display text-4xl text-paper">{event ? "Edit dinner" : "New dinner"}</h1>
      <Field label="Title">
        <Select
          value={f.titleId}
          onChange={(e) => set({ titleId: e.target.value as Id<"titles"> })}
        >
          {titles.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name} {t.year ? `(${t.year})` : ""}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Starts" hint="Eastern time">
        <Input
          type="datetime-local"
          value={f.startsAt}
          onChange={(e) => set({ startsAt: e.target.value })}
          required
        />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Address">
          <Input value={f.address} onChange={(e) => set({ address: e.target.value })} required />
        </Field>
        <Field label="Price per seat ($)">
          <Input
            type="number"
            min="0.5"
            step="0.01"
            value={f.price}
            onChange={(e) => set({ price: e.target.value })}
            required
          />
        </Field>
        <Field label="Seats">
          <Input
            type="number"
            min="1"
            step="1"
            value={f.capacity}
            onChange={(e) => set({ capacity: e.target.value })}
            required
          />
        </Field>
      </div>
      <Field label="Note" hint="Doors, dress code, anything else.">
        <Textarea value={f.note} onChange={(e) => set({ note: e.target.value })} />
      </Field>
      <div className="space-y-3">
        <span className="text-sm text-neutral-400">Menu</span>
        {f.menu.map((c, i) => (
          <div key={i} className="flex gap-3">
            <Input
              value={c.course}
              onChange={(e) => setCourse(i, { course: e.target.value })}
              placeholder="Course"
              className="w-40"
            />
            <Input
              value={c.dish}
              onChange={(e) => setCourse(i, { dish: e.target.value })}
              placeholder="Dish"
            />
            <button
              type="button"
              className="px-2 text-neutral-500 hover:text-red-300"
              onClick={() => set({ menu: f.menu.filter((_, n) => n !== i) })}
              aria-label="Remove course"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          onClick={() => set({ menu: [...f.menu, { course: "", dish: "" }] })}
        >
          <Plus size={16} aria-hidden="true" />
          Add course
        </Button>
      </div>
      <label className="flex items-center gap-3 text-neutral-300">
        <input
          type="checkbox"
          checked={f.published}
          onChange={(e) => set({ published: e.target.checked })}
          className="size-4 accent-[#f4efe6]"
        />
        Published. Publishing emails everyone with alerts on.
      </label>
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-3">
        <Button disabled={busy}>Save</Button>
        {event && (
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              if (!confirm("Delete this dinner?")) return
              try {
                await remove({ id: event._id })
                navigate("/admin/dinners")
              } catch (err) {
                setError(errorText(err))
              }
            }}
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  )
}
