import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomBytes } from 'crypto';
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

function findFirstConnectedIosDeviceUdid(): string | null {
    const jsonPath = path.join(os.tmpdir(), `t4l-devicectl-${randomBytes(8).toString('hex')}.json`);
    try {
        execSync(`xcrun devicectl list devices --json-output "${jsonPath}"`, {
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        if (!fs.existsSync(jsonPath)) return null;
        const raw = fs.readFileSync(jsonPath, 'utf8');
        fs.unlinkSync(jsonPath);
        const data = JSON.parse(raw) as {
            result?: { devices?: Array<{ hardwareProperties?: { udid?: string }; identifier?: string }> };
        };
        const devices = data.result?.devices ?? [];
        for (const d of devices) {
            const udid = d.hardwareProperties?.udid ?? d.identifier;
            if (typeof udid === 'string' && udid.length >= 20) {
                return udid;
            }
        }
    } catch {
        try {
            if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
        } catch {
            /* ignore */
        }
    }
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

    const production = opts.production === true;
    const sdk = production ? 'iphoneos' : opts.install ? 'iphonesimulator' : 'iphoneos';
    const signingArgs =
        production || opts.install ? '' : ' CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO';

    const archFlag = opts.install && !production ? `-arch ${hostArch()} ` : '';
    const extraSettings = [
        'ONLY_ACTIVE_ARCH=YES',
        'CLANG_ENABLE_EXPLICIT_MODULES=NO',
        ...(configuration === 'Debug' ? ['COMPILER_INDEX_STORE_ENABLE=NO'] : []),
    ].join(' ');

    console.log(`\n🔨 Building ${configuration} (${sdk})...`);
    execSync(
        `xcodebuild ${flag} "${xcproject}" -scheme "${scheme}" -configuration ${configuration} -sdk ${sdk} ${archFlag}-derivedDataPath "${derivedDataPath}" ${extraSettings}${signingArgs}`,
        { stdio: 'inherit', cwd: iosDir }
    );
    console.log(`✅ Build completed.`);

    if (opts.install) {
        if (production) {
            const appPath = path.join(
                derivedDataPath,
                'Build',
                'Products',
                `${configuration}-iphoneos`,
                `${appName}.app`
            );
            if (!fs.existsSync(appPath)) {
                console.error(`❌ Built app not found at: ${appPath}`);
                process.exit(1);
            }

            const udid = findFirstConnectedIosDeviceUdid();
            if (!udid) {
                console.error(
                    '❌ No connected iOS device found. Connect an iPhone/iPad with a trusted cable, unlock it, and ensure Developer Mode is on (iOS 16+). Requires Xcode 15+ (`xcrun devicectl`).'
                );
                process.exit(1);
            }

            console.log(`📲 Installing on device ${udid}...`);
            execSync(`xcrun devicectl device install app --device "${udid}" "${appPath}"`, {
                stdio: 'inherit',
            });

            if (bundleId) {
                console.log(`🚀 Launching ${bundleId}...`);
                try {
                    execSync(
                        `xcrun devicectl device process launch --device "${udid}" "${bundleId}"`,
                        { stdio: 'inherit' }
                    );
                    console.log('✅ App launched.');
                } catch {
                    console.log('✅ Installed. Launch manually on the device if auto-launch failed.');
                }
            } else {
                console.log('✅ App installed. (Set "ios.bundleId" in tamer.config.json to auto-launch.)');
            }
        } else {
            const appGlob = path.join(
                derivedDataPath,
                'Build',
                'Products',
                `${configuration}-iphonesimulator`,
                `${appName}.app`
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
}

export default buildIpa;
