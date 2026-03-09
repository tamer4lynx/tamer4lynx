import fs from 'fs';
import path from 'path';

export interface ExtensionPlatformConfig {
  packageName?: string;
  moduleClassName?: string;
  sourceDir?: string;
  podspecPath?: string;
  elements?: Record<string, string>;
  permissions?: string[];
}

export interface ExtensionConfig {
  platforms?: {
    android?: ExtensionPlatformConfig;
    ios?: ExtensionPlatformConfig;
    web?: Record<string, unknown>;
  };
  android?: {
    moduleClassName?: string;
    sourceDir?: string;
    packageName?: string;
  };
  ios?: {
    moduleClassName?: string;
    podspecPath?: string;
  };
}

export interface NormalizedExtensionConfig {
  android?: {
    moduleClassName?: string;
    sourceDir: string;
    elements?: Record<string, string>;
    permissions?: string[];
  };
  ios?: {
    moduleClassName: string;
    podspecPath: string;
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
    const elements = a?.elements ?? (raw.android as any)?.elements;
    const permissions = a?.permissions ?? (raw.android as any)?.permissions;
    if (moduleClassName || elements || permissions) {
      normalized.android = {
        ...(moduleClassName && { moduleClassName }),
        sourceDir: a?.sourceDir ?? (raw.android as any)?.sourceDir ?? 'android',
        ...(elements && Object.keys(elements).length > 0 && { elements }),
        ...(permissions && Array.isArray(permissions) && permissions.length > 0 && { permissions }),
      };
    }
  }

  if (raw.platforms?.ios || raw.ios) {
    const i = raw.platforms?.ios ?? raw.ios;
    const moduleClassName = i?.moduleClassName ?? (raw.ios as any)?.moduleClassName;
    if (moduleClassName) {
      normalized.ios = {
        moduleClassName,
        podspecPath: i?.podspecPath ?? (raw.ios as any)?.podspecPath ?? '.',
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
}

export function discoverNativeExtensions(projectRoot: string): NativeModuleInfo[] {
  const nodeModulesPath = getNodeModulesPath(projectRoot);
  const result: NativeModuleInfo[] = [];
  if (!fs.existsSync(nodeModulesPath)) return result;

  const packageDirs = fs.readdirSync(nodeModulesPath);
  const check = (name: string, packagePath: string) => {
    if (!hasExtensionConfig(packagePath)) return;
    const config = loadExtensionConfig(packagePath);
    const className = config?.android?.moduleClassName;
    if (className) result.push({ packageName: name, moduleClassName: className });
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
