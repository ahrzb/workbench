import { defineConfig } from 'vite';

// https://vitejs.dev/config
// node:sqlite stays a real Node module: bundled, Vite swaps it for an empty stub.
export default defineConfig({
  build: { rollupOptions: { external: ['node:sqlite'] } },
});
