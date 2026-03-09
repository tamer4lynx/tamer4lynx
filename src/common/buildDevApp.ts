import fs from 'fs';
import path from 'path';
import { findDevClientPackage } from './hostConfig';
import android_bundle from '../android/bundle';
import android_build from '../android/build';

function findRepoRoot(start: string): string {
  let dir = path.resolve(start);
  const root = path.parse(dir).root;
  while (dir !== root) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.workspaces) return dir;
      } catch {}
    }
    dir = path.dirname(dir);
  }
  return start;
}

async function buildDevApp(opts: { platform?: 'android' | 'ios' | 'all'; install?: boolean } = {}) {
  const cwd = process.cwd();
  const repoRoot = findRepoRoot(cwd);
  const devClientPkg = findDevClientPackage(repoRoot) ?? findDevClientPackage(cwd);

  if (!devClientPkg) {
    console.error('❌ tamer-dev-client is not installed in this project.');
    console.error('   Add it as a dependency or ensure packages/tamer-dev-client exists in the repo.');
    process.exit(1);
  }

  const platform = opts.platform ?? 'all';

  if (platform === 'ios' || platform === 'all') {
    console.log('⚠️  iOS dev-app build is not yet implemented. Skipping.');
    if (platform === 'ios') process.exit(0);
  }

  if (platform === 'android' || platform === 'all') {
    await android_bundle({ target: 'dev-app' });
    await android_build({ target: 'dev-app', install: opts.install });
  }
}

export default buildDevApp;
