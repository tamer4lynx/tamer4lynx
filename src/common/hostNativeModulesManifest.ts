/** Copied into the iOS app bundle next to dev-client; DevClientModule reads it if attachSupportedModuleClassNames was never set. */
export const TAMER_HOST_NATIVE_MODULES_FILENAME = 'tamer-host-native-modules.json'

export function buildHostNativeModulesManifestJson(moduleClassNames: string[]): string {
  return `${JSON.stringify({ moduleClassNames }, null, 2)}\n`
}
