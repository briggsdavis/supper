import { useEffect, useRef, useState, type MouseEvent } from "react"
import { Link } from "react-router"
import { mono, outlineButton, Reveal, section, sectionTitle } from "./marketing.tsx"

const features = [
  {
    film: "Ratatouille",
    year: "2007",
    title: "Confit byaldi",
    detail: "Summer vegetables, sliced thin and layered over pepper sauce.",
    course: "Dinner",
    tag: "The comfort film",
    poster: "Rat",
    color: "ember",
    titleSlug: "ratatouille-2007",
    recipeSlug: "confit-byaldi-ratatouille",
  },
  {
    film: "Pulp Fiction",
    year: "1994",
    title: "Big Kahuna Burger",
    detail: "A pineapple-topped burger straight out of the scene.",
    course: "Main",
    tag: "Cult classic",
    poster: "Pulp",
    color: "steel",
    titleSlug: "pulp-fiction-1994",
    recipeSlug: "big-kahuna-burger-pulp-fiction",
  },
  {
    film: "The Godfather",
    year: "1972",
    title: "Cannoli",
    detail: "Crisp pastry shells filled with sweet ricotta.",
    course: "Dessert",
    tag: "The final course",
    poster: "Cannolo",
    color: "plum",
    titleSlug: "the-godfather-1972",
    recipeSlug: "cannoli-the-godfather",
  },
]

function scrollToMenu(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const menu = document.getElementById("menu")
  if (!menu) return
  event.preventDefault()
  menu.focus({ preventScroll: true })
  menu.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  })
}

function FilmGallery() {
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
      {features.map((film, index) => (
        <Reveal
          key={film.titleSlug}
          className={`supper-film-card min-w-0 flex-1 max-sm:basis-auto ${active === null ? "" : active === index ? "grow-[1.15]" : "grow-[0.925]"}`}
        >
          <Link
            to={`/titles/${film.titleSlug}`}
            onPointerEnter={(event) => {
              if (event.pointerType !== "touch") activate(index)
            }}
            onFocus={() => activate(index)}
            onBlur={deactivate}
            className="block"
          >
            <div
              className={`supper-art-${film.color} relative flex aspect-9/16 items-start overflow-hidden bg-[linear-gradient(145deg,var(--art-dark),var(--art-mid)_58%,var(--art-light))] p-4.25`}
            >
              <div className="supper-poster-art" aria-hidden="true">
                <i />
                <b />
                <em>{film.poster}</em>
              </div>
              <span className="relative rounded-full bg-paper px-2.25 py-1.75 font-mono text-xs tracking-[0.06em] text-[#262323]">
                {film.tag}
              </span>
              <span className={`${mono} absolute right-4.25 bottom-4.75`}>{film.year}</span>
            </div>
            <h3 className="pt-4.25 text-xl leading-[1.25]">{film.film}</h3>
            <span className="mt-2 block font-mono text-xs tracking-[0.06em] text-muted">
              A menu in three acts
            </span>
          </Link>
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
          href="#menu"
          onClick={scrollToMenu}
          className="mt-6.5 inline-flex items-center gap-3.25 border-b border-line pb-1.75 text-xs font-semibold"
        >
          Take a look around
        </a>
      </Reveal>
    </section>
  )
}

export default function HomeSections() {
  return (
    <div className="text-paper">
      <section
        className={`${section} scroll-mt-25 py-30 max-sm:scroll-mt-28 max-sm:py-20`}
        id="menu"
        tabIndex={-1}
        aria-labelledby="menu-title"
      >
        <Reveal className="mb-13.75 flex items-end justify-between gap-6 max-sm:mb-9 max-sm:flex-col max-sm:items-start">
          <h2 id="menu-title" className={`${sectionTitle} text-4xl md:text-5xl lg:text-6xl`}>
            Scenes you can <em>taste.</em>
          </h2>
          <p className="flex-none text-right text-xs leading-[1.7] text-muted max-sm:text-left">
            Three little reasons to
            <br /> stay through the credits.
          </p>
        </Reveal>
        <div className="border-t border-line">
          {features.map((meal, index) => (
            <Link key={meal.recipeSlug} className="supper-meal" to={`/recipes/${meal.recipeSlug}`}>
              <span className={`supper-meal-number ${mono}`} aria-hidden="true">
                0{index + 1} <span className="text-muted max-sm:hidden">/ 03</span>
              </span>
              <div className={`supper-meal-art supper-art-${meal.color}`} aria-hidden="true">
                <i />
                <b />
                <span className="absolute bottom-3 left-3.5 z-1 font-mono text-xs tracking-[0.07em]">
                  {meal.course}
                </span>
              </div>
              <Reveal className="supper-meal-copy">
                <h3 className="mb-2 text-xl leading-[1.15] tracking-[-0.04em] md:text-2xl lg:text-3xl">
                  {meal.title}
                </h3>
                <p className="mb-3 text-xs text-muted">{meal.detail}</p>
                <span className={`${mono} text-muted`}>
                  {meal.film} · {meal.year}
                </span>
              </Reveal>
            </Link>
          ))}
        </div>
        <div className="mt-8.5 flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
          <span className={`${mono} text-muted`}>The menu changes with the mood.</span>
          <Link to="/contact" className={outlineButton} viewTransition>
            Make it a movie night
          </Link>
        </div>
      </section>

      <section className={`${section} py-30 max-sm:py-20`}>
        <Reveal className="mb-13.75 flex items-end justify-between gap-6 max-sm:mb-9 max-sm:flex-col max-sm:items-start">
          <h2 className={`${sectionTitle} text-4xl md:text-5xl lg:text-6xl`}>
            Now <em>playing.</em>
          </h2>
          <p className="flex-none text-right text-xs leading-[1.7] text-muted max-sm:text-left">
            A few films we think
            <br /> deserve a second course.
          </p>
        </Reveal>
        <FilmGallery />
        <div className="mt-12 flex justify-center max-sm:mt-8.5">
          <Link to="/titles" className={outlineButton}>
            Discover more films
          </Link>
        </div>
      </section>
    </div>
  )
}
