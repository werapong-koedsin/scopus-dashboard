/**
 * ============================================================
 *  Scopus → Google Sheets Auto-Sync  v4 (Final)
 *  - อ่านรายชื่ออาจารย์จาก Sheet "Config"
 *  - ดึงเฉพาะบทความปี START_YEAR ถึงปัจจุบัน
 *  - กรอง In Press / ยังไม่มีเลขหน้าออก
 *  - Quartile จาก Scopus CiteScore (แก้ไข parser แล้ว)
 *  - syncAll จะ clear + เขียนใหม่ทุกครั้ง ไม่ต้องลบเอง
 * ============================================================
 *
 *  โครงสร้าง Sheet "Config" ที่ต้องสร้างเอง:
 *
 *  | scopusId    | name                 | nameEn           | position            | active |
 *  |-------------|----------------------|------------------|---------------------|--------|
 *  | 57200123456 | Dr. Werapong Koedsin | Werapong Koedsin | Associate Professor | TRUE   |
 *  | 57200654321 | Dr. Somchai Thepnuan | Somchai Thepnuan | Assistant Professor | TRUE   |
 *
 *  ลำดับการรัน:
 *  1. checkConfig       → ตรวจสอบรายชื่ออาจารย์
 *  2. testAPIKey        → ตรวจสอบ API Key
 *  3. testJournalAPI    → ตรวจสอบ CiteScore
 *  4. testSyncOneAuthor → ทดสอบอาจารย์ 1 คน
 *  5. syncAll           → sync ทั้งหมด
 * ============================================================
 */

// ============================================================
//  ตั้งค่าตรงนี้ — แก้แค่ 2 บรรทัด
// ============================================================
const CONFIG = {
  SCOPUS_API_KEY:     'YOUR_SCOPUS_API_KEY_HERE', // ← ใส่ key จาก dev.elsevier.com
  START_YEAR:         2020,                        // ← ปีเริ่มต้นที่ต้องการ

  SHEET_CONFIG:       'Config',
  SHEET_PUBLICATIONS: 'Publications',
  SHEET_AUTHORS:      'Authors',
  SHEET_LOG:          'SyncLog',

  API_DELAY:          500,   // ms ระหว่าง API call
  MAX_PUBS_PER_AUTHOR: 200,  // จำนวนสูงสุดต่ออาจารย์ 1 คน
}

// คีย์เวิร์ด In Press
const IN_PRESS_KEYWORDS = [
  'article in press', 'articles in press',
  'in press', 'inpress', 'ahead of print', 'epub ahead of print',
]


// ============================================================
//  อ่านรายชื่ออาจารย์จาก Sheet "Config"
// ============================================================
function getAuthorsFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const ws = ss.getSheetByName(CONFIG.SHEET_CONFIG)

  if (!ws) throw new Error(
    'ไม่พบ Sheet "Config" — สร้าง sheet ใหม่ชื่อ Config แล้วใส่หัวคอลัมน์:\n' +
    'scopusId | name | nameEn | position | active'
  )

  const data = ws.getDataRange().getValues()
  if (data.length < 2) throw new Error('Sheet "Config" ยังไม่มีข้อมูล')

  const headers = data[0].map(h => h.toString().trim().toLowerCase())
  const col = {
    scopusId: headers.indexOf('scopusid'),
    name:     headers.indexOf('name'),
    nameEn:   headers.indexOf('nameen'),
    position: headers.indexOf('position'),
    active:   headers.indexOf('active'),
  }

  if (col.scopusId < 0) throw new Error('ไม่พบคอลัมน์ "scopusId" ใน Sheet Config')

  const authors = []
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row[col.scopusId] || row[col.scopusId].toString().trim() === '') continue
    if (col.active >= 0) {
      const v = row[col.active].toString().trim().toUpperCase()
      if (v === 'FALSE' || v === '0' || v === 'NO' || v === '') continue
    }
    authors.push({
      id:       row[col.scopusId].toString().trim(),
      name:     col.name     >= 0 ? row[col.name].toString().trim()     : `Author ${i}`,
      nameEn:   col.nameEn   >= 0 ? row[col.nameEn].toString().trim()   : '',
      position: col.position >= 0 ? row[col.position].toString().trim() : '',
    })
  }
  return authors
}


// ============================================================
//  MAIN — syncAll
//  Sheet จะถูก clear + เขียนใหม่ทุกครั้ง ไม่ต้องลบเอง
// ============================================================
function syncAll() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet()
  const endYear = new Date().getFullYear()

  log(ss, '════════════════════════════════════════')
  log(ss, '🚀 เริ่ม Sync — ' + new Date().toLocaleString('th-TH'))
  log(ss, '📅 ช่วงปี: ' + CONFIG.START_YEAR + '–' + endYear)
  log(ss, '🚫 กรอง: In Press / ยังไม่มีเลขหน้า')
  log(ss, '════════════════════════════════════════')

  try {
    const authorList = getAuthorsFromSheet()
    if (authorList.length === 0) {
      log(ss, '⚠️  ไม่พบรายชื่ออาจารย์ที่ active = TRUE')
      return
    }

    log(ss, '📋 อาจารย์ที่จะ sync: ' + authorList.length + ' คน')
    authorList.forEach((a, i) => log(ss, '   ' + (i+1) + '. ' + a.name + ' (ID: ' + a.id + ')'))
    log(ss, '────────────────────────────────────────')

    const pubMap     = new Map()  // EID → pub (dedup + upsert)
    const authorRows = []

    for (const author of authorList) {
      log(ss, '\n→ กำลังดึงข้อมูล: ' + author.name)

      // Author profile
      const profile = fetchAuthorProfile(author.id)
      if (profile) {
        log(ss, '   H-index: ' + profile.hIndex + ' | Citations: ' + profile.citations + ' | Total docs: ' + profile.docCount)
      } else {
        log(ss, '   ⚠️  ดึง profile ไม่ได้')
      }

      authorRows.push([
        author.id,
        author.name,
        author.nameEn || author.name,
        author.position,
        author.id,
        profile?.hIndex    || 0,
        profile?.citations || 0,
        profile?.docCount  || 0,
      ])

      // Publications
      const { pubs, skippedInPress } = fetchAuthorPublications(author.id, CONFIG.START_YEAR, endYear)
      log(ss, '   พบ ' + pubs.length + ' บทความที่สมบูรณ์ | กรอง In Press: ' + skippedInPress + ' บทความ')

      let newCount = 0, coCount = 0

      for (const pub of pubs) {
        if (pubMap.has(pub.eid)) {
          // Co-authored: อัปเดต citations ล่าสุด + เพิ่ม authorId
          const ex = pubMap.get(pub.eid)
          ex.citations = Math.max(ex.citations, pub.citations)
          ex.pages     = pub.pages  || ex.pages
          ex.volume    = pub.volume || ex.volume
          ex.issue     = pub.issue  || ex.issue
          if (!ex.authorIds.includes(author.id)) ex.authorIds.push(author.id)
          coCount++
        } else {
          // บทความใหม่ — ดึง quartile
          const journal = pub.issn ? fetchJournalInfo(pub.issn) : null
          pub.quartile  = journal?.quartile || 'Unknown'
          pub.isTop10   = journal?.isTop10  || false
          pubMap.set(pub.eid, pub)
          newCount++
        }
        Utilities.sleep(CONFIG.API_DELAY)
      }

      log(ss, '   ✓ ใหม่: ' + newCount + ' | co-author: ' + coCount)
    }

    // เขียนลง Sheets (clear อัตโนมัติก่อนเขียน)
    log(ss, '\n────────────────────────────────────────')
    log(ss, '📝 กำลังเขียนข้อมูลลง Sheets...')
    const allPubs = Array.from(pubMap.values())
    writePublications(ss, allPubs)
    writeAuthors(ss, authorRows)

    log(ss, '════════════════════════════════════════')
    log(ss, '✅ Sync สำเร็จ!')
    log(ss, '   📄 Publications : ' + allPubs.length + ' บทความ')
    log(ss, '   👤 Authors      : ' + authorRows.length + ' คน')
    log(ss, '   🕐 เวลา         : ' + new Date().toLocaleString('th-TH'))
    log(ss, '════════════════════════════════════════')

  } catch (e) {
    log(ss, '\n❌ ERROR: ' + e.message)
    throw e
  }
}


// ============================================================
//  Scopus API: Author Profile
// ============================================================
function fetchAuthorProfile(authorId) {
  const url = 'https://api.elsevier.com/content/author/author_id/' + authorId +
              '?field=h-index,citation-count,document-count'
  try {
    const res = UrlFetchApp.fetch(url, scopusHeaders())
    if (res.getResponseCode() !== 200) return null
    const core = JSON.parse(res.getContentText())
                   ?.['author-retrieval-response']?.[0]?.coredata || {}
    return {
      hIndex:    parseInt(core['h-index']        || 0),
      citations: parseInt(core['citation-count'] || 0),
      docCount:  parseInt(core['document-count'] || 0),
    }
  } catch (e) {
    Logger.log('fetchAuthorProfile error (' + authorId + '): ' + e)
    return null
  }
}


// ============================================================
//  Scopus API: Publications + กรอง In Press
// ============================================================
function fetchAuthorPublications(authorId, startYear, endYear) {
  const results      = []
  let start          = 0
  const count        = 25
  let skippedInPress = 0

  const yearQuery = 'PUBYEAR > ' + (startYear - 1) + ' AND PUBYEAR < ' + (endYear + 1)
  const fullQuery = 'AU-ID(' + authorId + ') AND ' + yearQuery

  Logger.log('  Query: ' + fullQuery)

  while (true) {
    const url =
      'https://api.elsevier.com/content/search/scopus' +
      '?query=' + encodeURIComponent(fullQuery) +
      '&count=' + count +
      '&start=' + start +
      '&field=eid,doi,title,publicationName,issn,eissn,coverDate,' +
             'citedby-count,subtypeDescription,subtype,author,' +
             'pageRange,volume,issueIdentifier' +
      '&sort=pubyear'

    try {
      const res  = UrlFetchApp.fetch(url, scopusHeaders())
      const code = res.getResponseCode()

      if (code === 429) {
        Logger.log('  Rate limit — รอ 10 วินาที...')
        Utilities.sleep(10000)
        continue
      }
      if (code !== 200) { Logger.log('  HTTP ' + code + ' at offset ' + start); break }

      const data    = JSON.parse(res.getContentText())
      const sr      = data?.['search-results'] || {}
      const entries = sr?.entry || []
      const total   = parseInt(sr?.['opensearch:totalResults'] || 0)

      if (!entries.length || entries[0]?.error) break

      for (const e of entries) {
        const pubYear = parseYear(e['prism:coverDate'])
        if (pubYear && (pubYear < startYear || pubYear > endYear)) continue

        const issn = normalizeISSN(e['prism:issn'] || e['prism:eIssn'] || '')
        const pub  = {
          eid:       e.eid                        || '',
          doi:       e['prism:doi']               || '',
          title:     e['dc:title']                || 'Untitled',
          authors:   formatAuthors(e.author),
          authorIds: [authorId],
          year:      pubYear,
          journal:   e['prism:publicationName']   || '',
          issn:      issn,
          citations: parseInt(e['citedby-count']  || 0),
          docType:   e['subtypeDescription']      || 'Article',
          subtype:   e['subtype']                 || '',
          pages:     e['prism:pageRange']         || '',
          volume:    e['prism:volume']            || '',
          issue:     e['prism:issueIdentifier']   || '',
          quartile:  'Unknown',
          isTop10:   false,
        }

        if (isInPress(pub)) {
          Logger.log('  🚫 In Press: "' + pub.title.substring(0, 50) + '..."')
          skippedInPress++
          continue
        }

        results.push(pub)
      }

      start += count
      if (start >= Math.min(total, CONFIG.MAX_PUBS_PER_AUTHOR)) break
      Utilities.sleep(CONFIG.API_DELAY)

    } catch (e) {
      Logger.log('  fetchPublications error at offset ' + start + ': ' + e)
      break
    }
  }

  return { pubs: results, skippedInPress }
}


// ============================================================
//  ตรวจสอบ In Press
// ============================================================
function isInPress(pub) {
  if ((pub.subtype || '').toLowerCase() === 'ip') return true
  const docType = (pub.docType || '').toLowerCase()
  if (IN_PRESS_KEYWORDS.some(k => docType.includes(k))) return true
  const noPage   = !pub.pages  || pub.pages.trim()  === ''
  const noVolume = !pub.volume || pub.volume.trim() === ''
  const noIssue  = !pub.issue  || pub.issue.trim()  === ''
  if (noPage && noVolume && noIssue) return true
  return false
}


// ============================================================
//  Scopus CiteScore: Journal Quartile (parser แก้ไขแล้ว)
// ============================================================
const _journalCache = {}

function fetchJournalInfo(issn) {
  if (!issn) return null
  if (_journalCache[issn] !== undefined) return _journalCache[issn]

  const url = 'https://api.elsevier.com/content/serial/title/issn/' + issn + '?view=CITESCORE'

  try {
    const res  = UrlFetchApp.fetch(url, scopusHeaders())
    if (res.getResponseCode() !== 200) {
      _journalCache[issn] = null
      return null
    }

    const json  = JSON.parse(res.getContentText())
    const entry = json?.['serial-metadata-response']?.entry?.[0]
    if (!entry) { _journalCache[issn] = null; return null }

    // ── อ่าน citeScoreYearInfo ──────────────────────────────
    const yearInfoList = entry?.citeScoreYearInfoList?.citeScoreYearInfo
    const yearArr      = Array.isArray(yearInfoList)
                         ? yearInfoList
                         : [yearInfoList].filter(Boolean)

    let bestPercentile = 0

    for (const yearEntry of yearArr) {
      // ข้าม In-Progress — ใช้เฉพาะ Complete
      const status = (yearEntry?.['@status'] || '').toLowerCase()
      if (status === 'in-progress') continue

      // citeScoreInformationList อาจเป็น array หรือ object
      const infoListRaw = yearEntry?.citeScoreInformationList
      const infoListArr = Array.isArray(infoListRaw) ? infoListRaw : [infoListRaw].filter(Boolean)

      for (const infoListItem of infoListArr) {
        const citeScoreInfoRaw = infoListItem?.citeScoreInfo
        const citeScoreInfoArr = Array.isArray(citeScoreInfoRaw)
                                 ? citeScoreInfoRaw
                                 : [citeScoreInfoRaw].filter(Boolean)

        for (const info of citeScoreInfoArr) {
          // อ่าน citeScoreSubjectRank → หา percentile สูงสุด
          const rankRaw = info?.citeScoreSubjectRank
          const rankArr = Array.isArray(rankRaw) ? rankRaw : [rankRaw].filter(Boolean)

          for (const rank of rankArr) {
            const pct = parseInt(rank?.percentile || 0)
            if (pct > bestPercentile) bestPercentile = pct
          }
        }
      }

      // ได้ปีล่าสุดที่ Complete แล้ว หยุด
      if (bestPercentile > 0) break
    }

    const result = classifyQuartile(bestPercentile)
    Logger.log('  📖 ISSN ' + issn + ': percentile=' + bestPercentile + ' → ' + result.quartile + ' | Top10: ' + result.isTop10)
    _journalCache[issn] = result
    return result

  } catch (e) {
    Logger.log('fetchJournalInfo error (' + issn + '): ' + e)
    _journalCache[issn] = null
    return null
  }
}

function classifyQuartile(percentile) {
  if (!percentile || percentile <= 0) return { quartile: 'Unknown', isTop10: false }
  let quartile
  if      (percentile >= 75) quartile = 'Q1'
  else if (percentile >= 50) quartile = 'Q2'
  else if (percentile >= 25) quartile = 'Q3'
  else                       quartile = 'Q4'
  return { quartile, isTop10: percentile >= 90 }
}


// ============================================================
//  เขียน Publications ลง Sheet (clear ก่อนเขียนเสมอ)
// ============================================================
function writePublications(ss, pubs) {
  const ws = getOrCreateSheet(ss, CONFIG.SHEET_PUBLICATIONS)
  ws.clearContents()
  ws.clearFormats()

  const headers = [
    'id','title','authors','authorIds','year',
    'journal','quartile','isTop10','citations',
    'docType','doi','issn','volume','issue','pages'
  ]

  // เรียงปีล่าสุดก่อน → citations มากก่อน
  const sorted = [...pubs].sort(
    (a, b) => (b.year || 0) - (a.year || 0) || b.citations - a.citations
  )

  const rows = sorted.map((p, i) => [
    p.eid || String(i + 1),
    p.title,
    p.authors,
    p.authorIds.join(';'),
    p.year,
    p.journal,
    p.quartile,
    p.isTop10 ? 'TRUE' : 'FALSE',
    p.citations,
    p.docType,
    p.doi,
    p.issn,
    p.volume || '',
    p.issue  || '',
    p.pages  || '',
  ])

  // Header row
  const hRange = ws.getRange(1, 1, 1, headers.length)
  hRange.setValues([headers])
  hRange.setFontWeight('bold')
  hRange.setBackground('#1E3A5F')
  hRange.setFontColor('#FFFFFF')
  hRange.setFontSize(10)

  // Data rows
  if (rows.length > 0) {
    ws.getRange(2, 1, rows.length, headers.length).setValues(rows)

    // สี quartile column (col 7)
    const Q_STYLES = {
      Q1:      { bg: '#D1FAE5', fg: '#065F46' },
      Q2:      { bg: '#DBEAFE', fg: '#1E40AF' },
      Q3:      { bg: '#FEF3C7', fg: '#92400E' },
      Q4:      { bg: '#FEE2E2', fg: '#991B1B' },
      Unknown: { bg: '#F3F4F6', fg: '#6B7280' },
    }
    for (let i = 0; i < rows.length; i++) {
      const q     = rows[i][6]
      const style = Q_STYLES[q] || Q_STYLES.Unknown
      ws.getRange(i + 2, 7)
        .setBackground(style.bg).setFontColor(style.fg)
        .setFontWeight('bold').setHorizontalAlignment('center')

      if (rows[i][7] === 'TRUE') {
        ws.getRange(i + 2, 8)
          .setBackground('#EDE9FE').setFontColor('#5B21B6')
          .setFontWeight('bold').setHorizontalAlignment('center')
      }
    }
  }

  ws.setFrozenRows(1)
  ws.autoResizeColumns(1, headers.length)
  ws.setColumnWidth(2, 350)
  ws.setColumnWidth(3, 200)
  ws.setColumnWidth(6, 220)

  Logger.log('✓ เขียน Publications: ' + rows.length + ' แถว')
}


// ============================================================
//  เขียน Authors ลง Sheet (clear ก่อนเขียนเสมอ)
// ============================================================
function writeAuthors(ss, authorRows) {
  const ws = getOrCreateSheet(ss, CONFIG.SHEET_AUTHORS)
  ws.clearContents()
  ws.clearFormats()

  const headers = ['id','name','nameEn','position','scopusId','hIndex','citations','pubCount']

  const hRange = ws.getRange(1, 1, 1, headers.length)
  hRange.setValues([headers])
  hRange.setFontWeight('bold')
  hRange.setBackground('#1E3A5F')
  hRange.setFontColor('#FFFFFF')
  hRange.setFontSize(10)

  if (authorRows.length > 0) {
    ws.getRange(2, 1, authorRows.length, headers.length).setValues(authorRows)
  }

  ws.setFrozenRows(1)
  ws.autoResizeColumns(1, headers.length)
  ws.setColumnWidth(2, 200)
  ws.setColumnWidth(3, 200)
  ws.setColumnWidth(4, 180)

  Logger.log('✓ เขียน Authors: ' + authorRows.length + ' แถว')
}


// ============================================================
//  Helpers
// ============================================================
function scopusHeaders() {
  return {
    headers: { 'X-ELS-APIKey': CONFIG.SCOPUS_API_KEY, 'Accept': 'application/json' },
    muteHttpExceptions: true,
  }
}

function formatAuthors(authorArr) {
  if (!authorArr) return ''
  const arr = Array.isArray(authorArr) ? authorArr : [authorArr]
  return arr.map(a => ((a['given-name'] || '') + ' ' + (a.surname || '')).trim())
            .filter(Boolean).join('; ')
}

function normalizeISSN(raw) {
  return raw.toString().replace(/-/g, '').trim()
}

function parseYear(dateStr) {
  if (!dateStr) return ''
  const y = parseInt(dateStr.toString().substring(0, 4))
  return isNaN(y) ? '' : y
}

function getOrCreateSheet(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name)
}

function log(ss, msg) {
  Logger.log(msg)
  getOrCreateSheet(ss, CONFIG.SHEET_LOG).appendRow([
    new Date().toLocaleString('th-TH'), msg
  ])
}


// ============================================================
//  ฟังก์ชันทดสอบ — รันตามลำดับก่อน syncAll
// ============================================================

/** ขั้นที่ 1: ตรวจสอบรายชื่ออาจารย์ */
function checkConfig() {
  Logger.log('=== รายชื่ออาจารย์ใน Config Sheet ===')
  try {
    const authors = getAuthorsFromSheet()
    if (authors.length === 0) { Logger.log('⚠️  ไม่พบอาจารย์ที่ active = TRUE'); return }
    authors.forEach((a, i) =>
      Logger.log((i+1) + '. ' + a.name + '  |  ID: ' + a.id + '  |  ' + a.position)
    )
    Logger.log('─────────────────────────────────────')
    Logger.log('รวม ' + authors.length + ' คน — ดึงปี ' + CONFIG.START_YEAR + ' ถึงปัจจุบัน')
  } catch (e) { Logger.log('❌ ' + e.message) }
}

/** ขั้นที่ 2: ตรวจสอบ API Key */
function testAPIKey() {
  Logger.log('=== ทดสอบ API Key ===')
  let authors
  try { authors = getAuthorsFromSheet() }
  catch (e) { Logger.log('❌ อ่าน Config ไม่ได้: ' + e.message); return }
  if (authors.length === 0) { Logger.log('❌ ไม่มีอาจารย์ใน Config'); return }

  const first = authors[0]
  Logger.log('→ ทดสอบกับ: ' + first.name + ' (ID: ' + first.id + ')')
  const res  = UrlFetchApp.fetch(
    'https://api.elsevier.com/content/author/author_id/' + first.id,
    scopusHeaders()
  )
  const code = res.getResponseCode()
  Logger.log('HTTP Status: ' + code)
  if      (code === 200) Logger.log('✅ API Key ถูกต้อง — พร้อม sync!')
  else if (code === 401) Logger.log('❌ API Key ผิดหรือหมดอายุ')
  else if (code === 403) Logger.log('❌ ไม่มีสิทธิ์ — ใช้ email มหาวิทยาลัยสมัคร')
  else if (code === 404) Logger.log('❌ ไม่พบ Author ID นี้ใน Scopus')
  else                   Logger.log('❌ HTTP ' + code + ': ' + res.getContentText().substring(0, 200))
}

/** ขั้นที่ 3: ตรวจสอบ CiteScore API */
function testJournalAPI() {
  Logger.log('=== ทดสอบ CiteScore API ===')
  Logger.log('→ ทดสอบ: Remote Sensing of Environment (ISSN: 0034-4257)')
  const result = fetchJournalInfo('00344257')
  if (result) {
    Logger.log('Quartile : ' + result.quartile)
    Logger.log('Top 10%  : ' + result.isTop10)
    if (result.quartile === 'Q1') Logger.log('✅ CiteScore API ทำงานถูกต้อง!')
    else                          Logger.log('⚠️  ได้ข้อมูลแต่ quartile ไม่ใช่ Q1 — ตรวจสอบ')
  } else {
    Logger.log('❌ ดึงข้อมูล Journal ไม่ได้ — ตรวจสอบ API Key และสิทธิ์')
  }
}

/** ขั้นที่ 4: ทดสอบดึงข้อมูลอาจารย์คนแรก */
function testSyncOneAuthor() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet()
  const endYear = new Date().getFullYear()
  log(ss, '=== ทดสอบ sync 1 คน (ปี ' + CONFIG.START_YEAR + '–' + endYear + ') ===')

  try {
    const authors = getAuthorsFromSheet()
    if (authors.length === 0) { log(ss, '❌ ไม่พบอาจารย์'); return }

    const author  = authors[0]
    log(ss, '→ ทดสอบ: ' + author.name + ' (ID: ' + author.id + ')')

    const profile = fetchAuthorProfile(author.id)
    log(ss, '   H-index: ' + profile?.hIndex + ' | Citations: ' + profile?.citations)

    const { pubs, skippedInPress } = fetchAuthorPublications(author.id, CONFIG.START_YEAR, endYear)
    log(ss, '   พบ ' + pubs.length + ' บทความที่สมบูรณ์')
    log(ss, '   กรอง In Press ออก: ' + skippedInPress + ' บทความ')

    // สรุปรายปี
    const byYear = {}
    pubs.forEach(p => { byYear[p.year] = (byYear[p.year] || 0) + 1 })
    Object.keys(byYear).sort((a,b) => b-a).forEach(yr => {
      log(ss, '   ' + yr + ': ' + byYear[yr] + ' บทความ')
    })

    if (pubs.length > 0) {
      const ex = pubs[0]
      log(ss, '   ตัวอย่าง: "' + ex.title.substring(0, 55) + '..."')
      log(ss, '   Volume: ' + (ex.volume||'-') + ' | Issue: ' + (ex.issue||'-') + ' | Pages: ' + (ex.pages||'-'))
    }

    log(ss, '✅ ทดสอบสำเร็จ — พร้อมรัน syncAll')
  } catch (e) { log(ss, '❌ Error: ' + e.message) }
}
