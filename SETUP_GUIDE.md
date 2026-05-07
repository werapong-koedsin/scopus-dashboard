# คู่มือติดตั้ง Scopus Research Dashboard
## GitHub Pages + Google Sheets (ฟรี 100%)

---

## ภาพรวมระบบ

```
Google Apps Script  →  Google Sheets  →  GitHub Pages
(ดึงข้อมูล Scopus)     (เก็บข้อมูล)      (แสดงผล Dashboard)
     ↑
ตั้งให้ run อัตโนมัติทุกสัปดาห์
```

---

## ส่วนที่ 1 — ตั้งค่า Google Sheets + Apps Script

### 1.1 สร้าง Google Spreadsheet ใหม่
1. ไปที่ [sheets.google.com](https://sheets.google.com)
2. กด **"+"** สร้าง Spreadsheet ใหม่
3. ตั้งชื่อ: `Scopus Research Data`

### 1.2 เพิ่ม Apps Script
1. เมนู **Extensions → Apps Script**
2. ลบโค้ดเดิมออกทั้งหมด
3. วางโค้ดจากไฟล์ `apps-script/ScopusSync.gs` ทั้งหมด
4. แก้ไข CONFIG:
   ```javascript
   SCOPUS_API_KEY: "ใส่ key จาก dev.elsevier.com",
   AUTHOR_IDS: [
     { id: "57200XXXXXXX", name: "ชื่ออาจารย์", position: "ตำแหน่ง" },
     // เพิ่มได้เรื่อยๆ
   ],
   ```
5. กด **Save** (Ctrl+S)

> **หา Scopus Author ID:**
> - ไปที่ scopus.com → Author Search
> - พิมพ์ชื่ออาจารย์ + "Prince of Songkla"
> - คลิกชื่อ → URL จะมีตัวเลข เช่น `authorId=57200123456`

### 1.3 ทดสอบ API Key
1. เลือก function: `testAPIKey`
2. กด **Run**
3. ดู Logs — ถ้าเห็น Status: 200 = สำเร็จ ✅

### 1.4 Sync ครั้งแรก
1. เลือก function: `syncAll`
2. กด **Run**
3. รอประมาณ 5-30 นาที (ขึ้นกับจำนวนอาจารย์)
4. ดู sheet "SyncLog" เพื่อติดตามความคืบหน้า
5. เมื่อเสร็จจะมี sheet "Publications" และ "Authors"

### 1.5 ตั้ง Auto-sync รายสัปดาห์
1. Apps Script → **Triggers** (ไอคอนนาฬิกา ด้านซ้าย)
2. กด **+ Add Trigger**
3. ตั้งค่า:
   - Function: `syncAll`
   - Event source: `Time-driven`
   - Type: `Week timer`
   - Day: `Monday`
   - Time: `2am to 3am`
4. กด **Save**

---

## ส่วนที่ 2 — Publish Google Sheets เป็น JSON

> Dashboard จะดึงข้อมูลจาก Sheets โดยตรง ต้องทำขั้นตอนนี้

### 2.1 เปิดการเข้าถึง Sheets
1. กด **Share** (มุมบนขวา)
2. ตรงล่างสุด → **"Anyone with the link"** → **Viewer**
3. กด **Done**

### 2.2 หา Sheet ID
URL ของ Sheets จะเป็น:
```
https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXXXXXX/edit
```
ส่วน `XXXXXXXXXXXXXXXXXXXXXX` คือ **Sheet ID** ของคุณ

### 2.3 ทดสอบ JSON URL
เปิด browser ไปที่ (แทน YOUR_SHEET_ID):
```
https://opensheet.elk.sh/YOUR_SHEET_ID/Publications
```
ถ้าเห็น JSON ข้อมูล = สำเร็จ ✅

---

## ส่วนที่ 3 — ตั้งค่า React Dashboard

### 3.1 แก้ไข `src/config.js`
```javascript
export const FACULTY_CONFIG = {
  facultyName: "ชื่อคณะของคุณ",
  universityName: "ชื่อมหาวิทยาลัย",

  // แทน YOUR_SHEET_ID ด้วย Sheet ID ที่ได้จากขั้นตอน 2.2
  googleSheetURL: "https://opensheet.elk.sh/YOUR_SHEET_ID/Publications",
  googleSheetAuthorsURL: "https://opensheet.elk.sh/YOUR_SHEET_ID/Authors",
}
```

### 3.2 แก้ไข `vite.config.js`
```javascript
base: '/YOUR_REPO_NAME/',  // ชื่อ GitHub repo ของคุณ
```

### 3.3 แก้ไข `package.json`
```json
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME"
```

---

## ส่วนที่ 4 — Deploy บน GitHub Pages

### 4.1 Push โค้ดขึ้น GitHub
```bash
cd scopus-ghpages

git init
git add .
git commit -m "Initial: Scopus Faculty Dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### 4.2 ติดตั้ง dependencies และ deploy
```bash
npm install
npm run deploy
```
คำสั่งนี้จะ build React แล้ว push ไปยัง branch `gh-pages` อัตโนมัติ

### 4.3 เปิด GitHub Pages
1. GitHub → repo ของคุณ → **Settings**
2. เมนูซ้าย → **Pages**
3. Source: **Deploy from a branch**
4. Branch: **gh-pages** → **/root**
5. กด **Save**
6. รอ 1-2 นาที → เว็บจะขึ้นที่ `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`

---

## อัปเดตโค้ดในอนาคต

เมื่อแก้ไขโค้ดแล้วอยากให้เว็บอัปเดต:
```bash
git add .
git commit -m "อธิบายการแก้ไข"
git push
npm run deploy
```

---

## โครงสร้างข้อมูลใน Google Sheets

### Sheet: Publications (สร้างอัตโนมัติ)
| คอลัมน์ | รายละเอียด |
|---|---|
| id | Scopus EID |
| title | ชื่อบทความ |
| authors | รายชื่อผู้แต่ง |
| authorIds | ID อาจารย์ (คั่นด้วย ;) |
| year | ปีที่ตีพิมพ์ |
| journal | ชื่อวารสาร |
| quartile | Q1/Q2/Q3/Q4/Unknown |
| isTop10 | TRUE/FALSE |
| citations | จำนวนอ้างอิง |
| docType | ประเภทบทความ |
| doi | DOI |

### Sheet: Authors (สร้างอัตโนมัติ)
| คอลัมน์ | รายละเอียด |
|---|---|
| id | Author ID (ตั้งใน CONFIG) |
| name | ชื่อ-นามสกุล |
| position | ตำแหน่ง |
| hIndex | H-index จาก Scopus |
| citations | Citations รวม |

---

## แก้ไขข้อมูลด้วยตนเอง

ถ้า quartile ผิดหรืออยากแก้ข้อมูลใด ๆ:
1. เปิด Google Sheets → sheet "Publications"
2. แก้ไขเซลล์ตรงๆ ได้เลย
3. Dashboard จะแสดงข้อมูลใหม่ภายใน 5 นาที (cache หมดอายุ)

---

## ปัญหาที่พบบ่อย

**Dashboard แสดง Demo Mode ตลอด**
→ ตรวจสอบ `googleSheetURL` ใน config.js ว่าใส่ Sheet ID ถูกต้อง

**Apps Script Error: "Exception: Request failed"**
→ API Key ผิดหรือหมดอายุ ตรวจสอบที่ dev.elsevier.com

**Quartile แสดงเป็น Unknown ทั้งหมด**
→ ISSN ของวารสารอาจไม่อยู่ใน Scopus Serial Title API
→ แก้ได้โดยเปิด Sheet แล้วพิมพ์ quartile เองในคอลัมน์ quartile

**GitHub Pages แสดงหน้าเปล่า**
→ ตรวจสอบ `base` ใน vite.config.js ว่าตรงกับชื่อ repo
