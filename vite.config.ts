import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig} from 'vite';

const rootDir = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    base: '/',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/three/')) return 'vendor-three';
            if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'vendor-firebase';
            if (id.includes('/recharts/') || id.includes('/d3-')) return 'vendor-charts';
            if (id.includes('/katex/')) return 'vendor-katex';
            if (id.includes('/pdfjs-dist/')) return 'vendor-pdf';
            if (id.includes('/motion/') || id.includes('/framer-motion/')) return 'vendor-motion';
            if (id.includes('/lucide-react/')) return 'vendor-icons';
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router')
            ) {
              return 'vendor-react';
            }
            return undefined;
          },
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(rootDir, 'dist');
          const srcAssets = path.resolve(rootDir, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
      alias: {
        '@': path.resolve(rootDir, '.'),
        react: path.resolve(rootDir, 'node_modules/react'),
        'react-dom': path.resolve(rootDir, 'node_modules/react-dom'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
        'react-router',
        'react-router-dom',
        'motion/react',
        'recharts',
        'lucide-react',
      ],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
