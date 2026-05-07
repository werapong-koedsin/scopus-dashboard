import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // ← เปลี่ยน 'scopus-dashboard' ให้ตรงกับชื่อ GitHub repo ของคุณ
  base: '/scopus-dashboard/',
})
