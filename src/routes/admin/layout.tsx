import { Link, Outlet, useLocation } from "react-router"
import { RequireAdmin } from "../../components/auth.tsx"
import { Page } from "../../components/ui.tsx"
import { EmailSignIn } from "../sign-in.tsx"

export default function AdminLayout() {
  const { pathname, search, hash } = useLocation()
  const section = pathname.split("/")[2]
  const pages = [
    { to: "/admin", name: "Dinners", current: !section || section === "events" },
    {
      to: "/admin/titles",
      name: "Titles & recipes",
      current: section === "titles" || section === "recipes",
    },
    {
      to: "/admin/announcement-bars",
      name: "Announcement bars",
      current: section === "announcement-bars",
    },
    { to: "/admin/popups", name: "Popups", current: section === "popups" },
    { to: "/admin/emails", name: "Emails", current: section === "emails" },
  ]

  return (
    <RequireAdmin signedOut={<EmailSignIn next={pathname + search + hash} admin />}>
      <Page wide>
        <div className="grid items-start gap-8 md:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
          <aside className="border-b border-line pb-4 md:sticky md:top-26 md:border-r md:border-b-0 md:pr-5 md:pb-0">
            <p className="mb-3 px-3 font-mono text-xs text-muted">Admin</p>
            <nav aria-label="Admin navigation" className="grid grid-cols-2 gap-1 md:grid-cols-1">
              {pages.map(({ to, name, current }) => (
                <Link
                  key={to}
                  to={to}
                  aria-current={current ? "page" : undefined}
                  className="rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-white/5 hover:text-paper aria-[current=page]:bg-paper aria-[current=page]:font-semibold aria-[current=page]:text-neutral-950"
                >
                  {name}
                </Link>
              ))}
            </nav>
          </aside>
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </Page>
    </RequireAdmin>
  )
}
