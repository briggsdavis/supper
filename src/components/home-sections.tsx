import { useQuery } from "convex/react"
import { useEffect, useRef, useState, type MouseEvent } from "react"
import { Link } from "react-router"
import { api } from "../../convex/_generated/api"
import { DetailLink } from "./detail-link.tsx"
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
  const films = useQuery(api.titles.featured)
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

  return (
    <div className="flex gap-5.5 max-sm:flex-col max-sm:gap-7" onPointerLeave={deactivate}>
      {films?.map((film, index) => (
        <Reveal
          key={film._id}
          className={`supper-film-card min-w-0 flex-1 max-sm:basis-auto ${active === null ? "" : active === index ? "grow-[1.15]" : "grow-[0.925]"}`}
        >
          <DetailLink
            section="titles"
            slug={film.slug}
            preview={{ name: film.name, imageUrl: film.posterUrl, description: film.synopsis }}
            onPointerEnter={(event) => {
              if (event.pointerType !== "touch") activate(index)
            }}
            onFocus={() => activate(index)}
            onBlur={deactivate}
            className="block"
          >
            {(posterStyle) => (
              <>
                <div className="relative aspect-9/16 overflow-hidden rounded-media bg-neutral-900">
                  {film.posterUrl && (
                    <img
                      src={film.posterUrl}
                      alt=""
                      style={posterStyle}
                      className="absolute inset-0 h-full w-full rounded-media object-cover"
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
          <Link to="/titles" className={outlineButton}>
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
        <div className="border-t border-line">
          {meals?.map((meal) => (
            <DetailLink
              key={meal._id}
              className="supper-meal"
              section="recipes"
              slug={meal.slug}
              preview={{ name: meal.name, imageUrl: meal.imageUrl, description: meal.summary }}
            >
              {(imageStyle) => (
                <>
                  <div className="supper-meal-art rounded-media" aria-hidden="true">
                    {meal.imageUrl && (
                      <img
                        src={meal.imageUrl}
                        alt=""
                        style={imageStyle}
                        className="absolute inset-0 h-full w-full rounded-media object-cover"
                      />
                    )}
                    {meal.course && (
                      <span className="absolute bottom-3 left-3.5 rounded-full bg-paper px-2.25 py-1 font-mono text-xs tracking-[0.07em] text-[#262323]">
                        {meal.course}
                      </span>
                    )}
                  </div>
                  <Reveal className="supper-meal-copy">
                    <h3 className="mb-2 text-xl leading-[1.15] tracking-[-0.04em] md:text-2xl lg:text-3xl">
                      {meal.name}
                    </h3>
                    <p className="mb-3 text-xs text-muted">{meal.summary}</p>
                    {meal.title && (
                      <span className={`${mono} text-muted`}>
                        {meal.title.name}
                        {meal.title.year ? ` · ${meal.title.year}` : ""}
                      </span>
                    )}
                  </Reveal>
                </>
              )}
            </DetailLink>
          ))}
        </div>
        <div className="mt-8.5 flex justify-end max-sm:justify-start">
          <Link to="/contact" className={outlineButton}>
            Make it a movie night
          </Link>
        </div>
      </section>
    </div>
  )
}
