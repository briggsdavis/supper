import { NavLink, Outlet } from "react-router"
import { RequireAdmin } from "../../components/auth.tsx"
import { Page } from "../../components/ui.tsx"

const tab = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm ${isActive ? "bg-paper text-neutral-950" : "text-neutral-400 hover:text-paper"}`

export default function AdminLayout() {
  return (
    <RequireAdmin>
      <Page>
        <div className="mb-10 flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          <NavLink to="/admin" end className={tab}>
            Dinners
          </NavLink>
          <NavLink to="/admin/titles" className={tab}>
            Titles & recipes
          </NavLink>
          <NavLink to="/admin/homepage" className={tab}>
            Homepage
          </NavLink>
        </div>
        <Outlet />
      </Page>
    </RequireAdmin>
  )
}
