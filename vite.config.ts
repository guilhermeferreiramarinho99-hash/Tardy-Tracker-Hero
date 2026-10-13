// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// Modo sem internet. O arquivo de apoio é gerado pelo próprio build (nunca à mão)
// e só é registrado por src/lib/pwa.ts, que se recusa a ativá-lo no editor do
// Lovable, em pré-visualização ou em desenvolvimento.
export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  plugins: [
    VitePWA({
      injectRegister: null, // nada de registro automático: o único registro é src/lib/pwa.ts
      registerType: "autoUpdate",
      devOptions: { enabled: false }, // no desenvolvimento nenhum arquivo de apoio é gerado
      manifest: false, // o app já tem public/manifest.webmanifest no <head>
      outDir: "dist/client", // é desta pasta que o app publicado serve os arquivos
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        navigateFallback: null,
        navigateFallbackDenylist: [/^\/~oauth/],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "fontes", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 180 } },
          },
          {
            // Telas: primeiro a internet; sem sinal, aparece a última versão vista.
            urlPattern: ({ request, sameOrigin, url }) =>
              sameOrigin && request.destination === "document" && !url.pathname.startsWith("/~oauth"),
            handler: "NetworkFirst",
            options: {
              cacheName: "telas",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Arquivos do próprio app (trazem número de versão no nome): ficam guardados.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/(assets|icons)\//.test(url.pathname),
            handler: "CacheFirst",
            options: { cacheName: "recursos", expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
});
