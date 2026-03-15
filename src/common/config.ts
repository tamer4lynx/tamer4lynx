import fs from 'fs';
import path from 'path';

export interface ActivityPatchConfig {
  onCreate?: string;
  onNewIntent?: string;
  onResume?: string;
  onPause?: string;
  onDestroy?: string;
  onViewAttached?: string;
  onViewDetached?: string;
  onBackPressed?: string;
  onWindowFocusChanged?: string;
  onCreateDelayed?: string;
}

export interface ExtensionPlatformConfig {
  packageName?: string;
  moduleClassName?: string;
  moduleClassNames?: string[];
  sourceDir?: string;
  podspecPath?: string;
  elements?: Record<string, string>;
  permissions?: string[];
  iosPermissions?: Record<string, string>;
  attachHostView?: boolean;
  activityPatches?: ActivityPatchConfig;
}

export interface ExtensionConfig {
  platforms?: {
    android?: ExtensionPlatformConfig;
    ios?: ExtensionPlatformConfig;
    web?: Record<string, unknown>;
  };
  android?: {
    moduleClassName?: string;
    moduleClassNames?: string[];
    sourceDir?: string;
    packageName?: string;
  };
  ios?: {
    moduleClassName?: string;
    moduleClassNames?: string[];
    podspecPath?: string;
  };
}

export interface NormalizedExtensionConfig {
  android?: {
    moduleClassName?: string;
    moduleClassNames?: string[];
    sourceDir: string;
    elements?: Record<string, string>;
    permissions?: string[];
    attachHostView?: boolean;
    activityPatches?: ActivityPatchConfig;
  };
  ios?: {
    moduleClassName?: string;
    moduleClassNames?: string[];
    podspecPath: string;
    elements?: Record<string, string>;
    iosPermissions?: Record<string, string>;
    attachHostView?: boolean;
  };
}

const LYNX_EXT_JSON = 'lynx.ext.json';
const TAMER_JSON = 'tamer.json';

function loadLynxExtJson(packagePath: string): ExtensionConfig | null {
  const p = path.join(packagePath, LYNX_EXT_JSON);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function loadTamerJson(packagePath: string): ExtensionConfig | null {
  const p = path.join(packagePath, TAMER_JSON);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function loadExtensionConfig(packagePath: string): NormalizedExtensionConfig | null {
  const lynxExt = loadLynxExtJson(packagePath);
  const tamer = loadTamerJson(packagePath);

  const raw = lynxExt ?? tamer;
  if (!raw) return null;

  const normalized: NormalizedExtensionConfig = {};

  if (raw.platforms?.android || raw.android) {
    const a = raw.platforms?.android ?? raw.android;
    const moduleClassName = a?.moduleClassName ?? (raw.android as any)?.moduleClassName;
    const moduleClassNames = a?.moduleClassNames ?? (raw.android as any)?.moduleClassNames;
    const elements = a?.elements ?? (raw.android as any)?.elements;
    const permissions = a?.permissions ?? (raw.android as any)?.permissions;
    const attachHostView = (a as any)?.attachHostView ?? (raw.android as any)?.attachHostView;
    const activityPatches = (a as any)?.activityPatches ?? (raw.android as any)?.activityPatches;
    const classes = Array.isArray(moduleClassNames) && moduleClassNames.length > 0
      ? moduleClassNames
      : moduleClassName ? [moduleClassName] : [];
    if (classes.length > 0 || elements || permissions || attachHostView || activityPatches) {
      normalized.android = {
        ...(classes.length === 1 ? { moduleClassName: classes[0] } : classes.length > 1 ? { moduleClassNames: classes } : {}),
        sourceDir: a?.sourceDir ?? (raw.android as any)?.sourceDir ?? 'android',
        ...(elements && Object.keys(elements).length > 0 && { elements }),
        ...(permissions && Array.isArray(permissions) && permissions.length > 0 && { permissions }),
        ...(attachHostView && { attachHostView: true }),
        ...(activityPatches && { activityPatches }),
      };
    }
  }

  if (raw.platforms?.ios || raw.ios) {
    const i = raw.platforms?.ios ?? raw.ios;
    const moduleClassName = i?.moduleClassName ?? (raw.ios as any)?.moduleClassName;
    const moduleClassNames = i?.moduleClassNames ?? (raw.ios as any)?.moduleClassNames;
    const elements = i?.elements ?? (raw.ios as any)?.elements;
    const attachHostView = (i as any)?.attachHostView ?? (raw.ios as any)?.attachHostView;
    const classes = Array.isArray(moduleClassNames) && moduleClassNames.length > 0
      ? moduleClassNames
      : moduleClassName ? [moduleClassName] : [];
    const iosPermissions = (i as any)?.iosPermissions ?? (raw.ios as any)?.iosPermissions;
    if (classes.length > 0 || elements || attachHostView || (iosPermissions && Object.keys(iosPermissions).length > 0)) {
      normalized.ios = {
        ...(classes.length === 1 ? { moduleClassName: classes[0] } : classes.length > 1 ? { moduleClassNames: classes } : {}),
        podspecPath: i?.podspecPath ?? (raw.ios as any)?.podspecPath ?? '.',
        ...(elements && Object.keys(elements).length > 0 && { elements }),
        ...(iosPermissions && Object.keys(iosPermissions).length > 0 && { iosPermissions }),
        ...(attachHostView && { attachHostView: true }),
      };
    }
  }

  if (Object.keys(normalized).length === 0) return null;
  return normalized;
}

export function hasExtensionConfig(packagePath: string): boolean {
  return fs.existsSync(path.join(packagePath, LYNX_EXT_JSON)) ||
    fs.existsSync(path.join(packagePath, TAMER_JSON));
}

export function getAndroidModuleClassNames(config: NormalizedExtensionConfig['android']): string[] {
  if (!config) return [];
  if (config.moduleClassNames?.length) return config.moduleClassNames;
  if (config.moduleClassName) return [config.moduleClassName];
  return [];
}

export function getIosModuleClassNames(config: NormalizedExtensionConfig['ios']): string[] {
  if (!config) return [];
  if (config.moduleClassNames?.length) return config.moduleClassNames;
  if (config.moduleClassName) return [config.moduleClassName];
  return [];
}

export function getIosElements(config: NormalizedExtensionConfig['ios']): Record<string, string> {
  return config?.elements ?? {};
}

export function getNodeModulesPath(projectRoot: string): string {
  let nodeModulesPath = path.join(projectRoot, 'node_modules');
  const workspaceRoot = path.join(projectRoot, '..', '..');
  const rootNodeModules = path.join(workspaceRoot, 'node_modules');
  if (fs.existsSync(path.join(workspaceRoot, 'package.json')) && fs.existsSync(rootNodeModules) && path.basename(path.dirname(projectRoot)) === 'packages') {
    nodeModulesPath = rootNodeModules;
  } else if (!fs.existsSync(nodeModulesPath)) {
    const altRoot = path.join(projectRoot, '..', '..');
    const altNodeModules = path.join(altRoot, 'node_modules');
    if (fs.existsSync(path.join(altRoot, 'package.json')) && fs.existsSync(altNodeModules)) {
      nodeModulesPath = altNodeModules;
    }
  }
  return nodeModulesPath;
}

export interface NativeModuleInfo {
  packageName: string;
  moduleClassName: string;
  attachHostView?: boolean;
}

export function discoverNativeExtensions(projectRoot: string): NativeModuleInfo[] {
  const nodeModulesPath = getNodeModulesPath(projectRoot);
  const result: NativeModuleInfo[] = [];
  if (!fs.existsSync(nodeModulesPath)) return result;

  const packageDirs = fs.readdirSync(nodeModulesPath);
  const check = (name: string, packagePath: string) => {
    if (!hasExtensionConfig(packagePath)) return;
    const config = loadExtensionConfig(packagePath);
    const classes = getAndroidModuleClassNames(config?.android);
    for (const className of classes) {
      result.push({ packageName: name, moduleClassName: className, attachHostView: config?.android?.attachHostView });
    }
  };

  for (const dirName of packageDirs) {
    const fullPath = path.join(nodeModulesPath, dirName);
    if (dirName.startsWith('@')) {
      try {
        for (const scopedDirName of fs.readdirSync(fullPath)) {
          check(`${dirName}/${scopedDirName}`, path.join(fullPath, scopedDirName));
        }
      } catch {
        /* ignore */
      }
    } else {
      check(dirName, fullPath);
    }
  }
  return result;
}
