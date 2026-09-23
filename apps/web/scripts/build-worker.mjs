// Bundles the Payload config + worker loop into one ESM file (runs from the standalone output,
// resolving externals from its traced node_modules).
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

await build({
  entryPoints: [path.join(root, 'src/worker/index.ts')],
  outfile: path.join(root, 'dist/worker.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  tsconfig: path.join(root, 'tsconfig.json'),
  // Native / optional modules stay external (present in the standalone node_modules).
  // @react-pdf/renderer: pdfkit loads its standard fonts via package subpath imports ('#standard-fonts/…')
  // that do not survive bundling; it is traced into the standalone node_modules by next build.
  external: ['sharp', 'pg-native', 'drizzle-kit', 'drizzle-kit/*', 'esbuild', 'tsx', '@next/env', 'next', 'next/*', 'react', 'react-dom', '@react-pdf/renderer'],
  banner: { js: "import{createRequire as __pkCreateRequire}from'node:module';const require=__pkCreateRequire(import.meta.url);" },
  logLevel: 'info',
  metafile: false,
})
