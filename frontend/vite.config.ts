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
        // РАДИКАЛЬНОЕ РЕШЕНИЕ: Все vendor библиотеки в один чанк
        // Это гарантирует правильный порядок загрузки и отсутствие ошибок useState
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // ВСЕ vendor библиотеки в один чанк vendor
            // Это предотвращает проблемы с порядком загрузки и зависимостями
            return 'vendor';
          }
        },
      },
      // Убедиться, что зависимости разрешаются правильно
      preserveEntrySignatures: 'strict',
    },
    // Очищать папку dist перед сборкой
    emptyOutDir: true,
    // Увеличить лимит предупреждений о размере чанков
    chunkSizeWarningLimit: 1000,
    // Минификация (esbuild быстрее чем terser)
    minify: 'esbuild',
    // Убедиться, что модули загружаются в правильном порядке
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Убедиться, что модули загружаются синхронно
    target: 'esnext',
    modulePreload: {
      polyfill: true,
    },
  },
})

