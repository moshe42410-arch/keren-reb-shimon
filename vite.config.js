import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: true // מאפשר גישה מכל כתובת IP
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // כבה sourcemaps בפרודקשן לקבצים קטנים יותר
  },
  base: '/' // שנה ל-'/your-project/' אם האתר בתת-תיקייה
})
