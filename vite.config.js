import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    glsl() // Cho phép import file .glsl trực tiếp
  ],
  build: {
    // Multi-page app: index.html + solar.html
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        solar: resolve(__dirname, 'solar.html'),
      },
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    },
    // Giới hạn chunk size warning
    chunkSizeWarningLimit: 600,
    // Minify cho production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true
      }
    }
  },
  server: {
    open: true // Tự động mở browser khi chạy dev
  }
});
