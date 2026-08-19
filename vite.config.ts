import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync } from 'fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
        popup: resolve(__dirname, 'src/popup/popup.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  plugins: [
    {
      name: 'copy-extension-assets',
      closeBundle() {
        copyFileSync(
          resolve(__dirname, 'src/popup/popup.html'),
          resolve(__dirname, 'dist/popup.html')
        );
        copyFileSync(
          resolve(__dirname, 'src/popup/popup.css'),
          resolve(__dirname, 'dist/popup.css')
        );
        copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        );
      }
    }
  ]
});