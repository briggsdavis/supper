// Page transitions: the current page's content blocks blur out one by one, the
// route commits, then the new page's blocks blur in one by one. The navbar is
// never touched. On Dinners and Recipes the 3D mark spins in before the content.

const ease = {
  out: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  in: "cubic-bezier(0.55, 0, 1, 0.45)",
  mark: "cubic-bezier(0.16, 1, 0.3, 1)",
}

const EXIT = { duration: 340, step: 42, spread: 300 }
const ENTER = { duration: 640, step: 62, spread: 460 }
const MARK_LEAD = 480
const WATCH_MS = 2500

const ATOMIC = new Set([
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "P",
  "A",
  "BUTTON",
  "IMG",
  "PICTURE",
  "VIDEO",
  "IFRAME",
  "CANVAS",
  "SVG",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "LABEL",
  "LI",
  "BLOCKQUOTE",
  "FIGURE",
  "HR",
  "TR",
  "DETAILS",
])
const MEDIA = new Set(["IMG", "PICTURE", "VIDEO", "IFRAME", "CANVAS", "SVG"])

export const hasMark = (path: string) => /^\/(events|titles)\/?$/.test(path)
const exempt = (path: string) => path === "/admin" || path.startsWith("/admin/")
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

let current: string | null = null
let navigated = false
let exits: Animation[] = []
let exiting: { promise: Promise<void>; markOut: boolean } | null = null
let morph: { path: string; link: Element } | null = null
let markIntroAt = -Infinity
let watcher: { observer: MutationObserver; timer: number } | null = null
let seen = new WeakSet<Element>()

const roots = () => [...document.querySelectorAll<HTMLElement>("[data-route-root]")]
const mark = () => document.querySelector<HTMLElement>("[data-route-mark]")

function collect(protect: Element[]) {
  const out: HTMLElement[] = []
  const visit = (el: Element) => {
    if (!(el instanceof HTMLElement || el instanceof SVGElement)) return
    if (protect.includes(el) || el.matches("[data-route-mark]")) return
    const style = getComputedStyle(el)
    if (style.display === "none" || style.visibility === "hidden") return
    if (protect.some((p) => el.contains(p))) {
      for (const child of el.children) visit(child)
      return
    }
    if (isBlock(el)) out.push(el as HTMLElement)
    else for (const child of el.children) visit(child)
  }
  for (const root of roots()) for (const child of root.children) visit(child)
  return out
}

function isBlock(el: Element) {
  const tag = el.tagName.toUpperCase()
  if (ATOMIC.has(tag) || el.getAttribute("aria-hidden") === "true") return true
  const kids = [...el.children].filter((k) => getComputedStyle(k).display !== "none")
  if (kids.length === 0) return true
  if ([...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()))
    return true
  if (kids.length === 1 && MEDIA.has(kids[0].tagName.toUpperCase())) return true
  return kids.every(
    (k) =>
      !ATOMIC.has(k.tagName.toUpperCase()) && getComputedStyle(k).display.startsWith("inline"),
  )
}

function onScreen(blocks: Element[]) {
  const height = window.innerHeight
  return blocks
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < height)
    .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)
    .map(({ el }) => el)
}

// Roughly top to bottom, with enough jitter that neighbours swap order.
function delays(count: number, { step, spread }: { step: number; spread: number }) {
  const gap = Math.min(step, spread / Math.max(1, count - 1))
  return Array.from({ length: count }, (_, i) => i * gap + Math.random() * gap * 1.6)
}

function stopWatching() {
  if (!watcher) return
  watcher.observer.disconnect()
  clearTimeout(watcher.timer)
  watcher = null
}

function exit(to: string) {
  const markOut = !hasMark(to)
  if (exiting) {
    const m = mark()
    if (markOut && !exiting.markOut && m) {
      exiting.markOut = true
      exits.push(fadeOut(m, 0))
      const prior = exiting.promise
      exiting.promise = Promise.all([prior, wait(EXIT.duration)]).then(() => {})
    }
    return exiting.promise
  }
  stopWatching()
  const source = morph?.path === to && morph.link.isConnected ? morph.link : null
  const protect = source ? [source.querySelector("[data-poster], img")].filter((e) => !!e) : []
  const blocks = onScreen(collect(protect as Element[]))
  const m = mark()
  if (markOut && m) blocks.splice(Math.floor(Math.random() * (blocks.length + 1)), 0, m)
  const offsets = delays(blocks.length, EXIT)
  exits = blocks.map((el, i) => fadeOut(el, offsets[i]))
  const total = blocks.length ? Math.max(...offsets) + EXIT.duration : 0
  const promise = wait(total)
  exiting = { promise, markOut }
  return promise
}

function fadeOut(el: Element, delay: number) {
  return el.animate(
    [{ opacity: 0, filter: "blur(0.625rem)", transform: "translateY(0.75rem)" }],
    { duration: EXIT.duration, delay, easing: ease.in, fill: "forwards" },
  )
}

function fadeIn(blocks: Element[], lead: number) {
  const offsets = delays(blocks.length, ENTER)
  blocks.forEach((el, i) => {
    seen.add(el)
    // Our own stagger replaces any page-specific entrance animation.
    for (const a of el.getAnimations())
      if (a instanceof CSSAnimation && a.animationName === "supper-enter") a.finish()
    el.animate(
      [{ offset: 0, opacity: 0, filter: "blur(0.625rem)", transform: "translateY(-0.75rem)" }],
      { duration: ENTER.duration, delay: lead + offsets[i], easing: ease.out, fill: "backwards" },
    )
  })
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Route loader: holds the navigation until the current page has blurred out. */
export function routeMotionLoader({ request }: { request: Request }) {
  const to = new URL(request.url).pathname
  if (current === null || to === current) return null
  navigated = true
  if (reduced() || exempt(current) || exempt(to)) return null
  return exit(to).then(() => null)
}

/** Remember which detail link was clicked so its image stays put for the morph. */
export function setMorphSource(path: string, link: Element) {
  morph = { path, link }
}

/** Called by the 3D mark as it mounts. Returns whether it should play its intro. */
export function claimMarkIntro() {
  if (!navigated || reduced()) return false
  markIntroAt = performance.now()
  return true
}

export function markIntro(el: HTMLElement) {
  return el.animate(
    [{ offset: 0, opacity: 0, filter: "blur(1.25rem)", transform: "scale(0.82)" }],
    { duration: 1100, easing: ease.mark, fill: "backwards" },
  )
}

/** Called from a layout effect after each route commit, before paint. */
export function routeEntered(path: string) {
  const changed = path !== current
  const interrupted = exits.length > 0
  current = path
  for (const a of exits) a.cancel()
  exits = []
  exiting = null
  morph = null
  if (!navigated || (!changed && !interrupted) || reduced() || exempt(path)) return

  stopWatching()
  seen = new WeakSet()
  const protect = [...document.querySelectorAll("[data-route-root] [style*='view-transition-name']")]
  const lead = performance.now() - markIntroAt < 200 ? MARK_LEAD : 0
  const started = performance.now()
  fadeIn(onScreen(collect(protect)), lead)

  // Content that arrives after the commit (query results) joins the stagger.
  let frame = 0
  const observer = new MutationObserver(() => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const fresh = onScreen(collect(protect)).filter((el) => !seen.has(el))
      const remaining = Math.max(0, lead - (performance.now() - started))
      if (fresh.length) fadeIn(fresh, remaining)
    })
  })
  for (const root of roots()) observer.observe(root, { childList: true, subtree: true })
  watcher = { observer, timer: window.setTimeout(stopWatching, WATCH_MS) }
}
