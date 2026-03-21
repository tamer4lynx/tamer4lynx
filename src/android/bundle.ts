import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { copyDistAssets } from '../common/copyDistAssets';
import { resolveHostPaths, findDevClientPackage, resolveIconPaths } from '../common/hostConfig';
import { applyAndroidLauncherIcons, ensureAndroidManifestLauncherIcon } from '../common/syncAppIcons';
import android_autolink from './autolink';
import android_syncDevClient from './syncDevClient';

async function bundleAndDeploy(opts: { release?: boolean; production?: boolean } = {}) {
    const release = opts.release === true || opts.production === true;
    let resolved: ReturnType<typeof resolveHostPaths>;
    try {
        resolved = resolveHostPaths();
    } catch (error: any) {
        console.error(`❌ Error loading configuration: ${error.message}`);
        process.exit(1);
    }

    const { projectRoot, lynxProjectDir, lynxBundlePath, androidAssetsDir, devClientBundlePath } = resolved;
    const devClientPkg = findDevClientPackage(projectRoot);
    const includeDevClient = !release && !!devClientPkg;
    const destinationDir = androidAssetsDir;

    android_autolink({ includeDevClient });
    await android_syncDevClient({ includeDevClient });

    const iconPaths = resolveIconPaths(projectRoot, resolved.config);
    if (iconPaths) {
        const resDir = path.join(resolved.androidAppDir, 'src', 'main', 'res');
        if (applyAndroidLauncherIcons(resDir, iconPaths)) {
            console.log('✅ Synced Android launcher icon(s) from tamer.config.json');
            ensureAndroidManifestLauncherIcon(path.join(resolved.androidAppDir, 'src', 'main', 'AndroidManifest.xml'));
        }
    }

    try {
        console.log('📦 Building Lynx bundle...');
        execSync('npm run build', { stdio: 'inherit', cwd: lynxProjectDir });
        console.log('✅ Build completed successfully.');
    } catch (error) {
        console.error('❌ Build process failed.');
        process.exit(1);
    }

    if (includeDevClient && devClientBundlePath && !fs.existsSync(devClientBundlePath)) {
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
        if (release) {
            const devClientAsset = path.join(destinationDir, 'dev-client.lynx.bundle');
            if (fs.existsSync(devClientAsset)) {
                fs.rmSync(devClientAsset);
                console.log(`✨ Removed dev-client.lynx.bundle from assets (production build)`);
            }
        } else if (includeDevClient && devClientBundlePath && fs.existsSync(devClientBundlePath)) {
            fs.copyFileSync(devClientBundlePath, path.join(destinationDir, 'dev-client.lynx.bundle'));
            console.log(`✨ Copied dev-client.lynx.bundle to assets`);
        }
        if (!fs.existsSync(lynxBundlePath)) {
            console.error(`❌ Build output not found at: ${lynxBundlePath}`);
            process.exit(1);
        }
        const distDir = path.dirname(lynxBundlePath);
        copyDistAssets(distDir, destinationDir, resolved.lynxBundleFile);
        console.log(`✨ Copied ${resolved.lynxBundleFile} to assets`);
    } catch (error: any) {
        console.error(`❌ Failed to copy bundle: ${error.message}`);
        process.exit(1);
    }
}
export default bundleAndDeploy

// // --- Main Execution ---
// bundleAndDeploy();
