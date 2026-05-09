import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Users, BarChart3, Calendar } from 'lucide-react'

const links = [
  { to: '.',          end: true, icon: LayoutDashboard, label: 'ภาพรวม' },
  { to: 'all',        icon: BookOpen,  label: 'งานวิจัย' },
  { to: 'by-year',    icon: Calendar,  label: 'รายปี' },
  { to: 'by-author',  icon: Users,     label: 'รายคน' },
  { to: 'analytics',  icon: BarChart3, label: 'สถิติ' },
]

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30
                    bg-white border-t border-slate-100 shadow-lg
                    flex items-center justify-around px-2 py-1
                    safe-area-pb">
      {links.map(({ to, end, icon: Icon, label }) => (
        <NavLink
          key={to} to={to} end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-colors min-w-[52px]
             ${isActive
               ? 'text-sky-600 bg-sky-50'
               : 'text-slate-400 hover:text-slate-600'}`
          }
        >
          <Icon size={20} />
          <span className="text-[10px] font-semibold leading-none">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
