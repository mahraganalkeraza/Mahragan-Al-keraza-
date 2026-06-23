import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/Mahragan-Al-keraza-/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // تذكير: سيبها autoUpdate لو التحديث البرتقالي شغال برودكاست منفصل، 
      // أو غيرها لـ promptForUpdate لو هتربطها بـ Event الـ PWA
      registerType: 'autoUpdate', 
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-able-icon.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB
      },
      manifest: {
        name: 'منصة إدارة الأنشطة والمسابقات',
        short_name: 'إدارة الأنشطة',
        description: 'نظام إدارة وتسجيل المشتركين والأنشطة والمسابقات الكنسية',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'mask-able-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable' // تم إضافة هذا السطر لتقفيل أمان الأيقونات على الأندرويد
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    }
  }
});