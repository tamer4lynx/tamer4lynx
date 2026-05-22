import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { resolveHostPaths, findDevClientPackage, resolveIconPaths } from '../common/hostConfig';
import { fixTsconfigReferencesForBuild } from '../common/tsconfigUtils';
import { applyIosAppIconAssets } from '../common/syncAppIcons';
import { copyDistAssets } from '../common/copyDistAssets';
import ios_autolink from './autolink';
import { addResourceFolderToXcodeProject, addResourceToXcodeProject } from './syncHost';
import { isDevAppProject } from '../common/hostConfig';

function buildEnvWithOfficialAppMetadata(projectRoot: string): NodeJS.ProcessEnv {
    if (!isDevAppProject(projectRoot)) return process.env;
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

function bundleAndDeploy(opts: { release?: boolean; production?: boolean } = {}) {
    const release = opts.release === true || opts.production === true;
    let resolved: ReturnType<typeof resolveHostPaths>;
    try {
        resolved = resolveHostPaths();
        if (!resolved.config.ios?.appName) {
            throw new Error('"ios.appName" must be defined in tamer.config.json');
        }
    } catch (error: any) {
        console.error(`❌ Error loading configuration: ${error.message}`);
        process.exit(1);
    }

    const devClientPkg = findDevClientPackage(resolved.projectRoot);
    const includeDevClient = !release && !!devClientPkg;

    let appName = resolved.config.ios!.appName!;
    const { lynxProjectDir, lynxBundleFiles, lynxBundleRootRel } = resolved;
    const sourceBundlePath = resolved.lynxBundlePath;
    // Discover actual Xcode project name — may differ from display appName (e.g. "Tamer App" vs "TamerDevApp")
    if (fs.existsSync(resolved.iosDir)) {
        const xcodeproj = fs.readdirSync(resolved.iosDir).find(f => f.endsWith('.xcodeproj'));
        if (xcodeproj) appName = path.basename(xcodeproj, '.xcodeproj');
    }
    const destinationDir = path.join(resolved.iosDir, appName);
    const destinationBundlePath = path.join(destinationDir, resolved.lynxBundleFile);

    ios_autolink({ release, includeDevClient });

    const iconPaths = resolveIconPaths(resolved.projectRoot, resolved.config);
    if (iconPaths) {
        const appIconDir = path.join(destinationDir, 'Assets.xcassets', 'AppIcon.appiconset');
        if (applyIosAppIconAssets(appIconDir, iconPaths)) {
            console.log('✅ Synced iOS AppIcon from tamer.config.json');
        }
    }

    try {
        const lynxTsconfig = path.join(resolved.lynxProjectDir, 'tsconfig.json');
        if (fs.existsSync(lynxTsconfig)) {
            fixTsconfigReferencesForBuild(lynxTsconfig);
        }
        console.log('📦 Building Lynx bundle...');
        const buildEnv = buildEnvWithOfficialAppMetadata(resolved.projectRoot);
        execSync('npm run build', { stdio: 'inherit', cwd: resolved.lynxProjectDir, env: buildEnv });
        console.log('✅ Build completed successfully.');
    } catch (error) {
        console.error('❌ Build process failed. Please check the errors above.');
        process.exit(1);
    }

    try {
        for (const name of lynxBundleFiles) {
            const p = path.join(lynxProjectDir, lynxBundleRootRel, name);
            if (!fs.existsSync(p)) {
                console.error(`❌ Build output not found at: ${p}`);
                process.exit(1);
            }
        }

        if (!fs.existsSync(destinationDir)) {
            console.error(`Destination directory not found at: ${destinationDir}`);
            process.exit(1);
        }

        const distDir = path.dirname(sourceBundlePath);
        console.log(`🚚 Copying bundle and assets to iOS project...`);
        copyDistAssets(distDir, destinationDir, resolved.lynxBundleFile);
        console.log(`✨ Successfully copied bundle to: ${destinationBundlePath}`);

        const pbxprojPath = path.join(resolved.iosDir, `${appName}.xcodeproj`, 'project.pbxproj');
        if (fs.existsSync(pbxprojPath)) {
            const skip = new Set(['.rspeedy', 'stats.json']);
            for (const entry of fs.readdirSync(distDir)) {
                if (skip.has(entry)) continue;
                const entryPath = path.join(distDir, entry);
                if (fs.statSync(entryPath).isDirectory()) {
                    addResourceFolderToXcodeProject(pbxprojPath, appName, entry);
                } else {
                    addResourceToXcodeProject(pbxprojPath, appName, entry);
                }
            }
        }

        if (includeDevClient && devClientPkg) {
            console.log('📦 Building dev-client bundle...');
            try {
                execSync('npm run build', { stdio: 'inherit', cwd: devClientPkg });
            } catch {
                console.warn('⚠️  dev-client build failed; skipping dev-client bundle');
            }
            const pbxprojPath = path.join(resolved.iosDir, `${appName}.xcodeproj`, 'project.pbxproj');
            for (const bundleName of resolved.devClientBundleFiles ?? ['dev-client.lynx.bundle']) {
                const builtBundle = path.join(devClientPkg, 'dist', bundleName);
                const destinationBundle = path.join(destinationDir, bundleName);
                if (!fs.existsSync(builtBundle)) {
                    console.warn(`⚠️  ${bundleName} build output missing; skipping`);
                    continue;
                }
                fs.copyFileSync(builtBundle, destinationBundle);
                console.log(`✨ Copied ${bundleName} to iOS project`);
                if (fs.existsSync(pbxprojPath)) {
                    addResourceToXcodeProject(pbxprojPath, appName, bundleName);
                }
            }
        }
    } catch (error: any) {
        console.error('❌ Failed to copy bundle assets.');
        console.error(error.message);
        process.exit(1);
    }
}

export default bundleAndDeploy;
