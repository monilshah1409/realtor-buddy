/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'resolve-deno-npm-specifiers',
      enforce: 'pre',
      transform(code) {
        if (code.includes('npm:nodemailer')) {
          const mockPath = decodeURI(new URL('./src/test/mocks/nodemailer.ts', import.meta.url).pathname);
          return {
            code: code.replace(/['"]npm:nodemailer[^'"]*['"]/g, JSON.stringify(mockPath)),
            map: null,
          };
        }
      },
    },
  ],
  resolve: {
    alias: [
      {
        find: /^npm:nodemailer.*/,
        replacement: decodeURI(new URL('./src/test/mocks/nodemailer.ts', import.meta.url).pathname),
      },
      {
        find: 'nodemailer',
        replacement: decodeURI(new URL('./src/test/mocks/nodemailer.ts', import.meta.url).pathname),
      },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ['leaflet', 'react-leaflet'],
          supabase: ['@supabase/supabase-js'],
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
