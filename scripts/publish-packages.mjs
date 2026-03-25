import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');

const PUBLISH_ORDER = [
  'packages/jiggle',
  'packages/tamer-host',
  'packages/tamer-plugin',
  'packages/tamer-env',
  'packages/tamer-transports',
  'packages/tamer-linking',
  'packages/tamer-secure-store',
  'packages/tamer-biometric',
  'packages/tamer-display-browser',
  'packages/tamer-insets',
  'packages/tamer-system-ui',
  'packages/tamer-screen',
  'packages/tamer-icons',
  'packages/tamer-auth',
  'packages/tamer-app-shell',
  'packages/tamer-router',
  'packages/tamer-dev-client',
  'packages/tamer-dev-app',
];

function publish(pkgPath) {
  const pkg = JSON.parse(readFileSync(join(ROOT, pkgPath, 'package.json'), 'utf8'));
  if (pkg.private) return;
  console.log(`\n📦 Publishing ${pkg.name}@${pkg.version}...`);
  try {
    execSync(`npm publish -w ${pkg.name}`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
  } catch {
    console.log(`⏭️  Skipped ${pkg.name}@${pkg.version} (already published or error)`);
  }
}

for (const pkgPath of PUBLISH_ORDER) {
  publish(pkgPath);
}

console.log('\n✅ Workspace packages published.');
