import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { api } from "../../../convex/_generated/api"
import type { Doc } from "../../../convex/_generated/dataModel"
import {
  ColorField,
  PromotionActive,
  PromotionFormActions,
  PromotionList,
  PromotionRow,
} from "../../components/promotion-admin.tsx"
import { Field, Heading, Input, Loading, NotFound, Textarea } from "../../components/ui.tsx"
import { errorText } from "../../lib.ts"

const path = "/admin/announcement-bars"

export default function AnnouncementBars() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.promotions.listAnnouncements,
    {},
    { initialNumItems: 20 },
  )
  return (
    <PromotionList
      title="Announcement bars"
      path={path}
      createLabel="New announcement bar"
      empty="No announcement bars yet."
      status={status}
      loadMore={() => loadMore(20)}
    >
      {results.map((bar) => (
        <PromotionRow
          key={bar._id}
          to={`${path}/${bar._id}`}
          title={bar.text}
          description={bar.link}
          color={bar.color}
          active={bar.active}
        />
      ))}
    </PromotionList>
  )
}

export function EditAnnouncement() {
  const { id } = useParams()
  const existing = id && id !== "new"
  const bar = useQuery(api.promotions.getAnnouncement, existing ? { id } : "skip")
  if (existing && bar === undefined) return <Loading />
  if (existing && bar === null) return <NotFound what="announcement bar" />
  return <AnnouncementForm key={id} bar={bar ?? null} />
}

function AnnouncementForm({ bar }: { bar: Doc<"announcementBars"> | null }) {
  const navigate = useNavigate()
  const save = useMutation(api.promotions.saveAnnouncement)
  const remove = useMutation(api.promotions.removeAnnouncement)
  const [text, setText] = useState(bar?.text ?? "")
  const [color, setColor] = useState(bar?.color ?? "#eee2d0")
  const [link, setLink] = useState(bar?.link ?? "")
  const [active, setActive] = useState(bar?.active ?? false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      navigate(path)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="max-w-2xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        void submit(() => save({ id: bar?._id, text, color, link, active }))
      }}
    >
      <Heading className="text-4xl md:text-5xl">
        {bar ? "Edit announcement bar" : "New announcement bar"}
      </Heading>
      <Field label="Display text">
        <Textarea value={text} onChange={(event) => setText(event.target.value)} required />
      </Field>
      <ColorField label="Bar color" value={color} onChange={setColor} />
      <Field label="Link (optional)">
        <Input
          value={link}
          onChange={(event) => setLink(event.target.value)}
          placeholder="/dinners or https://example.com"
        />
      </Field>
      <PromotionActive checked={active} onChange={setActive} />
      <PromotionFormActions
        path={path}
        busy={busy}
        error={error}
        remove={
          bar
            ? () => {
                if (confirm("Delete this announcement bar?"))
                  void submit(() => remove({ id: bar._id }))
              }
            : undefined
        }
      />
    </form>
  )
}
