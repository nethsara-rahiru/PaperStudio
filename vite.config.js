import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
export default defineConfig({
  plugins: [
    react(),
    {
      name: "pdfjs-assets",
      closeBundle() {
        const root = dirname(require.resolve("pdfjs-dist/package.json"));
        mkdirSync("dist/pdfjs", { recursive: true });
        for (const name of ["cmaps", "standard_fonts"])
          cpSync(join(root, name), join("dist/pdfjs", name), {
            recursive: true,
          });
      },
    },
  ],
  server: { proxy: { "/api": "http://127.0.0.1:3001" } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("pdfjs-dist") || id.includes("react-pdf"))
              return "pdf-viewer";
            if (id.includes("codemirror") || id.includes("@lezer"))
              return "source-editor";
          }
        },
      },
    },
  },
});
