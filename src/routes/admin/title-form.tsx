import { useMutation, useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import MediaGalleryAdmin from "../../components/media-gallery-admin.tsx"
import {
  Alert,
  Button,
  ButtonLink,
  Field,
  Input,
  Loading,
  Poster,
  Select,
  Textarea,
} from "../../components/ui.tsx"
import { errorText } from "../../lib.ts"

type Title = NonNullable<FunctionReturnType<typeof api.titles.byId>>

export default function AdminTitleForm() {
  const id = useParams().id as Id<"titles"> | undefined
  const title = useQuery(api.titles.byId, id ? { id } : "skip")
  if (id && title === undefined) return <Loading />
  return <Form key={id ?? "new"} title={title ?? null} />
}

function Form({ title }: { title: Title | null }) {
  const save = useMutation(api.titles.save)
  const remove = useMutation(api.titles.remove)
  const uploadUrl = useMutation(api.titles.uploadUrl)
  const navigate = useNavigate()
  const [f, setF] = useState({
    name: title?.name ?? "",
    kind: title?.kind ?? ("movie" as const),
    year: title?.year ? String(title.year) : "",
    synopsis: title?.synopsis ?? "",
  })
  const [poster, setPoster] = useState<{ id?: Id<"_storage">; url: string | null }>({
    id: title?.posterId,
    url: title?.posterUrl ?? null,
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<typeof f>) => setF((old) => ({ ...old, ...patch }))

  const upload = async (file: File) => {
    setBusy(true)
    try {
      const res = await fetch(await uploadUrl(), {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> }
      setPoster({ id: storageId, url: URL.createObjectURL(file) })
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_20rem]">
      <form
        className="max-w-2xl space-y-6"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try {
            const id = await save({
              id: title?._id,
              name: f.name,
              kind: f.kind,
              year: f.year ? Number(f.year) : undefined,
              synopsis: f.synopsis,
              posterId: poster.id,
            })
            navigate(`/admin/movies/${id}`, { replace: true })
            setBusy(false)
          } catch (err) {
            setError(errorText(err))
            setBusy(false)
          }
        }}
      >
        <h1 className="font-display text-4xl text-paper">{title ? "Edit title" : "New title"}</h1>
        <Field label="Name">
          <Input value={f.name} onChange={(e) => set({ name: e.target.value })} required />
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Kind">
            <Select
              value={f.kind}
              onChange={(e) => set({ kind: e.target.value as "movie" | "show" })}
            >
              <option value="movie">Movie</option>
              <option value="show">Show</option>
            </Select>
          </Field>
          <Field label="Year">
            <Input type="number" value={f.year} onChange={(e) => set({ year: e.target.value })} />
          </Field>
        </div>
        <Field label="Synopsis">
          <Textarea
            value={f.synopsis}
            onChange={(e) => set({ synopsis: e.target.value })}
            required
          />
        </Field>
        <Field label="Poster" hint="2:3 works best.">
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </Field>
        {error && <Alert>{error}</Alert>}
        <div className="flex gap-3">
          <Button disabled={busy}>Save</Button>
          {title && (
            <Button
              type="button"
              variant="danger"
              onClick={async () => {
                if (!confirm("Delete this title and its recipes?")) return
                try {
                  await remove({ id: title._id })
                  navigate("/admin/movies")
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

      <aside className="space-y-8">
        <Poster url={poster.url} name={f.name || "Poster"} className="w-48" />
        {title && <MediaGalleryAdmin titleId={title._id} media={title.media} />}
        {title && (
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-paper">Recipes</h2>
              <ButtonLink
                to={`/admin/recipes/new?title=${title._id}`}
                variant="ghost"
                className="px-3 py-1.5"
              >
                Add
              </ButtonLink>
            </div>
            <ul className="mt-4 space-y-2">
              {title.recipes.map((r) => (
                <li key={r._id}>
                  <Link
                    to={`/admin/recipes/${r._id}`}
                    className="text-neutral-300 hover:text-paper"
                  >
                    {r.name}
                  </Link>
                </li>
              ))}
              {title.recipes.length === 0 && (
                <li className="text-sm text-neutral-500">None yet.</li>
              )}
            </ul>
          </div>
        )}
      </aside>
    </div>
  )
}
