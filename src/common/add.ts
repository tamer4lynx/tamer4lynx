import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { resolveHostPaths } from './hostConfig';

const CORE_PACKAGES = [
  '@tamer4lynx/tamer-app-shell',
  '@tamer4lynx/tamer-screen',
  '@tamer4lynx/tamer-router',
  '@tamer4lynx/tamer-insets',
  '@tamer4lynx/tamer-transports',
  '@tamer4lynx/tamer-text-input',
  '@tamer4lynx/tamer-system-ui',
  '@tamer4lynx/tamer-icons',
];

function detectPackageManager(cwd: string): 'npm' | 'pnpm' | 'bun' {
  const dir = path.resolve(cwd);
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(dir, 'bun.lockb'))) return 'bun';
  return 'npm';
}

function runInstall(cwd: string, packages: string[], pm: 'npm' | 'pnpm' | 'bun') {
  const args = pm === 'npm' ? ['install', ...packages] : ['add', ...packages];
  const cmd = pm === 'npm' ? 'npm' : pm === 'pnpm' ? 'pnpm' : 'bun';
  execSync(`${cmd} ${args.join(' ')}`, { stdio: 'inherit', cwd });
}

export function addCore() {
  const { lynxProjectDir } = resolveHostPaths();
  const pm = detectPackageManager(lynxProjectDir);
  console.log(`Adding core packages to ${lynxProjectDir} (using ${pm})...`);
  runInstall(lynxProjectDir, CORE_PACKAGES, pm);
  console.log('✅ Core packages installed. Run `t4l link` to link native modules.');
}

export function add(packages: string[] = []) {
  const list = Array.isArray(packages) ? packages : [];
  if (list.length === 0) {
    console.log('Usage: t4l add <package> [package...]');
    console.log('Example: t4l add @tamer4lynx/tamer-auth');
    console.log('');
    console.log('Future: t4l add will track installed versions for compatibility (Expo-style).');
    return;
  }
  const { lynxProjectDir } = resolveHostPaths();
  const pm = detectPackageManager(lynxProjectDir);
  const normalized = list.map((p) =>
    p.startsWith('@') ? p : `@tamer4lynx/${p}`
  );
  console.log(`Adding ${normalized.join(', ')} to ${lynxProjectDir} (using ${pm})...`);
  runInstall(lynxProjectDir, normalized, pm);
  console.log('✅ Packages installed. Run `t4l link` to link native modules.');
}
