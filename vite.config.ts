import { defineConfig, createLogger, type LogOptions } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// @wowserhq/scene ships .js.map sourcemaps that reference the original .ts
// sources, which aren't published in the npm package. Vite tries to inline
// those sources for debugging, can't find them, and warns once per file —
// dozens of harmless lines that bury the logs that matter. Filter out only
// that exact message; every other warning/error passes through untouched.
const logger = createLogger()
const isMissingSourcemapWarning = (msg: string) =>
  msg.includes('Sourcemap for') && msg.includes('points to missing source files')
const baseWarn = logger.warn.bind(logger)
const baseWarnOnce = logger.warnOnce.bind(logger)
logger.warn = (msg: string, options?: LogOptions) => {
  if (isMissingSourcemapWarning(msg)) return
  baseWarn(msg, options)
}
logger.warnOnce = (msg: string, options?: LogOptions) => {
  if (isMissingSourcemapWarning(msg)) return
  baseWarnOnce(msg, options)
}

// https://vite.dev/config/
export default defineConfig({
  customLogger: logger,
  plugins: [vue()],
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    // Spawns web workers via `new Worker(new URL('./worker.js',
    // import.meta.url))`; esbuild pre-bundling would break those relative
    // URLs in dev, so serve the package's own ESM files instead.
    exclude: ['@wowserhq/scene'],
    // …but its sub-dependencies must still be pre-bundled: @wowserhq/io
    // ships a CJS `fs` shim that only esbuild's interop makes importable
    // (WebKit fails the raw graph with "Importing binding name 'default'
    // cannot be resolved by star export entries").
    include: [
      '@wowserhq/scene > @wowserhq/format',
      '@wowserhq/scene > @tweenjs/tween.js',
    ],
  },
})
