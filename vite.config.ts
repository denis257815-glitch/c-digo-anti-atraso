// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Stamps public/sw.js with a unique BUILD_ID per build, so each deploy
// produces a new service worker file → browser detects update → app reloads.
function stampServiceWorker(): Plugin {
  const BUILD_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: "stamp-service-worker",
    apply: "build",
    transform(code, id) {
      if (id.endsWith("/public/sw.js") || id.endsWith("\\public\\sw.js")) {
        return code.replace(/__BUILD_ID__/g, BUILD_ID);
      }
      return null;
    },
    closeBundle() {
      // Patch the emitted sw.js inside common output dirs.
      const candidates = [
        "dist/sw.js",
        "dist/client/sw.js",
        ".output/public/sw.js",
        ".vercel/output/static/sw.js",
      ];
      for (const rel of candidates) {
        const p = resolve(process.cwd(), rel);
        if (existsSync(p)) {
          try {
            const src = readFileSync(p, "utf8");
            if (src.includes("__BUILD_ID__")) {
              writeFileSync(p, src.replace(/__BUILD_ID__/g, BUILD_ID));
            }
          } catch {
            /* ignore */
          }
        }
      }
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [stampServiceWorker()],
  },
});
