import fs from 'fs';
import path from 'path';
import type { HostConfig } from '../common/hostConfig';

/** Default env names (values read at runtime; document in .env / CI). */
export const DEFAULT_APP_STORE_CONNECT_API_KEY_PATH_ENV = 'APP_STORE_CONNECT_API_KEY_PATH';
export const DEFAULT_APP_STORE_CONNECT_API_KEY_ID_ENV = 'APP_STORE_CONNECT_API_KEY_ID';
export const DEFAULT_APP_STORE_CONNECT_ISSUER_ID_ENV = 'APP_STORE_CONNECT_ISSUER_ID';

export type AppStoreConnectAuth = {
    keyPath: string;
    keyId: string;
    issuerId: string;
};

/**
 * When all three env vars are set (using configured or default env *names*), returns resolved auth.
 * If none are set, returns null (use legacy manual codesign + zip IPA).
 * If only some are set, throws — user must set all three for App Store export.
 */
export function resolveAppStoreConnectForIpa(
    config: HostConfig,
    projectRoot: string,
): AppStoreConnectAuth | null {
    const asc = config.ios?.appStoreConnect;
    const pathEnv = asc?.apiKeyPathEnv?.trim() || DEFAULT_APP_STORE_CONNECT_API_KEY_PATH_ENV;
    const idEnv = asc?.apiKeyIdEnv?.trim() || DEFAULT_APP_STORE_CONNECT_API_KEY_ID_ENV;
    const issuerEnv = asc?.issuerIdEnv?.trim() || DEFAULT_APP_STORE_CONNECT_ISSUER_ID_ENV;

    const keyPathRaw = process.env[pathEnv]?.trim();
    const keyId = process.env[idEnv]?.trim();
    const issuerId = process.env[issuerEnv]?.trim();

    const any = Boolean(keyPathRaw || keyId || issuerId);
    const all = Boolean(keyPathRaw && keyId && issuerId);
    if (!any) return null;
    if (!all) {
        throw new Error(
            `App Store Connect API: set all of ${pathEnv}, ${idEnv}, ${issuerEnv} (or unset all to use the legacy IPA zip).`,
        );
    }

    const keyPath = path.isAbsolute(keyPathRaw!)
        ? keyPathRaw!
        : path.join(projectRoot, keyPathRaw!);
    if (!fs.existsSync(keyPath)) {
        throw new Error(`App Store Connect API key file not found: ${keyPath} (${pathEnv})`);
    }

    return { keyPath, keyId: keyId!, issuerId: issuerId! };
}

export function xcodeAppStoreConnectAuthFlags(auth: AppStoreConnectAuth): string {
    const kp = auth.keyPath.replace(/"/g, '\\"');
    return (
        ` -allowProvisioningUpdates` +
        ` -authenticationKeyPath "${kp}"` +
        ` -authenticationKeyID "${auth.keyId}"` +
        ` -authenticationKeyIssuerID "${auth.issuerId}"`
    );
}

export function writeAppStoreExportOptionsPlist(outPath: string, teamId: string): void {
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>teamID</key>
  <string>${teamId}</string>
  <key>compileBitcode</key>
  <false/>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
`;
    fs.writeFileSync(outPath, plist, 'utf8');
}

export function findExportedIpa(exportDir: string): string | null {
    if (!fs.existsSync(exportDir)) return null;
    const entries = fs.readdirSync(exportDir);
    const ipa = entries.find((f) => f.endsWith('.ipa'));
    return ipa ? path.join(exportDir, ipa) : null;
}
