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
        // Убедимся что vendor-react загружается первым через правильный порядок
        manualChunks: (id) => {
          // Vendor chunks - упрощенное разделение для избежания проблем с порядком загрузки
          if (id.includes('node_modules')) {
            // ВСЕ что связано с React должно быть в vendor-react
            // Это гарантирует что React загружается первым и доступен для всех зависимостей
            if (id.includes('react') || 
                id.includes('react-dom') || 
                id.includes('react-router') || 
                id.includes('react-query') || 
                id.includes('react-hook-form') || 
                id.includes('react-i18next') || 
                id.includes('react-player') ||
                id.includes('zustand') || 
                id.includes('@hookform') || 
                id.includes('@tanstack') ||
                id.includes('lucide-react') || // Иконки могут использовать React контекст
                id.includes('recharts')) { // Charts могут использовать React
              return 'vendor-react';
            }
            // Остальные библиотеки
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

