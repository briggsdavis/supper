import { useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react"
import { Link } from "react-router"
import { api } from "../../convex/_generated/api"
import { DetailLink, useImageTransition } from "./detail-link.tsx"
import { mono, outlineButton, Reveal, section, sectionTitle } from "./marketing.tsx"

function scrollToPlaying(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const playing = document.getElementById("now-playing")
  if (!playing) return
  event.preventDefault()
  playing.focus({ preventScroll: true })
  playing.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  })
}

function FilmGallery() {
  const [now] = useState(() => Date.now())
  const films = useQuery(api.titles.featured, { after: now })
  const [active, setActive] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const activate = (index: number) => {
    clearTimeout(timer.current)
    setActive(index)
  }
  const deactivate = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setActive(null), 160)
  }

  if (films?.length === 0)
    return (
      <p className="text-center text-muted">No dinners on the calendar yet. Check back soon.</p>
    )

  const few = (films?.length ?? 0) < 3

  return (
    <div
      className="flex justify-center gap-5.5 max-sm:flex-col max-sm:gap-7"
      onPointerLeave={deactivate}
    >
      {films?.map((film, index) => (
        <Reveal
          key={film._id}
          className={`supper-film-card min-w-0 flex-1 max-sm:basis-auto ${few ? "sm:max-w-[calc((100%-2.75rem)/3)]" : active === null ? "" : active === index ? "grow-[1.15]" : "grow-[0.925]"}`}
        >
          <DetailLink
            section="movies"
            slug={film.slug}
            preview={{ name: film.name, imageUrl: film.posterUrl, description: film.synopsis }}
            onPointerEnter={(event) => {
              if (event.pointerType !== "touch") activate(index)
            }}
            onFocus={() => activate(index)}
            onBlur={deactivate}
            className="group block"
          >
            {(posterStyle) => (
              <>
                <div className="relative aspect-9/16 overflow-hidden rounded-media bg-neutral-900">
                  {film.posterUrl && (
                    <img
                      src={film.posterUrl}
                      alt=""
                      style={posterStyle}
                      className="absolute inset-0 h-full w-full rounded-media object-cover transition-transform duration-900 ease-site group-hover:scale-[1.07] group-focus-visible:scale-[1.07] motion-reduce:transition-none"
                    />
                  )}
                  {film.year && (
                    <span
                      className={`${mono} absolute right-4.25 bottom-4.75 [text-shadow:0_1px_0.5rem_#000]`}
                    >
                      {film.year}
                    </span>
                  )}
                </div>
                <h3 className="pt-4.25 text-xl leading-[1.25]">{film.name}</h3>
                {film.recipeName && (
                  <span className="mt-2 block font-mono text-xs tracking-[0.06em] text-muted">
                    Served with {film.recipeName}
                  </span>
                )}
              </>
            )}
          </DetailLink>
        </Reveal>
      ))}
    </div>
  )
}

// Free cinema imagery: photos from Unsplash, muted clips from Mixkit (about a quarter are video).
const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=75`
const mixkit = (id: number) => `https://assets.mixkit.co/videos/${id}/${id}-720.mp4`

type ScatterItem = {
  src: string
  video?: boolean
  left: number // % of the field
  top: number // % of the field
  width: number // vw
  ratio: string
  speed: number // parallax strength, negative drifts the other way
}

const scatterItems: ScatterItem[] = [
  {
    src: unsplash("1478720568477-152d9b164e26"),
    left: 5,
    top: 1,
    width: 30,
    ratio: "3/2",
    speed: 0.12,
  },
  { src: mixkit(28422), video: true, left: 41, top: 7, width: 22, ratio: "4/5", speed: -0.06 },
  {
    src: unsplash("1489599849927-2ee91cede3ba"),
    left: 70,
    top: 0,
    width: 26,
    ratio: "3/4",
    speed: 0.18,
  },
  {
    src: unsplash("1517604931442-7e0c8ed2963c"),
    left: 2,
    top: 30,
    width: 15,
    ratio: "16/9",
    speed: -0.1,
  },
  {
    src: unsplash("1485846234645-a62644f84728"),
    left: 21,
    top: 40,
    width: 18,
    ratio: "3/2",
    speed: 0.08,
  },
  { src: mixkit(25478), video: true, left: 52, top: 35, width: 32, ratio: "16/9", speed: 0.22 },
  {
    src: unsplash("1574267432553-4b4628081c31"),
    left: 86,
    top: 47,
    width: 12,
    ratio: "2/3",
    speed: -0.04,
  },
  {
    src: unsplash("1536440136628-849c177e76a1"),
    left: 3,
    top: 64,
    width: 28,
    ratio: "16/10",
    speed: 0.16,
  },
  {
    src: unsplash("1626814026160-2237a95fc5a0"),
    left: 37,
    top: 62,
    width: 20,
    ratio: "4/5",
    speed: -0.08,
  },
  { src: mixkit(28417), video: true, left: 63, top: 72, width: 30, ratio: "16/10", speed: 0.1 },
  {
    src: unsplash("1485095329183-d0797cdc5676"),
    left: 22,
    top: 88,
    width: 16,
    ratio: "3/2",
    speed: 0.2,
  },
  {
    src: unsplash("1535016120720-40c646be5580"),
    left: 48,
    top: 92,
    width: 13,
    ratio: "1/1",
    speed: -0.12,
  },
]

// About a viewport of scattered cinema photos and clips, each drifting at its own parallax speed.
export function MovieScatter() {
  const field = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = field.current
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const items = [...root.querySelectorAll<HTMLElement>("[data-scatter]")]
    let frame = 0

    const update = () => {
      frame = 0
      const vh = window.innerHeight
      for (const item of items) {
        const rect = item.getBoundingClientRect()
        // -1 entering from the bottom, 0 centred, 1 leaving at the top
        const p = Math.max(
          -1,
          Math.min(1, (vh / 2 - (rect.top + rect.height / 2)) / (vh / 2 + rect.height / 2)),
        )
        const inner = item.firstElementChild as HTMLElement
        inner.style.transform = `translate3d(0, ${(-p * Number(item.dataset.speed) * vh).toFixed(1)}px, 0)`
      }
    }
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", request, { passive: true })
    window.addEventListener("resize", request)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", request)
      window.removeEventListener("resize", request)
    }
  }, [])

  return (
    <section aria-hidden="true" className="relative overflow-hidden py-[12svh]">
      <div ref={field} className="relative mx-auto h-[150svh] max-md:h-[130svh]">
        {scatterItems.map((item) => (
          <div
            key={item.src}
            data-scatter
            data-speed={item.speed}
            className="absolute max-md:w-[calc(var(--w)*1.6)]!"
            style={
              {
                left: `${item.left}%`,
                top: `${item.top}%`,
                width: `${item.width}vw`,
                "--w": `${item.width}vw`,
                maxWidth: `${100 - item.left}%`,
              } as CSSProperties
            }
          >
            <div className="will-change-transform">
              {item.video ? (
                <video
                  src={item.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="block w-full rounded-media bg-[#1a1818] object-cover"
                  style={{ aspectRatio: item.ratio }}
                />
              ) : (
                <img
                  src={item.src}
                  alt=""
                  loading="lazy"
                  className="block w-full rounded-media bg-[#1a1818] object-cover"
                  style={{ aspectRatio: item.ratio }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function HomeIntro() {
  return (
    <section
      className={`${section} relative z-10 grid min-h-svh grid-cols-[1fr_50svh_1fr] items-center gap-x-12 py-25 text-paper [text-shadow:0_2px_1rem_#000,0_0_1.75rem_#000] max-sm:min-h-[84svh] max-sm:grid-cols-1 max-sm:content-center max-sm:pt-22`}
      aria-labelledby="intro-title"
    >
      <Reveal className="col-start-1 justify-self-end text-right max-sm:justify-self-start max-sm:text-left">
        <h2 id="intro-title" className={`${sectionTitle} text-4xl md:text-5xl lg:text-6xl`}>
          Let the movie
          <br /> set the <em>table.</em>
        </h2>
      </Reveal>
      <Reveal className="col-start-3 max-w-88 justify-self-start max-sm:col-start-1 max-sm:mt-7.5">
        <p className="mb-3.5 max-w-[12em] text-xl leading-[1.18] font-semibold tracking-[-0.035em]">
          Some films make you hungry.
        </p>
        <p className="max-w-[25.625rem] text-sm leading-[1.8] text-muted">
          We pair a film with a menu from its world, timed to the scenes and made for sharing.
        </p>
        <a
          href="#now-playing"
          onClick={scrollToPlaying}
          className="mt-6.5 inline-flex items-center gap-3.25 border-b border-line pb-1.75 text-xs font-semibold"
        >
          Take a look around
        </a>
      </Reveal>
    </section>
  )
}

type Meal = FunctionReturnType<typeof api.recipes.featured>[number]

function MealImage({ meal, shown }: { meal: Meal; shown: boolean }) {
  const style = useImageTransition(`/recipes/${meal.slug}`)
  if (!meal.imageUrl) return null
  return (
    <img
      src={meal.imageUrl}
      alt=""
      style={style}
      className={`absolute inset-0 h-full w-full object-cover transition-[opacity,scale] duration-700 ease-site ${shown ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"}`}
    />
  )
}

// Indexed list with one large image over its centre; the hovered row lights up, the rest mute.
function MealIndex({ meals }: { meals: Meal[] }) {
  const [active, setActive] = useState(0)
  const current = meals[active] ?? meals[0]

  return (
    <div className="relative grid min-h-[min(46rem,100svh)] items-center max-md:min-h-0 max-md:gap-8">
      <div
        aria-hidden="true"
        className="pointer-events-none relative z-10 mx-auto w-[min(48vw,52rem)] max-md:w-full md:col-start-1 md:row-start-1"
      >
        <div className="relative aspect-video overflow-hidden rounded-media bg-[#1a1818]">
          {meals.map((meal, index) => (
            <MealImage key={meal._id} meal={meal} shown={index === active} />
          ))}
        </div>
        <div className="pt-5 text-center [text-shadow:0_2px_1rem_#000]">
          <p className="font-serif text-3xl leading-[1.05] text-paper md:text-5xl">
            {current.name}
          </p>
          {(current.title || current.course) && (
            <p className={`${mono} mt-3 text-muted uppercase`}>
              {[current.title?.name, current.course].filter(Boolean).join(" / ")}
            </p>
          )}
        </div>
      </div>
      <ol className="relative z-0 md:col-start-1 md:row-start-1">
        {meals.map((meal, index) => {
          const on = index === active
          return (
            <li key={meal._id}>
              <DetailLink
                section="recipes"
                slug={meal.slug}
                preview={{ name: meal.name, imageUrl: meal.imageUrl, description: meal.summary }}
                onPointerEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                className={`grid grid-cols-[1.25rem_3rem_minmax(0,1fr)_minmax(0,0.7fr)_6rem_3.5rem] items-center py-2.5 text-sm font-medium tracking-[0.02em] uppercase transition-colors duration-300 max-md:grid-cols-[1.25rem_2.5rem_minmax(0,1fr)_3rem] max-md:text-xs ${on ? "text-paper" : "text-paper/25 hover:text-paper/60"}`}
              >
                {() => (
                  <>
                    <span
                      aria-hidden="true"
                      className={`text-[0.6rem] transition-opacity ${on ? "opacity-100" : "opacity-0"}`}
                    >
                      ▶
                    </span>
                    <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                    <span className="truncate pr-6">{meal.name}</span>
                    <span className="truncate pr-6 max-md:hidden">{meal.title?.name}</span>
                    <span className="max-md:hidden">{meal.course}</span>
                    <span className="text-right tabular-nums">{meal.title?.year}</span>
                  </>
                )}
              </DetailLink>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default function HomeSections() {
  const meals = useQuery(api.recipes.featured)

  return (
    <div className="text-paper">
      <section
        className={`${section} scroll-mt-25 py-30 max-sm:scroll-mt-28 max-sm:py-20`}
        id="now-playing"
        tabIndex={-1}
        aria-labelledby="playing-title"
      >
        <Reveal className="mb-13.75 max-sm:mb-9">
          <h2 id="playing-title" className={`${sectionTitle} text-4xl md:text-5xl lg:text-6xl`}>
            Now <em>playing.</em>
          </h2>
        </Reveal>
        <FilmGallery />
        <div className="mt-12 flex justify-center max-sm:mt-8.5">
          <Link to="/movies" className={outlineButton}>
            Discover more films
          </Link>
        </div>
      </section>

      <section
        className={`${section} scroll-mt-25 py-30 max-sm:scroll-mt-28 max-sm:py-20`}
        id="menu"
        tabIndex={-1}
        aria-labelledby="menu-title"
      >
        <Reveal className="mb-13.75 max-sm:mb-9">
          <h2 id="menu-title" className={`${sectionTitle} text-4xl md:text-5xl lg:text-6xl`}>
            Scenes you can <em>taste.</em>
          </h2>
        </Reveal>
        {meals && meals.length > 0 && <MealIndex meals={meals} />}
        <div className="mt-8.5 flex justify-end max-sm:justify-start">
          <Link to="/contact" className={outlineButton}>
            Make it a movie night
          </Link>
        </div>
      </section>
    </div>
  )
}
