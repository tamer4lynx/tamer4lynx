#!/usr/bin/env node


import fs from 'fs';
import path from 'path';

import { program } from 'commander';
// Make sure you have a package.json file in the same directory
// with a "version" field for this import to work.
import { version } from './package.json';
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
import buildDevApp from './src/common/buildDevApp';

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
    .description('Build Lynx bundle and copy to Android assets (runs autolink first)')
    .action(async (opts) => {
        await android_bundle({ target: opts.target });
    });

android
    .command('build')
    .option('-i, --install', 'Install APK to connected device after building')
    .option('-t, --target <target>', 'Build target: host (default) or dev-app', 'host')
    .description('Build APK (autolink + bundle + gradle)')
    .action(async (opts) => {
        await android_build({ install: opts.install, target: opts.target });
    });

android
    .command('sync')
    .description('Sync dev client files (TemplateProvider, MainActivity, DevClientManager) from tamer.config.json')
    .action(async () => {
        await android_syncDevClient();
    });


// iOS commands
const ios = program.command('ios')
    .description('iOS project commands');


ios.command('create')
    .description('Create a new iOS project')
    .action(() => {
        ios_create();
    });


ios.command('link')
    .description('Link native modules to the iOS project')
    .action(() => {
        ios_autolink();
    });


ios.command('bundle')
    .option('-t, --target <target>', 'Bundle target: host (default) or dev-app', 'host')
    .description('Build Lynx bundle and copy to iOS project (runs autolink first)')
    .action((opts) => {
        ios_bundle({ target: opts.target });
    });

ios.command('build')
    .option('-t, --target <target>', 'Build target: host (default) or dev-app', 'host')
    .description('Build IPA (autolink + bundle + xcodebuild)')
    .action((opts) => {
        ios_build({ target: opts.target });
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

program
    .command('build-dev-app')
    .option('-p, --platform <platform>', 'Platform: android, ios, or all (default)', 'all')
    .option('-i, --install', 'Install APK to connected device after building')
    .description('Build the standalone dev client app (requires tamer-dev-client). iOS stubbed until implemented.')
    .action(async (opts) => {
        const p = opts.platform?.toLowerCase();
        const platform = p === 'ios' || p === 'android' ? p : 'all';
        await buildDevApp({ platform, install: opts.install });
    });

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
    .command('autolink')
    .description('Auto-link native modules to the project')
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
