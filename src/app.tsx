import { useQuery_experimental } from "convex/react"
import { useState } from "react"
import { NavLink, Outlet, ScrollRestoration, useLocation, useMatch } from "react-router"
import { api } from "../convex/_generated/api"
import { useMe } from "./components/auth.tsx"
import { Brand, SiteFooter, solidButton } from "./components/marketing.tsx"
import { AnnouncementBar, SitePopup } from "./components/site-promotions.tsx"
import { useWeightedScroll } from "./use-weighted-scroll.ts"

const pill =
  "h-12 rounded-full border border-line bg-nav shadow-[0_0.4375rem_1.375rem_#0005] backdrop-blur-[0.875rem] max-md:h-10"
const group = `${pill} flex items-center gap-1 p-1.25`
const link =
  "inline-flex items-center rounded-full border text-xs font-semibold whitespace-nowrap transition-colors duration-250 hover:bg-paper hover:text-[#151515] aria-[current=page]:bg-paper aria-[current=page]:text-[#151515]"
const groupLink = `${link} h-full border-transparent px-3.25 text-muted hover:border-line aria-[current=page]:border-line max-md:px-2`
const soloLink = `${pill} ${link} px-4.75 text-paper max-md:px-2`

export default function App() {
  useWeightedScroll()
  const { me, loading } = useMe()
  const home = useMatch("/")
  const contact = useMatch("/contact")
  const { pathname } = useLocation()
  const publicPage = !!home || !!contact || /^\/(events|titles|recipes)(\/|$)/.test(pathname)
  const promotionQuery = useQuery_experimental({
    query: api.promotions.current,
    args: publicPage ? {} : "skip",
  })
  const promotions = promotionQuery.status === "success" ? promotionQuery.data : undefined
  const [barHeight, setBarHeight] = useState(0)

  return (
    <div className="supper-site flex min-h-screen flex-col text-neutral-300 selection:bg-paper selection:text-neutral-950">
      <div className="supper-header pointer-events-none fixed inset-x-0 top-0 z-40">
        {promotions?.announcement && (
          <AnnouncementBar bar={promotions.announcement} onHeightChange={setBarHeight} />
        )}
        <header className="grid min-h-[5.375rem] grid-cols-[1fr_auto_1fr] items-center gap-3 px-[max(6.1vw,1.25rem)] font-sans text-paper *:pointer-events-auto max-md:grid-cols-[1fr_auto] max-md:gap-1.25 max-md:px-3 max-md:pt-2">
          <Brand
            className={`${pill} px-3 max-md:gap-1.25 max-md:px-2 max-md:text-xs max-[365px]:[&>span:last-child]:sr-only`}
            discClassName="max-md:w-4"
          />
          <nav
            className={`${group} max-md:col-span-full max-md:row-start-2 max-md:justify-self-center`}
            aria-label="Main navigation"
          >
            <NavLink to="/" end viewTransition className={groupLink}>
              Home
            </NavLink>
            <NavLink to="/events" className={groupLink}>
              Dinners
            </NavLink>
            <NavLink to="/titles" className={groupLink}>
              Recipes
            </NavLink>
          </nav>
          <div className="flex items-center gap-2 justify-self-end max-md:gap-1">
            {!loading &&
              (me?.isAdmin ? (
                <div className={group}>
                  <NavLink to="/admin" className={groupLink}>
                    Admin
                  </NavLink>
                  <NavLink to="/account" className={groupLink}>
                    Account
                  </NavLink>
                </div>
              ) : (
                <NavLink to={me ? "/account" : "/sign-in"} className={soloLink}>
                  {me ? "Account" : "Sign in"}
                </NavLink>
              ))}
            <NavLink
              to="/contact"
              viewTransition
              className={`${solidButton} max-md:min-h-10 max-md:px-2`}
            >
              Contact
            </NavLink>
          </div>
        </header>
      </div>
      <main
        className={`flex-1 ${home || contact ? "" : "pt-28 md:pt-20"}`}
        style={promotions?.announcement ? { marginTop: barHeight } : undefined}
      >
        <Outlet />
      </main>
      {publicPage && <SiteFooter />}
      {promotions?.popup && <SitePopup key={promotions.popup._id} popup={promotions.popup} />}
      <ScrollRestoration />
    </div>
  )
}
