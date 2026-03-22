import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      jsxImportSource: "react",
    }),
    mode === "development" ? componentTagger() : null,
    mode === "production" ? visualizer({ open: false }) : null,
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  server: {
    host: true,
    port: 8080,
    hmr: {
      overlay: false,
    },
  },

  build: {
    outDir: "dist",
    target: "esnext",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          firebase: ["firebase"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
          queryLib: ["@tanstack/react-query"],
        },
      },
    },
    // Aggressive code splitting
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: true,
  },

  // Optimize CSS
  css: {
    postcss: {
      plugins: [
        require("autoprefixer"),
        require("tailwindcss"),
      ],
    },
  },

  // Performance hints
  logLevel: mode === "production" ? "warn" : "info",
}));
