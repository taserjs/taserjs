import { defineConfig, mergeConfig } from 'vitest/config'
import { tanstackViteConfig } from '@tanstack/vite-config'

const config = defineConfig({
  test: {
    name: 'router',
    dir: './tests',
    environment: 'node',
    globals: true,
    watch: false,
  },
})

export default mergeConfig(
  config,
  tanstackViteConfig({
    entry: [
      './src/index.ts',
      './src/middleware/cors.ts',
      './src/middleware/body-limit.ts',
      './src/middleware/compress.ts',
      './src/middleware/csrf.ts',
      './src/middleware/etag.ts',
      './src/middleware/jwk.ts',
      './src/middleware/jwt.ts',
      './src/middleware/secure-headers.ts',
      './src/middleware/timing.ts',
    ],
    srcDir: './src',
  }),
)
