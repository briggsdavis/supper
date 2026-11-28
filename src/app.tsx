import { useQuery_experimental } from "convex/react"
import { type ReactNode, useLayoutEffect, useState } from "react"
import { NavLink, Outlet, ScrollRestoration, useLocation, useMatch } from "react-router"
import { api } from "../convex/_generated/api"
import { useMe } from "./components/auth.tsx"
import { Brand, SiteFooter } from "./components/marketing.tsx"
import { AnnouncementBar, SitePopup } from "./components/site-promotions.tsx"
import { routeEntered } from "./route-motion.ts"
import { useSmoothScroll } from "./smooth-scroll.ts"

const navLink =
  "group inline-flex py-2 text-sm font-medium text-paper/60 transition-colors duration-300 hover:text-paper aria-[current=page]:text-paper max-md:text-xs"

// Hover: the label slides up out of view while an identical copy rolls up from below.
function RollText({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex overflow-hidden">
      <span className="block transition-transform duration-500 ease-site group-hover:-translate-y-full group-focus-visible:-translate-y-full motion-reduce:transition-none">
        {children}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-site group-hover:translate-y-0 group-focus-visible:translate-y-0 motion-reduce:transition-none"
      >
        {children}
      </span>
    </span>
  )
}

function NavItem({ to, end, children }: { to: string; end?: boolean; children: string }) {
  return (
    <NavLink to={to} end={end} className={navLink}>
      <RollText>{children}</RollText>
    </NavLink>
  )
}

export default function App() {
  useSmoothScroll()
  const { me, loading } = useMe()
  const home = useMatch("/")
  const contact = useMatch("/contact")
  const { pathname, key } = useLocation()
  // Runs after the scroll reset and before paint, so new blocks start hidden.
  useLayoutEffect(() => routeEntered(pathname), [pathname, key])
  const publicPage = !!home || !!contact || /^\/(dinners|movies|recipes)(\/|$)/.test(pathname)
  const promotionQuery = useQuery_experimental({
    query: api.promotions.current,
    args: publicPage ? {} : "skip",
  })
  const promotions = promotionQuery.status === "success" ? promotionQuery.data : undefined
  const [barHeight, setBarHeight] = useState(0)

  return (
    <>
      <div className="supper-site flex min-h-screen flex-col text-neutral-300 selection:bg-paper selection:text-neutral-950">
        <div className="supper-header pointer-events-none fixed inset-x-0 top-0 z-40">
          {promotions?.announcement && (
            <AnnouncementBar bar={promotions.announcement} onHeightChange={setBarHeight} />
          )}
          <header className="grid min-h-[5.375rem] grid-cols-[1fr_auto_1fr] items-center gap-3 px-[max(6.1vw,1.25rem)] font-sans text-paper [text-shadow:0_1px_0.75rem_#0009] *:pointer-events-auto max-md:grid-cols-[1fr_auto] max-md:gap-1.25 max-md:px-3 max-md:pt-2">
            <Brand
              showWordmark={false}
              className="h-12 max-md:h-10"
              discClassName="h-[2.25rem] max-md:h-[1.6rem]"
            />
            <nav
              className="flex items-center gap-8 max-md:col-span-full max-md:row-start-2 max-md:gap-6 max-md:justify-self-center"
              aria-label="Main navigation"
            >
              <NavItem to="/dinners">Dinners</NavItem>
              <NavItem to="/movies">Movies</NavItem>
              <NavItem to="/recipes">Recipes</NavItem>
            </nav>
            <div className="flex items-center gap-8 justify-self-end max-md:gap-5">
              {!loading && (
                <NavItem to={me ? "/account" : "/sign-in"}>{me ? "Account" : "Sign in"}</NavItem>
              )}
              <NavItem to="/contact">Contact</NavItem>
            </div>
          </header>
        </div>
        <main
          data-route-root
          className={`flex-1 ${home || contact ? "" : "pt-28 md:pt-20"}`}
          style={promotions?.announcement ? { marginTop: barHeight } : undefined}
        >
          <Outlet />
        </main>
        {publicPage && <SiteFooter />}
        {promotions?.popup && <SitePopup key={promotions.popup._id} popup={promotions.popup} />}
        <ScrollRestoration />
      </div>
    </>
  )
}
