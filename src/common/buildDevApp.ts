import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { findDevClientPackage } from './hostConfig';
import android_bundle from '../android/bundle';
import android_build from '../android/build';
import syncDevClientIos from '../ios/syncDevClient';

function findRepoRoot(start: string): string {
  let dir = path.resolve(start);
  const root = path.parse(dir).root;
  while (dir !== root) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.workspaces) return dir;
      } catch {}
    }
    dir = path.dirname(dir);
  }
  return start;
}

async function buildDevApp(opts: { platform?: 'android' | 'ios' | 'all'; install?: boolean } = {}) {
  const cwd = process.cwd();
  const repoRoot = findRepoRoot(cwd);
  const devClientPkg = findDevClientPackage(repoRoot) ?? findDevClientPackage(cwd);

  if (!devClientPkg) {
    console.error('❌ tamer-dev-client is not installed in this project.');
    console.error('   Add it as a dependency or ensure packages/tamer-dev-client exists in the repo.');
    process.exit(1);
  }

  const platform = opts.platform ?? 'all';

  if (platform === 'ios' || platform === 'all') {
    await syncDevClientIos();
    buildIosDevApp(opts.install);
    if (platform === 'ios') return;
  }

  if (platform === 'android' || platform === 'all') {
    await android_bundle({ target: 'dev-app' });
    await android_build({ target: 'dev-app', install: opts.install });
  }
}

function buildIosDevApp(install?: boolean) {
    const repoRoot = findRepoRoot(process.cwd());
    const iosDir = path.join(repoRoot, 'packages', 'tamer-dev-app', 'ios');
    const appName = 'TamerDevApp';
    const workspacePath = path.join(iosDir, `${appName}.xcworkspace`);
    const projectPath = path.join(iosDir, `${appName}.xcodeproj`);
    const xcproject = fs.existsSync(workspacePath) ? workspacePath : projectPath;
    const flag = xcproject.endsWith('.xcworkspace') ? 'workspace' : 'project';
    const simulatorId = 'A07F36D8-873A-41E0-8B90-3DF328A6B614'; // iPhone 16 Pro iOS 18.5

    console.log('\n🔨 Building TamerDevApp for simulator...');
    execSync(
        `xcodebuild -${flag} "${xcproject}" -scheme "${appName}" -configuration Debug ` +
        `-sdk iphonesimulator -destination "platform=iOS Simulator,name=iPhone 16 Pro,OS=18.5" ` +
        `-derivedDataPath build`,
        { stdio: 'inherit', cwd: iosDir }
    );
    console.log('✅ TamerDevApp built successfully.');

    if (install) {
        const appPath = path.join(iosDir, 'build', 'Build', 'Products', 'Debug-iphonesimulator', `${appName}.app`);
        console.log('\n📲 Installing to simulator...');
        try { execSync(`xcrun simctl boot "${simulatorId}" 2>/dev/null`); } catch { /* already booted */ }
        execSync(`xcrun simctl install "${simulatorId}" "${appPath}"`, { stdio: 'inherit' });
        const bundleId = 'com.nanofuxion.tamerdevapp';
        execSync(`xcrun simctl launch "${simulatorId}" "${bundleId}"`, { stdio: 'inherit' });
        execSync('open -a Simulator', { stdio: 'inherit' });
        console.log('✅ TamerDevApp launched in simulator.');
    }
}

export default buildDevApp;
