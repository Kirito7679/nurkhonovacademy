import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Генерировать хэши для файлов (для правильного кэширования)
    rollupOptions: {
      output: {
        // Добавляем хэш к именам файлов для кэш-бастинга
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Code splitting - разделение на чанки
        manualChunks: (id) => {
          // Vendor chunks - более детальное разделение
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('axios') || id.includes('socket.io')) {
              return 'vendor-network';
            }
            if (id.includes('react-query') || id.includes('zustand')) {
              return 'vendor-state';
            }
            if (id.includes('react-hook-form') || id.includes('zod')) {
              return 'vendor-forms';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react-player')) {
              return 'vendor-player';
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'vendor-i18n';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('dompurify')) {
              return 'vendor-utils';
            }
            // Остальные node_modules
            return 'vendor-other';
          }
        },
      },
    },
    // Очищать папку dist перед сборкой
    emptyOutDir: true,
    // Увеличить лимит предупреждений о размере чанков
    chunkSizeWarningLimit: 1000,
    // Минификация (esbuild быстрее чем terser)
    minify: 'esbuild',
  },
})

