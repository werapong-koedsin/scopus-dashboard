import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Users, BarChart3, Calendar, X } from 'lucide-react'
import { FACULTY_CONFIG } from '../config'

// ← วางไฟล์ Logo_TE.png ไว้ใน public/ แล้วจะใช้ได้เลย
import logoUrl from '/Logo_TE.png'

const links = [
  { to: '.',         end: true, icon: LayoutDashboard, label: 'ภาพรวม' },
  { to: 'all',       icon: BookOpen,  label: 'งานวิจัยทั้งหมด' },
  { to: 'by-year',   icon: Calendar,  label: 'แยกรายปี' },
  { to: 'by-author', icon: Users,     label: 'แยกรายคน' },
  { to: 'analytics', icon: BarChart3, label: 'สถิติ & กราฟ' },
]

export default function Sidebar({ onClose }) {
  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col
                      bg-white border-r border-slate-100 py-5 px-3">

      {/* Logo + Close button (mobile) */}
      <div className="px-3 mb-6">
        <div className="flex items-start justify-between">
          {/* Logo image */}
          <div className="flex items-center gap-2.5">
            <img
              src={logoUrl}
              alt="Faculty Logo"
              className="w-12 h-12 object-contain rounded-lg"
              onError={e => {
                // fallback ถ้าไม่พบรูป
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            {/* Fallback icon (ซ่อนอยู่ ถ้า logo โหลดสำเร็จจะไม่แสดง) */}
            <div className="w-12 h-12 rounded-lg bg-sky-500 items-center justify-center hidden">
              <span className="text-white font-extrabold text-xs">TE</span>
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-sm font-display leading-tight">
                Research<br />Dashboard
              </p>
            </div>
          </div>

          {/* Close button — mobile only */}
          {onClose && (
            <button onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400
                         hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Faculty name */}
        <p className="text-[10px] text-slate-400 leading-snug mt-3 pl-0.5">
          {FACULTY_CONFIG.facultyName}
        </p>
        <p className="text-[10px] text-slate-400 leading-snug pl-0.5">
          {FACULTY_CONFIG.universityName}
        </p>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {links.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to} to={to} end={end}
            onClick={onClose}  // ปิด drawer เมื่อกดเมนูบน mobile
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
