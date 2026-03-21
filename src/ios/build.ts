import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { resolveHostPaths } from '../common/hostConfig';
import ios_bundle from './bundle';

function hostArch(): string {
    return os.arch() === 'arm64' ? 'arm64' : 'x86_64';
}

function findBootedSimulator(): string | null {
    try {
        const out = execSync('xcrun simctl list devices --json', { encoding: 'utf8' });
        const json = JSON.parse(out);
        for (const runtimes of Object.values(json.devices) as any[][]) {
            for (const device of runtimes) {
                if (device.state === 'Booted') return device.udid as string;
            }
        }
    } catch {}
    return null;
}

async function buildIpa(opts: { install?: boolean; release?: boolean; production?: boolean } = {}) {
    const resolved = resolveHostPaths();
    if (!resolved.config.ios?.appName) {
        throw new Error('"ios.appName" must be defined in tamer.config.json');
    }

    const appName = resolved.config.ios.appName;
    const bundleId = resolved.config.ios.bundleId;
    const iosDir = resolved.iosDir;
    const release = opts.release === true || opts.production === true;
    const configuration = release ? 'Release' : 'Debug';

    ios_bundle({ release, production: opts.production });

    const scheme = appName;
    const workspacePath = path.join(iosDir, `${appName}.xcworkspace`);
    const projectPath = path.join(iosDir, `${appName}.xcodeproj`);
    const xcproject = fs.existsSync(workspacePath) ? workspacePath : projectPath;
    const flag = xcproject.endsWith('.xcworkspace') ? '-workspace' : '-project';
    const derivedDataPath = path.join(iosDir, 'build');

    const sdk = opts.install ? 'iphonesimulator' : 'iphoneos';
    const signingArgs = opts.install ? '' : ' CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO';

    const archFlag = opts.install ? `-arch ${hostArch()} ` : '';
    const extraSettings = [
        'ONLY_ACTIVE_ARCH=YES',
        'CLANG_ENABLE_EXPLICIT_MODULES=NO',
    ].join(' ');

    console.log(`\n🔨 Building ${configuration} (${sdk})...`);
    execSync(
        `xcodebuild ${flag} "${xcproject}" -scheme "${scheme}" -configuration ${configuration} -sdk ${sdk} ${archFlag}-derivedDataPath "${derivedDataPath}" ${extraSettings}${signingArgs}`,
        { stdio: 'inherit', cwd: iosDir }
    );
    console.log(`✅ Build completed.`);

    if (opts.install) {
        const appGlob = path.join(
            derivedDataPath,
            'Build', 'Products', `${configuration}-iphonesimulator`, `${appName}.app`
        );
        if (!fs.existsSync(appGlob)) {
            console.error(`❌ Built app not found at: ${appGlob}`);
            process.exit(1);
        }

        const udid = findBootedSimulator();
        if (!udid) {
            console.error('❌ No booted simulator found. Start one with: xcrun simctl boot <udid>');
            process.exit(1);
        }

        console.log(`📲 Installing on simulator ${udid}...`);
        execSync(`xcrun simctl install "${udid}" "${appGlob}"`, { stdio: 'inherit' });

        if (bundleId) {
            console.log(`🚀 Launching ${bundleId}...`);
            execSync(`xcrun simctl launch "${udid}" "${bundleId}"`, { stdio: 'inherit' });
            console.log('✅ App launched.');
        } else {
            console.log('✅ App installed. (Set "ios.bundleId" in tamer.config.json to auto-launch.)');
        }
    }
}

export default buildIpa;
