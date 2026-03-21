import fs from 'fs';
import path from 'path';
import { resolveHostPaths, type HostConfig, type ResolvedPaths } from './hostConfig';

type Resolved = ResolvedPaths & { config: HostConfig };

export function isAndroidSigningConfigured(resolved: Resolved): boolean {
  const signing = resolved.config.android?.signing;
  const hasConfig = Boolean(signing?.keystoreFile?.trim() && signing?.keyAlias?.trim());
  const signingProps = path.join(resolved.androidDir, 'signing.properties');
  const hasProps = fs.existsSync(signingProps);
  return hasConfig || hasProps;
}

export function isIosSigningConfigured(resolved: Resolved): boolean {
  const team = resolved.config.ios?.signing?.developmentTeam?.trim();
  return Boolean(team);
}

export type BuildPlatformFilter = 'android' | 'ios' | 'all';

export function assertProductionSigningReady(filter: BuildPlatformFilter): void {
  const resolved = resolveHostPaths();

  const needAndroid = filter === 'android' || filter === 'all';
  const needIos = filter === 'ios' || filter === 'all';
  const missing: string[] = [];

  if (needAndroid && !isAndroidSigningConfigured(resolved)) {
    missing.push('Android: run `t4l signing android`, then `t4l build android -p`.');
  }
  if (needIos && !isIosSigningConfigured(resolved)) {
    missing.push('iOS: run `t4l signing ios`, then `t4l build ios -p`.');
  }

  if (missing.length === 0) return;

  console.error('\n❌ Production build (`-p`) needs signing configured for the platform(s) you are building.');
  for (const line of missing) {
    console.error(`   ${line}`);
  }
  console.error(
    '\n   `t4l build -p` (no platform) builds both Android and iOS; use `t4l build android -p` or `t4l build ios -p` for one platform only.\n'
  );
  process.exit(1);
}
