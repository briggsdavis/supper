import { ArrowLeft, ArrowRight, Trash } from "@phosphor-icons/react"
import { useMutation } from "convex/react"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { MAX_MEDIA_PER_TITLE, MEDIA_LIMITS, mediaProblem } from "../../convex/limits.ts"
import { errorText } from "../lib.ts"
import { Alert, Field, Input } from "./ui.tsx"

type Item = { _id: Id<"titleMedia">; kind: "image" | "video"; url: string }

const accept = [...MEDIA_LIMITS.image.types, ...MEDIA_LIMITS.video.types].join(",")
const mb = (bytes: number) => bytes / 1024 / 1024

export default function MediaGalleryAdmin({
  titleId,
  media,
}: {
  titleId: Id<"titles">
  media: Item[]
}) {
  const uploadUrl = useMutation(api.media.uploadUrl)
  const add = useMutation(api.media.add)
  const remove = useMutation(api.media.remove)
  const move = useMutation(api.media.move)
  const [busy, setBusy] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const full = media.length >= MAX_MEDIA_PER_TITLE

  async function upload(files: File[]) {
    setError(null)
    const room = MAX_MEDIA_PER_TITLE - media.length
    if (files.length > room) {
      setError(`You can add ${room} more.`)
      return
    }
    for (const file of files) {
      const problem = mediaProblem(file.type, file.size)
      if (problem) {
        setError(`${file.name}: ${problem}`)
        return
      }
    }
    setBusy(files.length)
    for (const file of files) {
      try {
        const res = await fetch(await uploadUrl(), {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        })
        if (!res.ok) throw new Error(`Upload failed (${res.status}).`)
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> }
        await add({ titleId, storageId })
      } catch (err) {
        setError(`${file.name}: ${errorText(err)}`)
      }
      setBusy((n) => n - 1)
    }
  }

  const act = (fn: () => Promise<unknown>) => () =>
    fn().catch((err: unknown) => setError(errorText(err)))

  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl text-paper">Gallery</h2>
      <Field
        label="Add images or videos"
        hint={`Images up to ${mb(MEDIA_LIMITS.image.bytes)} MB, videos up to ${mb(MEDIA_LIMITS.video.bytes)} MB. ${media.length}/${MAX_MEDIA_PER_TITLE} used.`}
      >
        <Input
          type="file"
          accept={accept}
          multiple
          disabled={full || busy > 0}
          onChange={(e) => {
            const files = [...(e.target.files ?? [])]
            e.target.value = ""
            if (files.length) void upload(files)
          }}
        />
      </Field>
      {busy > 0 && (
        <p role="status" className="text-sm text-muted">
          Uploading {busy}…
        </p>
      )}
      {error && <Alert>{error}</Alert>}
      {media.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {media.map((item, i) => (
            <li
              key={item._id}
              className="group relative aspect-square overflow-hidden rounded-lg bg-neutral-900"
            >
              {item.kind === "video" ? (
                <video
                  src={item.url}
                  muted
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 p-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="Move earlier"
                  disabled={i === 0}
                  onClick={act(() => move({ id: item._id, direction: -1 }))}
                  className="p-1 text-paper disabled:opacity-30"
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={act(async () => {
                    if (confirm("Delete this item?")) await remove({ id: item._id })
                  })}
                  className="p-1 text-red-300"
                >
                  <Trash size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Move later"
                  disabled={i === media.length - 1}
                  onClick={act(() => move({ id: item._id, direction: 1 }))}
                  className="p-1 text-paper disabled:opacity-30"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
