// ============================================================
//  config.js — แก้ไขไฟล์นี้ไฟล์เดียวเพื่อตั้งค่าทั้งหมด
// ============================================================

export const FACULTY_CONFIG = {
  // ชื่อคณะ / มหาวิทยาลัย
  facultyName: "Faculty of Technology and Environment",
  universityName: "Prince of Songkla University, Phuket Campus",

  // URL ของ Google Sheets ที่ publish เป็น JSON
  // (ดูวิธีทำใน SETUP_GUIDE.md)
  googleSheetURL: "https://opensheet.elk.sh/1WV5-v0Wn0cNjSvLdealXNd91Dy2Bm-_JphfNfJd_Dyg/Publications",
  googleSheetAuthorsURL: "https://opensheet.elk.sh/1WV5-v0Wn0cNjSvLdealXNd91Dy2Bm-_JphfNfJd_Dyg/Authors",

  // สีธีมหลัก (hex)
  accentColor: "#0EA5E9",

  // ปีเริ่มต้นที่แสดงข้อมูล
  startYear: 2020,
}

// คำอธิบาย quartile สำหรับ tooltip
export const QUARTILE_INFO = {
  Q1: { label: "Q1", desc: "Top 25% — Highest impact", color: "#059669", bg: "#D1FAE5" },
  Q2: { label: "Q2", desc: "Top 50%", color: "#0284C7", bg: "#E0F2FE" },
  Q3: { label: "Q3", desc: "Top 75%", color: "#D97706", bg: "#FEF3C7" },
  Q4: { label: "Q4", desc: "Bottom 25%", color: "#DC2626", bg: "#FEE2E2" },
  Unknown: { label: "—", desc: "Not classified", color: "#6B7280", bg: "#F3F4F6" },
}

export const TOP10_COLOR = "#7C3AED"
