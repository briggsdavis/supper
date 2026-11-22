import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from "react-router"
import { useMe } from "./components/auth.tsx"

const pill = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition ${isActive ? "bg-paper text-neutral-950" : "text-neutral-400 hover:text-paper"}`

const bar =
  "pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-neutral-900/70 p-1.5 shadow-lg shadow-black/40 backdrop-blur"

export default function App() {
  const { me, loading } = useMe()
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-300 selection:bg-paper selection:text-neutral-950">
      <header className="pointer-events-none fixed inset-x-4 top-4 z-40 mx-auto flex max-w-6xl items-center justify-between gap-2 sm:grid sm:grid-cols-[1fr_auto_1fr]">
        <Link to="/" className={`hidden justify-self-start sm:flex ${bar}`}>
          <span className="px-4 py-1.5 font-display text-base leading-5 tracking-[-0.02em] text-paper">
            Scenes <span className="italic">&</span> Supper
          </span>
        </Link>
        <nav className={bar}>
          <NavLink to="/" end className={pill}>
            Home
          </NavLink>
          <NavLink to="/events" className={pill}>
            Dinners
          </NavLink>
          <NavLink to="/titles" className={pill}>
            Recipes
          </NavLink>
        </nav>
        <div className="flex justify-self-end">
          {!loading && (
            <div className={bar}>
              {me?.isAdmin && (
                <NavLink to="/admin" className={pill}>
                  Admin
                </NavLink>
              )}
              <NavLink to={me ? "/account" : "/sign-in"} className={pill}>
                {me ? "Account" : "Sign in"}
              </NavLink>
            </div>
          )}
        </div>
      </header>
      <main className={`flex-1 ${pathname === "/" ? "" : "pt-20"}`}>
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  )
}
