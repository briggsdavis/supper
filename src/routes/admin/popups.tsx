import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { api } from "../../../convex/_generated/api"
import type { Doc, Id } from "../../../convex/_generated/dataModel"
import {
  ColorField,
  PromotionActive,
  PromotionFormActions,
  PromotionList,
  PromotionRow,
} from "../../components/promotion-admin.tsx"
import {
  Button,
  Field,
  Heading,
  Input,
  Loading,
  NotFound,
  Select,
  Textarea,
} from "../../components/ui.tsx"
import { errorText } from "../../lib.ts"

const path = "/admin/popups"
const layoutLabels: Record<Doc<"popups">["layout"], string> = {
  left: "Image on the left",
  right: "Image on the right",
  top: "Image on top",
  none: "No image",
}

type Popup = NonNullable<FunctionReturnType<typeof api.promotions.getPopup>>

export default function Popups() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.promotions.listPopups,
    {},
    { initialNumItems: 20 },
  )
  return (
    <PromotionList
      title="Popups"
      path={path}
      createLabel="New popup"
      empty="No popups yet."
      status={status}
      loadMore={() => loadMore(20)}
    >
      {results.map((popup) => (
        <PromotionRow
          key={popup._id}
          to={`${path}/${popup._id}`}
          title={popup.title}
          description={layoutLabels[popup.layout]}
          color={popup.backgroundColor}
          active={popup.active}
        />
      ))}
    </PromotionList>
  )
}

export function EditPopup() {
  const { id } = useParams()
  const existing = id && id !== "new"
  const popup = useQuery(api.promotions.getPopup, existing ? { id } : "skip")
  if (existing && popup === undefined) return <Loading />
  if (existing && popup === null) return <NotFound what="popup" />
  return <PopupForm key={id} popup={popup ?? null} />
}

function PopupForm({ popup }: { popup: Popup | null }) {
  const navigate = useNavigate()
  const save = useMutation(api.promotions.savePopup)
  const remove = useMutation(api.promotions.removePopup)
  const upload = useMutation(api.promotions.uploadPopupImage)
  const [fields, setFields] = useState({
    title: popup?.title ?? "",
    text: popup?.text ?? "",
    backgroundColor: popup?.backgroundColor ?? "#171717",
    textColor: popup?.textColor ?? "#f4efe6",
    layout: popup?.layout ?? "none",
    captureEmail: popup?.captureEmail ?? false,
    active: popup?.active ?? false,
  })
  const [showButton, setShowButton] = useState(!!popup?.button)
  const [button, setButton] = useState(popup?.button ?? { text: "", color: "#f4efe6", link: "" })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const uploaded = useRef<{ file: File; id: Id<"_storage"> } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const imageUrl = preview ?? (removeImage ? null : popup?.imageUrl)
  const update = (patch: Partial<typeof fields>) =>
    setFields((current) => ({ ...current, ...patch }))

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

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

  async function savePopup() {
    let image: Id<"_storage"> | null | undefined = removeImage ? null : undefined
    if (file && fields.layout !== "none") {
      if (uploaded.current?.file !== file) {
        const response = await fetch(await upload(), {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        })
        if (!response.ok) throw new Error("Image upload failed")
        const { storageId } = (await response.json()) as { storageId: Id<"_storage"> }
        uploaded.current = { file, id: storageId }
      }
      image = uploaded.current.id
    }
    await save({ ...fields, id: popup?._id, image, button: showButton ? button : undefined })
  }

  return (
    <form
      className="max-w-2xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        void submit(savePopup)
      }}
    >
      <Heading className="text-4xl md:text-5xl">{popup ? "Edit popup" : "New popup"}</Heading>
      <Field label="Title">
        <Input
          value={fields.title}
          onChange={(event) => update({ title: event.target.value })}
          required
        />
      </Field>
      <Field label="Text">
        <Textarea value={fields.text} onChange={(event) => update({ text: event.target.value })} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <ColorField
          label="Background color"
          value={fields.backgroundColor}
          onChange={(backgroundColor) => update({ backgroundColor })}
        />
        <ColorField
          label="Text color"
          value={fields.textColor}
          onChange={(textColor) => update({ textColor })}
        />
      </div>
      <Field label="Image layout">
        <Select
          value={fields.layout}
          onChange={(event) => update({ layout: event.target.value as Doc<"popups">["layout"] })}
        >
          {Object.entries(layoutLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      {fields.layout !== "none" && (
        <div className="space-y-3">
          <Field label="Popup image">
            <Input
              type="file"
              accept="image/*"
              required={!file && (!popup?.imageUrl || removeImage)}
              onChange={(event) => {
                const selected = event.target.files?.[0]
                if (selected) {
                  setFile(selected)
                  setRemoveImage(false)
                }
              }}
            />
          </Field>
          {imageUrl && (
            <div className="flex flex-wrap items-start gap-3">
              <img
                src={imageUrl}
                alt="Popup image preview"
                className="max-h-36 max-w-56 rounded-media object-contain"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setFile(null)
                  setRemoveImage(true)
                  update({ layout: "none" })
                }}
              >
                Remove image
              </Button>
            </div>
          )}
        </div>
      )}
      <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
        <label className="flex items-center gap-3 text-paper">
          <input
            type="checkbox"
            checked={fields.captureEmail}
            className="size-4 accent-paper"
            onChange={(event) => update({ captureEmail: event.target.checked })}
          />
          Capture email addresses
        </label>
        <label className="flex items-center gap-3 text-paper">
          <input
            type="checkbox"
            checked={showButton}
            className="size-4 accent-paper"
            onChange={(event) => setShowButton(event.target.checked)}
          />
          Show a button
        </label>
      </div>
      {showButton && (
        <div className="space-y-5 rounded-xl border border-line p-4">
          <Field label="Button text">
            <Input
              required
              value={button.text}
              onChange={(event) => setButton({ ...button, text: event.target.value })}
            />
          </Field>
          <Field label="Button link">
            <Input
              required
              value={button.link}
              onChange={(event) => setButton({ ...button, link: event.target.value })}
              placeholder="/dinners or https://example.com"
            />
          </Field>
          <ColorField
            label="Button color"
            value={button.color}
            onChange={(color) => setButton({ ...button, color })}
          />
        </div>
      )}
      <PromotionActive checked={fields.active} onChange={(active) => update({ active })} />
      <PromotionFormActions
        path={path}
        busy={busy}
        error={error}
        remove={
          popup
            ? () => {
                if (confirm("Delete this popup?")) void submit(() => remove({ id: popup._id }))
              }
            : undefined
        }
      />
    </form>
  )
}
