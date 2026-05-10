import { execSync, spawnSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync } from 'fs';
import { join, isAbsolute } from 'path';
import dotenv from 'dotenv';

const ROOT = join(import.meta.dirname, '..');
dotenv.config({ path: join(ROOT, '.env') });
const DEV_APP = join(ROOT, 'packages', 'tamer-dev-app');
const DEV_CLIENT = join(ROOT, 'packages', 'tamer-dev-client');
const DIST_DIR = join(ROOT, 'dist', 'release');

const args = new Set(process.argv.slice(2));
const skipAndroid = args.has('--skip-android');
const skipIos = args.has('--skip-ios');
const skipIosDevice = args.has('--skip-ios-device');
const skipUpload = args.has('--skip-upload');

const pkg = JSON.parse(readFileSync(join(DEV_APP, 'package.json'), 'utf8'));
const VERSION = pkg.version;
const TAG = `tamer-dev-app@${VERSION}`;
const APK_NAME = `TamerDevApp-${VERSION}.apk`;
const ZIP_NAME = `TamerDevApp-Simulator-${VERSION}.zip`;
const DEVICE_ZIP_NAME = `TamerDevApp-Device-Unsigned-${VERSION}.zip`;
const SIGN_README = `TamerDevApp-Device-Unsigned ${VERSION}
=====================================
Unsigned iOS device .app (arm64). User signs with own Apple Developer identity.

Sign:
  unzip TamerDevApp-Device-Unsigned-${VERSION}.zip
  codesign --force --deep --sign "Apple Development: <your name> (<TEAM_ID>)" TamerDevApp.app

Embed provisioning profile (required for device install):
  cp <YourApp.mobileprovision> TamerDevApp.app/embedded.mobileprovision

Wrap into IPA + install:
  mkdir Payload && mv TamerDevApp.app Payload/
  zip -r TamerDevApp.ipa Payload
  xcrun devicectl device install app --device <UDID> TamerDevApp.ipa

Notes:
- Bundle id: com.nanofuxion.tamerdevapp (must match your provisioning profile, or change with: /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier <id>" TamerDevApp.app/Info.plist)
- Free Apple ID profiles expire after 7 days.
`;

function run(cmd, opts = {}) {
    console.log(`\n$ ${cmd}`);
    execSync(cmd, { stdio: 'inherit', ...opts });
}

function tryRun(cmd, opts = {}) {
    const r = spawnSync(cmd, { shell: true, stdio: 'pipe', encoding: 'utf8', ...opts });
    return { code: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

function rebuildLynxBundles() {
    console.log(`\n📦 Building tamer-dev-client lynx bundles...`);
    const env = { ...process.env, OFFICIAL_APP_SOURCE: process.env.OFFICIAL_APP_SOURCE || 'github' };
    run('npm run build', { cwd: DEV_APP, env });

    const iosAssetsDir = join(DEV_APP, 'ios', 'TamerDevApp');
    const bundles = ['dev-client.lynx.bundle', 'tamer-debug.lynx.bundle'];
    for (const name of bundles) {
        const src = join(DEV_CLIENT, 'dist', name);
        if (!existsSync(src)) {
            throw new Error(`Bundle missing: ${src}`);
        }
        const dst = join(iosAssetsDir, name);
        copyFileSync(src, dst);
        console.log(`   ↳ copied ${name} to ios/TamerDevApp/`);
    }
}

function ensureKeystore(ksPath, pw, alias) {
    const probe = tryRun(
        `keytool -list -keystore "${ksPath}" -storepass ${pw} -alias ${alias}`
    );
    if (probe.code === 0) return;
    if (existsSync(ksPath)) {
        console.log(`🔐 Existing keystore at ${ksPath} does not match password/alias — replacing.`);
        rmSync(ksPath, { force: true });
    }
    console.log(`🔐 Generating release keystore at ${ksPath} (alias=${alias})...`);
    const dname = 'CN=Tamer Dev App, OU=nanofuxion, O=tamer4lynx, L=NA, ST=NA, C=US';
    run(
        `keytool -genkeypair -v -keystore "${ksPath}" -alias ${alias}` +
            ` -keyalg RSA -keysize 2048 -validity 36500` +
            ` -storepass ${pw} -keypass ${pw} -dname "${dname}"`
    );
}

function buildAndroid() {
    console.log(`\n🤖 Building Android release APK (${VERSION})...`);
    const env = { ...process.env };
    const required = [
        'ANDROID_KEYSTORE_PATH',
        'ANDROID_KEYSTORE_PASSWORD',
        'ANDROID_KEY_ALIAS',
        'ANDROID_KEY_PASSWORD',
    ];
    const missing = required.filter((k) => !env[k]);
    if (missing.length) {
        throw new Error(
            `Missing env vars (set in .env or shell): ${missing.join(', ')}`
        );
    }
    const absKsPath = isAbsolute(env.ANDROID_KEYSTORE_PATH)
        ? env.ANDROID_KEYSTORE_PATH
        : join(ROOT, env.ANDROID_KEYSTORE_PATH);
    env.ANDROID_KEYSTORE_PATH = absKsPath;
    ensureKeystore(absKsPath, env.ANDROID_KEYSTORE_PASSWORD, env.ANDROID_KEY_ALIAS);

    const androidDir = join(DEV_APP, 'android');
    const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    // Use assembleDebug — the dev app needs LynxDevtool gates, long-press menu,
    // and #if DEBUG hooks active. Release strips them.
    run(`${gradlew} assembleDebug`, { cwd: androidDir, env });

    const apk = join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    if (!existsSync(apk)) {
        throw new Error(`APK not found at ${apk}`);
    }
    mkdirSync(DIST_DIR, { recursive: true });
    const out = join(DIST_DIR, APK_NAME);
    copyFileSync(apk, out);
    console.log(`✅ APK → ${out}`);
    return out;
}

function buildIosSimulator() {
    if (process.platform !== 'darwin') {
        throw new Error('iOS simulator build requires macOS.');
    }
    console.log(`\n🍎 Building iOS Simulator .app (${VERSION})...`);

    const iosDir = join(DEV_APP, 'ios');
    const workspace = join(iosDir, 'TamerDevApp.xcworkspace');
    const project = join(iosDir, 'TamerDevApp.xcodeproj');
    const flag = existsSync(workspace) ? '-workspace' : '-project';
    const xcproject = existsSync(workspace) ? workspace : project;
    const derived = join(iosDir, 'build');

    if (existsSync(join(derived, 'Build'))) {
        rmSync(join(derived, 'Build'), { recursive: true, force: true });
    }

    // Use Debug — needed for #if DEBUG gates that wire LynxDevtool, long-press menu,
    // and shake-to-open. Release strips them and we get a white-screen-ish launcher.
    const cmd =
        `xcodebuild ${flag} "${xcproject}" -scheme TamerDevApp -configuration Debug` +
        ` -sdk iphonesimulator -arch arm64 -arch x86_64 ONLY_ACTIVE_ARCH=NO` +
        ` -derivedDataPath "${derived}"` +
        ` CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=""`;
    run(cmd, { cwd: iosDir });

    const appDir = join(derived, 'Build', 'Products', 'Debug-iphonesimulator');
    const app = join(appDir, 'TamerDevApp.app');
    if (!existsSync(app)) {
        throw new Error(`.app not found at ${app}`);
    }

    mkdirSync(DIST_DIR, { recursive: true });
    const out = join(DIST_DIR, ZIP_NAME);
    if (existsSync(out)) rmSync(out, { force: true });
    run(`zip -y -r "${out}" "TamerDevApp.app"`, { cwd: appDir });
    console.log(`✅ ZIP → ${out}`);
    return out;
}

function buildIosDevice() {
    if (process.platform !== 'darwin') {
        throw new Error('iOS device build requires macOS.');
    }
    console.log(`\n📱 Building iOS Device unsigned .app (${VERSION})...`);

    const iosDir = join(DEV_APP, 'ios');
    const workspace = join(iosDir, 'TamerDevApp.xcworkspace');
    const project = join(iosDir, 'TamerDevApp.xcodeproj');
    const flag = existsSync(workspace) ? '-workspace' : '-project';
    const xcproject = existsSync(workspace) ? workspace : project;
    const derived = join(iosDir, 'build-device');

    if (existsSync(join(derived, 'Build'))) {
        rmSync(join(derived, 'Build'), { recursive: true, force: true });
    }

    // Debug config so devtool / long-press menu / shake fire on device.
    const cmd =
        `xcodebuild ${flag} "${xcproject}" -scheme TamerDevApp -configuration Debug` +
        ` -sdk iphoneos -arch arm64 ONLY_ACTIVE_ARCH=NO` +
        ` -derivedDataPath "${derived}"` +
        ` CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" CODE_SIGN_ENTITLEMENTS=""`;
    run(cmd, { cwd: iosDir });

    const appDir = join(derived, 'Build', 'Products', 'Debug-iphoneos');
    const app = join(appDir, 'TamerDevApp.app');
    if (!existsSync(app)) {
        throw new Error(`.app not found at ${app}`);
    }

    const readmePath = join(appDir, 'SIGN-AND-INSTALL.txt');
    writeFileSync(readmePath, SIGN_README);

    mkdirSync(DIST_DIR, { recursive: true });
    const out = join(DIST_DIR, DEVICE_ZIP_NAME);
    if (existsSync(out)) rmSync(out, { force: true });
    run(`zip -y -r "${out}" "TamerDevApp.app" "SIGN-AND-INSTALL.txt"`, { cwd: appDir });
    rmSync(readmePath, { force: true });
    console.log(`✅ Device ZIP → ${out}`);
    return out;
}

function ensureGhTag() {
    const view = tryRun(`gh release view "${TAG}"`, { cwd: ROOT });
    if (view.code === 0) {
        console.log(`ℹ️  Release ${TAG} already exists, will upload assets with --clobber.`);
        return;
    }
    console.log(`\n🏷  Creating release ${TAG}...`);
    const notesFile =
        process.env.RELEASE_NOTES_FILE ||
        join(ROOT, 'scripts', 'RELEASE_NOTES.md');
    let notesArg;
    if (existsSync(notesFile)) {
        console.log(`📝 Using release notes from ${notesFile}`);
        notesArg = `--notes-file "${notesFile}"`;
    } else {
        const fallback = `Prebuilt simulator/emulator binaries for tamer-dev-app@${VERSION}`;
        notesArg = `--notes "${fallback}"`;
    }
    run(
        `gh release create "${TAG}" --title "Tamer Dev App ${VERSION}" ${notesArg}`,
        { cwd: ROOT }
    );
}

function uploadAssets(assets) {
    if (!assets.length) {
        console.log('⏭  No assets to upload.');
        return;
    }
    const quoted = assets.map((p) => `"${p}"`).join(' ');
    run(`gh release upload "${TAG}" ${quoted} --clobber`, { cwd: ROOT });
    console.log(`✅ Uploaded ${assets.length} asset(s) to ${TAG}.`);
}

async function main() {
    console.log(`\n🚀 release-binaries: tamer-dev-app@${VERSION} (tag: ${TAG})`);

    rebuildLynxBundles();

    const assets = [];
    if (!skipAndroid) {
        try {
            assets.push(buildAndroid());
        } catch (e) {
            console.error(`❌ Android build failed: ${e instanceof Error ? e.message : e}`);
            process.exit(1);
        }
    } else {
        console.log('⏭  Skipping Android (--skip-android).');
    }

    if (!skipIos) {
        try {
            assets.push(buildIosSimulator());
        } catch (e) {
            console.error(`❌ iOS simulator build failed: ${e instanceof Error ? e.message : e}`);
            process.exit(1);
        }
    } else {
        console.log('⏭  Skipping iOS simulator (--skip-ios).');
    }

    if (!skipIosDevice) {
        try {
            assets.push(buildIosDevice());
        } catch (e) {
            console.error(`❌ iOS device build failed: ${e instanceof Error ? e.message : e}`);
            process.exit(1);
        }
    } else {
        console.log('⏭  Skipping iOS device (--skip-ios-device).');
    }

    if (skipUpload) {
        console.log('\n⏭  Skipping GitHub upload (--skip-upload).');
        console.log(`Artifacts in ${DIST_DIR}.`);
        return;
    }

    ensureGhTag();
    uploadAssets(assets);

    console.log('\n✅ release-binaries done.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
