import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { copyDistAssets } from '../common/copyDistAssets';
import { resolveAndroidPaths, findDevClientPackage, resolveIconPaths, isDevAppProject } from '../common/hostConfig';
import { fixTsconfigReferencesForBuild } from '../common/tsconfigUtils';
import { applyAndroidLauncherIcons, ensureAndroidManifestLauncherIcon } from '../common/syncAppIcons';
import android_autolink from './autolink';
import android_syncDevClient from './syncDevClient';
import { getTamerDevAppProjectActivity } from '../explorer/patches';

function buildEnvWithOfficialAppMetadata(isDevApp: boolean, projectRoot: string): NodeJS.ProcessEnv {
    if (!isDevApp) return process.env;
    const officialAppJsonPath = path.join(projectRoot, 'official-app.json');
    if (!fs.existsSync(officialAppJsonPath)) return process.env;
    try {
        const metadata = fs.readFileSync(officialAppJsonPath, 'utf8');
        JSON.parse(metadata); // validate
        return { ...process.env, TAMER_DEV_CLIENT_OFFICIAL_APP_METADATA_JSON: metadata };
    } catch {
        console.warn('⚠ Could not read official-app.json; building without official app metadata.');
        return process.env;
    }
}

async function bundleAndDeploy(opts: { release?: boolean; production?: boolean } = {}) {
    const release = opts.release === true || opts.production === true;
    let resolved: ReturnType<typeof resolveAndroidPaths>;
    try {
        resolved = resolveAndroidPaths(process.cwd());
    } catch (error: any) {
        console.error(`❌ Error loading configuration: ${error.message}`);
        process.exit(1);
    }

    const { projectRoot, lynxProjectDir, lynxBundlePath, lynxBundleFiles, lynxBundleRootRel, androidAssetsDir, devClientBundlePath, devClientBundleFiles } = resolved;
    const isDevApp = isDevAppProject(projectRoot);

    if (isDevApp) {
        console.log('📱 Resolving paths for Tamer Dev App (@tamer4lynx/tamer-dev-app)');
    }

    const devClientPkg = findDevClientPackage(projectRoot);
    const includeDevClient = !release && !!devClientPkg;
    const destinationDir = androidAssetsDir;

    android_autolink({ includeDevClient, release });
    if (!isDevApp) {
        await android_syncDevClient({ includeDevClient });
    } else {
        const pkg = resolved.config.android?.packageName ?? 'com.nanofuxion.tamerdevapp';
        const projectActivityPath = path.join(resolved.androidKotlinDir, 'ProjectActivity.kt');
        fs.mkdirSync(path.dirname(projectActivityPath), { recursive: true });
        fs.writeFileSync(projectActivityPath, getTamerDevAppProjectActivity(pkg));
        console.log(
            '✅ Wrote packages/tamer-dev-app ProjectActivity.kt from getTamerDevAppProjectActivity() (full template sync skipped for dev-app).',
        );
    }

    const iconPaths = resolveIconPaths(projectRoot, resolved.config);
    if (iconPaths) {
        const resDir = path.join(resolved.androidAppDir, 'src', 'main', 'res');
        if (applyAndroidLauncherIcons(resDir, iconPaths)) {
            console.log('✅ Synced Android launcher icon(s) from tamer.config.json');
            ensureAndroidManifestLauncherIcon(path.join(resolved.androidAppDir, 'src', 'main', 'AndroidManifest.xml'));
        }
    }

    try {
        const lynxTsconfig = path.join(lynxProjectDir, 'tsconfig.json');
        if (fs.existsSync(lynxTsconfig)) {
            fixTsconfigReferencesForBuild(lynxTsconfig);
        }
        console.log('📦 Building Lynx bundle...');
        const buildEnv = buildEnvWithOfficialAppMetadata(isDevApp, projectRoot);
        execSync('npm run build', { stdio: 'inherit', cwd: lynxProjectDir, env: buildEnv });
        console.log('✅ Build completed successfully.');
    } catch (error) {
        console.error('❌ Build process failed.');
        process.exit(1);
    }

    if (includeDevClient && devClientBundlePath) {
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
            for (const bundleName of devClientBundleFiles ?? ['dev-client.lynx.bundle']) {
                const devClientAsset = path.join(destinationDir, bundleName);
                if (fs.existsSync(devClientAsset)) {
                    fs.rmSync(devClientAsset);
                    console.log(`✨ Removed ${bundleName} from assets (production build)`);
                }
            }
        } else if (includeDevClient && devClientBundlePath) {
            const devClientDir = path.dirname(path.dirname(devClientBundlePath));
            for (const bundleName of devClientBundleFiles ?? ['dev-client.lynx.bundle']) {
                const builtBundle = path.join(devClientDir, 'dist', bundleName);
                if (!fs.existsSync(builtBundle)) {
                    console.error(`❌ Dev client build output not found at: ${builtBundle}`);
                    process.exit(1);
                }
                fs.copyFileSync(builtBundle, path.join(destinationDir, bundleName));
                console.log(`✨ Copied ${bundleName} to assets`);
            }
        }
        for (const name of lynxBundleFiles) {
            const p = path.join(lynxProjectDir, lynxBundleRootRel, name);
            if (!fs.existsSync(p)) {
                console.error(`❌ Build output not found at: ${p}`);
                process.exit(1);
            }
        }
        const distDir = path.dirname(lynxBundlePath);
        copyDistAssets(distDir, destinationDir, resolved.lynxBundleFile);
        if (lynxBundleFiles.length > 1) {
            console.log(`✨ Copied dist assets including: ${lynxBundleFiles.join(', ')}`);
        } else {
            console.log(`✨ Copied ${resolved.lynxBundleFile} to assets`);
        }
    } catch (error: any) {
        console.error(`❌ Failed to copy bundle: ${error.message}`);
        process.exit(1);
    }
}
export default bundleAndDeploy

// // --- Main Execution ---
// bundleAndDeploy();
