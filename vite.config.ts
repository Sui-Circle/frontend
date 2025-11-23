import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.wasm'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react', '@mysten/walrus'],
    include: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      'poseidon-lite',
      'dataloader',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
    ],
  },
  server: {
    fs: {
      strict: false,
    },
    proxy: {
      '/aggregator1/v1': {
        target: 'https://aggregator.walrus-testnet.walrus.space',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/aggregator1/, ''),
      },
      '/aggregator2/v1': {
        target: 'https://wal-aggregator-testnet.staketab.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/aggregator2/, ''),
      },
      '/aggregator3/v1': {
        target: 'https://walrus-testnet-aggregator.redundex.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/aggregator3/, ''),
      },
      '/aggregator4/v1': {
        target: 'https://walrus-testnet-aggregator.nodes.guru',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/aggregator4/, ''),
      },
      '/aggregator5/v1': {
        target: 'https://aggregator.walrus.banansen.dev',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/aggregator5/, ''),
      },
      '/aggregator6/v1': {
        target: 'https://walrus-testnet-aggregator.everstake.one',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/aggregator6/, ''),
      },
      '/publisher1/v1': {
        target: 'https://publisher.walrus-testnet.walrus.space',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/publisher1/, ''),
      },
      '/publisher2/v1': {
        target: 'https://wal-publisher-testnet.staketab.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/publisher2/, ''),
      },
      '/publisher3/v1': {
        target: 'https://walrus-testnet-publisher.redundex.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/publisher3/, ''),
      },
      '/publisher4/v1': {
        target: 'https://walrus-testnet-publisher.nodes.guru',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/publisher4/, ''),
      },
      '/publisher5/v1': {
        target: 'https://publisher.walrus.banansen.dev',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/publisher5/, ''),
      },
      '/publisher6/v1': {
        target: 'https://walrus-testnet-publisher.everstake.one',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/publisher6/, ''),
      },
      '/sui-rpc': {
        target: 'https://fullnode.testnet.sui.io',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/sui-rpc/, ''),
        timeout: 120000,
        proxyTimeout: 120000,
      }
    },
  },
});
