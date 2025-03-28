import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './public/manifest.json'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isExtensionBuild = mode === 'extension';
  
  return {
    plugins: [
      react(),
      // Only use the crx plugin when building the extension
      isExtensionBuild ? crx({ manifest }) : null,
    ].filter(Boolean),
    
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: isExtensionBuild ? resolve(__dirname, 'index.html') : resolve(__dirname, 'dev.html'),
          background: isExtensionBuild ? resolve(__dirname, 'background.js') : undefined,
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]'
        }
      },
    },
    
    server: {
      port: 3000,
      open: mode === 'extension' ? true : 'dev.html',
    },
    
    define: {
      'process.env.IS_DEV': JSON.stringify(mode !== 'extension'),
    }
  }
})
