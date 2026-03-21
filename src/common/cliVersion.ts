import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export function getCliVersion(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 12; i++) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name?: string; version?: string };
        if (pkg.name === '@tamer4lynx/cli' && typeof pkg.version === 'string') {
          return pkg.version;
        }
      } catch {
        /* */
      }
    }
    const next = path.dirname(dir);
    if (next === dir) break;
    dir = next;
  }
  return '0.0.0';
}
