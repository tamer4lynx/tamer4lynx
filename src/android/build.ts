import path from 'path';
import { execSync } from 'child_process';
import { resolveHostPaths } from '../common/hostConfig';
import { pickOne, isInteractive } from '../common/pickOne';
import android_bundle from './bundle';
import { cleanTamerAndroidLibBuildsIfVersionsChanged } from './cleanTamerAndroidCaches.ts';

export type AdbDevice = { serial: string; model?: string };

function listAdbDevices(): AdbDevice[] {
    try {
        const out = execSync('adb devices -l', { encoding: 'utf8' });
        const lines = out.split('\n').slice(1);
        const result: AdbDevice[] = [];
        for (const line of lines) {
            const m = line.match(/^(\S+)\s+device\s/);
            if (m) {
                const serial = m[1];
                const model = line.match(/model:(\S+)/)?.[1];
                result.push({ serial, model });
            }
        }
        return result;
    } catch {
        return [];
    }
}

async function resolveAdbSerial(): Promise<string> {
    const devices = listAdbDevices();
    if (devices.length === 0) {
        console.error('❌ No Android device/emulator connected. Check `adb devices`.');
        process.exit(1);
    }
    if (devices.length === 1) return devices[0].serial;
    if (!isInteractive()) {
        console.error(
            '❌ Multiple adb devices connected. Connect only one device, or run in an interactive terminal to pick a device.'
        );
        process.exit(1);
    }
    return pickOne(
        'Select a device:',
        devices.map((d) => ({
            label: d.model ? `${d.model} — ${d.serial}` : d.serial,
            value: d.serial,
        }))
    );
}

async function buildApk(
    opts: { install?: boolean; release?: boolean; production?: boolean; clean?: boolean } = {}
) {
    let resolved: ReturnType<typeof resolveHostPaths>;
    try {
        resolved = resolveHostPaths();
    } catch (error: unknown) {
        throw error;
    }

    const release = opts.release === true || opts.production === true;
    await android_bundle({ release, production: opts.production });

    const { androidDir, projectRoot } = resolved;
    cleanTamerAndroidLibBuildsIfVersionsChanged(projectRoot);

    const gradlew = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
    const variant = release ? 'Release' : 'Debug';

    let adbSerial: string | undefined;
    if (opts.install) {
        adbSerial = await resolveAdbSerial();
    }

    const task = opts.install ? `install${variant}` : `assemble${variant}`;
    console.log(`\n🔨 Building ${variant.toLowerCase()} APK${opts.install ? ' and installing' : ''}...`);
    if (opts.clean === true) {
        console.log('ℹ️  Running Gradle clean (--clean)...');
        execSync(`"${gradlew}" clean`, { stdio: 'inherit', cwd: androidDir });
    }
    const env =
        adbSerial !== undefined
            ? { ...process.env, ANDROID_SERIAL: adbSerial }
            : process.env;
    execSync(`"${gradlew}" ${task}`, { stdio: 'inherit', cwd: androidDir, env });
    console.log(`✅ APK ${opts.install ? 'installed' : 'built'} successfully.`);

    if (opts.install && adbSerial) {
        const packageName = resolved.config.android?.packageName;
        if (packageName) {
            try {
                console.log(`🚀 Launching ${packageName}...`);
                execSync(`adb -s "${adbSerial}" shell am start -n ${packageName}/.MainActivity`, {
                    stdio: 'inherit',
                });
                console.log('✅ App launched.');
            } catch {
                console.warn('⚠️ Could not launch app.');
            }
        } else {
            console.log('ℹ️ Set "android.packageName" in tamer.config.json to auto-launch.');
        }
    }
}

export default buildApk;
