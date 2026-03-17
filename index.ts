#!/usr/bin/env node


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


// Android commands
const android = program.command('android')
    .description('Android project commands');

android
    .command('create')
    .option('-t, --target <target>', 'Create target: host (default) or dev-app', 'host')
    .description('Create a new Android project')
    .action(async (opts) => {
        await android_create({ target: opts.target });
    });


android
    .command('link')
    .description('Link native modules to the Android project')
    .action(() => {
        android_autolink();
    });


android
    .command('bundle')
    .option('-t, --target <target>', 'Bundle target: host (default) or dev-app', 'host')
    .option('-d, --debug', 'Build debug (development) bundle')
    .option('-r, --release', 'Build release (production) bundle')
    .description('Build Lynx bundle and copy to Android assets (runs autolink first)')
    .action(async (opts) => {
        validateDebugRelease(opts.debug, opts.release);
        const release = opts.release === true;
        await android_bundle({ target: opts.target, release });
    });

const androidBuildCmd = android
    .command('build')
    .option('-i, --install', 'Install APK to connected device and launch app after building')
    .option('-t, --target <target>', 'Build target: host (default) or dev-app', 'host')
    .option('-e, --embeddable', 'Build for embedding in existing app (host only). Use with --release for production-ready embeddable.')
    .option('-d, --debug', 'Build debug (development) APK')
    .option('-r, --release', 'Build release (production) APK')
    .description('Build APK (autolink + bundle + gradle)')
    .action(async () => {
        const opts = androidBuildCmd.opts();
        validateDebugRelease(opts.debug, opts.release);
        const release = opts.release === true;
        if (opts.embeddable) {
            await buildEmbeddable({ release: true });
            return;
        }
        await android_build({ install: opts.install, target: opts.target, release });
    });

android
    .command('sync')
    .description('Sync dev client files (TemplateProvider, MainActivity, DevClientManager) from tamer.config.json')
    .action(async () => {
        await android_syncDevClient();
    });

android
    .command('inject')
    .option('-f, --force', 'Overwrite existing files')
    .description('Inject tamer-host templates into an existing Android project')
    .action(async (opts) => {
        await injectHostAndroid({ force: opts.force });
    });


// iOS commands
const ios = program.command('ios')
    .description('iOS project commands');


ios.command('create')
    .description('Create a new iOS project')
    .action(() => {
        ios_create();
    });

ios.command('inject')
    .option('-f, --force', 'Overwrite existing files')
    .description('Inject tamer-host templates into an existing iOS project')
    .action(async (opts) => {
        await injectHostIos({ force: opts.force });
    });


ios.command('link')
    .description('Link native modules to the iOS project')
    .action(() => {
        ios_autolink();
    });


ios.command('bundle')
    .option('-t, --target <target>', 'Bundle target: host (default) or dev-app', 'host')
    .option('-d, --debug', 'Build debug (development) bundle')
    .option('-r, --release', 'Build release (production) bundle')
    .description('Build Lynx bundle and copy to iOS project (runs autolink first)')
    .action((opts) => {
        validateDebugRelease(opts.debug, opts.release);
        const release = opts.release === true;
        ios_bundle({ target: opts.target, release });
    });

const iosBuildCmd = ios.command('build')
    .option('-t, --target <target>', 'Build target: host (default) or dev-app', 'host')
    .option('-e, --embeddable', 'Output bundle + code snippets to embeddable/ for adding LynxView to an existing app. Use with --release.')
    .option('-i, --install', 'Install and launch on booted simulator after building')
    .option('-d, --debug', 'Build debug (development) configuration')
    .option('-r, --release', 'Build release (production) configuration')
    .description('Build iOS app (autolink + bundle + xcodebuild)')
    .action(async () => {
        const opts = iosBuildCmd.opts();
        validateDebugRelease(opts.debug, opts.release);
        const release = opts.release === true;
        if (opts.embeddable) {
            await buildEmbeddable({ release: true });
            return;
        }
        await ios_build({ target: opts.target, install: opts.install, release });
    });

const linkCmd = program.command('link')
    .option('-i, --ios', 'Link iOS native modules')
    .option('-a, --android', 'Link Android native modules')
    .option('-b, --both', 'Link both iOS and Android native modules')
    .option('-s, --silent', 'Run in silent mode without outputting messages')
    .description('Link native modules to the project')
    .action(() => {
        const opts = linkCmd.opts();
        if (opts.silent) {
            console.log = () => {}; // Suppress output
            console.error = () => {}; // Suppress errors
            console.warn = () => {}; // Suppress warnings
        }
        if (opts.ios) {
            ios_autolink();
            return;
        }
        if (opts.android) {
            android_autolink();
            return;
        }
        ios_autolink();
        android_autolink();
    });

program
    .command('start')
    .option('-v, --verbose', 'Show all logs (native + JS); default shows JS only')
    .description('Start dev server with HMR and WebSocket support (Expo-like)')
    .action(async (opts) => {
        await start({ verbose: opts.verbose });
    });

const buildCmd = program
    .command('build')
    .option('-p, --platform <platform>', 'android, ios, or all (default: all)', 'all')
    .option('-t, --target <target>', 'host or dev-app (default: dev-app)', 'dev-app')
    .option('-e, --embeddable', 'Output bundle + code snippets to embeddable/ for adding LynxView to an existing app. Use with --release.')
    .option('-d, --debug', 'Debug build (default)')
    .option('-r, --release', 'Release build')
    .option('-i, --install', 'Install after building')
    .description('Build app (unified: delegates to android/ios build)')
    .action(async () => {
        const opts = buildCmd.opts();
        validateDebugRelease(opts.debug, opts.release);
        const release = opts.release === true;
        if (opts.embeddable) {
            await buildEmbeddable({ release: true });
            return;
        }
        const p = opts.platform?.toLowerCase();
        const platform = p === 'ios' || p === 'android' ? p : 'all';
        const target = opts.target ?? 'dev-app';
        if (platform === 'android' || platform === 'all') {
            await android_build({ install: opts.install, target, release });
        }
        if (platform === 'ios' || platform === 'all') {
            await ios_build({ target, install: opts.install, release });
        }
    });

program
    .command('build-dev-app')
    .option('-p, --platform <platform>', 'Platform: android, ios, or all (default)', 'all')
    .option('-i, --install', 'Install APK to connected device and launch app after building')
    .description('(Deprecated) Use: t4l build --platform <platform> --install')
    .action(async (opts) => {
        console.warn('⚠️  build-dev-app is deprecated. Use: t4l build --platform <platform> [--install]');
        const p = opts.platform?.toLowerCase();
        const platform = p === 'ios' || p === 'android' ? p : 'all';
        if (platform === 'android' || platform === 'all') {
            await android_build({ install: opts.install, target: 'dev-app', release: false });
        }
        if (platform === 'ios' || platform === 'all') {
            await ios_build({ target: 'dev-app', install: opts.install, release: false });
        }
    });

program
    .command('add [packages...]')
    .description('Add @tamer4lynx packages to the Lynx project. Future: will track versions for compatibility (Expo-style).')
    .action((packages: string[]) => add(packages));

program
    .command('add-core')
    .description('Add core packages (app-shell, screen, router, insets, transports, text-input, system-ui, icons)')
    .action(() => addCore());

program
    .command('create')
    .description('Create a new Lynx extension project (RFC-compliant)')
    .action(() => create());

program
    .command('codegen')
    .description('Generate code from @lynxmodule declarations')
    .action(() => {
        codegen();
    });

program
    .command('autolink-toggle')
    .alias('autolink')
    .description('Toggle autolink on/off in tamer.config.json (controls postinstall linking)')
    .action(async () => {
        const configPath = path.join(process.cwd(), 'tamer.config.json');
        let config: any = {};
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
    })



// If no arguments or only node/index.js, run init

if (process.argv.length <= 2 || (process.argv.length === 3 && process.argv[2] === 'init')) {
    // Run init script and exit
    Promise.resolve(init()).then(() => process.exit(0));
} else {
    program.parseAsync().then(() => process.exit(0)).catch(() => process.exit(1));
}
