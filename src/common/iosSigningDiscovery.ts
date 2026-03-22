import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

export type CodeSigningIdentity = {
  sha1: string;
  label: string;
};

export type ProvisioningProfileInfo = {
  filePath: string;
  uuid: string;
  name: string;
  teamIds: string[];
  applicationIdentifier: string;
  appIdPatterns: string[];
  expiration?: string;
};

function run(cmd: string, opts: { cwd?: string } = {}): string {
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: opts.cwd,
  }).trim();
}

export function listCodeSigningIdentities(): CodeSigningIdentity[] {
  try {
    const out = run('security find-identity -v -p codesigning');
    const lines = out.split('\n');
    const result: CodeSigningIdentity[] = [];
    for (const line of lines) {
      const m = line.match(/^\s*\d+\)\s+([0-9A-F]{40})\s+"(.+)"\s*$/);
      if (m) {
        result.push({ sha1: m[1], label: m[2] });
      }
    }
    return result;
  } catch {
    return [];
  }
}

/** Apple lists identities like `Apple Development: user@email.com (ABC123XY45)` — team ID is the parenthetical. */
export function extractTeamIdFromIdentityLabel(label: string): string | null {
  const m = label.match(/\(([A-Z0-9]{10})\)/);
  return m?.[1] ?? null;
}

export function teamIdFromCertificateSha1(sha1: string): string | null {
  try {
    const pem = execSync(`security find-certificate -a -Z ${sha1} -p`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (!pem.includes('BEGIN CERTIFICATE')) return null;
    const subject = execSync('openssl x509 -noout -subject -nameopt RFC2253', {
      input: pem,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    for (const m of subject.matchAll(/OU\s*=\s*([A-Z0-9]{10})/g)) {
      if (m[1]) return m[1];
    }
    const legacy = subject.match(/OU=([A-Z0-9]{10})/);
    return legacy?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Prefer keychain OU; fall back to identity label (matches Xcode / security output). */
export function resolveDevelopmentTeamFromIdentity(identity: CodeSigningIdentity): string {
  return (
    teamIdFromCertificateSha1(identity.sha1) ??
    extractTeamIdFromIdentityLabel(identity.label) ??
    ''
  );
}

function decodeProvisioningProfilePlist(filePath: string): Record<string, unknown> | null {
  try {
    const xml = execSync(`security cms -D -i "${filePath}"`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const tmp = path.join(os.tmpdir(), `t4l-prov-${path.basename(filePath)}.plist`);
    fs.writeFileSync(tmp, xml, 'utf8');
    const json = execSync(`plutil -convert json -o - "${tmp}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    fs.unlinkSync(tmp);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function listProvisioningProfiles(bundleIdFilter?: string): ProvisioningProfileInfo[] {
  const dir = path.join(
    os.homedir(),
    'Library/MobileDevice/Provisioning Profiles'
  );
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mobileprovision'));
  const out: ProvisioningProfileInfo[] = [];

  for (const f of files) {
    const filePath = path.join(dir, f);
    const plist = decodeProvisioningProfilePlist(filePath);
    if (!plist) continue;

    const uuid = String(plist.UUID ?? '');
    const name = String(plist.Name ?? uuid);
    const teamIds = Array.isArray(plist.TeamIdentifier)
      ? (plist.TeamIdentifier as string[])
      : [];
    const ent = plist.Entitlements as Record<string, unknown> | undefined;
    const appId = String(ent?.['application-identifier'] ?? '');
    const parts = appId.split('.');
    const patterns = appId
      ? [appId, parts.length > 1 ? parts.slice(1).join('.') : appId]
      : [];

    const exp = plist.ExpirationDate as string | undefined;

    const info: ProvisioningProfileInfo = {
      filePath,
      uuid,
      name,
      teamIds,
      applicationIdentifier: appId,
      appIdPatterns: patterns.filter(Boolean),
      expiration: exp,
    };

    if (bundleIdFilter?.trim()) {
      const bid = bundleIdFilter.trim();
      const matches =
        appId === bid ||
        appId.endsWith(`.${bid}`) ||
        appId.includes(`.${bid}`) ||
        patterns.some((p) => p === bid || p.endsWith(bid));
      if (!matches && appId) continue;
    }

    out.push(info);
  }

  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
