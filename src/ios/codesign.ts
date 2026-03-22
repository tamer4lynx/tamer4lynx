import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import {
    listCodeSigningIdentities,
    listProvisioningProfiles,
    type ProvisioningProfileInfo,
} from '../common/iosSigningDiscovery';

const SIGNABLE_EXTENSIONS = new Set([
    '.app', '.framework', '.dylib', '.appex', '.so',
]);

function run(cmd: string, opts: { cwd?: string } = {}): string {
    return execSync(cmd, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        ...opts,
    }).trim();
}

function extractEntitlementsPlist(profilePath: string): string | null {
    try {
        const xml = run(`security cms -D -i "${profilePath}"`);
        const tmp = path.join(os.tmpdir(), `t4l-ent-${Date.now()}.plist`);
        fs.writeFileSync(tmp, xml, 'utf8');
        const json = run(`plutil -convert json -o - "${tmp}"`);
        fs.unlinkSync(tmp);
        const plist = JSON.parse(json) as Record<string, unknown>;
        const ent = plist.Entitlements as Record<string, unknown> | undefined;
        if (!ent) return null;

        let lines = '<?xml version="1.0" encoding="UTF-8"?>\n';
        lines += '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n';
        lines += '<plist version="1.0">\n<dict>\n';
        for (const [k, v] of Object.entries(ent)) {
            lines += `  <key>${k}</key>\n`;
            if (typeof v === 'boolean') {
                lines += v ? '  <true/>\n' : '  <false/>\n';
            } else if (typeof v === 'string') {
                lines += `  <string>${v}</string>\n`;
            } else if (Array.isArray(v)) {
                lines += '  <array>\n';
                for (const item of v) lines += `    <string>${item}</string>\n`;
                lines += '  </array>\n';
            }
        }
        lines += '</dict>\n</plist>\n';
        return lines;
    } catch {
        return null;
    }
}

function resolveSigningBinary(itemPath: string): string {
    const ext = path.extname(itemPath);
    if (ext === '.framework') {
        const name = path.basename(itemPath, '.framework');
        return path.join(itemPath, name);
    }
    if (ext === '.app' || ext === '.appex') {
        const infoPlist = path.join(itemPath, 'Info.plist');
        if (fs.existsSync(infoPlist)) {
            try {
                const exe = run(`/usr/libexec/PlistBuddy -c "Print :CFBundleExecutable" "${infoPlist}"`);
                if (exe) return path.join(itemPath, exe);
            } catch { /* fall through */ }
        }
    }
    return itemPath;
}

function signPath(
    itemPath: string,
    identity: string,
    entitlementsFile: string | null,
    profilePath: string | null,
): void {
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
        const children = fs.readdirSync(itemPath).map(c => path.join(itemPath, c));
        for (const child of children) {
            if (fs.statSync(child).isDirectory()) {
                signPath(child, identity, entitlementsFile, profilePath);
            }
        }
    }

    const ext = path.extname(itemPath);
    if (!SIGNABLE_EXTENSIONS.has(ext)) return;

    if ((ext === '.app' || ext === '.appex') && profilePath) {
        const dest = path.join(itemPath, 'embedded.mobileprovision');
        try { fs.unlinkSync(dest); } catch { /* ok */ }
        fs.copyFileSync(profilePath, dest);
    }

    const target = resolveSigningBinary(itemPath);
    if (!fs.existsSync(target)) return;

    const useEntitlements = (ext === '.app' || ext === '.appex') && entitlementsFile;
    const entFlag = useEntitlements ? ` --entitlements "${entitlementsFile}"` : '';
    const cmd = `codesign -f -s "${identity}" --generate-entitlement-der${entFlag} "${itemPath}"`;
    execSync(cmd, { stdio: 'inherit' });
}

export function findMatchingProfile(
    bundleId: string | undefined,
    teamId: string,
): ProvisioningProfileInfo | null {
    if (!bundleId) return null;
    const profiles = listProvisioningProfiles(bundleId);
    const match = profiles.find(p => p.teamIds.includes(teamId));
    return match ?? profiles[0] ?? null;
}

export function resolveIdentitySha1(configuredIdentity: string | undefined): string | null {
    const identities = listCodeSigningIdentities();
    if (identities.length === 0) return null;
    if (configuredIdentity) {
        const exact = identities.find(i => i.label === configuredIdentity);
        if (exact) return exact.sha1;
        const partial = identities.find(i => i.label.includes(configuredIdentity));
        if (partial) return partial.sha1;
    }
    const dev = identities.find(i => i.label.startsWith('Apple Development:'));
    return dev?.sha1 ?? identities[0].sha1;
}

export function codesignApp(
    appPath: string,
    opts: {
        identity: string;
        profilePath?: string;
        entitlementsPlist?: string;
    },
): void {
    if (!fs.existsSync(appPath)) {
        throw new Error(`App bundle not found: ${appPath}`);
    }

    let entFile: string | null = null;
    let tmpEntFile: string | null = null;

    if (opts.entitlementsPlist) {
        entFile = opts.entitlementsPlist;
    } else if (opts.profilePath) {
        const xml = extractEntitlementsPlist(opts.profilePath);
        if (xml) {
            tmpEntFile = path.join(os.tmpdir(), `t4l-entitlements-${Date.now()}.plist`);
            fs.writeFileSync(tmpEntFile, xml, 'utf8');
            entFile = tmpEntFile;
        }
    }

    try {
        console.log(`🔏 Signing ${path.basename(appPath)}...`);
        signPath(appPath, opts.identity, entFile, opts.profilePath ?? null);

        try {
            run(`codesign -v "${appPath}"`);
            console.log('✅ Code signature verified.');
        } catch (e: any) {
            console.warn(`⚠️ Signature verification warning: ${e.message}`);
        }
    } finally {
        if (tmpEntFile && fs.existsSync(tmpEntFile)) fs.unlinkSync(tmpEntFile);
    }
}
