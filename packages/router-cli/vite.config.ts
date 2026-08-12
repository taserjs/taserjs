import { defineConfig, mergeConfig } from 'vitest/config'
import { tanstackViteConfig } from '@tanstack/vite-config'

const config = defineConfig({
  test: {
    name: 'router-cli',
    dir: './tests',
    environment: 'node',
    globals: true,
    watch: false,
  },
})

export default mergeConfig(
  config,
  tanstackViteConfig({
    entry: './src/cli.ts',
    srcDir: './src',
  }),
)
