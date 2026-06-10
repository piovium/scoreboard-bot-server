import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid({ ssr: true })],
  ssr: { noExternal: /^\.\.?\// },
  build: {
    ssr: 'src/index.ts',
    target: 'node26',
    outDir: 'dist',
    rollupOptions: {
      output: { entryFileNames: 'server.mjs' },
    },
  },
});
