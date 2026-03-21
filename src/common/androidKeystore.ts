import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export function normalizeJavaHome(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const t = raw.trim().replace(/^["']|["']$/g, '');
  return t || undefined;
}

function discoverJavaHomeMacOs(): string | undefined {
  if (process.platform !== 'darwin') return undefined;
  try {
    const out = execFileSync('/usr/libexec/java_home', [], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
      .trim()
      .split('\n')[0]
      ?.trim();
    if (out && fs.existsSync(path.join(out, 'bin', 'keytool'))) return out;
  } catch {
    // no JDK registered with /usr/libexec/java_home
  }
  return undefined;
}

export function resolveKeytoolPath(): string {
  const jh = normalizeJavaHome(process.env.JAVA_HOME);
  const win = process.platform === 'win32';
  const keytoolName = win ? 'keytool.exe' : 'keytool';
  if (jh) {
    const p = path.join(jh, 'bin', keytoolName);
    if (fs.existsSync(p)) return p;
  }
  const mac = discoverJavaHomeMacOs();
  if (mac) {
    const p = path.join(mac, 'bin', keytoolName);
    if (fs.existsSync(p)) return p;
  }
  return 'keytool';
}

export function keytoolAvailable(): boolean {
  const tryRun = (cmd: string) => {
    try {
      execFileSync(cmd, ['-help'], { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  };
  if (tryRun('keytool')) return true;
  const fromJavaHome = resolveKeytoolPath();
  if (fromJavaHome !== 'keytool' && fs.existsSync(fromJavaHome)) {
    return tryRun(fromJavaHome);
  }
  return false;
}

export function generateReleaseKeystore(opts: {
  keystoreAbsPath: string;
  alias: string;
  storePassword: string;
  keyPassword: string;
  dname: string;
}): void {
  const keytool = resolveKeytoolPath();
  const dir = path.dirname(opts.keystoreAbsPath);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(opts.keystoreAbsPath)) {
    throw new Error(`Keystore already exists: ${opts.keystoreAbsPath}`);
  }
  if (!opts.storePassword || !opts.keyPassword) {
    throw new Error(
      'JDK keytool requires a keystore and key password of at least 6 characters for -genkeypair. Enter a password or use an existing keystore.'
    );
  }
  const args = [
    '-genkeypair',
    '-v',
    '-keystore',
    opts.keystoreAbsPath,
    '-alias',
    opts.alias,
    '-keyalg',
    'RSA',
    '-keysize',
    '2048',
    '-validity',
    '10000',
    '-storepass',
    opts.storePassword,
    '-keypass',
    opts.keyPassword,
    '-dname',
    opts.dname,
  ];
  try {
    execFileSync(keytool, args, { stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e: unknown) {
    const err = e as { stdout?: Buffer; stderr?: Buffer; message?: string };
    const fromKeytool = [err.stdout, err.stderr]
      .filter(Boolean)
      .map((b) => Buffer.from(b!).toString('utf8'))
      .join('\n')
      .trim();
    throw new Error(fromKeytool || err.message || 'keytool failed');
  }
}
