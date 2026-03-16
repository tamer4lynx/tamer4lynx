import fs from 'fs';
import path from 'path';

export interface HostConfigPaths {
  androidDir?: string;
  iosDir?: string;
  lynxProject?: string;
  lynxBundleRoot?: string;
  lynxBundleFile?: string;
}

export type DevMode = 'standalone' | 'embedded' | 'off';

export interface HostConfigIcon {
  source?: string;
  android?: string;
  ios?: string;
}

export interface DeepLinkConfig {
  scheme: string;
  host?: string;
  pathPrefix?: string;
  activity?: string;
}

export interface IosUrlSchemeConfig {
  scheme: string;
  role?: string;
}

export interface HostConfig {
  android?: {
    appName?: string;
    packageName?: string;
    sdk?: string;
    deepLinks?: DeepLinkConfig[];
  };
  ios?: {
    appName?: string;
    bundleId?: string;
    urlSchemes?: IosUrlSchemeConfig[];
  };
  icon?: string | HostConfigIcon;
  paths?: HostConfigPaths;
  lynxProject?: string;
  dev?: {
    mode?: DevMode;
  };
  devServer?: {
    host?: string;
    port?: number;
    httpPort?: number;
  };
}

export interface ResolvedPaths {
  projectRoot: string;
  androidDir: string;
  iosDir: string;
  androidAppDir: string;
  androidAssetsDir: string;
  androidKotlinDir: string;
  lynxProjectDir: string;
  lynxBundlePath: string;
  lynxBundleFile: string;
  devMode: DevMode;
  devClientBundlePath?: string;
}

const TAMER_CONFIG = 'tamer.config.json';
const LYNX_CONFIG_FILES = ['lynx.config.ts', 'lynx.config.js', 'lynx.config.mjs'];
const DEFAULT_ANDROID_DIR = 'android';
const DEFAULT_IOS_DIR = 'ios';
const DEFAULT_BUNDLE_FILE = 'main.lynx.bundle';
const DEFAULT_BUNDLE_ROOT = 'dist';

function findProjectRoot(start: string): string {
  let dir = path.resolve(start);
  const root = path.parse(dir).root;
  while (dir !== root) {
    const p = path.join(dir, TAMER_CONFIG);
    if (fs.existsSync(p)) return dir;
    dir = path.dirname(dir);
  }
  return start;
}

function loadTamerConfig(cwd: string): HostConfig | null {
  const p = path.join(cwd, TAMER_CONFIG);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function extractDistPathRoot(configPath: string): string | null {
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const rootMatch = content.match(/distPath\s*:\s*\{\s*root\s*:\s*['"]([^'"]+)['"]/);
    if (rootMatch?.[1]) return rootMatch[1];
    const rootMatch2 = content.match(/root\s*:\s*['"]([^'"]+)['"]/);
    if (rootMatch2?.[1]) return rootMatch2[1];
  } catch {
    /* ignore */
  }
  return null;
}

function findLynxConfigInDir(dir: string): string | null {
  for (const name of LYNX_CONFIG_FILES) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function hasRspeedy(pkgDir: string): boolean {
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return Object.keys(deps).some(k => k === '@lynx-js/rspeedy');
  } catch {
    return false;
  }
}

function discoverLynxProject(cwd: string, explicitPath?: string): { dir: string; bundleRoot: string } | null {
  if (explicitPath) {
    const resolved = path.isAbsolute(explicitPath) ? explicitPath : path.join(cwd, explicitPath);
    if (fs.existsSync(resolved)) {
      const lynxConfig = findLynxConfigInDir(resolved);
      const bundleRoot = lynxConfig ? (extractDistPathRoot(lynxConfig) ?? DEFAULT_BUNDLE_ROOT) : DEFAULT_BUNDLE_ROOT;
      return { dir: resolved, bundleRoot };
    }
  }

  const rootPkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(rootPkgPath)) {
    try {
      const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
      const lynxConfig = findLynxConfigInDir(cwd);
      if (lynxConfig || (rootPkg.dependencies?.['@lynx-js/rspeedy'] || rootPkg.devDependencies?.['@lynx-js/rspeedy'])) {
        const bundleRoot = lynxConfig ? (extractDistPathRoot(lynxConfig) ?? DEFAULT_BUNDLE_ROOT) : DEFAULT_BUNDLE_ROOT;
        return { dir: cwd, bundleRoot };
      }
      const workspaces = rootPkg.workspaces;
      if (Array.isArray(workspaces)) {
        for (const ws of workspaces) {
          const isGlob = typeof ws === 'string' && ws.includes('*');
          const dirsToCheck: string[] = isGlob
            ? (() => {
                const parentDir = path.join(cwd, ws.replace(/\/\*$/, ''));
                if (!fs.existsSync(parentDir)) return [];
                return fs.readdirSync(parentDir, { withFileTypes: true })
                  .filter(e => e.isDirectory())
                  .map(e => path.join(parentDir, e.name));
              })()
            : [path.join(cwd, ws)];
          for (const pkgDir of dirsToCheck) {
            if (!fs.existsSync(pkgDir)) continue;
            const lynxConfig = findLynxConfigInDir(pkgDir);
            if (lynxConfig || hasRspeedy(pkgDir)) {
              const bundleRoot = lynxConfig ? (extractDistPathRoot(lynxConfig) ?? DEFAULT_BUNDLE_ROOT) : DEFAULT_BUNDLE_ROOT;
              return { dir: pkgDir, bundleRoot };
            }
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  const lynxConfig = findLynxConfigInDir(cwd);
  if (lynxConfig) {
    const bundleRoot = extractDistPathRoot(lynxConfig) ?? DEFAULT_BUNDLE_ROOT;
    return { dir: cwd, bundleRoot };
  }

  return null;
}

function findDevAppPackage(projectRoot: string): string | null {
  const candidates = [
    path.join(projectRoot, 'node_modules', 'tamer-dev-app'),
    path.join(projectRoot, 'packages', 'tamer-dev-app'),
  ];
  for (const pkg of candidates) {
    if (fs.existsSync(pkg) && fs.existsSync(path.join(pkg, 'package.json'))) {
      return pkg;
    }
  }
  return null;
}

export function findDevClientPackage(projectRoot: string): string | null {
  const candidates = [
    path.join(projectRoot, 'node_modules', 'tamer-dev-client'),
    path.join(projectRoot, 'packages', 'tamer-dev-client'),
    path.join(path.dirname(projectRoot), 'tamer-dev-client'),
  ];
  for (const pkg of candidates) {
    if (fs.existsSync(pkg) && fs.existsSync(path.join(pkg, 'package.json'))) {
      return pkg;
    }
  }
  return null;
}

export function findTamerHostPackage(projectRoot: string): string | null {
  const candidates = [
    path.join(projectRoot, 'node_modules', 'tamer-host'),
    path.join(projectRoot, 'packages', 'tamer-host'),
  ];
  for (const pkg of candidates) {
    if (fs.existsSync(pkg) && fs.existsSync(path.join(pkg, 'package.json'))) {
      return pkg;
    }
  }
  return null;
}

export function resolveHostPaths(cwd: string = process.cwd()): ResolvedPaths & { config: HostConfig } {
  const projectRoot = findProjectRoot(cwd);
  const config = loadTamerConfig(projectRoot) ?? {};
  const paths = config.paths ?? {};
  const androidDirRel = paths.androidDir ?? DEFAULT_ANDROID_DIR;
  const iosDirRel = paths.iosDir ?? DEFAULT_IOS_DIR;
  const packageName = config.android?.packageName ?? 'com.example.app';

  const explicitLynx = config.lynxProject ?? paths.lynxProject;
  const discovered = discoverLynxProject(projectRoot, explicitLynx);
  const lynxProjectDir = discovered?.dir ?? cwd;
  const bundleRoot = paths.lynxBundleRoot ?? discovered?.bundleRoot ?? DEFAULT_BUNDLE_ROOT;
  const bundleFile = paths.lynxBundleFile ?? DEFAULT_BUNDLE_FILE;
  const lynxBundlePath = path.join(lynxProjectDir, bundleRoot, bundleFile);

  const androidDir = path.join(projectRoot, androidDirRel);
  const devMode = resolveDevMode(config);
  const devAppDir = devMode === 'embedded' ? findDevAppPackage(projectRoot) : null;
  const devClientPkg = findDevClientPackage(projectRoot);
  const devClientBundleInClient = devClientPkg
    ? path.join(devClientPkg, DEFAULT_BUNDLE_ROOT, 'dev-client.lynx.bundle')
    : null;
  const devClientBundleInApp = devAppDir
    ? path.join(devAppDir, DEFAULT_BUNDLE_ROOT, 'dev-client.lynx.bundle')
    : null;
  const devClientBundlePath =
    devMode === 'embedded'
      ? (devClientBundleInClient && fs.existsSync(devClientBundleInClient)
          ? devClientBundleInClient
          : devClientBundleInApp ?? undefined)
      : undefined;

  return {
    projectRoot,
    androidDir,
    iosDir: path.join(projectRoot, iosDirRel),
    androidAppDir: path.join(projectRoot, androidDirRel, 'app'),
    androidAssetsDir: path.join(projectRoot, androidDirRel, 'app', 'src', 'main', 'assets'),
    androidKotlinDir: path.join(projectRoot, androidDirRel, 'app', 'src', 'main', 'kotlin', packageName.replace(/\./g, '/')),
    lynxProjectDir,
    lynxBundlePath,
    lynxBundleFile: bundleFile,
    devMode,
    devClientBundlePath,
    config,
  };
}

export function resolveDevMode(config: HostConfig): DevMode {
  const explicit = config.dev?.mode;
  if (explicit) return explicit;
  if (config.devServer) return 'embedded';
  return 'off';
}

export function loadHostConfig(cwd: string = process.cwd()): HostConfig {
  const cfg = loadTamerConfig(cwd);
  if (!cfg) throw new Error('tamer.config.json not found in the project root.');
  return cfg;
}

export function resolveIconPaths(
  projectRoot: string,
  config: HostConfig
): { source?: string; android?: string; ios?: string } | null {
  const raw = config.icon;
  if (!raw) return null;
  const join = (p: string) => (path.isAbsolute(p) ? p : path.join(projectRoot, p));
  if (typeof raw === 'string') {
    const p = join(raw);
    return fs.existsSync(p) ? { source: p } : null;
  }
  const out: { source?: string; android?: string; ios?: string } = {};
  if (raw.source) {
    const p = join(raw.source);
    if (fs.existsSync(p)) out.source = p;
  }
  if (raw.android) {
    const p = join(raw.android);
    if (fs.existsSync(p)) out.android = p;
  }
  if (raw.ios) {
    const p = join(raw.ios);
    if (fs.existsSync(p)) out.ios = p;
  }
  return Object.keys(out).length ? out : null;
}

export function resolveDevAppPaths(repoRoot: string): ResolvedPaths & { config: HostConfig } {
  const devAppDir = path.join(repoRoot, 'packages', 'tamer-dev-app');
  const configPath = path.join(devAppDir, 'tamer.config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('packages/tamer-dev-app/tamer.config.json not found.');
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const packageName = config.android?.packageName ?? 'com.nanofuxion.tamerdevapp';
  const androidDirRel = config.paths?.androidDir ?? 'android';
  const androidDir = path.join(devAppDir, androidDirRel);
  const devClientDir = findDevClientPackage(repoRoot) ?? path.join(repoRoot, 'packages', 'tamer-dev-client');
  const lynxBundlePath = path.join(devClientDir, DEFAULT_BUNDLE_ROOT, 'dev-client.lynx.bundle');
  return {
    projectRoot: devAppDir,
    androidDir,
    iosDir: path.join(devAppDir, 'ios'),
    androidAppDir: path.join(androidDir, 'app'),
    androidAssetsDir: path.join(androidDir, 'app', 'src', 'main', 'assets'),
    androidKotlinDir: path.join(androidDir, 'app', 'src', 'main', 'kotlin', packageName.replace(/\./g, '/')),
    lynxProjectDir: devClientDir,
    lynxBundlePath,
    lynxBundleFile: 'dev-client.lynx.bundle',
    devMode: 'embedded',
    devClientBundlePath: undefined,
    config,
  };
}
