import fs from 'fs';
import path from 'path';
import { execFile, execSync } from 'child_process';
import { promisify } from 'util';
import semver from 'semver';
import { resolveHostPaths } from './hostConfig';

const execFileAsync = promisify(execFile);

/**
 * Installed by `t4l add-core`. The minimum set to run a Tamer app in production
 * (no dev client, no dev launcher). tamer-navigation will be included once published to npm.
 */
const CORE_PACKAGES = [
  '@tamer4lynx/tamer-host',
  '@tamer4lynx/tamer-navigation', // not yet on npm — skipped automatically until published
  '@tamer4lynx/tamer-plugin',
  '@tamer4lynx/tamer-router',
  '@tamer4lynx/tamer-app-shell',
  '@tamer4lynx/tamer-screen',
  '@tamer4lynx/tamer-insets',
  '@tamer4lynx/tamer-system-ui',
  '@tamer4lynx/tamer-icons',
  '@tamer4lynx/tamer-transports',
  '@tamer4lynx/tamer-env',
];

/**
 * Installed by `t4l add-dev`. Superset of CORE_PACKAGES plus the dev launcher stack.
 * Each name is resolved to npm's installable default line via `normalizeTamerInstallSpec`
 * so hosts do not rely on transitive installs alone (avoids stale or mismatched versions).
 * Packages not yet published to npm are skipped automatically.
 */
const DEV_STACK_PACKAGES = [
  // core
  '@tamer4lynx/tamer-host',
  '@tamer4lynx/tamer-navigation', // not yet on npm — skipped automatically until published
  '@tamer4lynx/tamer-plugin',
  '@tamer4lynx/tamer-router',
  '@tamer4lynx/tamer-app-shell',
  '@tamer4lynx/tamer-screen',
  '@tamer4lynx/tamer-insets',
  '@tamer4lynx/tamer-system-ui',
  '@tamer4lynx/tamer-icons',
  '@tamer4lynx/tamer-transports',
  '@tamer4lynx/tamer-env',
  // dev additions
  '@tamer4lynx/tamer-dev-client',
  '@tamer4lynx/tamer-linking',
] as const

const PACKAGE_JSON_DEP_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const

export type PackageManager = 'npm' | 'pnpm' | 'bun';
export type TamerInstallStack = 'core' | 'dev';

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

function workspaceMatches(workspace: string, rel: string): boolean {
  const normalized = workspace.replace(/\\/g, '/').replace(/\/$/, '');
  if (normalized === rel) return true;
  if (normalized.endsWith('/*')) {
    const parent = normalized.slice(0, -2);
    return rel.startsWith(`${parent}/`) && rel.slice(parent.length + 1).split('/').length === 1;
  }
  return false;
}

function workspaceIncludes(root: string, projectDir: string): boolean {
  const pkgPath = path.join(root, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;
  const rel = path.relative(root, projectDir).split(path.sep).join('/');
  if (!rel || rel.startsWith('..')) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      workspaces?: string[] | { packages?: string[] };
    };
    const workspaces = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces?.packages;
    return Array.isArray(workspaces) && workspaces.some((workspace) => workspaceMatches(workspace, rel));
  } catch {
    return false;
  }
}

export function resolveTamerInstallDir(): string {
  const { projectRoot, lynxProjectDir } = resolveHostPaths();
  return workspaceIncludes(projectRoot, lynxProjectDir) ? projectRoot : lynxProjectDir;
}

async function getPreferredPublishedVersion(fullName: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('npm', ['view', fullName, 'dist-tags', '--json'], {
      maxBuffer: 10 * 1024 * 1024,
    });
    const parsed = JSON.parse(stdout.trim()) as Record<string, unknown>;
    const latest = parsed.latest;
    if (typeof latest === 'string' && semver.valid(latest)) {
      return latest;
    }
  } catch {
    // Fall through to versions query when dist-tags are missing or inaccessible.
  }

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

/** Picks npm's installable default version for @tamer4lynx/* (usually the `latest` dist-tag).
 *  Falls back to the highest published semver when `latest` is missing.
 *  Returns null if the package is not yet published — callers must filter nulls out. */
async function normalizeTamerInstallSpec(pkg: string): Promise<string | null> {
  if (!pkg.startsWith('@tamer4lynx/')) return pkg;
  if (/^@[^/]+\/[^@]+@/.test(pkg)) return pkg;
  const preferred = await getPreferredPublishedVersion(pkg);
  if (preferred) {
    return `${pkg}@${preferred}`;
  }
  console.warn(`⚠️  ${pkg} not found on npm — skipping (will be included once published)`);
  return null;
}

export function detectPackageManager(cwd: string): PackageManager {
  const dir = path.resolve(cwd);
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(dir, 'bun.lockb')) || fs.existsSync(path.join(dir, 'bun.lock'))) return 'bun';
  const pkgPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { packageManager?: string };
      if (pkg.packageManager?.startsWith('pnpm@')) return 'pnpm';
      if (pkg.packageManager?.startsWith('bun@')) return 'bun';
      if (pkg.packageManager?.startsWith('npm@')) return 'npm';
    } catch {
      /* ignore malformed package.json */
    }
  }
  return 'npm';
}

export function runPackageManagerInstall(cwd: string, pm: PackageManager) {
  if (pm === 'npm') {
    execSync('npm install --legacy-peer-deps', { stdio: 'inherit', cwd });
    return;
  }
  execSync(`${pm} install`, { stdio: 'inherit', cwd });
}

function runInstall(cwd: string, packages: string[], pm: PackageManager) {
  if (packages.length === 0) return;
  if (pm === 'npm') {
    // npm 7+ strict peers: @tamer4lynx/* often declare react@^17 while @tamer4lynx/cli (Ink) pulls react@18.
    execSync(`npm install --legacy-peer-deps ${packages.join(' ')}`, { stdio: 'inherit', cwd });
    return;
  }
  const args = ['add', ...packages];
  const cmd = pm === 'pnpm' ? 'pnpm' : 'bun';
  execSync(`${cmd} ${args.join(' ')}`, { stdio: 'inherit', cwd });
}

export async function installTamerStack(
  stack: TamerInstallStack,
  opts: { cwd?: string; pm?: PackageManager } = {},
) {
  const cwd = opts.cwd ?? resolveTamerInstallDir();
  const pm = opts.pm ?? detectPackageManager(cwd);
  const packageNames = stack === 'dev' ? [...DEV_STACK_PACKAGES] : CORE_PACKAGES;
  console.log(`Resolving installable npm versions…`);
  const resolved = (await Promise.all(packageNames.map(normalizeTamerInstallSpec))).filter((s): s is string => s !== null);
  const label = stack === 'dev' ? 'dev stack' : 'core packages';
  console.log(`Adding ${label} to ${cwd} (using ${pm})…`);
  runInstall(cwd, resolved, pm);
}

export async function addCore() {
  await installTamerStack('core');
  console.log('✅ Core packages installed. Run `t4l link` to link native modules.');
}

export async function addDev() {
  await installTamerStack('dev');
  console.log('✅ Dev stack installed. Run `t4l link` to link native modules.');
}

/** Resolves every `@tamer4lynx/*` listed in the project package.json (dependencies / dev / peer / optional) to npm's installable default version — same as `t4l add`. Skips `file:`, `link:`, `portal:`, and `workspace:*` entries. */
export async function updateTamerPackages() {
  const installDir = resolveTamerInstallDir();
  const tamerPkgs = collectTamerPackagesFromPackageJson(installDir);
  if (tamerPkgs.length === 0) {
    console.log(
      'No @tamer4lynx packages to update (none found in package.json, or only file:/workspace: links). Add packages with `t4l add` first.',
    );
    return;
  }
  const pm = detectPackageManager(installDir);
  console.log(`Resolving installable npm versions…`);
  const resolved = (await Promise.all(tamerPkgs.map(normalizeTamerInstallSpec))).filter((s): s is string => s !== null);
  console.log(`Updating ${resolved.length} @tamer4lynx packages in ${installDir} (using ${pm})…`);
  runInstall(installDir, resolved, pm);
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
  const installDir = resolveTamerInstallDir();
  const pm = detectPackageManager(installDir);
  console.log(`Resolving installable npm versions…`);
  const normalized = (await Promise.all(
    list.map(async (p) => {
      const spec = p.startsWith('@') ? p : PACKAGE_ALIASES[p] ?? `@tamer4lynx/${p}`;
      return normalizeTamerInstallSpec(spec);
    })
  )).filter((s): s is string => s !== null);
  console.log(`Adding ${normalized.join(', ')} to ${installDir} (using ${pm})…`);
  runInstall(installDir, normalized, pm);
  console.log('✅ Packages installed. Run `t4l link` to link native modules.');
}
