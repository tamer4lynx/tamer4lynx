import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { resolveHostPaths } from '../common/hostConfig';
import ios_bundle from './bundle';

function buildIpa(opts: { target?: string } = {}) {
    const target = opts.target ?? 'host';
    const resolved = resolveHostPaths();
    if (!resolved.config.ios?.appName) {
        throw new Error('"ios.appName" must be defined in tamer.config.json');
    }

    if (target === 'dev-app') {
        console.error('❌ iOS dev-app target not yet implemented.');
        process.exit(1);
    }

    const appName = resolved.config.ios.appName;
    const iosDir = resolved.iosDir;

    ios_bundle({ target });

    const scheme = appName;
    const workspacePath = path.join(iosDir, `${appName}.xcworkspace`);
    const projectPath = path.join(iosDir, `${appName}.xcodeproj`);

    const xcproject = fs.existsSync(workspacePath) ? workspacePath : projectPath;
    const flag = xcproject.endsWith('.xcworkspace') ? '-workspace' : '-project';

    console.log(`\n🔨 Building IPA...`);
    execSync(`xcodebuild -${flag} "${xcproject}" -scheme "${scheme}" -configuration Debug -sdk iphoneos -derivedDataPath build`, {
        stdio: 'inherit',
        cwd: iosDir,
    });
    console.log('✅ IPA built successfully.');
}

export default buildIpa;
