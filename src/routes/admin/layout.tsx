import { NavLink, Outlet, useLocation } from "react-router"
import { RequireAdmin } from "../../components/auth.tsx"
import { Page } from "../../components/ui.tsx"
import { EmailSignIn } from "../sign-in.tsx"

const tab = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm ${isActive ? "bg-paper text-neutral-950" : "text-neutral-400 hover:text-paper"}`

export default function AdminLayout() {
  const { pathname, search, hash } = useLocation()

  return (
    <RequireAdmin signedOut={<EmailSignIn next={pathname + search + hash} admin />}>
      <Page>
        <div className="mb-10 flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          <NavLink to="/admin" end className={tab}>
            Dinners
          </NavLink>
          <NavLink to="/admin/titles" className={tab}>
            Titles & recipes
          </NavLink>
        </div>
        <Outlet />
      </Page>
    </RequireAdmin>
  )
}
