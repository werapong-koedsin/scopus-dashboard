import { QUARTILE_INFO, TOP10_COLOR } from '../config'

export const Q_COLORS = {
  Q1: '#059669', Q2: '#0284C7', Q3: '#D97706', Q4: '#DC2626', Unknown: '#9CA3AF'
}

export function QuartilePill({ q, isTop10 }) {
  const info = QUARTILE_INFO[q] || QUARTILE_INFO.Unknown
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      <span style={{ background: info.bg, color: info.color }}
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tracking-wide">
        {info.label}
      </span>
      {isTop10 && (
        <span style={{ background: '#EDE9FE', color: TOP10_COLOR }}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold">
          ★ Top 10%
        </span>
      )}
    </span>
  )
}

export function StatCard({ value, label, sub, color = '#0EA5E9' }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-1">
      <p style={{ color }} className="text-3xl font-extrabold tracking-tight font-display">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 rounded-full border-4 border-sky-200 border-t-sky-500 animate-spin" />
      <p className="text-sm text-slate-400 font-medium">กำลังโหลดข้อมูล…</p>
    </div>
  )
}

export function MockBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm">
      <span className="text-amber-500 text-lg">⚠️</span>
      <div>
        <p className="font-semibold text-amber-800">กำลังแสดงข้อมูลตัวอย่าง (Demo Mode)</p>
        <p className="text-amber-700 mt-0.5">
          ยังไม่ได้เชื่อมต่อ Google Sheets จริง — แก้ไข <code className="bg-amber-100 px-1 rounded">src/config.js</code> เพื่อเชื่อมข้อมูลจริง
        </p>
      </div>
    </div>
  )
}

export function SectionTitle({ children, sub }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-extrabold text-slate-900 font-display">{children}</h2>
      {sub && <p className="text-sm text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}
