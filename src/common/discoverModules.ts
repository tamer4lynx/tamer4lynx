import fs from 'fs';
import path from 'path';
import { hasExtensionConfig, loadExtensionConfig, type NormalizedExtensionConfig } from './config';

export interface DiscoveredModule {
    name: string;
    config: NormalizedExtensionConfig;
    packagePath: string;
}

function resolveNodeModulesPath(projectRoot: string): string {
    let nodeModulesPath = path.join(projectRoot, 'node_modules');
    const workspaceRoot = path.join(projectRoot, '..', '..');
    const rootNodeModules = path.join(workspaceRoot, 'node_modules');
    if (
        fs.existsSync(path.join(workspaceRoot, 'package.json')) &&
        fs.existsSync(rootNodeModules) &&
        path.basename(path.dirname(projectRoot)) === 'packages'
    ) {
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

function resolvePackageRoot(projectRoot: string, packageName: string): string | null {
    const nodeModulesPath = resolveNodeModulesPath(projectRoot);
    const hasPkg = (dir: string) => fs.existsSync(path.join(dir, 'package.json'));
    if (packageName.startsWith('@')) {
        const parts = packageName.split('/');
        if (parts.length !== 2 || !parts[0].startsWith('@')) return null;
        const direct = path.join(nodeModulesPath, parts[0], parts[1]);
        if (hasPkg(direct)) return direct;
        const underDevClient = path.join(
            nodeModulesPath,
            '@tamer4lynx',
            'tamer-dev-client',
            'node_modules',
            parts[0],
            parts[1]
        );
        if (hasPkg(underDevClient)) return underDevClient;
        return null;
    }
    const direct = path.join(nodeModulesPath, packageName);
    return hasPkg(direct) ? direct : null;
}

/**
 * For `@tamer4lynx/tamer-dev-app` only: limit autolink to the npm dependency tree of that package
 * (avoids linking every hoisted workspace package under root node_modules).
 */
function collectTransitiveTamer4LynxPackageNames(projectRoot: string): Set<string> | null {
    const hostPjPath = path.join(projectRoot, 'package.json');
    if (!fs.existsSync(hostPjPath)) return null;
    const hostPj = JSON.parse(fs.readFileSync(hostPjPath, 'utf8')) as {
        name?: string;
        dependencies?: Record<string, string>;
        optionalDependencies?: Record<string, string>;
    };
    if (hostPj.name !== '@tamer4lynx/tamer-dev-app') return null;

    const visited = new Set<string>();
    const queue: string[] = [];
    const enqueue = (deps: Record<string, string> | undefined) => {
        if (!deps) return;
        for (const name of Object.keys(deps)) {
            if (name.startsWith('@tamer4lynx/')) queue.push(name);
        }
    };
    enqueue(hostPj.dependencies);
    enqueue(hostPj.optionalDependencies);

    while (queue.length) {
        const name = queue.shift()!;
        if (visited.has(name)) continue;
        visited.add(name);
        const pkgRoot = resolvePackageRoot(projectRoot, name);
        if (!pkgRoot || !fs.existsSync(path.join(pkgRoot, 'package.json'))) continue;
        const sub = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8')) as {
            dependencies?: Record<string, string>;
            optionalDependencies?: Record<string, string>;
        };
        const merged = { ...sub.dependencies, ...sub.optionalDependencies };
        for (const dep of Object.keys(merged)) {
            if (dep.startsWith('@tamer4lynx/') && !visited.has(dep)) queue.push(dep);
        }
    }

    return visited;
}

export function discoverModules(projectRoot: string): DiscoveredModule[] {
    const nodeModulesPath = resolveNodeModulesPath(projectRoot);
    const packages: DiscoveredModule[] = [];

    if (!fs.existsSync(nodeModulesPath)) {
        return [];
    }

    const packageDirs = fs.readdirSync(nodeModulesPath);

    for (const dirName of packageDirs) {
        const fullPath = path.join(nodeModulesPath, dirName);
        const checkPackage = (name: string, packagePath: string) => {
            if (!hasExtensionConfig(packagePath)) return;
            const config = loadExtensionConfig(packagePath);
            if (!config || (!config.android && !config.ios)) return;
            packages.push({ name, config, packagePath });
        };

        if (dirName.startsWith('@')) {
            try {
                const scopedDirs = fs.readdirSync(fullPath);
                for (const scopedDirName of scopedDirs) {
                    const scopedPackagePath = path.join(fullPath, scopedDirName);
                    checkPackage(`${dirName}/${scopedDirName}`, scopedPackagePath);
                }
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                console.warn(`⚠️ Could not read scoped package directory ${fullPath}: ${msg}`);
            }
        } else {
            checkPackage(dirName, fullPath);
        }
    }

    const allowed = collectTransitiveTamer4LynxPackageNames(projectRoot);
    if (allowed) {
        return packages.filter((p) => allowed.has(p.name));
    }
    return packages;
}
