import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { resolveHostPaths } from '../common/hostConfig';
import android_bundle from './bundle';
import { cleanTamerAndroidLibBuildsIfVersionsChanged } from './cleanTamerAndroidCaches.ts';

async function buildApk(
    opts: { install?: boolean; release?: boolean; production?: boolean; clean?: boolean } = {},
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
    const task = opts.install ? `install${variant}` : `assemble${variant}`;
    console.log(`\n🔨 Building ${variant.toLowerCase()} APK${opts.install ? ' and installing' : ''}...`);
    if (opts.clean === true) {
        console.log('ℹ️  Running Gradle clean (--clean)...');
        execSync(`"${gradlew}" clean`, { stdio: 'inherit', cwd: androidDir });
    }
    execSync(`"${gradlew}" ${task}`, { stdio: 'inherit', cwd: androidDir });
    console.log(`✅ APK ${opts.install ? 'installed' : 'built'} successfully.`);

    if (opts.install) {
        const packageName = resolved.config.android?.packageName;
        if (packageName) {
            try {
                console.log(`🚀 Launching ${packageName}...`);
                execSync(`adb shell am start -n ${packageName}/.MainActivity`, { stdio: 'inherit' });
                console.log('✅ App launched.');
            } catch (e) {
                console.warn('⚠️ Could not launch app. Is a device/emulator connected?');
            }
        } else {
            console.log('ℹ️ Set "android.packageName" in tamer.config.json to auto-launch.');
        }
    }
}

export default buildApk;
