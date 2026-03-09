import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { resolveHostPaths } from '../common/hostConfig';
import ios_autolink from './autolink';

function bundleAndDeploy(opts: { target?: string } = {}) {
    const target = opts.target ?? 'host';
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

    const appName = resolved.config.ios!.appName!;
    const sourceBundlePath = resolved.lynxBundlePath;
    const destinationDir = path.join(resolved.iosDir, appName);
    const destinationBundlePath = path.join(destinationDir, resolved.lynxBundleFile);

    if (target === 'dev-app') {
        console.error('❌ iOS dev-app target not yet implemented.');
        process.exit(1);
    }

    ios_autolink();

    if (resolved.devMode === 'embedded' && resolved.devClientBundlePath) {
        const devAppDir = path.dirname(path.dirname(resolved.devClientBundlePath));
        try {
            console.log('📦 Building tamer-dev-app...');
            execSync('npm run build', { stdio: 'inherit', cwd: devAppDir });
            console.log('✅ Dev client build completed.');
        } catch (error) {
            console.error('❌ Dev client build failed.');
            process.exit(1);
        }
    }

    try {
        console.log('📦 Starting the build process...');
        execSync('npm run build', { stdio: 'inherit', cwd: resolved.lynxProjectDir });
        console.log('✅ Build completed successfully.');
    } catch (error) {
        console.error('❌ Build process failed. Please check the errors above.');
        process.exit(1);
    }

    try {
        if (!fs.existsSync(sourceBundlePath)) {
            console.error(`❌ Build output not found at: ${sourceBundlePath}`);
            process.exit(1);
        }

        if (!fs.existsSync(destinationDir)) {
            console.error(`Destination directory not found at: ${destinationDir}`);
            process.exit(1);
        }

        if (resolved.devMode === 'embedded' && resolved.devClientBundlePath && fs.existsSync(resolved.devClientBundlePath)) {
            const devClientDest = path.join(destinationDir, 'dev-client.lynx.bundle');
            fs.copyFileSync(resolved.devClientBundlePath, devClientDest);
            console.log(`✨ Copied dev-client.lynx.bundle to iOS project`);
        }

        console.log(`🚚 Copying bundle to iOS project...`);
        fs.copyFileSync(sourceBundlePath, destinationBundlePath);
        console.log(`✨ Successfully copied bundle to: ${destinationBundlePath}`);
    } catch (error: any) {
        console.error('❌ Failed to copy the bundle file.');
        console.error(error.message);
        process.exit(1);
    }
}

export default bundleAndDeploy;