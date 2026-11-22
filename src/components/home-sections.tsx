import { useEffect, useRef, useState, type MouseEvent } from "react"
import { Link } from "react-router"
import { Arrow, Reveal } from "./marketing.tsx"

const features = [
  {
    film: "Ratatouille",
    year: "2007",
    title: "Confit byaldi",
    detail: "Summer vegetables, sliced thin and layered over pepper sauce.",
    course: "DINNER",
    tag: "THE COMFORT FILM",
    poster: "RAT",
    color: "ember",
    titleSlug: "ratatouille-2007",
    recipeSlug: "confit-byaldi-ratatouille",
  },
  {
    film: "Pulp Fiction",
    year: "1994",
    title: "Big Kahuna Burger",
    detail: "A pineapple-topped burger straight out of the scene.",
    course: "MAIN",
    tag: "CULT CLASSIC",
    poster: "PULP",
    color: "steel",
    titleSlug: "pulp-fiction-1994",
    recipeSlug: "big-kahuna-burger-pulp-fiction",
  },
  {
    film: "The Godfather",
    year: "1972",
    title: "Cannoli",
    detail: "Crisp pastry shells filled with sweet ricotta.",
    course: "DESSERT",
    tag: "THE FINAL COURSE",
    poster: "CANNOLO",
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
    <div className="supper-film-grid" onPointerLeave={deactivate}>
      {features.map((film, index) => (
        <Reveal
          key={film.titleSlug}
          className={`supper-film-card ${active === null ? "" : active === index ? "is-active" : "is-neighbor"}`}
        >
          <Link
            to={`/titles/${film.titleSlug}`}
            onPointerEnter={event => { if (event.pointerType !== "touch") activate(index) }}
            onFocus={() => activate(index)}
            onBlur={deactivate}
          >
            <div className={`supper-poster supper-art-${film.color}`}>
              <div className="supper-poster-art" aria-hidden="true">
                <i /><b /><em>{film.poster}</em>
              </div>
              <span className="supper-poster-tag">{film.tag}</span>
              <span className="supper-poster-year">{film.year}</span>
            </div>
            <div className="supper-film-title"><h3>{film.film}</h3><Arrow /></div>
            <span className="supper-film-caption">A MENU IN THREE ACTS</span>
          </Link>
        </Reveal>
      ))}
    </div>
  )
}

export function HomeIntro() {
  return (
    <section className="supper-section supper-intro" aria-labelledby="intro-title">
      <Reveal><h2 id="intro-title">Let the movie<br /> set the <em>table.</em></h2></Reveal>
      <Reveal className="supper-intro-copy">
        <p>Some films make you hungry.</p>
        <p>We pair a film with a menu from its world, timed to the scenes and made for sharing.</p>
        <a href="#menu" onClick={scrollToMenu} className="supper-text-link">
          Take a look around <Arrow />
        </a>
      </Reveal>
    </section>
  )
}

export default function HomeSections() {
  return (
    <div className="supper-editorial">
      <section className="supper-section supper-menu" id="menu" tabIndex={-1} aria-labelledby="menu-title">
        <Reveal className="supper-section-heading">
          <h2 id="menu-title">Scenes you can <em>taste.</em></h2>
          <p>Three little reasons to<br /> stay through the credits.</p>
        </Reveal>
        <div className="supper-meal-list">
          {features.map((meal, index) => (
            <Link key={meal.recipeSlug} className="supper-meal" to={`/recipes/${meal.recipeSlug}`}>
              <span className="supper-meal-number" aria-hidden="true">0{index + 1} <span>/ 03</span></span>
              <div className={`supper-meal-art supper-art-${meal.color}`} aria-hidden="true">
                <i /><b /><span>{meal.course}</span>
              </div>
              <Reveal className="supper-meal-copy">
                <h3>{meal.title}</h3>
                <p>{meal.detail}</p>
                <span>{meal.film} · {meal.year}</span>
              </Reveal>
              <Arrow />
            </Link>
          ))}
        </div>
        <div className="supper-menu-cta">
          <span>THE MENU CHANGES WITH THE MOOD.</span>
          <Link to="/contact" className="supper-button" viewTransition>
            Make it a movie night <Arrow />
          </Link>
        </div>
      </section>

      <section className="supper-section supper-films">
        <Reveal className="supper-section-heading">
          <h2>Now showing <em>at home.</em></h2>
          <p>A few films we think<br /> deserve a second course.</p>
        </Reveal>
        <FilmGallery />
        <div className="supper-film-cta">
          <Link to="/titles" className="supper-button">Discover more films <Arrow /></Link>
        </div>
      </section>
    </div>
  )
}
