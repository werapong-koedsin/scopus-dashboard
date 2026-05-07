import { useState, useMemo } from 'react'
import { useSheetData } from '../hooks/useSheetData'
import { QuartilePill, Spinner, MockBanner } from '../components/ui'
import { Q_COLORS } from '../components/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Award, Star, TrendingUp, BookOpen, ChevronDown, ChevronRight } from 'lucide-react'

function AuthorCard({ author, pubs, rank }) {
  const [open, setOpen] = useState(false)
  const q1 = pubs.filter(p => p.quartile==='Q1').length
  const top10 = pubs.filter(p => p.isTop10).length
  const citations = pubs.reduce((s,p) => s+p.citations, 0)
  const q1pct = pubs.length ? Math.round(q1/pubs.length*100) : 0

  const byYearChart = useMemo(() => {
    const map = {}
    pubs.forEach(p => {
      if (!p.year) return
      if (!map[p.year]) map[p.year] = { year:p.year, Q1:0, Q2:0, Q3:0, Q4:0 }
      map[p.year][p.quartile]++
    })
    return Object.values(map).sort((a,b)=>a.year-b.year)
  }, [pubs])

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Rank */}
          <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shrink-0">
            <span className="text-white font-extrabold text-sm font-display">#{rank}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 font-display text-base">{author.name}</h3>
            <p className="text-sm text-slate-400">{author.position}</p>
            {author.scopusId && (
              <a href={`https://www.scopus.com/authid/detail.uri?authorId=${author.scopusId}`}
                target="_blank" rel="noreferrer"
                className="text-xs text-sky-500 hover:text-sky-700 font-semibold mt-0.5 inline-block">
                Scopus Profile →
              </a>
            )}
          </div>

          {/* H-index badge */}
          <div className="shrink-0 text-center bg-slate-100 rounded-xl px-3 py-2">
            <p className="text-xl font-extrabold text-slate-800 font-display leading-none">{author.hIndex}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">H-index</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { icon: BookOpen, value: pubs.length, label: 'Papers', color:'text-sky-500', bg:'bg-sky-50' },
            { icon: Award,    value: q1,           label: 'Q1',     color:'text-green-600', bg:'bg-green-50' },
            { icon: Star,     value: top10,         label: 'Top 10%',color:'text-purple-600', bg:'bg-purple-50' },
            { icon: TrendingUp,value:citations.toLocaleString(),label:'Citations',color:'text-amber-600',bg:'bg-amber-50' },
          ].map(({ icon:Icon, value, label, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-2.5 text-center`}>
              <Icon size={14} className={`${color} mx-auto mb-1`} />
              <p className={`text-base font-extrabold ${color} font-display leading-none`}>{value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Q1 bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Q1 ratio</span><span>{q1pct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-700"
              style={{ width:`${q1pct}%` }} />
          </div>
        </div>

        {/* Toggle */}
        <button onClick={() => setOpen(o=>!o)}
          className="mt-3 text-xs text-sky-500 hover:text-sky-700 font-semibold flex items-center gap-1">
          {open ? <><ChevronDown size={12}/> ซ่อนรายละเอียด</> : <><ChevronRight size={12}/> ดูผลงานทั้งหมด ({pubs.length})</>}
        </button>
      </div>

      {/* Detail */}
      {open && (
        <div className="border-t border-slate-100">
          {/* Mini chart */}
          {byYearChart.length > 1 && (
            <div className="p-5 pb-2">
              <p className="text-xs font-semibold text-slate-500 mb-2">Publications per year</p>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={byYearChart} margin={{ top:0, right:0, left:-35, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize:9, fill:'#94a3b8' }} />
                  <YAxis tick={{ fontSize:9, fill:'#94a3b8' }} allowDecimals={false} />
                  <Tooltip formatter={(v,n) => [v, n]} />
                  {['Q1','Q2','Q3','Q4'].map(q => (
                    <Bar key={q} dataKey={q} stackId="a" fill={Q_COLORS[q]}
                      radius={q==='Q4'?[2,2,0,0]:[0,0,0,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Table */}
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th style={{ width:'55%' }}>ชื่อบทความ</th>
                  <th className="text-center">ปี</th>
                  <th>วารสาร</th>
                  <th className="text-center">Q</th>
                  <th className="text-center">Cited</th>
                </tr>
              </thead>
              <tbody>
                {pubs.sort((a,b)=>b.year-a.year).map(pub => (
                  <tr key={pub.id}>
                    <td><p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">{pub.title}</p></td>
                    <td className="text-center font-bold text-slate-600 text-xs font-display">{pub.year}</td>
                    <td><p className="text-xs text-slate-400 line-clamp-1">{pub.journal}</p></td>
                    <td className="text-center"><QuartilePill q={pub.quartile} isTop10={pub.isTop10} /></td>
                    <td className="text-center font-bold text-slate-700 text-sm">{pub.citations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ByAuthorPage() {
  const { publications, authors, loading, usingMock } = useSheetData()
  const [sortBy, setSortBy] = useState('citations')

  const authorStats = useMemo(() => {
    return authors
      .map(a => ({
        author: a,
        pubs: publications.filter(p => p.authorIds.includes(a.id)),
      }))
      .sort((x, y) => {
        if (sortBy === 'citations') return (y.author.citations || y.pubs.reduce((s,p)=>s+p.citations,0)) - (x.author.citations || x.pubs.reduce((s,p)=>s+p.citations,0))
        if (sortBy === 'pubs')     return y.pubs.length - x.pubs.length
        if (sortBy === 'q1')       return y.pubs.filter(p=>p.quartile==='Q1').length - x.pubs.filter(p=>p.quartile==='Q1').length
        if (sortBy === 'hindex')   return (y.author.hIndex||0) - (x.author.hIndex||0)
        return 0
      })
  }, [publications, authors, sortBy])

  if (loading) return <Spinner />

  return (
    <div className="space-y-5 fade-up">
      {usingMock && <MockBanner />}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">งานวิจัยแยกรายคน</h1>
          <p className="text-slate-400 text-sm mt-0.5">{authors.length} นักวิจัย</p>
        </div>
        <select className="input w-auto text-sm" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
          <option value="citations">เรียง: Citations</option>
          <option value="pubs">เรียง: จำนวนบทความ</option>
          <option value="q1">เรียง: Q1 papers</option>
          <option value="hindex">เรียง: H-index</option>
        </select>
      </div>

      <div className="space-y-4">
        {authorStats.map(({ author, pubs }, i) => (
          <AuthorCard key={author.id} author={author} pubs={pubs} rank={i+1} />
        ))}
      </div>
    </div>
  )
}
