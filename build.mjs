import * as esbuild from 'esbuild';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [join(__dirname, 'index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: join(__dirname, 'dist', 'index.js'),
  format: 'esm',
  packages: 'external',
});
