import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomBytes } from 'crypto';
import { execSync } from 'child_process';
import { resolveHostPaths, type HostConfig } from '../common/hostConfig';
import { extractTeamIdFromIdentityLabel } from '../common/iosSigningDiscovery';
import { pickOne, isInteractive } from '../common/pickOne';
import ios_bundle from './bundle';
import { codesignApp, resolveIdentitySha1, findMatchingProfile } from './codesign';
import { prepareMacIosBundleLikePlayCover } from './macIosRun';
import {
    resolveAppStoreConnectForIpa,
    xcodeAppStoreConnectAuthFlags,
    writeAppStoreExportOptionsPlist,
    findExportedIpa,
    type AppStoreConnectAuth,
} from './appStoreConnect';

function hostArch(): string {
    return os.arch() === 'arm64' ? 'arm64' : 'x86_64';
}

function isAppleSilicon(): boolean {
    return os.arch() === 'arm64' && process.platform === 'darwin';
}

function resolvedIosTeamId(config: HostConfig): string {
    const s = config.ios?.signing;
    if (!s) return '';
    return (
        s.developmentTeam?.trim() ||
        (s.codeSignIdentity?.trim()
            ? extractTeamIdFromIdentityLabel(s.codeSignIdentity.trim()) ?? ''
            : '')
    );
}

interface SigningFlags {
    xcodebuildArgs: string;
    allowProvisioningUpdates: boolean;
}

function iosSigningXcodeFlags(config: HostConfig): SigningFlags {
    const s = config.ios?.signing;
    if (!s) return { xcodebuildArgs: '', allowProvisioningUpdates: false };
    const team = resolvedIosTeamId(config);
    if (!team) return { xcodebuildArgs: '', allowProvisioningUpdates: false };
    let out = ` DEVELOPMENT_TEAM=${team}`;
    const hasManualProfile =
        s.provisioningProfileSpecifier?.trim() || s.provisioningProfileUuid?.trim();
    if (hasManualProfile) {
        if (s.codeSignIdentity?.trim()) {
            const id = s.codeSignIdentity.trim().replace(/"/g, '\\"');
            out += ` CODE_SIGN_IDENTITY="${id}"`;
        }
        if (s.provisioningProfileSpecifier?.trim()) {
            const spec = s.provisioningProfileSpecifier.trim().replace(/"/g, '\\"');
            out += ` PROVISIONING_PROFILE_SPECIFIER="${spec}" CODE_SIGN_STYLE=Manual`;
        } else {
            out += ` PROVISIONING_PROFILE=${s.provisioningProfileUuid!.trim()} CODE_SIGN_STYLE=Manual`;
        }
        return { xcodebuildArgs: out, allowProvisioningUpdates: false };
    } else {
        // Automatic signing: pass only the generic role, never a full "Name (TEAM)" identity string.
        // -allowProvisioningUpdates lets xcodebuild register/download the profile automatically.
        out += ' CODE_SIGN_IDENTITY="Apple Development" CODE_SIGN_STYLE=Automatic';
        return { xcodebuildArgs: out, allowProvisioningUpdates: true };
    }
}

/** Automatic / manual signing flags for archiving an App Store build (not “Apple Development”). */
function iosSigningXcodeFlagsAppStoreArchive(config: HostConfig): SigningFlags {
    const s = config.ios?.signing;
    if (!s) return { xcodebuildArgs: '', allowProvisioningUpdates: false };
    const team = resolvedIosTeamId(config);
    if (!team) return { xcodebuildArgs: '', allowProvisioningUpdates: false };
    let out = ` DEVELOPMENT_TEAM=${team}`;
    const hasManualProfile =
        s.provisioningProfileSpecifier?.trim() || s.provisioningProfileUuid?.trim();
    if (hasManualProfile) {
        if (s.codeSignIdentity?.trim()) {
            const id = s.codeSignIdentity.trim().replace(/"/g, '\\"');
            out += ` CODE_SIGN_IDENTITY="${id}"`;
        }
        if (s.provisioningProfileSpecifier?.trim()) {
            const spec = s.provisioningProfileSpecifier.trim().replace(/"/g, '\\"');
            out += ` PROVISIONING_PROFILE_SPECIFIER="${spec}" CODE_SIGN_STYLE=Manual`;
        } else {
            out += ` PROVISIONING_PROFILE=${s.provisioningProfileUuid!.trim()} CODE_SIGN_STYLE=Manual`;
        }
        return { xcodebuildArgs: out, allowProvisioningUpdates: true };
    }
    out += ' CODE_SIGN_IDENTITY="Apple Distribution" CODE_SIGN_STYLE=Automatic';
    return { xcodebuildArgs: out, allowProvisioningUpdates: true };
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

export type PhysicalIosDevice = { udid: string; name: string };

function listPhysicalIosDevices(): PhysicalIosDevice[] {
    const jsonPath = path.join(os.tmpdir(), `t4l-devicectl-${randomBytes(8).toString('hex')}.json`);
    try {
        execSync(`xcrun devicectl list devices --json-output "${jsonPath}"`, {
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        if (!fs.existsSync(jsonPath)) return [];
        const raw = fs.readFileSync(jsonPath, 'utf8');
        fs.unlinkSync(jsonPath);
        const data = JSON.parse(raw) as {
            result?: {
                devices?: Array<{
                    hardwareProperties?: { udid?: string };
                    identifier?: string;
                    deviceProperties?: { name?: string };
                }>;
            };
        };
        const devices = data.result?.devices ?? [];
        const out: PhysicalIosDevice[] = [];
        for (const d of devices) {
            const udid = d.hardwareProperties?.udid ?? d.identifier;
            if (typeof udid !== 'string' || udid.length < 20) continue;
            const name =
                d.deviceProperties?.name ??
                (d as { name?: string }).name ??
                `Device ${udid.slice(0, 8)}…`;
            out.push({ udid, name });
        }
        return out;
    } catch {
        try {
            if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
        } catch {
            /* ignore */
        }
    }
    return [];
}

async function buildIpa(
    opts: { install?: boolean; release?: boolean; production?: boolean; ipa?: boolean; mac?: boolean } = {}
) {
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
    const signing = iosSigningXcodeFlags(resolved.config);
    const signingFlags = signing.xcodebuildArgs;
    const allowProvisioningUpdates = signing.allowProvisioningUpdates ? ' -allowProvisioningUpdates' : '';

    const production = opts.production === true;
    const mac = opts.mac === true;
    const wantIpa = opts.ipa === true && production;

    if (mac && !isAppleSilicon()) {
        console.error('❌ --mac requires an Apple Silicon Mac.');
        process.exit(1);
    }

    const sdk = mac
        ? 'iphoneos'
        : production
          ? 'iphoneos'
          : opts.install
            ? 'iphonesimulator'
            : 'iphoneos';
    const sdkOrDest = `-sdk ${sdk}`;
    const archFlag = opts.install && !production && !mac ? `-arch ${hostArch()} ` : '';
    const extraSettings = [
        'ONLY_ACTIVE_ARCH=YES',
        'CLANG_ENABLE_EXPLICIT_MODULES=NO',
        ...(configuration === 'Debug' ? ['COMPILER_INDEX_STORE_ENABLE=NO'] : []),
    ].join(' ');

    const archivePath = path.join(derivedDataPath, `${appName}.xcarchive`);
    const exportDir = path.join(derivedDataPath, 'ipa-export');
    const exportPlist = path.join(derivedDataPath, 'ExportOptions.plist');

    const productsSubdir = `${configuration}-iphoneos`;

    let productionInstallPath: string | undefined;

    if (production) {
        let ascAuth: AppStoreConnectAuth | null = null;
        if (wantIpa && !mac) {
            try {
                ascAuth = resolveAppStoreConnectForIpa(resolved.config, resolved.projectRoot);
            } catch (e) {
                console.error(`❌ ${e instanceof Error ? e.message : e}`);
                process.exit(1);
            }
        }
        const useAppStoreExport = Boolean(wantIpa && ascAuth && !mac);

        if (useAppStoreExport) {
            const teamIdAsc = resolvedIosTeamId(resolved.config);
            if (!teamIdAsc) {
                console.error(
                    '❌ ios.signing.developmentTeam is required for App Store IPA export with APP_STORE_CONNECT_* env vars.',
                );
                process.exit(1);
            }
            const signingAsc = iosSigningXcodeFlagsAppStoreArchive(resolved.config);
            if (!signingAsc.xcodebuildArgs.trim()) {
                console.error('❌ Configure ios.signing (e.g. developmentTeam) for App Store archive.');
                process.exit(1);
            }
            const authFlags = xcodeAppStoreConnectAuthFlags(ascAuth);
            const ddBuild = path.join(derivedDataPath, 'Build');
            if (fs.existsSync(ddBuild)) fs.rmSync(ddBuild, { recursive: true, force: true });
            if (fs.existsSync(archivePath)) fs.rmSync(archivePath, { recursive: true, force: true });
            if (fs.existsSync(exportDir)) fs.rmSync(exportDir, { recursive: true, force: true });
            fs.mkdirSync(exportDir, { recursive: true });
            writeAppStoreExportOptionsPlist(exportPlist, teamIdAsc);

            console.log(`\n📦 Archiving for App Store (App Store Connect API key)…`);
            execSync(
                `xcodebuild archive ${flag} "${xcproject}" -scheme "${scheme}" -configuration ${configuration}` +
                    ` -destination "generic/platform=iOS" -archivePath "${archivePath}" -derivedDataPath "${derivedDataPath}" ${extraSettings}` +
                    `${signingAsc.xcodebuildArgs}${authFlags}`,
                { stdio: 'inherit', cwd: iosDir }
            );
            console.log('✅ Archive completed.');

            console.log(`\n📤 Exporting App Store IPA…`);
            execSync(
                `xcodebuild -exportArchive -archivePath "${archivePath}" -exportPath "${exportDir}"` +
                    ` -exportOptionsPlist "${exportPlist}"${authFlags}`,
                { stdio: 'inherit', cwd: iosDir }
            );
            const ipaFile = findExportedIpa(exportDir);
            if (!ipaFile) {
                console.error(`❌ No .ipa found in ${exportDir} after export.`);
                process.exit(1);
            }
            console.log(`✅ IPA exported to: ${ipaFile}`);
            productionInstallPath = ipaFile;
        } else {
            const target = mac ? 'iphoneos (then Mac Catalyst / PlayCover-style vtool)' : 'iphoneos';
            console.log(`\n🔨 Building ${configuration} (${target}) without signing...`);
            execSync(
                `xcodebuild ${flag} "${xcproject}" -scheme "${scheme}" -configuration ${configuration}` +
                    ` ${sdkOrDest} -derivedDataPath "${derivedDataPath}" ${extraSettings}` +
                    ` CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO`,
                { stdio: 'inherit', cwd: iosDir }
            );
            console.log('✅ Build completed (unsigned).');

            const appInProductsInner = path.join(
                derivedDataPath,
                'Build',
                'Products',
                productsSubdir,
                `${appName}.app`
            );

            if (mac) {
                try {
                    prepareMacIosBundleLikePlayCover(appInProductsInner);
                } catch (e) {
                    console.error(`❌ Mac run preparation failed: ${e instanceof Error ? e.message : e}`);
                    process.exit(1);
                }
            }

            const identitySha1 = resolveIdentitySha1(
                resolved.config.ios?.signing?.codeSignIdentity?.trim()
            );
            if (!identitySha1) {
                console.error(
                    '❌ No code signing identity found in keychain.\n' +
                        '   Run `t4l signing ios` or install an Apple Development certificate in Keychain Access.'
                );
                process.exit(1);
            }

            const teamId = resolvedIosTeamId(resolved.config);
            const profile = mac ? null : findMatchingProfile(bundleId, teamId);
            if (mac) {
                console.log('ℹ️  --mac: skipping embedded provisioning profile (not used for local Mac run).');
            } else if (profile) {
                console.log(`📋 Using provisioning profile: ${profile.name}`);
            } else {
                console.log('ℹ️  No matching provisioning profile found — signing without one.');
                console.log('   Device installs may fail. Build once from Xcode to create a managed profile,');
                console.log('   or use a paid Apple Developer account with a downloaded profile.');
            }

            codesignApp(appInProductsInner, {
                identity: identitySha1,
                profilePath: profile?.filePath,
            });

            productionInstallPath = appInProductsInner;

            if (wantIpa) {
                if (fs.existsSync(exportDir)) fs.rmSync(exportDir, { recursive: true, force: true });
                fs.mkdirSync(exportDir, { recursive: true });
                const ipaPath = path.join(exportDir, `${appName}.ipa`);
                const payloadDir = path.join(exportDir, 'Payload');
                fs.mkdirSync(payloadDir, { recursive: true });
                fs.cpSync(appInProductsInner, path.join(payloadDir, `${appName}.app`), { recursive: true });
                execSync(`cd "${exportDir}" && zip -r -q "${ipaPath}" Payload`, { stdio: 'inherit' });
                fs.rmSync(payloadDir, { recursive: true, force: true });
                console.log(`✅ IPA exported to: ${ipaPath}`);
            }
        }
    } else {
        const signingArgs =
            opts.install && !mac ? '' : ' CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO';
        const debugTarget = mac ? 'iphoneos (unsigned, then Mac Catalyst / PlayCover-style)' : sdk!;
        console.log(`\n🔨 Building ${configuration} (${debugTarget})...`);
        execSync(
            `xcodebuild ${flag} "${xcproject}" -scheme "${scheme}" -configuration ${configuration} ${sdkOrDest} ${archFlag}-derivedDataPath "${derivedDataPath}" ${extraSettings}${signingArgs}${signingFlags}${allowProvisioningUpdates}`,
            { stdio: 'inherit', cwd: iosDir }
        );
        console.log(`✅ Build completed.`);

        const appDbg = path.join(
            derivedDataPath,
            'Build',
            'Products',
            `${configuration}-iphoneos`,
            `${appName}.app`
        );
        if (mac && fs.existsSync(appDbg)) {
            try {
                prepareMacIosBundleLikePlayCover(appDbg);
                execSync(`codesign --force --sign - --deep "${appDbg}"`, { stdio: 'inherit' });
            } catch (e) {
                console.error(`❌ Mac run preparation failed: ${e instanceof Error ? e.message : e}`);
                process.exit(1);
            }
        }
    }

    const debugProductsSubdir = `${configuration}-${sdk === 'iphonesimulator' ? 'iphonesimulator' : 'iphoneos'}`;
    const appInProducts = path.join(
        derivedDataPath,
        'Build',
        'Products',
        debugProductsSubdir,
        `${appName}.app`
    );

    if (opts.install) {
        if (production) {
            const appPath = productionInstallPath ?? appInProducts;
            if (!fs.existsSync(appPath)) {
                console.error(`❌ Built app not found at: ${appPath}`);
                process.exit(1);
            }

            if (mac) {
                console.log('📲 Launching on Mac (Mac Catalyst / PlayCover-style Mach-O conversion)...');
                execSync(`open "${appPath}"`, { stdio: 'inherit' });
                console.log('✅ App launched.');
            } else {
                const physicalDevices = listPhysicalIosDevices();
                if (physicalDevices.length === 0) {
                    console.error(
                        '❌ No connected physical iOS device found for production install (`-p -i`).\n' +
                            '   Connect an iPhone/iPad (USB), unlock it, and enable Developer Mode (iOS 16+).\n' +
                            '   To run on this Mac instead, add --mac: `t4l build ios -p -i --mac`'
                    );
                    process.exit(1);
                }
                let udid: string;
                if (physicalDevices.length === 1) {
                    udid = physicalDevices[0].udid;
                } else if (!isInteractive()) {
                    console.error('❌ Multiple iOS devices connected. Run in an interactive terminal to pick one.');
                    process.exit(1);
                } else {
                    udid = await pickOne(
                        'Select a device:',
                        physicalDevices.map((d) => ({ label: `${d.name} — ${d.udid}`, value: d.udid }))
                    );
                }

                console.log(`📲 Installing on physical device ${udid}...`);
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
            }
        } else if (mac) {
            if (!fs.existsSync(appInProducts)) {
                console.error(`❌ Built app not found at: ${appInProducts}`);
                process.exit(1);
            }
            console.log('📲 Launching on Mac (Mac Catalyst / PlayCover-style)...');
            execSync(`open "${appInProducts}"`, { stdio: 'inherit' });
            console.log('✅ App launched.');
        } else {
            const simProducts = path.join(
                derivedDataPath,
                'Build',
                'Products',
                `${configuration}-iphonesimulator`,
                `${appName}.app`
            );
            if (!fs.existsSync(simProducts)) {
                console.error(`❌ Built app not found at: ${simProducts}`);
                process.exit(1);
            }

            const udid = findBootedSimulator();
            if (!udid) {
                console.error('❌ No booted simulator found. Start one with: xcrun simctl boot <udid>');
                process.exit(1);
            }

            console.log(`📲 Installing on simulator ${udid}...`);
            execSync(`xcrun simctl install "${udid}" "${simProducts}"`, { stdio: 'inherit' });

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
