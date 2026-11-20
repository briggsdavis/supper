import { Link, NavLink, Outlet, ScrollRestoration } from "react-router"
import { useMe } from "./components/auth.tsx"

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm transition ${isActive ? "bg-white/10 text-paper" : "text-neutral-400 hover:text-paper"}`

export default function App() {
  const { me, loading } = useMe()
  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-300 selection:bg-paper selection:text-neutral-950">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 px-6 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4">
          <Link to="/" className="font-display text-xl font-bold text-paper">
            Scenes <span className="italic">&</span> Supper
          </Link>
          <div className="flex items-center gap-1">
            <NavLink to="/events" className={link}>
              Dinners
            </NavLink>
            <NavLink to="/titles" className={link}>
              Recipes
            </NavLink>
            {me?.isAdmin && (
              <NavLink to="/admin" className={link}>
                Admin
              </NavLink>
            )}
            {!loading && (
              <NavLink to={me ? "/account" : "/sign-in"} className={link}>
                {me ? "Account" : "Sign in"}
              </NavLink>
            )}
          </div>
        </div>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  )
}
