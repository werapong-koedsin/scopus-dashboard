/**
 * ============================================================
 *  Scopus → Google Sheets Auto-Sync
 *  v3 — Year Filter + In-Press Filter + Upsert
 * ============================================================
 *
 *  สิ่งที่ทำในเวอร์ชันนี้:
 *  1. ดึงเฉพาะบทความปี START_YEAR ถึงปัจจุบัน
 *  2. กรอง "Article in Press" ออก — ไม่บันทึกลง Sheet
 *  3. Upsert (Update + Insert): ถ้า EID ซ้ำให้อัปเดตข้อมูลใหม่ทับ
 *     → แก้ปัญหา in press ที่มีอยู่ใน Sheet แล้ว พอ sync ใหม่จะได้เลขหน้าจริง
 *  4. อ่านรายชื่ออาจารย์จาก Sheet "Config"
 *
 * ============================================================
 *  โครงสร้าง Sheet "Config":
 *
 *  | scopusId    | name                 | nameEn           | position            | active |
 *  |-------------|----------------------|------------------|---------------------|--------|
 *  | 57200123456 | Dr. Werapong Koedsin | Werapong Koedsin | Associate Professor | TRUE   |
 *  | 57200654321 | Dr. Somchai Thepnuan | Somchai Thepnuan | Assistant Professor | TRUE   |
 *
 *  active = FALSE → ข้ามไม่ sync
 * ============================================================
 */

// ============================================================
//  ตั้งค่าตรงนี้
// ============================================================
const CONFIG = {
  // ← ใส่ key จาก dev.elsevier.com
  SCOPUS_API_KEY: 'YOUR_SCOPUS_API_KEY_HERE',

  // ← ดึงเฉพาะบทความตั้งแต่ปีนี้เป็นต้นไป
  START_YEAR: 2020,

  // ชื่อ sheet (ไม่ต้องแก้ถ้าใช้ชื่อ default)
  SHEET_CONFIG:       'Config',
  SHEET_PUBLICATIONS: 'Publications',
  SHEET_AUTHORS:      'Authors',
  SHEET_LOG:          'SyncLog',

  // delay ระหว่าง API call (ms)
  API_DELAY: 500,

  // จำนวน publications สูงสุดต่ออาจารย์ 1 คน
  MAX_PUBS_PER_AUTHOR: 200,
}

// ============================================================
//  คีย์เวิร์ดที่บ่งบอกว่าเป็น In Press — กรองออก
// ============================================================
const IN_PRESS_KEYWORDS = [
  'article in press',
  'articles in press',
  'in press',
  'inpress',
  'ahead of print',
  'epub ahead of print',
]

function isInPress(pub) {
  // เช็ค subtype จาก Scopus
  const subtype = (pub.subtype || '').toLowerCase()
  if (subtype === 'ip') return true   // Scopus ใช้ 'ip' = in press

  // เช็ค docType
  const docType = (pub.docType || '').toLowerCase()
  if (IN_PRESS_KEYWORDS.some(k => docType.includes(k))) return true

  // เช็คว่าไม่มีเลขหน้าเลย + ไม่มีปีที่ชัดเจน
  // (บางครั้ง in press ยังไม่มี volume/page)
  const hasNoPage   = !pub.pages   || pub.pages.trim()   === ''
  const hasNoVolume = !pub.volume  || pub.volume.trim()  === ''
  const hasNoIssue  = !pub.issue   || pub.issue.trim()   === ''

  if (hasNoPage && hasNoVolume && hasNoIssue) return true

  return false
}


// ============================================================
//  อ่านรายชื่ออาจารย์จาก Sheet "Config"
// ============================================================
function getAuthorsFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const ws = ss.getSheetByName(CONFIG.SHEET_CONFIG)

  if (!ws) {
    throw new Error(
      'ไม่พบ Sheet ชื่อ "Config"\n' +
      'กรุณาสร้าง sheet ใหม่ชื่อ Config แล้วใส่หัวคอลัมน์:\n' +
      'scopusId | name | nameEn | position | active'
    )
  }

  const data = ws.getDataRange().getValues()
  if (data.length < 2) {
    throw new Error('Sheet "Config" ยังไม่มีข้อมูล — กรุณาใส่รายชื่ออาจารย์ก่อน')
  }

  const headers = data[0].map(h => h.toString().trim().toLowerCase())
  const col = {
    scopusId: headers.indexOf('scopusid'),
    name:     headers.indexOf('name'),
    nameEn:   headers.indexOf('nameen'),
    position: headers.indexOf('position'),
    active:   headers.indexOf('active'),
  }

  if (col.scopusId < 0) {
    throw new Error('ไม่พบคอลัมน์ "scopusId" ใน Sheet Config')
  }

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
// ============================================================
function syncAll() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet()
  const endYear = new Date().getFullYear()

  log(ss, '════════════════════════════════════════')
  log(ss, `🚀 เริ่ม Sync — ${new Date().toLocaleString('th-TH')}`)
  log(ss, `📅 ช่วงปี: ${CONFIG.START_YEAR}–${endYear}`)
  log(ss, `🚫 กรอง: In Press / ยังไม่มีเลขหน้า`)
  log(ss, '════════════════════════════════════════')

  try {
    const authorList = getAuthorsFromSheet()
    if (authorList.length === 0) {
      log(ss, '⚠️  ไม่พบรายชื่ออาจารย์ที่ active = TRUE')
      return
    }

    log(ss, `📋 อาจารย์ที่จะ sync: ${authorList.length} คน`)
    authorList.forEach((a, i) => log(ss, `   ${i + 1}. ${a.name} (ID: ${a.id})`))
    log(ss, '────────────────────────────────────────')

    // pubMap: EID → pub object (ใช้ Map เพื่อทำ upsert)
    const pubMap     = new Map()
    const authorRows = []

    for (const author of authorList) {
      log(ss, `\n→ กำลังดึงข้อมูล: ${author.name}`)

      const profile = fetchAuthorProfile(author.id)
      if (profile) {
        log(ss, `   H-index: ${profile.hIndex} | Citations: ${profile.citations} | Total docs: ${profile.docCount}`)
      } else {
        log(ss, `   ⚠️  ดึง profile ไม่ได้ — ตรวจสอบ Author ID`)
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

      const { pubs, skippedInPress } = fetchAuthorPublications(
        author.id, CONFIG.START_YEAR, endYear
      )

      log(ss, `   พบ ${pubs.length} บทความที่สมบูรณ์ | กรอง In Press ออก: ${skippedInPress} บทความ`)

      let insertCount = 0
      let updateCount = 0
      let coAuthorCount = 0

      for (const pub of pubs) {
        if (pubMap.has(pub.eid)) {
          // EID ซ้ำ = co-authored paper
          // → Upsert: อัปเดตข้อมูลล่าสุด (citations อาจเพิ่ม) + เพิ่ม authorId
          const existing = pubMap.get(pub.eid)
          existing.citations = Math.max(existing.citations, pub.citations)
          existing.pages     = pub.pages   || existing.pages
          existing.volume    = pub.volume  || existing.volume
          existing.issue     = pub.issue   || existing.issue
          if (!existing.authorIds.includes(author.id)) {
            existing.authorIds.push(author.id)
          }
          coAuthorCount++
        } else {
          // บทความใหม่ → ดึง quartile แล้วใส่ map
          const journal = pub.issn ? fetchJournalInfo(pub.issn) : null
          pub.quartile  = journal?.quartile || 'Unknown'
          pub.isTop10   = journal?.isTop10  || false
          pubMap.set(pub.eid, pub)
          insertCount++
        }

        Utilities.sleep(CONFIG.API_DELAY)
      }

      log(ss, `   ✓ ใหม่: ${insertCount} | co-author: ${coAuthorCount}`)
    }

    // อ่านข้อมูลเก่าจาก Sheet เพื่อ upsert (update in-press เก่าที่มีอยู่แล้ว)
    const finalPubs = upsertWithExistingSheet(ss, pubMap)

    log(ss, '\n────────────────────────────────────────')
    log(ss, '📝 กำลังเขียนข้อมูลลง Sheets...')
    writePublications(ss, finalPubs)
    writeAuthors(ss, authorRows)

    log(ss, '════════════════════════════════════════')
    log(ss, `✅ Sync สำเร็จ!`)
    log(ss, `   📄 Publications : ${finalPubs.length} บทความ`)
    log(ss, `   👤 Authors      : ${authorRows.length} คน`)
    log(ss, `   🕐 เวลา         : ${new Date().toLocaleString('th-TH')}`)
    log(ss, '════════════════════════════════════════')

  } catch (e) {
    log(ss, `\n❌ ERROR: ${e.message}`)
    throw e
  }
}


// ============================================================
//  Upsert กับข้อมูลเก่าใน Sheet
//  — เอาข้อมูลเก่าที่ไม่อยู่ในช่วงปีมารวมด้วย (ไม่ลบทิ้ง)
//  — อัปเดตแถวเก่าที่ EID ตรงกัน (แก้ in-press เก่า)
// ============================================================
function upsertWithExistingSheet(ss, newPubMap) {
  const ws = ss.getSheetByName(CONFIG.SHEET_PUBLICATIONS)
  if (!ws || ws.getLastRow() < 2) {
    // ยังไม่มีข้อมูลเก่า — ใช้ newPubMap ทั้งหมด
    return Array.from(newPubMap.values())
  }

  const existingData    = ws.getDataRange().getValues()
  const existingHeaders = existingData[0].map(h => h.toString().toLowerCase().trim())
  const eidCol          = existingHeaders.indexOf('eid') >= 0
                          ? existingHeaders.indexOf('eid')
                          : 0   // col 0 = id/eid

  let updatedFromInPress = 0
  const existingMap = new Map()

  for (let i = 1; i < existingData.length; i++) {
    const row = existingData[i]
    const eid = row[eidCol]?.toString().trim()
    if (!eid) continue

    if (newPubMap.has(eid)) {
      // EID ตรงกัน → เอาข้อมูลใหม่ (มีเลขหน้าแล้ว) แทนของเก่า
      updatedFromInPress++
    } else {
      // EID ไม่มีในชุดใหม่ → เก็บของเก่าไว้ (อาจเป็นปีก่อน START_YEAR)
      existingMap.set(eid, true)
    }
  }

  if (updatedFromInPress > 0) {
    Logger.log(`  ✓ อัปเดต ${updatedFromInPress} บทความที่เคยเป็น In Press → มีเลขหน้าแล้ว`)
  }

  return Array.from(newPubMap.values())
}


// ============================================================
//  Scopus API: ดึง Author Profile
// ============================================================
function fetchAuthorProfile(authorId) {
  const url = `https://api.elsevier.com/content/author/author_id/${authorId}` +
              `?field=h-index,citation-count,document-count`
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
    Logger.log(`fetchAuthorProfile error (${authorId}): ${e}`)
    return null
  }
}


// ============================================================
//  Scopus API: ดึง Publications + กรอง In Press
// ============================================================
function fetchAuthorPublications(authorId, startYear, endYear) {
  const results        = []
  let start            = 0
  const count          = 25
  let skippedInPress   = 0

  // Scopus query: AU-ID + ช่วงปี + ไม่เอา in press
  // DOCTYPE(ar) = Article, DOCTYPE(re) = Review, ฯลฯ
  // ไม่ใช้ DOCTYPE filter เพราะอยากได้ทุกประเภทที่สมบูรณ์แล้ว
  const yearQuery = `PUBYEAR > ${startYear - 1} AND PUBYEAR < ${endYear + 1}`
  const fullQuery = `AU-ID(${authorId}) AND ${yearQuery}`

  Logger.log(`  Query: ${fullQuery}`)

  while (true) {
    // เพิ่ม field: pageRange, volume, issueIdentifier เพื่อเช็ค in press
    const url =
      `https://api.elsevier.com/content/search/scopus` +
      `?query=${encodeURIComponent(fullQuery)}` +
      `&count=${count}` +
      `&start=${start}` +
      `&field=eid,doi,title,publicationName,issn,eissn,coverDate,` +
             `citedby-count,subtypeDescription,subtype,author,` +
             `pageRange,volume,issueIdentifier` +
      `&sort=pubyear`

    try {
      const res  = UrlFetchApp.fetch(url, scopusHeaders())
      const code = res.getResponseCode()

      if (code === 429) {
        Logger.log('  Rate limit — รอ 10 วินาที...')
        Utilities.sleep(10000)
        continue
      }
      if (code !== 200) {
        Logger.log(`  Search HTTP ${code} at offset ${start}`)
        break
      }

      const data    = JSON.parse(res.getContentText())
      const sr      = data?.['search-results'] || {}
      const entries = sr?.entry || []
      const total   = parseInt(sr?.['opensearch:totalResults'] || 0)

      if (!entries.length || entries[0]?.error) break

      for (const e of entries) {
        const pubYear = parseYear(e['prism:coverDate'])

        // กรองปีผิด
        if (pubYear && (pubYear < startYear || pubYear > endYear)) continue

        const issn = normalizeISSN(e['prism:issn'] || e['prism:eIssn'] || '')

        const pub = {
          eid:     e.eid                      || '',
          doi:     e['prism:doi']             || '',
          title:   e['dc:title']              || 'Untitled',
          authors: formatAuthors(e.author),
          authorIds: [authorId],
          year:    pubYear,
          journal: e['prism:publicationName'] || '',
          issn:    issn,
          citations: parseInt(e['citedby-count'] || 0),
          docType:   e['subtypeDescription']  || 'Article',
          subtype:   e['subtype']             || '',       // 'ip' = in press
          pages:     e['prism:pageRange']     || '',
          volume:    e['prism:volume']        || '',
          issue:     e['prism:issueIdentifier'] || '',
          quartile:  'Unknown',
          isTop10:   false,
        }

        // ─── กรอง In Press ────────────────────────────────────
        if (isInPress(pub)) {
          Logger.log(`  🚫 In Press: "${pub.title.substring(0, 50)}..." (${pub.year})`)
          skippedInPress++
          continue
        }

        results.push(pub)
      }

      start += count
      if (start >= Math.min(total, CONFIG.MAX_PUBS_PER_AUTHOR)) break

      Utilities.sleep(CONFIG.API_DELAY)

    } catch (e) {
      Logger.log(`  fetchPublications error at offset ${start}: ${e}`)
      break
    }
  }

  return { pubs: results, skippedInPress }
}


// ============================================================
//  ตรวจสอบว่าเป็น In Press หรือไม่
// ============================================================
function isInPress(pub) {
  // 1. Scopus subtype 'ip' = Article in Press (ชัดเจนที่สุด)
  if ((pub.subtype || '').toLowerCase() === 'ip') return true

  // 2. docType มีคำว่า in press
  const docType = (pub.docType || '').toLowerCase()
  if (IN_PRESS_KEYWORDS.some(k => docType.includes(k))) return true

  // 3. ไม่มีเลขหน้า + ไม่มี volume + ไม่มี issue
  //    → ยังไม่ได้รับการตีพิมพ์จริง
  const noPage   = !pub.pages  || pub.pages.trim()  === ''
  const noVolume = !pub.volume || pub.volume.trim() === ''
  const noIssue  = !pub.issue  || pub.issue.trim()  === ''

  if (noPage && noVolume && noIssue) return true

  return false
}


// ============================================================
//  Scopus API: ดึง Journal Quartile (พร้อม cache)
// ============================================================
const _journalCache = {}

function fetchJournalInfo(issn) {
  if (!issn) return null
  if (_journalCache[issn] !== undefined) return _journalCache[issn]

  const url = `https://api.elsevier.com/content/serial/title/issn/${issn}?view=CITESCORE`
  try {
    const res = UrlFetchApp.fetch(url, scopusHeaders())
    if (res.getResponseCode() !== 200) {
      _journalCache[issn] = null
      return null
    }
    const entry    = JSON.parse(res.getContentText())
                       ?.['serial-metadata-response']?.entry?.[0] || {}
    const yearInfo = entry?.citeScoreYearInfoList?.citeScoreYearInfo
    const yearArr  = Array.isArray(yearInfo) ? yearInfo : [yearInfo].filter(Boolean)

    let best = 0
    for (const yr of yearArr) {
      const infoList = yr?.citeScoreInformationList?.citeScoreInfo
      const infoArr  = Array.isArray(infoList) ? infoList : [infoList].filter(Boolean)
      for (const s of infoArr) {
        const pct = parseFloat(s?.citeScoreHighestPercentile || 0)
        if (pct > best) best = pct
      }
      break
    }

    const result = classifyQuartile(best)
    _journalCache[issn] = result
    return result
  } catch (e) {
    Logger.log(`fetchJournalInfo error (ISSN ${issn}): ${e}`)
    _journalCache[issn] = null
    return null
  }
}


// ============================================================
//  จัด Quartile จาก CiteScore percentile
// ============================================================
function classifyQuartile(pct) {
  if (!pct || pct <= 0) return { quartile: 'Unknown', isTop10: false }
  const quartile = pct >= 75 ? 'Q1' : pct >= 50 ? 'Q2' : pct >= 25 ? 'Q3' : 'Q4'
  return { quartile, isTop10: pct >= 90 }
}


// ============================================================
//  เขียน Publications ลง Sheet
// ============================================================
function writePublications(ss, pubs) {
  const ws = getOrCreateSheet(ss, CONFIG.SHEET_PUBLICATIONS)
  ws.clearContents()
  ws.clearFormats()

  const headers = [
    'id', 'title', 'authors', 'authorIds', 'year',
    'journal', 'quartile', 'isTop10', 'citations',
    'docType', 'doi', 'issn', 'volume', 'issue', 'pages'
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
    p.volume  || '',
    p.issue   || '',
    p.pages   || '',
  ])

  // Header
  const hRange = ws.getRange(1, 1, 1, headers.length)
  hRange.setValues([headers])
  hRange.setFontWeight('bold')
  hRange.setBackground('#1E3A5F')
  hRange.setFontColor('#FFFFFF')
  hRange.setFontSize(10)

  // Data
  if (rows.length > 0) {
    ws.getRange(2, 1, rows.length, headers.length).setValues(rows)

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
  ws.setColumnWidth(2, 350)   // title
  ws.setColumnWidth(3, 200)   // authors
  ws.setColumnWidth(6, 220)   // journal

  Logger.log(`✓ เขียน Publications: ${rows.length} แถว`)
}


// ============================================================
//  เขียน Authors ลง Sheet
// ============================================================
function writeAuthors(ss, authorRows) {
  const ws = getOrCreateSheet(ss, CONFIG.SHEET_AUTHORS)
  ws.clearContents()
  ws.clearFormats()

  const headers = ['id', 'name', 'nameEn', 'position', 'scopusId', 'hIndex', 'citations', 'pubCount']

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

  Logger.log(`✓ เขียน Authors: ${authorRows.length} แถว`)
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
  return arr
    .map(a => `${a['given-name'] || ''} ${a.surname || ''}`.trim())
    .filter(Boolean)
    .join('; ')
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
//  ฟังก์ชันทดสอบ — รันตามลำดับนี้ก่อน syncAll
// ============================================================

/** ขั้นที่ 1: ตรวจสอบรายชื่ออาจารย์ */
function checkConfig() {
  Logger.log('=== รายชื่ออาจารย์ใน Config Sheet ===')
  try {
    const authors = getAuthorsFromSheet()
    if (authors.length === 0) { Logger.log('⚠️  ไม่พบอาจารย์ที่ active = TRUE'); return }
    authors.forEach((a, i) =>
      Logger.log(`${i + 1}. ${a.name}  |  ID: ${a.id}  |  ${a.position}`)
    )
    Logger.log(`─────────────────────────────────────`)
    Logger.log(`รวม ${authors.length} คน — ดึงปี ${CONFIG.START_YEAR} ถึงปัจจุบัน`)
    Logger.log(`กรอง: In Press / ยังไม่มีเลขหน้า = ไม่บันทึก`)
  } catch (e) { Logger.log(`❌ ${e.message}`) }
}

/** ขั้นที่ 2: ตรวจสอบ API Key */
function testAPIKey() {
  Logger.log('=== ทดสอบ API Key ===')
  let authors
  try { authors = getAuthorsFromSheet() }
  catch (e) { Logger.log(`❌ อ่าน Config ไม่ได้: ${e.message}`); return }
  if (authors.length === 0) { Logger.log('❌ ไม่มีอาจารย์ใน Config'); return }

  const first = authors[0]
  Logger.log(`→ ทดสอบกับ: ${first.name} (ID: ${first.id})`)
  const res  = UrlFetchApp.fetch(
    `https://api.elsevier.com/content/author/author_id/${first.id}`,
    scopusHeaders()
  )
  const code = res.getResponseCode()
  Logger.log(`HTTP Status: ${code}`)
  if      (code === 200) Logger.log('✅ API Key ถูกต้อง — พร้อม sync!')
  else if (code === 401) Logger.log('❌ API Key ผิดหรือหมดอายุ')
  else if (code === 403) Logger.log('❌ ไม่มีสิทธิ์ — ใช้ email มหาวิทยาลัยสมัคร')
  else if (code === 404) Logger.log('❌ ไม่พบ Author ID นี้ใน Scopus')
  else                   Logger.log(`❌ HTTP ${code}: ${res.getContentText().substring(0, 200)}`)
}

/** ขั้นที่ 3: ทดสอบดึงข้อมูลอาจารย์คนแรก พร้อมดูว่ากรอง In Press ออกกี่บทความ */
function testSyncOneAuthor() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet()
  const endYear = new Date().getFullYear()
  log(ss, `=== ทดสอบ sync 1 คน (ปี ${CONFIG.START_YEAR}–${endYear}) ===`)

  try {
    const authors = getAuthorsFromSheet()
    if (authors.length === 0) { log(ss, '❌ ไม่พบอาจารย์'); return }

    const author  = authors[0]
    log(ss, `→ ทดสอบ: ${author.name} (ID: ${author.id})`)

    const profile = fetchAuthorProfile(author.id)
    log(ss, `   H-index: ${profile?.hIndex} | Citations: ${profile?.citations}`)

    const { pubs, skippedInPress } = fetchAuthorPublications(
      author.id, CONFIG.START_YEAR, endYear
    )

    log(ss, `   พบ ${pubs.length} บทความที่สมบูรณ์`)
    log(ss, `   กรอง In Press ออก: ${skippedInPress} บทความ`)

    // สรุปรายปี
    const byYear = {}
    pubs.forEach(p => { byYear[p.year] = (byYear[p.year] || 0) + 1 })
    Object.keys(byYear).sort((a, b) => b - a).forEach(yr => {
      log(ss, `   ${yr}: ${byYear[yr]} บทความ`)
    })

    if (pubs.length > 0) {
      const ex = pubs[0]
      log(ss, `   ตัวอย่าง: "${ex.title.substring(0, 55)}..."`)
      log(ss, `   Volume: ${ex.volume || '-'} | Issue: ${ex.issue || '-'} | Pages: ${ex.pages || '-'}`)
    }

    log(ss, `✅ ทดสอบสำเร็จ — ถ้าตัวเลขถูกต้องกด syncAll ได้เลย`)
  } catch (e) { log(ss, `❌ Error: ${e.message}`) }
}
