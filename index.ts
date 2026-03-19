#!/usr/bin/env node

import './src/suppress-punycode-warning.ts';
import fs from 'fs';
import path from 'path';

import { program } from 'commander';
import { version } from './package.json';

function validateDebugRelease(debug: boolean, release: boolean) {
    if (debug && release) {
        console.error('Cannot use --debug and --release together.');
        process.exit(1);
    }
}

function parsePlatform(value: string): 'ios' | 'android' | 'all' | null {
    const p = value?.toLowerCase();
    if (p === 'ios' || p === 'android') return p;
    if (p === 'all' || p === 'both') return 'all';
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
import { add, addCore } from './src/common/add';

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
    .command('build [platform]')
    .description('Build app. Platform: ios | android (default: both)')
    .option('-e, --embeddable', 'Output embeddable bundle + code for existing apps. Use with --release.')
    .option('-d, --debug', 'Debug build with dev client embedded (default)')
    .option('-r, --release', 'Release build without dev client')
    .option('-i, --install', 'Install after building')
    .action(async (platform: string | undefined, opts) => {
        validateDebugRelease(opts.debug, opts.release);
        const release = opts.release === true;
        if (opts.embeddable) {
            await buildEmbeddable({ release: true });
            return;
        }
        const p = parsePlatform(platform ?? 'all') ?? 'all';
        if (p === 'android' || p === 'all') {
            await android_build({ install: opts.install, release });
        }
        if (p === 'ios' || p === 'all') {
            await ios_build({ install: opts.install, release });
        }
    });

program
    .command('link [platform]')
    .description('Link native modules. Platform: ios | android | both (default: both)')
    .option('-s, --silent', 'Run in silent mode (e.g. for postinstall)')
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
    .option('-r, --release', 'Release bundle without dev client')
    .action(async (platform: string | undefined, opts) => {
        validateDebugRelease(opts.debug, opts.release);
        const release = opts.release === true;
        const p = parsePlatform(platform ?? 'both') ?? 'both';
        if (p === 'android' || p === 'all') await android_bundle({ release });
        if (p === 'ios' || p === 'all') ios_bundle({ release });
    });

program
    .command('inject <platform>')
    .description('Inject tamer-host templates into an existing project. Platform: ios | android')
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
    .description('Sync dev client files from tamer.config.json. Platform: android (default)')
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
    .description('(Deprecated) Use: t4l build android -d [--install]')
    .action(async (opts) => {
        console.warn('⚠️  build-dev-app is deprecated. Use: t4l build android -d [--install]');
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
    .description('Add @tamer4lynx packages to the Lynx project. Future: will track versions for compatibility (Expo-style).')
    .action((packages: string[]) => add(packages));

program
    .command('add-core')
    .description('Add core packages (app-shell, screen, router, insets, transports, system-ui, icons)')
    .action(() => addCore());

program
    .command('codegen')
    .description('Generate code from @lynxmodule declarations')
    .action(() => {
        codegen();
    });

program
    .command('android <subcommand>')
    .description('(Legacy) Use: t4l <command> android. e.g. t4l create android')
    .option('-d, --debug', 'Create: host project. Bundle/build: debug with dev client.')
    .option('-r, --release', 'Create: dev-app project. Bundle/build: release without dev client.')
    .option('-i, --install', 'Install after build')
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
            android_autolink();
            return;
        }
        if (sub === 'bundle') {
            validateDebugRelease(opts.debug, opts.release);
            await android_bundle({ release: opts.release === true });
            return;
        }
        if (sub === 'build') {
            validateDebugRelease(opts.debug, opts.release);
            if (opts.embeddable) await buildEmbeddable({ release: true });
            else await android_build({ install: opts.install, release: opts.release === true });
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
    .description('(Legacy) Use: t4l <command> ios. e.g. t4l create ios')
    .option('-d, --debug', 'Debug (bundle/build)')
    .option('-r, --release', 'Release (bundle/build)')
    .option('-i, --install', 'Install after build')
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
            validateDebugRelease(opts.debug, opts.release);
            ios_bundle({ release: opts.release === true });
            return;
        }
        if (sub === 'build') {
            validateDebugRelease(opts.debug, opts.release);
            if (opts.embeddable) await buildEmbeddable({ release: true });
            else await ios_build({ install: opts.install, release: opts.release === true });
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
