import { NavLink, Outlet, ScrollRestoration, useMatch } from "react-router"
import { useMe } from "./components/auth.tsx"
import { Brand, SiteFooter } from "./components/marketing.tsx"
import { useWeightedScroll } from "./use-weighted-scroll.ts"
import "./marketing.css"

export default function App() {
  useWeightedScroll()
  const { me, loading } = useMe()
  const home = useMatch("/")
  const contact = useMatch("/contact")

  return (
    <div className="supper-site flex min-h-screen flex-col text-neutral-300 selection:bg-paper selection:text-neutral-950">
      <header className="supper-nav">
        <Brand />
        <nav className="supper-nav-group" aria-label="Main navigation">
          <NavLink to="/" end viewTransition>
            Home
          </NavLink>
          <NavLink to="/events">Dinners</NavLink>
          <NavLink to="/titles">Recipes</NavLink>
        </nav>
        <div className="supper-nav-actions">
          {!loading && (
            <div className="supper-nav-group">
              {me?.isAdmin && <NavLink to="/admin">Admin</NavLink>}
              <NavLink to={me ? "/account" : "/sign-in"}>{me ? "Account" : "Sign in"}</NavLink>
            </div>
          )}
          <NavLink to="/contact" className="supper-button supper-button-solid" viewTransition>
            Contact
          </NavLink>
        </div>
      </header>
      <main className={`flex-1 ${home || contact ? "" : "pt-28 md:pt-20"}`}>
        <Outlet />
      </main>
      {(home || contact) && <SiteFooter />}
      <ScrollRestoration />
    </div>
  )
}
