import fs from 'fs';
import path from 'path';
import { resolveHostPaths, type HostConfig, type ResolvedPaths } from './hostConfig';
import { extractTeamIdFromIdentityLabel } from './iosSigningDiscovery';

type Resolved = ResolvedPaths & { config: HostConfig };

export function isAndroidSigningConfigured(resolved: Resolved): boolean {
  const signing = resolved.config.android?.signing;
  const hasConfig = Boolean(signing?.keystoreFile?.trim() && signing?.keyAlias?.trim());
  const signingProps = path.join(resolved.androidDir, 'signing.properties');
  const hasProps = fs.existsSync(signingProps);
  return hasConfig || hasProps;
}

export function isIosSigningConfigured(resolved: Resolved): boolean {
  const signing = resolved.config.ios?.signing;
  const team = signing?.developmentTeam?.trim();
  if (team) return true;
  const id = signing?.codeSignIdentity?.trim();
  if (id && extractTeamIdFromIdentityLabel(id)) return true;
  return false;
}

export type BuildPlatformFilter = 'android' | 'ios';

export function assertProductionSigningReady(filter: BuildPlatformFilter): void {
  const resolved = resolveHostPaths();
  const missing: string[] = [];

  if (filter === 'android' && !isAndroidSigningConfigured(resolved)) {
    missing.push('Android: run `t4l signing android`, then `t4l build android -p`.');
  }
  if (filter === 'ios' && !isIosSigningConfigured(resolved)) {
    missing.push('iOS: run `t4l signing ios`, then `t4l build ios -p`.');
  }

  if (missing.length === 0) return;

  console.error('\n❌ Production build (`-p`) needs signing configured for this platform.');
  for (const line of missing) {
    console.error(`   ${line}`);
  }
  console.error('');
  process.exit(1);
}
