import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Users, BarChart3, Calendar, GraduationCap } from 'lucide-react'
import { FACULTY_CONFIG } from '../config'

const links = [
  { to: '.',         end: true, icon: LayoutDashboard, label: 'ภาพรวม' },
  { to: 'all',       icon: BookOpen,         label: 'งานวิจัยทั้งหมด' },
  { to: 'by-year',   icon: Calendar,         label: 'แยกรายปี' },
  { to: 'by-author', icon: Users,            label: 'แยกรายคน' },
  { to: 'analytics', icon: BarChart3,        label: 'สถิติ & กราฟ' },
]

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col bg-white border-r border-slate-100 py-5 px-3">
      {/* Logo */}
      <div className="px-3 mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="font-extrabold text-slate-900 text-sm font-display leading-tight">
            Research<br/>Dashboard
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-snug mt-2 pl-0.5">
          {FACULTY_CONFIG.facultyName}
        </p>
        <p className="text-[10px] text-slate-400 leading-snug pl-0.5">
          {FACULTY_CONFIG.universityName}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {links.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pt-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-300">
          Powered by Scopus API + Google Sheets
        </p>
      </div>
    </aside>
  )
}
