import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['src/index.ts', 'src/server.ts'],
  format: ['esm'],
  sourcemap: true,
  clean: true,
  target: 'node22',
  // @876/core publishes raw TypeScript through its exports map, and tsup treats
  // every declared dependency as external by default — so without this the built
  // service crashes at boot with ERR_MODULE_NOT_FOUND.
  noExternal: ['@876/core'],
})
