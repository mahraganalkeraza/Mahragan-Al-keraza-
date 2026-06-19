import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['./favicon.ico', './apple-touch-icon.png', './mask-able-icon.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB
      },
      manifest: {
        name: 'منصة إدارة الأنشطة والمسابقات', // الاسم الكامل للبرنامج
        short_name: 'إدارة الأنشطة',          // الاسم اللي هيظهر تحت الأيقونة في الشاشة
        description: 'نظام إدارة وتسجيل المشتركين والأنشطة والمسابقات الكنسية',
        theme_color: '#4f46e5',              // لون شريط النظام العلوي (هنا اخترت لون Indigo)
        background_color: '#ffffff',          // لون شاشة الترحيب عند فتح الأبلكيشن
        display: 'standalone',               // يخليه يفتح كبرنامج مستقل بدون شريط المتصفح
        orientation: 'portrait',             // إجبار التطبيق يفتح بالطول
        start_url: './',
        icons: [
          {
            src: './pwa-192x192.png',           // أيقونة بحجم 192
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: './pwa-512x512.png',           // أيقونة بحجم 512
            sizes: '512x512',
            type: 'image/png'
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
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
});
