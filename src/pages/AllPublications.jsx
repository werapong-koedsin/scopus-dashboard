import { useState, useMemo } from 'react'
import { Search, ExternalLink, Download } from 'lucide-react'
import { useSheetData } from '../hooks/useSheetData'
import { QuartilePill, Spinner, MockBanner, SectionTitle } from '../components/ui'

function exportCSV(pubs) {
  const header = ['Title','Authors','Year','Journal','Quartile','Top10%','Citations','DocType','DOI']
  const rows = pubs.map(p => [
    `"${p.title.replace(/"/g,'""')}"`,
    `"${p.authors.replace(/"/g,'""')}"`,
    p.year, `"${p.journal}"`, p.quartile,
    p.isTop10 ? 'Yes':'No', p.citations, p.docType, p.doi
  ])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download='publications.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function AllPublicationsPage() {
  const { publications, authors, loading, usingMock } = useSheetData()

  const [search, setSearch]       = useState('')
  const [filterQ, setFilterQ]     = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterAuthor, setFilterAuthor] = useState('')
  const [filterType, setFilterType] = useState('')
  const [top10Only, setTop10Only] = useState(false)
  const [sortBy, setSortBy]       = useState('year')
  const [page, setPage]           = useState(1)
  const PER_PAGE = 15

  const years = useMemo(() => [...new Set(publications.map(p => p.year))].sort((a,b)=>b-a), [publications])
  const docTypes = useMemo(() => [...new Set(publications.map(p => p.docType).filter(Boolean))], [publications])

  const filtered = useMemo(() => {
    let r = publications
    if (search)       r = r.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.journal.toLowerCase().includes(search.toLowerCase()) || p.authors.toLowerCase().includes(search.toLowerCase()))
    if (filterQ)      r = r.filter(p => p.quartile === filterQ)
    if (filterYear)   r = r.filter(p => p.year === parseInt(filterYear))
    if (filterAuthor) r = r.filter(p => p.authorIds.includes(filterAuthor))
    if (filterType)   r = r.filter(p => p.docType === filterType)
    if (top10Only)    r = r.filter(p => p.isTop10)
    r = [...r].sort((a,b) => sortBy === 'citations' ? b.citations-a.citations : sortBy === 'title' ? a.title.localeCompare(b.title) : b.year-a.year)
    return r
  }, [publications, search, filterQ, filterYear, filterAuthor, filterType, top10Only, sortBy])

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  const reset = () => { setSearch(''); setFilterQ(''); setFilterYear(''); setFilterAuthor(''); setFilterType(''); setTop10Only(false); setPage(1) }
  const onChange = (fn) => (e) => { fn(e.target.value ?? e.target.checked); setPage(1) }

  if (loading) return <Spinner />

  return (
    <div className="space-y-5 fade-up">
      {usingMock && <MockBanner />}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">งานวิจัยทั้งหมด</h1>
          <p className="text-slate-400 text-sm mt-0.5">{filtered.length.toLocaleString()} รายการ</p>
        </div>
        <button onClick={() => exportCSV(filtered)} className="btn-ghost">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-8" placeholder="ค้นหาชื่อบทความ, วารสาร, ผู้แต่ง…"
            value={search} onChange={onChange(setSearch)} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select className="input" value={filterQ} onChange={onChange(setFilterQ)}>
            <option value="">ทุก Quartile</option>
            {['Q1','Q2','Q3','Q4'].map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          <select className="input" value={filterYear} onChange={onChange(setFilterYear)}>
            <option value="">ทุกปี</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="input" value={filterAuthor} onChange={onChange(setFilterAuthor)}>
            <option value="">ทุกคน</option>
            {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="input" value={filterType} onChange={onChange(setFilterType)}>
            <option value="">ทุกประเภท</option>
            {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" className="rounded" checked={top10Only}
              onChange={e => { setTop10Only(e.target.checked); setPage(1) }} />
            Top 10% เท่านั้น
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">เรียงโดย</span>
            <select className="input py-1 text-xs w-auto" value={sortBy} onChange={onChange(setSortBy)}>
              <option value="year">ปีล่าสุด</option>
              <option value="citations">Citations</option>
              <option value="title">ชื่อบทความ</option>
            </select>
            <button onClick={reset} className="text-xs text-sky-500 hover:text-sky-700 font-semibold">รีเซ็ต</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th style={{ width:'45%' }}>ชื่อบทความ</th>
                <th>ผู้แต่ง</th>
                <th className="text-center">ปี</th>
                <th>วารสาร</th>
                <th className="text-center">Quartile</th>
                <th className="text-center">Cited</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">ไม่พบข้อมูล</td></tr>
              ) : paged.map(pub => (
                <tr key={pub.id}>
                  <td>
                    <div className="flex items-start gap-1.5">
                      <p className="font-medium text-slate-800 leading-snug line-clamp-2 text-xs sm:text-sm">{pub.title}</p>
                      {pub.doi && (
                        <a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noreferrer"
                           className="shrink-0 mt-0.5 text-slate-300 hover:text-sky-500 transition-colors">
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td>
                    <p className="text-xs text-slate-500 line-clamp-2">{pub.authors}</p>
                  </td>
                  <td className="text-center">
                    <span className="text-sm font-bold text-slate-600 font-display">{pub.year}</span>
                  </td>
                  <td>
                    <p className="text-xs text-slate-500 line-clamp-2">{pub.journal}</p>
                  </td>
                  <td className="text-center">
                    <QuartilePill q={pub.quartile} isTop10={pub.isTop10} />
                  </td>
                  <td className="text-center">
                    <span className="font-bold text-slate-700 text-sm">{pub.citations}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              หน้า {page} จาก {totalPages} · {filtered.length} รายการ
            </p>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors
                      ${page===p ? 'bg-sky-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    {p}
                  </button>
                )
              })}
              {totalPages > 7 && page < totalPages && (
                <button onClick={() => setPage(totalPages)}
                  className="w-7 h-7 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100">
                  {totalPages}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
