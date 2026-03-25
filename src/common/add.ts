import fs from 'fs';
import path from 'path';
import { execFile, execSync } from 'child_process';
import { promisify } from 'util';
import semver from 'semver';
import { resolveHostPaths } from './hostConfig';

const execFileAsync = promisify(execFile);

const CORE_PACKAGES = [
  '@tamer4lynx/tamer-app-shell',
  '@tamer4lynx/tamer-screen',
  '@tamer4lynx/tamer-router',
  '@tamer4lynx/tamer-insets',
  '@tamer4lynx/tamer-transports',
  '@tamer4lynx/tamer-system-ui',
  '@tamer4lynx/tamer-icons',
  '@tamer4lynx/tamer-env',
];

/**
 * Installed by `t4l add-dev`. Each name is resolved to the highest published semver via `normalizeTamerInstallSpec`
 * so hosts do not rely on transitive installs alone (avoids stale or mismatched versions).
 * Align with `packages/tamer-dev-client/package.json` dependencies + `lynx.config` aliases (screen, icons).
 */
const DEV_STACK_PACKAGES = [
  '@tamer4lynx/tamer-dev-app',
  '@tamer4lynx/tamer-dev-client',
  '@tamer4lynx/tamer-app-shell',
  '@tamer4lynx/tamer-icons',
  '@tamer4lynx/tamer-insets',
  '@tamer4lynx/tamer-plugin',
  '@tamer4lynx/tamer-router',
  '@tamer4lynx/tamer-screen',
  '@tamer4lynx/tamer-system-ui',
] as const

const PACKAGE_JSON_DEP_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const

/** Local / monorepo specs we do not rewrite to a registry version. */
function isNonRegistryTamerDep(versionSpec: string): boolean {
  const v = versionSpec.trim()
  if (!v) return true
  return (
    v.startsWith('file:') ||
    v.startsWith('link:') ||
    v.startsWith('portal:') ||
    v.includes('workspace:')
  )
}

/** Collect `@tamer4lynx/*` package names from package.json (registry-installable entries only). */
export function collectTamerPackagesFromPackageJson(cwd: string): string[] {
  const pkgPath = path.join(cwd, 'package.json')
  if (!fs.existsSync(pkgPath)) {
    console.warn(`⚠️  No package.json at ${pkgPath}`)
    return []
  }
  let pkg: Record<string, unknown>
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as Record<string, unknown>
  } catch {
    console.warn(`⚠️  Could not parse ${pkgPath}`)
    return []
  }
  const names = new Set<string>()
  for (const section of PACKAGE_JSON_DEP_SECTIONS) {
    const deps = pkg[section]
    if (!deps || typeof deps !== 'object' || Array.isArray(deps)) continue
    for (const [name, spec] of Object.entries(deps as Record<string, unknown>)) {
      if (!name.startsWith('@tamer4lynx/')) continue
      if (typeof spec !== 'string') continue
      if (isNonRegistryTamerDep(spec)) continue
      names.add(name)
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

const PACKAGE_ALIASES: Record<string, string> = {};

async function getHighestPublishedVersion(fullName: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('npm', ['view', fullName, 'versions', '--json'], {
      maxBuffer: 10 * 1024 * 1024,
    });
    const parsed = JSON.parse(stdout.trim()) as string | string[];
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const valid = list.filter((v): v is string => typeof v === 'string' && !!semver.valid(v));
    if (valid.length === 0) return null;
    return semver.rsort(valid)[0] ?? null;
  } catch {
    return null;
  }
}

/** Picks the highest semver published on npm for @tamer4lynx/* (npm `latest` / dist-tags can lag). */
async function normalizeTamerInstallSpec(pkg: string): Promise<string> {
  if (!pkg.startsWith('@tamer4lynx/')) return pkg;
  if (/^@[^/]+\/[^@]+@/.test(pkg)) return pkg;
  const highest = await getHighestPublishedVersion(pkg);
  if (highest) {
    return `${pkg}@${highest}`;
  }
  console.warn(`⚠️  Could not resolve published versions for ${pkg}; using @prerelease`);
  return `${pkg}@prerelease`;
}

function detectPackageManager(cwd: string): 'npm' | 'pnpm' | 'bun' {
  const dir = path.resolve(cwd);
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(dir, 'bun.lockb'))) return 'bun';
  return 'npm';
}

function runInstall(cwd: string, packages: string[], pm: 'npm' | 'pnpm' | 'bun') {
  if (pm === 'npm') {
    // npm 7+ strict peers: @tamer4lynx/* often declare react@^17 while @tamer4lynx/cli (Ink) pulls react@18.
    execSync(`npm install --legacy-peer-deps ${packages.join(' ')}`, { stdio: 'inherit', cwd });
    return;
  }
  const args = ['add', ...packages];
  const cmd = pm === 'pnpm' ? 'pnpm' : 'bun';
  execSync(`${cmd} ${args.join(' ')}`, { stdio: 'inherit', cwd });
}

export async function addCore() {
  const { lynxProjectDir } = resolveHostPaths();
  const pm = detectPackageManager(lynxProjectDir);
  console.log(`Resolving latest published versions (npm)…`);
  const resolved = await Promise.all(CORE_PACKAGES.map(normalizeTamerInstallSpec));
  console.log(`Adding core packages to ${lynxProjectDir} (using ${pm})…`);
  runInstall(lynxProjectDir, resolved, pm);
  console.log('✅ Core packages installed. Run `t4l link` to link native modules.');
}

export async function addDev() {
  const { lynxProjectDir } = resolveHostPaths();
  const pm = detectPackageManager(lynxProjectDir);
  console.log(`Resolving latest published versions (npm)…`);
  const resolved = await Promise.all([...DEV_STACK_PACKAGES].map(normalizeTamerInstallSpec));
  console.log(`Adding dev stack (${DEV_STACK_PACKAGES.length} @tamer4lynx packages) to ${lynxProjectDir} (using ${pm})…`);
  runInstall(lynxProjectDir, resolved, pm);
  console.log('✅ Dev stack installed. Run `t4l link` to link native modules.');
}

/** Resolves every `@tamer4lynx/*` listed in the project package.json (dependencies / dev / peer / optional) to the highest published semver — same as `t4l add`. Skips `file:`, `link:`, `portal:`, and `workspace:*` entries. */
export async function updateTamerPackages() {
  const { lynxProjectDir } = resolveHostPaths();
  const tamerPkgs = collectTamerPackagesFromPackageJson(lynxProjectDir);
  if (tamerPkgs.length === 0) {
    console.log(
      'No @tamer4lynx packages to update (none found in package.json, or only file:/workspace: links). Add packages with `t4l add` first.',
    );
    return;
  }
  const pm = detectPackageManager(lynxProjectDir);
  console.log(`Resolving latest published versions (npm)…`);
  const resolved = await Promise.all(tamerPkgs.map(normalizeTamerInstallSpec));
  console.log(`Updating ${tamerPkgs.length} @tamer4lynx packages in ${lynxProjectDir} (using ${pm})…`);
  runInstall(lynxProjectDir, resolved, pm);
  console.log('✅ Tamer packages updated. Run `t4l link` to link native modules.');
}

export async function add(packages: string[] = []) {
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
  console.log(`Resolving latest published versions (npm)…`);
  const normalized = await Promise.all(
    list.map(async (p) => {
      const spec = p.startsWith('@') ? p : PACKAGE_ALIASES[p] ?? `@tamer4lynx/${p}`;
      return normalizeTamerInstallSpec(spec);
    })
  );
  console.log(`Adding ${normalized.join(', ')} to ${lynxProjectDir} (using ${pm})…`);
  runInstall(lynxProjectDir, normalized, pm);
  console.log('✅ Packages installed. Run `t4l link` to link native modules.');
}
