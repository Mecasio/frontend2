import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    allowedHosts: [
      "ap.earist.edu.ph",
      "136.239.248.62",
      "localhost",
      "127.0.0.1"    
    ]
  },
  ssr:{
    optimizeDeps: {
      include: ['dayjs'],
    },
  },
  build:{
    commonjsOptions: {
      esmExternals: true,
    },
  },
});
