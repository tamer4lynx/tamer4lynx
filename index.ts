#!/usr/bin/env node

import './src/suppress-punycode-warning.ts';
import fs from 'fs';
import path from 'path';

import { program } from 'commander';

import { getCliVersion } from './src/common/cliVersion.ts';
import { loadProjectEnv } from './src/common/loadProjectEnv.ts';

loadProjectEnv();

const version = getCliVersion();

function validateBuildMode(debug: boolean, release: boolean, production: boolean) {
    const modes = [debug, release, production].filter(Boolean).length;
    if (modes > 1) {
        console.error('Cannot use --debug, --release, and --production together. Use only one.');
        process.exit(1);
    }
}

function validateDebugRelease(debug: boolean, release: boolean) {
    validateBuildMode(debug, release, false);
}

function parsePlatform(value: string): 'ios' | 'android' | 'all' | null {
    const p = value?.toLowerCase();
    if (p === 'ios' || p === 'android') return p;
    if (p === 'all' || p === 'both') return 'all';
    return null;
}

function parseBuildPlatform(value: string | undefined): 'ios' | 'android' | null {
    const p = value?.toLowerCase()?.trim();
    if (p === 'ios' || p === 'android') return p;
    return null;
}

import android_create from './src/android/create';
import android_autolink from './src/android/autolink';
import android_bundle from './src/android/bundle';
import android_build from './src/android/build';
import android_syncDevClient from './src/android/syncDevClient';
import ios_create from './src/ios/create';
import ios_autolink from './src/ios/autolink';
import ios_bundle from './src/ios/bundle';
import ios_build from './src/ios/build';
import init from './src/common/init';
import create from './src/common/create';
import codegen from './src/common/codegen';
import start from './src/common/start';
import { injectHostAndroid, injectHostIos } from './src/common/injectHost';
import buildEmbeddable from './src/common/buildEmbeddable';
import { add, addCore, addDev, updateTamerPackages } from './src/common/add';
import signing from './src/common/signing';
import { assertProductionSigningReady } from './src/common/productionSigning';

program
    .version(version)
    .description('Tamer4Lynx CLI - A tool for managing Lynx projects');

program
    .command('init')
    .description('Initialize tamer.config.json interactively')
    .action(() => {
        init();
    });

program
    .command('create <target>')
    .description('Create a project or extension. Target: ios | android | module | element | service | combo')
    .option('-d, --debug', 'For android: create host project (default)')
    .option('-r, --release', 'For android: create dev-app project')
    .action(async (target: string, opts: { debug?: boolean; release?: boolean }) => {
        const t = target.toLowerCase();
        if (t === 'ios') {
            ios_create();
            return;
        }
        if (t === 'android') {
            if (opts.debug && opts.release) {
                console.error('Cannot use --debug and --release together.');
                process.exit(1);
            }
            await android_create({ target: opts.release ? 'dev-app' : 'host' });
            return;
        }
        if (['module', 'element', 'service', 'combo'].includes(t)) {
            await create({ type: t as 'module' | 'element' | 'service' | 'combo' });
            return;
        }
        console.error(`Invalid create target: ${target}. Use ios | android | module | element | service | combo`);
        process.exit(1);
    });

program
    .command('build <platform>')
    .description('Build app. Platform: ios | android (required; one at a time)')
    .option('-e, --embeddable', 'Output embeddable bundle + code for existing apps (release-style; no separate --release needed).')
    .option('-d, --debug', 'Debug build with dev client embedded (default)')
    .option('-r, --release', 'Release build without dev client (unsigned)')
    .option('-p, --production', 'Production build for app store (signed)')
    .option(
        '-i, --install',
        'Install after build (iOS: simulator with -d; physical device only with -p, never simulator)',
    )
    .option('--ipa', 'iOS only: after production build, archive and export a signed IPA')
    .option(
        '--mac',
        'iOS only: after build, convert Mach-O for Mac Catalyst (vtool) and run on Apple Silicon like PlayCover',
    )
    .option('-C, --clean', 'Run Gradle clean before Android build (fixes stubborn caches)')
    .action(async (platform: string, opts) => {
        validateBuildMode(opts.debug, opts.release, opts.production);
        const release = opts.release === true || opts.production === true;
        const production = opts.production === true;
        if (opts.embeddable) {
            const ep = parseBuildPlatform(platform);
            if (!ep) {
                console.error('Embeddable build requires a platform: t4l build android --embeddable');
                process.exit(1);
            }
            if (ep !== 'android') {
                console.error('Embeddable output is only supported for Android. Use: t4l build android --embeddable');
                process.exit(1);
            }
            await buildEmbeddable({ release: true });
            return;
        }
        const p = parseBuildPlatform(platform);
        if (!p) {
            console.error(`Invalid or missing platform: "${platform ?? ''}". Use: t4l build ios | t4l build android`);
            process.exit(1);
        }
        if (opts.ipa && p !== 'ios') {
            console.error('--ipa is only valid with: t4l build ios -p');
            process.exit(1);
        }
        if (opts.ipa && !production) {
            console.error('--ipa requires production signing: add -p');
            process.exit(1);
        }
        if (opts.mac && p !== 'ios') {
            console.error('--mac is only valid with: t4l build ios');
            process.exit(1);
        }
        if (opts.mac && opts.ipa) {
            console.error(
                '--mac cannot be combined with --ipa (IPA targets device/App Store; --mac uses Mac Catalyst / PlayCover-style conversion).',
            );
            process.exit(1);
        }
        if (production) {
            assertProductionSigningReady(p);
        }
        if (p === 'android') {
            await android_build({ install: opts.install, release, production, clean: opts.clean });
        } else {
            await ios_build({
                install: opts.install,
                release,
                production,
                ipa: opts.ipa === true,
                mac: opts.mac === true,
            });
        }
    });

program
    .command('link [platform]')
    .description('Link native modules. Platform: ios | android | both (default: both)')
    .option('-s, --silent', 'Run without output')
    .action((platform: string | undefined, opts: { silent?: boolean }) => {
        if (opts.silent) {
            console.log = () => {};
            console.error = () => {};
            console.warn = () => {};
        }
        const p = parsePlatform(platform ?? 'both') ?? 'both';
        if (p === 'ios') {
            ios_autolink();
            return;
        }
        if (p === 'android') {
            android_autolink();
            return;
        }
        ios_autolink();
        android_autolink();
    });

program
    .command('bundle [platform]')
    .description('Build Lynx bundle and copy to native project. Platform: ios | android (default: both)')
    .option('-d, --debug', 'Debug bundle with dev client embedded (default)')
    .option('-r, --release', 'Release bundle without dev client (unsigned)')
    .option('-p, --production', 'Production bundle for app store (signed)')
    .action(async (platform: string | undefined, opts) => {
        validateBuildMode(opts.debug, opts.release, opts.production);
        const release = opts.release === true || opts.production === true;
        const production = opts.production === true;
        const p = parsePlatform(platform ?? 'both') ?? 'both';
        if (p === 'android' || p === 'all') await android_bundle({ release, production });
        if (p === 'ios' || p === 'all') ios_bundle({ release, production });
    });

program
    .command('inject <platform>')
    .description('Inject host templates into an existing project. Platform: ios | android')
    .option('-f, --force', 'Overwrite existing files')
    .action(async (platform: string, opts: { force?: boolean }) => {
        const p = platform?.toLowerCase();
        if (p === 'ios') {
            await injectHostIos({ force: opts.force });
            return;
        }
        if (p === 'android') {
            await injectHostAndroid({ force: opts.force });
            return;
        }
        console.error(`Invalid inject platform: ${platform}. Use ios | android`);
        process.exit(1);
    });

program
    .command('sync [platform]')
    .description('Sync dev client. Platform: android (default)')
    .action(async (platform: string | undefined) => {
        const p = (platform ?? 'android').toLowerCase();
        if (p !== 'android') {
            console.error('sync only supports android.');
            process.exit(1);
        }
        await android_syncDevClient();
    });

program
    .command('start')
    .option('-v, --verbose', 'Show all logs (native + JS); default shows JS only')
    .description('Start dev server with HMR and WebSocket support (Expo-like)')
    .action(async (opts) => {
        await start({ verbose: opts.verbose });
    });

program
    .command('build-dev-app')
    .option('-p, --platform <platform>', 'Platform: android, ios, or all (default)', 'all')
    .option('-i, --install', 'Install APK to connected device and launch app after building')
    .description('Build with dev client embedded (same as t4l build -d)')
    .action(async (opts) => {
        const p = parsePlatform(opts.platform ?? 'all') ?? 'all';
        if (p === 'android' || p === 'all') {
            await android_build({ install: opts.install, release: false });
        }
        if (p === 'ios' || p === 'all') {
            await ios_build({ install: opts.install, release: false });
        }
    });

program
    .command('add [packages...]')
    .description('Add @tamer4lynx packages to the Lynx project')
    .action(async (packages: string[]) => {
        await add(packages);
    });

program
    .command('add-core')
    .description('Add core packages')
    .action(async () => {
        await addCore();
    });

program
    .command('add-dev')
    .description('Add dev-app, dev-client, and their dependencies')
    .action(async () => {
        await addDev();
    });

program
    .command('update')
    .description('Update every @tamer4lynx/* dependency in package.json to the latest published versions')
    .action(async () => {
        await updateTamerPackages();
    });

program
    .command('signing [platform]')
    .description('Configure Android and iOS signing interactively')
    .action(async (platform?: string) => {
        const p = platform?.toLowerCase();
        if (p === 'android' || p === 'ios') {
            await signing(p as 'android' | 'ios');
        } else {
            await signing();
        }
    });

program
    .command('codegen')
    .description('Generate code from @lynxmodule declarations')
    .action(() => {
        codegen();
    });

program
    .command('android <subcommand>')
    .description('Android: create | link | bundle | build | sync | inject (alias for t4l <command> android)')
    .option('-d, --debug', 'Create: host project. Bundle/build: debug with dev client.')
    .option('-r, --release', 'Create: dev-app project. Bundle/build: release without dev client.')
    .option('-p, --production', 'Bundle/build: production for app store (signed)')
    .option('-i, --install', 'Install after build')
    .option('-C, --clean', 'Run Gradle clean before Android build')
    .option('-e, --embeddable', 'Build embeddable')
    .option('-f, --force', 'Force (inject)')
    .action(async (subcommand: string, opts) => {
        const sub = subcommand?.toLowerCase();
        if (sub === 'create') {
            if (opts.debug && opts.release) {
                console.error('Cannot use --debug and --release together.');
                process.exit(1);
            }
            await android_create({ target: opts.release ? 'dev-app' : 'host' });
            return;
        }
        if (sub === 'link') {
            const release = opts.release === true || opts.production === true;
            android_autolink({ release });
            return;
        }
        if (sub === 'bundle') {
            validateBuildMode(opts.debug, opts.release, opts.production);
            const release = opts.release === true || opts.production === true;
            await android_bundle({ release, production: opts.production === true });
            return;
        }
        if (sub === 'build') {
            validateBuildMode(opts.debug, opts.release, opts.production);
            const release = opts.release === true || opts.production === true;
            if (opts.embeddable) await buildEmbeddable({ release: true });
            else {
                if (opts.production === true) assertProductionSigningReady('android');
                await android_build({
                    install: opts.install,
                    release,
                    production: opts.production === true,
                    clean: opts.clean,
                });
            }
            return;
        }
        if (sub === 'sync') {
            await android_syncDevClient();
            return;
        }
        if (sub === 'inject') {
            await injectHostAndroid({ force: opts.force });
            return;
        }
        console.error(`Unknown android subcommand: ${subcommand}. Use: create | link | bundle | build | sync | inject`);
        process.exit(1);
    });

program
    .command('ios <subcommand>')
    .description('iOS: create | link | bundle | build | sync | inject (alias for t4l <command> ios)')
    .option('-d, --debug', 'Debug (bundle/build)')
    .option('-r, --release', 'Release (bundle/build)')
    .option('-p, --production', 'Production for app store (signed)')
    .option('-i, --install', 'Install after build')
    .option('--ipa', 'After production build, archive and export IPA')
    .option('--mac', 'Convert Mach-O for Mac Catalyst (vtool) and run on Apple Silicon (PlayCover-style)')
    .option('-e, --embeddable', 'Build embeddable')
    .option('-f, --force', 'Force (inject)')
    .action(async (subcommand: string, opts) => {
        const sub = subcommand?.toLowerCase();
        if (sub === 'create') {
            ios_create();
            return;
        }
        if (sub === 'link') {
            ios_autolink();
            return;
        }
        if (sub === 'bundle') {
            validateBuildMode(opts.debug, opts.release, opts.production);
            const release = opts.release === true || opts.production === true;
            ios_bundle({ release, production: opts.production === true });
            return;
        }
        if (sub === 'build') {
            validateBuildMode(opts.debug, opts.release, opts.production);
            const release = opts.release === true || opts.production === true;
            const production = opts.production === true;
            if (opts.embeddable) await buildEmbeddable({ release: true });
            else {
                if (opts.ipa && !production) {
                    console.error('--ipa requires production signing: add -p');
                    process.exit(1);
                }
                if (opts.mac && opts.ipa) {
                    console.error('--mac cannot be combined with --ipa');
                    process.exit(1);
                }
                if (production) assertProductionSigningReady('ios');
                await ios_build({
                    install: opts.install,
                    release,
                    production,
                    ipa: opts.ipa === true,
                    mac: opts.mac === true,
                });
            }
            return;
        }
        if (sub === 'inject') {
            await injectHostIos({ force: opts.force });
            return;
        }
        console.error(`Unknown ios subcommand: ${subcommand}. Use: create | link | bundle | build | inject`);
        process.exit(1);
    });

program
    .command('autolink-toggle')
    .alias('autolink')
    .description('Toggle autolink on/off in tamer.config.json (controls postinstall linking)')
    .action(async () => {
        const configPath = path.join(process.cwd(), 'tamer.config.json');
        let config: Record<string, unknown> = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        if (config.autolink) {
            delete config.autolink;
            console.log('Autolink disabled in tamer.config.json');
        } else {
            config.autolink = true;
            console.log('Autolink enabled in tamer.config.json');
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`Updated ${configPath}`);
    });

if (process.argv.length <= 2 || (process.argv.length === 3 && process.argv[2] === 'init')) {
    Promise.resolve(init()).then(() => process.exit(0));
} else {
    program.parseAsync().then(() => process.exit(0)).catch(() => process.exit(1));
}
