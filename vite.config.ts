import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false,
  },

  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
    minify: 'esbuild',
    // Chunk size warning threshold (KB) — наши вендоры будут большими
    chunkSizeWarningLimit: 3000,

    rollupOptions: {
      output: {
        // Разбиваем на чанки для параллельной загрузки и лучшего кеширования
        manualChunks(id) {
          // React + React DOM
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // Firebase (самый тяжёлый)
          if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
            return 'vendor-firebase';
          }
          // Анимации
          if (id.includes('node_modules/motion/') || id.includes('node_modules/framer-motion/')) {
            return 'vendor-motion';
          }
          // Графики
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3') || id.includes('node_modules/victory')) {
            return 'vendor-charts';
          }
          // Flow-диаграммы
          if (id.includes('node_modules/@xyflow/') || id.includes('node_modules/@reactflow/')) {
            return 'vendor-flow';
          }
          // Офисные форматы (jspdf, xlsx, jszip, pptxgenjs, mammoth)
          if (
            id.includes('node_modules/jspdf') ||
            id.includes('node_modules/jspdf-autotable') ||
            id.includes('node_modules/xlsx') ||
            id.includes('node_modules/jszip') ||
            id.includes('node_modules/pptxgenjs') ||
            id.includes('node_modules/mammoth')
          ) {
            return 'vendor-office';
          }
          // Остальные node_modules НЕ назначаем — Rollup разберётся сам
          // (явный catch-all вызывает циклические зависимости между чанками)
        },

        // Стабильные имена файлов для кеширования
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'motion/react',
      'lucide-react',
      'recharts',
      'zustand',
      'clsx',
      'tailwind-merge',
      'date-fns',
    ],
  },
});
