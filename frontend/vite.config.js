import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // 👈 @vitejs/plugin-react ලෙස Slash (/) එකක් තියෙන්න ඕන
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: './',
})