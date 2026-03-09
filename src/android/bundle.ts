import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { resolveHostPaths, resolveDevAppPaths } from '../common/hostConfig';
import android_autolink from './autolink';
import android_create from './create';
import android_syncDevClient from './syncDevClient';

export type BundleTarget = 'host' | 'dev-app';

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

async function bundleAndDeploy(opts: { target?: string } = {}) {
    const target = (opts.target ?? 'host') as BundleTarget;
    const origCwd = process.cwd();

    let resolved: ReturnType<typeof resolveHostPaths>;
    try {
        if (target === 'dev-app') {
            const repoRoot = findRepoRoot(origCwd);
            resolved = resolveDevAppPaths(repoRoot);
            const devAppDir = resolved.projectRoot;
            const androidDir = resolved.androidDir;
            if (!fs.existsSync(androidDir)) {
                console.log('📱 Creating Tamer Dev App Android project...');
                await android_create({ target: 'dev-app' });
            }
            process.chdir(devAppDir);
        } else {
            resolved = resolveHostPaths();
        }
    } catch (error: any) {
        console.error(`❌ Error loading configuration: ${error.message}`);
        process.exit(1);
    }

    const { lynxProjectDir, lynxBundlePath, androidAssetsDir, devClientBundlePath, devMode } = resolved;
    const destinationDir = androidAssetsDir;

    android_autolink();
    if (devMode === 'embedded') {
        await android_syncDevClient();
    }

    try {
        console.log('📦 Building Lynx project...');
        execSync('npm run build', { stdio: 'inherit', cwd: lynxProjectDir });
        console.log('✅ Build completed successfully.');
    } catch (error) {
        console.error('❌ Build process failed.');
        process.exit(1);
    }

    if (target === 'dev-app') {
        process.chdir(origCwd);
    }

    if (target !== 'dev-app' && devMode === 'embedded' && devClientBundlePath && !fs.existsSync(devClientBundlePath)) {
        const devClientDir = path.dirname(path.dirname(devClientBundlePath));
        try {
            console.log('📦 Building dev launcher (tamer-dev-client)...');
            execSync('npm run build', { stdio: 'inherit', cwd: devClientDir });
            console.log('✅ Dev launcher build completed.');
        } catch (error) {
            console.error('❌ Dev launcher build failed.');
            process.exit(1);
        }
    }

    try {
        fs.mkdirSync(destinationDir, { recursive: true });
        if (target !== 'dev-app' && devMode === 'embedded' && devClientBundlePath && fs.existsSync(devClientBundlePath)) {
            fs.copyFileSync(devClientBundlePath, path.join(destinationDir, 'dev-client.lynx.bundle'));
            console.log(`✨ Copied dev-client.lynx.bundle to assets`);
        }
        if (!fs.existsSync(lynxBundlePath)) {
            console.error(`❌ Build output not found at: ${lynxBundlePath}`);
            process.exit(1);
        }
        fs.copyFileSync(lynxBundlePath, path.join(destinationDir, resolved.lynxBundleFile));
        console.log(`✨ Copied ${resolved.lynxBundleFile} to assets`);
    } catch (error: any) {
        console.error(`❌ Failed to copy bundle: ${error.message}`);
        process.exit(1);
    }
}
export default bundleAndDeploy

// // --- Main Execution ---
// bundleAndDeploy();
