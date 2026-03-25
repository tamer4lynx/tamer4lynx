import fs from 'fs';
import path from 'path';

export interface HostConfigPaths {
  androidDir?: string;
  iosDir?: string;
  lynxProject?: string;
  lynxBundleRoot?: string;
  lynxBundleFile?: string;
  /**
   * More `.lynx.bundle` outputs under the same `lynxBundleRoot` as `lynxBundleFile`.
   * Used by `t4l start` (meta.json), `t4l bundle`, and embeddable so all listed files are expected and documented.
   */
  lynxAdditionalBundles?: string[];
}

export type DevMode = 'standalone' | 'embedded' | 'off';

export interface AdaptiveForegroundPadding {
  left?: number | string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
}

export interface HostConfigIconAdaptive {
  /** Project-relative path to foreground layer (png/webp). */
  foreground: string;
  /** Project-relative path to background layer (png/webp). Omit if using `backgroundColor`. */
  background?: string;
  /** Solid adaptive-icon background. Hex: `#RGB`, `#RRGGBB`, or `#AARRGGBB`. e.g. `"#000000"`. */
  backgroundColor?: string;
  /** Uniform shrink 0–1. e.g. `0.62` keeps the logo inside the safe zone. Implemented as `<layer-list>` insets. */
  foregroundScale?: number;
  /**
   * Extra padding per edge. Number = % per side (e.g. `6` → 6%). String = `"8dp"` or `"10%"`.
   * Object: `{ left, top, right, bottom }`. Combined with `foregroundScale` into `<layer-list>` insets.
   */
  foregroundPadding?: number | string | AdaptiveForegroundPadding;
}

export interface HostConfigIcon {
  source?: string;
  android?: string;
  ios?: string;
  /** Android 8+ adaptive icon layers; generates mipmap-anydpi-v26 when set. */
  androidAdaptive?: HostConfigIconAdaptive;
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

const DEFAULT_ABI_FILTERS = ['armeabi-v7a', 'arm64-v8a'];
const DEFAULT_IOS_ARCHITECTURES = ['arm64'];

export interface AndroidSigningConfig {
  keystoreFile?: string;
  keyAlias?: string;
  storePasswordEnv?: string;
  keyPasswordEnv?: string;
}

export interface IosSigningConfig {
  developmentTeam?: string;
  codeSignIdentity?: string;
  provisioningProfileSpecifier?: string;
  provisioningProfileUuid?: string;
}

/** Env var *names* for App Store Connect API (values in process.env / .env). Defaults: APP_STORE_CONNECT_* */
export interface IosAppStoreConnectConfig {
  /** Path to AuthKey_xxx.p8 — default env: APP_STORE_CONNECT_API_KEY_PATH */
  apiKeyPathEnv?: string;
  /** API Key ID — default env: APP_STORE_CONNECT_API_KEY_ID */
  apiKeyIdEnv?: string;
  /** Issuer ID — default env: APP_STORE_CONNECT_ISSUER_ID */
  issuerIdEnv?: string;
}

export interface HostConfig {
  android?: {
    appName?: string;
    packageName?: string;
    sdk?: string;
    deepLinks?: DeepLinkConfig[];
    abiFilters?: string[];
    signing?: AndroidSigningConfig;
  };
  ios?: {
    appName?: string;
    bundleId?: string;
    urlSchemes?: IosUrlSchemeConfig[];
    architectures?: string[];
    signing?: IosSigningConfig;
    /** Optional: env var names for `t4l build ios -p --ipa` App Store archive/export via xcodebuild + .p8 key */
    appStoreConnect?: IosAppStoreConnectConfig;
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
  /**
   * When true (default), `t4l init` / `t4l link` generate `.tamer/tamer-components.d.ts`
   * and ensure `tsconfig` includes it. Set to false to skip.
   */
  syncTamerComponentTypes?: boolean;
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
  /** All bundle filenames under `lynxBundleRoot` (primary `lynxBundleFile` first). */
  lynxBundleFiles: string[];
  /** Same as `paths.lynxBundleRoot` / discovered `dist` root under `lynxProjectDir`. */
  lynxBundleRootRel: string;
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

export function findRepoRoot(start: string): string {
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

export function findDevAppPackage(projectRoot: string): string | null {
  const candidates = [
    path.join(projectRoot, 'node_modules', '@tamer4lynx', 'tamer-dev-app'),
    path.join(projectRoot, 'node_modules', 'tamer-dev-app'),
    path.join(projectRoot, 'packages', 'tamer-dev-app'),
    path.join(path.dirname(projectRoot), 'tamer-dev-app'),
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
    path.join(projectRoot, 'node_modules', '@tamer4lynx', 'tamer-dev-client'),
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
  const extra = Array.isArray(paths.lynxAdditionalBundles) ? paths.lynxAdditionalBundles : [];
  const lynxBundleFiles: string[] = [];
  const seen = new Set<string>();
  for (const f of [bundleFile, ...extra]) {
    const name = typeof f === 'string' ? f.trim() : '';
    if (!name || seen.has(name)) continue;
    seen.add(name);
    lynxBundleFiles.push(name);
  }
  if (lynxBundleFiles.length === 0) lynxBundleFiles.push(bundleFile);
  const lynxBundlePath = path.join(lynxProjectDir, bundleRoot, bundleFile);

  const androidDir = path.join(projectRoot, androidDirRel);
  const devMode = resolveDevMode(config);
  const devClientPkg = findDevClientPackage(projectRoot);
  const devClientBundlePath = devClientPkg
    ? path.join(devClientPkg, DEFAULT_BUNDLE_ROOT, 'dev-client.lynx.bundle')
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
    lynxBundleFiles,
    lynxBundleRootRel: bundleRoot,
    devMode,
    devClientBundlePath,
    config,
  };
}

export function resolveAbiFilters(config: HostConfig): string[] {
  return config.android?.abiFilters ?? DEFAULT_ABI_FILTERS;
}

export function resolveIosArchitectures(config: HostConfig): string[] {
  return config.ios?.architectures ?? DEFAULT_IOS_ARCHITECTURES;
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

export type ResolvedAdaptiveForegroundLayout = {
  scale?: number;
  padding?: { left: string; top: string; right: string; bottom: string };
};

export type ResolvedIconPaths = {
  source?: string;
  android?: string;
  ios?: string;
  androidAdaptiveForeground?: string;
  androidAdaptiveBackground?: string;
  /** Normalized `#AARRGGBB` for generated `ic_launcher_background` shape drawable. */
  androidAdaptiveBackgroundColor?: string;
  androidAdaptiveForegroundLayout?: ResolvedAdaptiveForegroundLayout;
};

function formatAdaptiveInsetValue(v: number | string | undefined, fallback: string): string {
  if (v === undefined) return fallback;
  if (typeof v === 'number') {
    if (!Number.isFinite(v) || v < 0 || v > 50) return fallback;
    return `${v}%`;
  }
  const s = String(v).trim();
  if (s.endsWith('%') || s.endsWith('dp')) return s;
  if (/^\d+(\.\d+)?$/.test(s)) return `${s}%`;
  return fallback;
}

export function resolveAdaptiveForegroundLayoutFromConfig(
  ad: HostConfigIconAdaptive
): ResolvedAdaptiveForegroundLayout | undefined {
  const hasLayoutOpt = ad.foregroundScale != null || ad.foregroundPadding != null;
  if (!hasLayoutOpt) return undefined;
  let scale = ad.foregroundScale;
  if (scale != null && typeof scale === 'number') {
    if (!Number.isFinite(scale)) scale = undefined;
    else scale = Math.min(1, Math.max(0.05, scale));
  }
  let padding: ResolvedAdaptiveForegroundLayout['padding'] | undefined;
  if (ad.foregroundPadding != null) {
    const pad = ad.foregroundPadding;
    if (typeof pad === 'number' || typeof pad === 'string') {
      const u = formatAdaptiveInsetValue(pad, '0%');
      padding = { left: u, top: u, right: u, bottom: u };
    } else {
      const d = '0%';
      padding = {
        left: formatAdaptiveInsetValue(pad.left, d),
        top: formatAdaptiveInsetValue(pad.top, d),
        right: formatAdaptiveInsetValue(pad.right, d),
        bottom: formatAdaptiveInsetValue(pad.bottom, d),
      };
    }
  }
  return { scale, padding };
}

/** Returns `#AARRGGBB` or null if invalid. */
export function normalizeAndroidAdaptiveColor(input: string): string | null {
  const raw = input.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(raw)) return null;
  let h = raw;
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (h.length === 6) {
    h = 'FF' + h;
  }
  return `#${h.toUpperCase()}`;
}

export function resolveIconPaths(projectRoot: string, config: HostConfig): ResolvedIconPaths | null {
  const raw = config.icon;
  if (!raw) return null;
  const join = (p: string) => (path.isAbsolute(p) ? p : path.join(projectRoot, p));
  if (typeof raw === 'string') {
    const p = join(raw);
    return fs.existsSync(p) ? { source: p } : null;
  }
  const out: ResolvedIconPaths = {};
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
  const ad = raw.androidAdaptive;
  if (ad?.foreground) {
    const fg = join(ad.foreground);
    if (fs.existsSync(fg)) {
      let usedAdaptive = false;
      if (ad.background) {
        const bg = join(ad.background);
        if (fs.existsSync(bg)) {
          out.androidAdaptiveForeground = fg;
          out.androidAdaptiveBackground = bg;
          usedAdaptive = true;
        }
      }
      if (!usedAdaptive && ad.backgroundColor) {
        const norm = normalizeAndroidAdaptiveColor(ad.backgroundColor);
        if (norm) {
          out.androidAdaptiveForeground = fg;
          out.androidAdaptiveBackgroundColor = norm;
        }
      }
      if (out.androidAdaptiveForeground) {
        const lay = resolveAdaptiveForegroundLayoutFromConfig(ad);
        if (lay) out.androidAdaptiveForegroundLayout = lay;
      }
    }
  }
  return Object.keys(out).length ? out : null;
}

export function resolveDevAppPaths(searchRoot: string): ResolvedPaths & { config: HostConfig } {
  const devAppDir = findDevAppPackage(searchRoot) ?? findDevAppPackage(findRepoRoot(searchRoot));
  if (!devAppDir) {
    throw new Error('tamer-dev-app not found. Add @tamer4lynx/tamer-dev-app to dependencies, or run from the tamer4lynx monorepo.');
  }
  const configPath = path.join(devAppDir, 'tamer.config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`tamer.config.json not found in ${devAppDir}`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const packageName = config.android?.packageName ?? 'com.nanofuxion.tamerdevapp';
  const androidDirRel = config.paths?.androidDir ?? 'android';
  const androidDir = path.join(devAppDir, androidDirRel);
  const inDevAppScoped = path.join(devAppDir, 'node_modules', '@tamer4lynx', 'tamer-dev-client');
  const inDevAppFlat = path.join(devAppDir, 'node_modules', 'tamer-dev-client');
  const devClientDir =
    findDevClientPackage(searchRoot) ??
    findDevClientPackage(findRepoRoot(searchRoot)) ??
    (fs.existsSync(path.join(inDevAppScoped, 'package.json')) ? inDevAppScoped : null) ??
    (fs.existsSync(path.join(inDevAppFlat, 'package.json')) ? inDevAppFlat : null);
  if (!devClientDir || !fs.existsSync(devClientDir)) {
    throw new Error('tamer-dev-client not found. Add @tamer4lynx/tamer-dev-client (or tamer-dev-app pulls it in).');
  }
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
    lynxBundleFiles: ['dev-client.lynx.bundle'],
    lynxBundleRootRel: DEFAULT_BUNDLE_ROOT,
    devMode: 'embedded',
    devClientBundlePath: undefined,
    config,
  };
}
