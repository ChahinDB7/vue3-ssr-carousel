import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/plugin.js', import.meta.url)), // Entry point of your plugin
      name: 'Vue3CarouselSSR', // Library name for UMD builds
      fileName: (format) => `vue3-ssr-carousel.${format}.js`, // Output file naming
    },
    rollupOptions: {
      external: ['vue'], // Vue is marked as an external dependency (not bundled)
      output: {
        globals: {
          vue: 'Vue', // Vue global variable for UMD build
        },
        exports: 'default', // Ensure default export for your component
      },
    },
    sourcemap: true, // Enable sourcemaps for debugging (optional)
  },
})
