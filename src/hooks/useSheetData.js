// hooks/useSheetData.js
// ดึงข้อมูลจาก Google Sheets ที่ publish เป็น JSON
import { useState, useEffect } from 'react'
import { FACULTY_CONFIG } from '../config'

// ─── Mock data สำหรับทดสอบก่อนมี Sheets จริง ──────────────────────────────
const MOCK_PUBLICATIONS = [
  { id:"1", title:"Mangrove biomass estimation using GEDI LiDAR in Phang Nga Bay", authors:"Werapong K.; Somchai T.; Malee P.", year:"2024", journal:"Remote Sensing of Environment", quartile:"Q1", isTop10:"TRUE", citations:"12", docType:"Article", doi:"10.1016/j.rse.2024.001", authorIds:"A001;A002;A003" },
  { id:"2", title:"Machine learning approaches for leptospirosis forecasting in Thailand", authors:"Somchai T.; Werapong K.", year:"2024", journal:"Science of the Total Environment", quartile:"Q1", isTop10:"TRUE", citations:"8", docType:"Article", doi:"10.1016/j.scitotenv.2024.002", authorIds:"A002;A001" },
  { id:"3", title:"Sentinel-1/2 multi-sensor mangrove classification", authors:"Werapong K.; Pattama S.", year:"2023", journal:"ISPRS Journal of Photogrammetry", quartile:"Q1", isTop10:"TRUE", citations:"25", docType:"Article", doi:"10.1016/j.isprsjprs.2023.003", authorIds:"A001;A004" },
  { id:"4", title:"EVI-based vegetation dynamics of mangrove species in Thailand", authors:"Werapong K.; Malee P.; Somchai T.", year:"2023", journal:"Remote Sensing", quartile:"Q2", isTop10:"FALSE", citations:"9", docType:"Article", doi:"10.3390/rs2023004", authorIds:"A001;A003;A002" },
  { id:"5", title:"SVM and KNN models for malaria forecasting in Tak Province", authors:"Somchai T.; Nattaporn W.", year:"2023", journal:"International Journal of Health Geographics", quartile:"Q2", isTop10:"FALSE", citations:"6", docType:"Article", doi:"10.1186/s12942-023-005", authorIds:"A002;A005" },
  { id:"6", title:"Oil palm age detection using Landsat time series in Krabi", authors:"Pattama S.; Werapong K.", year:"2022", journal:"GIScience & Remote Sensing", quartile:"Q1", isTop10:"FALSE", citations:"14", docType:"Article", doi:"10.1080/15481603.2022.006", authorIds:"A004;A001" },
  { id:"7", title:"Sargassum biomass detection via AFAI in Google Earth Engine", authors:"Werapong K.; Pattama S.; Malee P.", year:"2022", journal:"Remote Sensing", quartile:"Q2", isTop10:"FALSE", citations:"11", docType:"Article", doi:"10.3390/rs2022007", authorIds:"A001;A004;A003" },
  { id:"8", title:"XGBoost model for environmental disease prediction", authors:"Nattaporn W.; Somchai T.", year:"2022", journal:"Computers in Biology and Medicine", quartile:"Q1", isTop10:"TRUE", citations:"18", docType:"Article", doi:"10.1016/j.compbiomed.2022.008", authorIds:"A005;A002" },
  { id:"9", title:"Hyperspectral remote sensing of mangrove species in Phuket", authors:"Werapong K.", year:"2021", journal:"Forest Ecology and Management", quartile:"Q1", isTop10:"FALSE", citations:"31", docType:"Article", doi:"10.1016/j.foreco.2021.009", authorIds:"A001" },
  { id:"10", title:"NDVI phenology pipeline for tropical mangroves", authors:"Malee P.; Werapong K.", year:"2021", journal:"Ecological Indicators", quartile:"Q2", isTop10:"FALSE", citations:"7", docType:"Article", doi:"10.1016/j.ecolind.2021.010", authorIds:"A003;A001" },
  { id:"11", title:"Deep learning classification of coastal wetlands", authors:"Pattama S.; Nattaporn W.; Somchai T.", year:"2021", journal:"IEEE Transactions on Geoscience", quartile:"Q1", isTop10:"TRUE", citations:"22", docType:"Article", doi:"10.1109/tgrs.2021.011", authorIds:"A004;A005;A002" },
  { id:"12", title:"Carbon stock assessment of Thai mangroves", authors:"Werapong K.; Malee P.", year:"2020", journal:"Forest Ecology and Management", quartile:"Q1", isTop10:"FALSE", citations:"44", docType:"Article", doi:"10.1016/j.foreco.2020.012", authorIds:"A001;A003" },
  { id:"13", title:"Sea surface temperature anomaly detection using MODIS", authors:"Somchai T.; Pattama S.", year:"2020", journal:"Remote Sensing", quartile:"Q2", isTop10:"FALSE", citations:"15", docType:"Article", doi:"10.3390/rs2020013", authorIds:"A002;A004" },
  { id:"14", title:"Coastal erosion monitoring using multi-temporal SAR data", authors:"Nattaporn W.; Werapong K.", year:"2019", journal:"Estuarine, Coastal and Shelf Science", quartile:"Q2", isTop10:"FALSE", citations:"19", docType:"Article", doi:"10.1016/j.ecss.2019.014", authorIds:"A005;A001" },
  { id:"15", title:"Google Earth Engine applications for tropical forest monitoring", authors:"Werapong K.; Somchai T.; Pattama S.", year:"2019", journal:"Remote Sensing of Environment", quartile:"Q1", isTop10:"TRUE", citations:"67", docType:"Review", doi:"10.1016/j.rse.2019.015", authorIds:"A001;A002;A004" },
]

const MOCK_AUTHORS = [
  { id:"A001", name:"Dr. Werapong Koedsin", nameEn:"Werapong Koedsin", position:"Associate Professor", scopusId:"57200000001", hIndex:"12", citations:"285", pubCount:"9" },
  { id:"A002", name:"Dr. Somchai Thepnuan", nameEn:"Somchai Thepnuan", position:"Assistant Professor", scopusId:"57200000002", hIndex:"8", citations:"142", pubCount:"7" },
  { id:"A003", name:"Dr. Malee Phongput", nameEn:"Malee Phongput", position:"Lecturer", scopusId:"57200000003", hIndex:"5", citations:"68", pubCount:"5" },
  { id:"A004", name:"Dr. Pattama Singharat", nameEn:"Pattama Singharat", position:"Assistant Professor", scopusId:"57200000004", hIndex:"7", citations:"98", pubCount:"6" },
  { id:"A005", name:"Dr. Nattaporn Wongsai", nameEn:"Nattaporn Wongsai", position:"Lecturer", scopusId:"57200000005", hIndex:"6", citations:"75", pubCount:"4" },
]

// ─── Fetch helpers ─────────────────────────────────────────────────────────
async function fetchSheet(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ─── Main hook ─────────────────────────────────────────────────────────────
export function useSheetData() {
  const [publications, setPublications] = useState([])
  const [authors, setAuthors]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [usingMock, setUsingMock]       = useState(false)

  useEffect(() => {
    const isConfigured =
      FACULTY_CONFIG.googleSheetURL &&
      !FACULTY_CONFIG.googleSheetURL.includes('YOUR_SHEET_ID')

    if (!isConfigured) {
      // ใช้ mock data แทนถ้ายังไม่ได้ตั้งค่า Sheets
      setPublications(normalizePublications(MOCK_PUBLICATIONS))
      setAuthors(normalizeAuthors(MOCK_AUTHORS))
      setUsingMock(true)
      setLoading(false)
      return
    }

    Promise.all([
      fetchSheet(FACULTY_CONFIG.googleSheetURL),
      fetchSheet(FACULTY_CONFIG.googleSheetAuthorsURL),
    ])
      .then(([pubs, auths]) => {
        setPublications(normalizePublications(pubs))
        setAuthors(normalizeAuthors(auths))
      })
      .catch(err => {
        console.warn('Sheets fetch failed, falling back to mock:', err)
        setPublications(normalizePublications(MOCK_PUBLICATIONS))
        setAuthors(normalizeAuthors(MOCK_AUTHORS))
        setUsingMock(true)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  return { publications, authors, loading, error, usingMock }
}

// ─── Normalizers ───────────────────────────────────────────────────────────
function normalizePublications(rows) {
  return rows.map(r => ({
    id:         r.id || r.EID || String(Math.random()),
    title:      r.title || r.Title || '',
    authors:    r.authors || r.Authors || '',
    authorIds:  (r.authorIds || r.AuthorIDs || '').split(';').map(s => s.trim()).filter(Boolean),
    year:       parseInt(r.year || r.Year) || 0,
    journal:    r.journal || r.Journal || '',
    quartile:   r.quartile || r.Quartile || 'Unknown',
    isTop10:    (r.isTop10 || r.IsTop10 || '').toString().toUpperCase() === 'TRUE',
    citations:  parseInt(r.citations || r.Citations) || 0,
    docType:    r.docType || r.DocType || 'Article',
    doi:        r.doi || r.DOI || '',
  })).filter(p => p.title)
}

function normalizeAuthors(rows) {
  return rows.map(r => ({
    id:        r.id || r.ID || '',
    name:      r.name || r.Name || '',
    nameEn:    r.nameEn || r.NameEN || r.name || '',
    position:  r.position || r.Position || '',
    scopusId:  r.scopusId || r.ScopusID || '',
    hIndex:    parseInt(r.hIndex || r.HIndex) || 0,
    citations: parseInt(r.citations || r.Citations) || 0,
    pubCount:  parseInt(r.pubCount || r.PubCount) || 0,
  }))
}
