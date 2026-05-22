import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isDesktop = env.VITE_APP_PLATFORM === 'desktop';
  const plugins = [
    react(), 
    tailwindcss(),
  ];

  // 桌面版跳过 PWA 插件（manifest + service worker），仅 Web 版启用
  if (!isDesktop) {
    plugins.push(VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-16x16.png', 'icon-32x32.png', 'icon-256x256.png', 'icon-512x512.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB
      },
      manifest: {
        name: '智能体育教案',
        short_name: '体育教案',
        description: 'AI 驱动的体育教案生成辅助工具',
        theme_color: '#0d9488',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'zh-CN',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    }));
  }

  return {
    base: './',
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
