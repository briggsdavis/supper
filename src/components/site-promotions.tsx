import { X } from "@phosphor-icons/react"
import { useMutation } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { Link } from "react-router"
import { api } from "../../convex/_generated/api"
import { errorText } from "../lib.ts"

type Promotions = FunctionReturnType<typeof api.promotions.current>
type Popup = NonNullable<Promotions["popup"]>
const sessionKey = "supper:popup-shown"
let shownInMemory = false

function wasPopupShown() {
  try {
    return shownInMemory || sessionStorage.getItem(sessionKey) === "1"
  } catch {
    return shownInMemory
  }
}

function markPopupShown() {
  shownInMemory = true
  try {
    sessionStorage.setItem(sessionKey, "1")
  } catch {
    // Keep the in-memory flag when storage is unavailable.
  }
}

function readableText(hex: string) {
  const channels = (hex.match(/[\da-f]{2}/gi) ?? []).map((pair) => {
    const channel = Number.parseInt(pair, 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  const light = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  return light > 0.179 ? "#000000" : "#ffffff"
}

function PromotionLink({
  href,
  children,
  className,
  style,
  onClick,
}: {
  href: string
  children: ReactNode
  className: string
  style?: CSSProperties
  onClick?: () => void
}) {
  if (href.startsWith("/")) {
    return (
      <Link to={href} className={className} style={style} onClick={onClick}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} className={className} style={style} onClick={onClick}>
      {children}
    </a>
  )
}

export function AnnouncementBar({
  bar,
  onHeightChange,
}: {
  bar: NonNullable<Promotions["announcement"]>
  onHeightChange: (height: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => onHeightChange(element.getBoundingClientRect().height)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [bar.text, onHeightChange])

  return (
    <div
      ref={ref}
      className="pointer-events-auto text-center text-sm leading-snug font-medium"
      style={{ backgroundColor: bar.color, color: readableText(bar.color) }}
    >
      {bar.link ? (
        <PromotionLink
          href={bar.link}
          className="block px-4 py-2.5 wrap-break-word underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2"
        >
          {bar.text}
        </PromotionLink>
      ) : (
        <p className="px-4 py-2.5 wrap-break-word">{bar.text}</p>
      )}
    </div>
  )
}

export function SitePopup({ popup }: { popup: Popup }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (wasPopupShown()) return
    const frame = requestAnimationFrame(() => {
      if (wasPopupShown()) return
      setShow(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [])
  return show ? <PopupDialog popup={popup} onClose={() => setShow(false)} /> : null
}

function PopupDialog({ popup, onClose }: { popup: Popup; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const [closing, setClosing] = useState(false)
  const backdropPress = useRef(false)
  const imageUrl = popup.layout !== "none" ? popup.imageUrl : null

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    markPopupShown()
    closeButton.current?.focus({ preventScroll: true })
    document.body.style.overflow = "hidden"
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    if (!closing) return
    // Keep close usable even if animations have been disabled by browser settings.
    const timeout = window.setTimeout(onClose, 300)
    return () => window.clearTimeout(timeout)
  }, [closing, onClose])

  function dismiss() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) onClose()
    else setClosing(true)
  }

  return (
    <dialog
      ref={ref}
      className="supper-popup fixed inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-lg overflow-visible rounded-2xl border border-current/15 p-0 shadow-2xl data-[layout=left]:max-w-2xl data-[layout=right]:max-w-2xl"
      data-layout={imageUrl ? popup.layout : "none"}
      data-closing={closing || undefined}
      aria-labelledby={titleId}
      aria-describedby={popup.text ? descriptionId : undefined}
      style={{ backgroundColor: popup.backgroundColor, color: popup.textColor }}
      onCancel={(event) => {
        event.preventDefault()
        dismiss()
      }}
      onPointerDown={(event) => {
        backdropPress.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (backdropPress.current && event.target === event.currentTarget) dismiss()
      }}
      onAnimationEnd={(event) => {
        if (
          closing &&
          event.currentTarget === event.target &&
          event.animationName === "supper-popup-out"
        )
          onClose()
      }}
    >
      <button
        ref={closeButton}
        aria-label="Close popup"
        type="button"
        className="absolute top-3 right-3 z-10 grid size-9 cursor-pointer place-items-center rounded-full border border-current/20 text-[1.5rem]/none hover:opacity-80"
        style={{ backgroundColor: popup.backgroundColor }}
        onClick={dismiss}
      >
        <X size={18} aria-hidden="true" />
      </button>
      <div className="max-h-[min(85dvh,48rem)] overflow-y-auto overscroll-contain rounded-2xl">
        <div
          className={
            imageUrl && popup.layout !== "top" ? "grid sm:grid-cols-[1fr_1.2fr]" : undefined
          }
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className={
                popup.layout === "top"
                  ? "max-h-52 w-full object-cover"
                  : `h-44 w-full object-cover sm:h-full ${popup.layout === "right" ? "sm:col-start-2 sm:row-start-1" : ""}`
              }
            />
          )}
          <div
            className={`min-w-0 space-y-5 px-6 pt-12 pb-8 sm:px-8 ${imageUrl && popup.layout === "right" ? "sm:col-start-1 sm:row-start-1" : ""}`}
          >
            <h2
              id={titleId}
              className="text-3xl leading-tight font-semibold wrap-break-word sm:text-4xl"
            >
              {popup.title}
            </h2>
            {popup.text && (
              <p
                id={descriptionId}
                className="text-base/relaxed wrap-break-word whitespace-pre-line"
              >
                {popup.text}
              </p>
            )}
            {popup.captureEmail && <PopupSignup id={popup._id} />}
            {popup.button && (
              <PromotionLink
                href={popup.button.link}
                className="inline-flex min-h-11 max-w-full items-center justify-center rounded-full px-5 py-2.5 text-center text-sm font-semibold wrap-break-word hover:opacity-85"
                style={{
                  backgroundColor: popup.button.color,
                  color: readableText(popup.button.color),
                }}
                onClick={dismiss}
              >
                {popup.button.text}
              </PromotionLink>
            )}
          </div>
        </div>
      </div>
    </dialog>
  )
}

function PopupSignup({ id }: { id: Popup["_id"] }) {
  const signup = useMutation(api.promotions.signup)
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (done)
    return (
      <p role="status" className="font-semibold">
        Thanks for signing up.
      </p>
    )
  return (
    <form
      className="space-y-2"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        setError(null)
        try {
          await signup({ popupId: id, email })
          setDone(true)
        } catch (err) {
          setError(errorText(err))
        } finally {
          setBusy(false)
        }
      }}
    >
      <label className="block text-sm font-medium" htmlFor="supper-popup-email">
        Email address
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="supper-popup-email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-11 min-w-36 flex-1 rounded-lg border border-current/30 bg-transparent px-3 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 shrink-0 rounded-full border border-current/30 px-4 text-sm font-semibold hover:opacity-80 disabled:opacity-55"
        >
          {busy ? "Saving…" : "Sign up"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium">
          {error}
        </p>
      )}
    </form>
  )
}
