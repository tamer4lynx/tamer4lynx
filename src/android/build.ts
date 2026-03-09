import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { resolveHostPaths, resolveDevAppPaths } from '../common/hostConfig';
import android_bundle from './bundle';

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

async function buildApk(opts: { install?: boolean; target?: string } = {}) {
    const target = opts.target ?? 'host';
    const resolved = target === 'dev-app'
        ? resolveDevAppPaths(findRepoRoot(process.cwd()))
        : resolveHostPaths();

    await android_bundle({ target });

    const androidDir = resolved.androidDir;
    const gradlew = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
    const task = opts.install ? 'installDebug' : 'assembleDebug';
    console.log(`\n🔨 Building ${opts.install ? 'and installing' : ''} APK...`);
    execSync(`"${gradlew}" ${task}`, { stdio: 'inherit', cwd: androidDir });
    console.log(`✅ APK ${opts.install ? 'installed' : 'built'} successfully.`);
}

export default buildApk;
