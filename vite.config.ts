import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020", // Compatible target for better browser support
    sourcemap: false, // Disable sourcemaps in production for faster builds
    minify: "esbuild", // Faster than terser
    cssMinify: true,
    // Enable compression
    reportCompressedSize: false, // Faster builds
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
          ],
          "query-vendor": ["@tanstack/react-query"],
          "chart-vendor": ["recharts"],
          "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
          // Separate heavy 3D libraries
          "three-vendor": ["three", "@react-three/fiber", "@react-three/drei"],
        },
        // Optimize chunk file names
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "@react-three/fiber", // Include to fix scheduler dependency resolution
      "three", // Include for proper bundling
    ],
    // Don't exclude @react-three/fiber as it needs proper dependency resolution
  },
  // Enable experimental features for faster HMR
  experimental: {
    renderBuiltUrl(filename: string) {
      return `/${filename}`;
    },
  },
});
