
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the code to use process.env.API_KEY locally
    'process.env.API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY || '')
  },
  server: {
    port: 5173,
    strictPort: true,
  }
});
