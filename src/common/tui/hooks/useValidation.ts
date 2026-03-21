export function isValidAndroidPackage(name: string): boolean {
  const s = name.trim();
  if (!s) return false;
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(s);
}

export function isValidIosBundleId(id: string): boolean {
  const s = id.trim();
  if (!s) return false;
  return /^[a-zA-Z][a-zA-Z0-9_-]*(\.[a-zA-Z0-9][a-zA-Z0-9_-]*)+$/.test(s);
}

export function isValidEnvVarRef(token: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(token);
}
