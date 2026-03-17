import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');

const PUBLISH_ORDER = [
  'packages/jiggle',
  'packages/lynxwebsockets',
  'packages/tamer-host',
  'packages/tamer-plugin',
  'packages/tamer-transports',
  'packages/tamer-linking',
  'packages/tamer-secure-store',
  'packages/tamer-biometric',
  'packages/tamer-display-browser',
  'packages/tamer-insets',
  'packages/tamer-system-ui',
  'packages/tamer-screen',
  'packages/tamer-text-input',
  'packages/tamer-icons',
  'packages/tamer-auth',
  'packages/tamer-app-shell',
  'packages/tamer-router',
  'packages/tamer-dev-client',
];

function publish(pkgPath) {
  const pkg = JSON.parse(readFileSync(join(ROOT, pkgPath, 'package.json'), 'utf8'));
  if (pkg.private) return;
  console.log(`\n📦 Publishing ${pkg.name}...`);
  execSync(`npm publish -w ${pkg.name}`, {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

for (const pkgPath of PUBLISH_ORDER) {
  publish(pkgPath);
}

console.log('\n📦 Publishing @tamer4lynx/tamer4lynx (root)...');
execSync('npm publish', { cwd: ROOT, stdio: 'inherit' });

console.log('\n✅ All packages published.');
