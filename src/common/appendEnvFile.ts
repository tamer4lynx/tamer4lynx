import fs from 'fs';
import path from 'path';
import { parse } from 'dotenv';

function keysDefinedInFile(filePath: string): Set<string> {
  if (!fs.existsSync(filePath)) return new Set();
  try {
    return new Set(Object.keys(parse(fs.readFileSync(filePath, 'utf8'))));
  } catch {
    return new Set();
  }
}

function formatEnvLine(key: string, value: string): string {
  if (/[\r\n]/.test(value) || /^\s|\s$/.test(value) || /[#"'\\=]/.test(value)) {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `${key}="${escaped}"`;
  }
  return `${key}=${value}`;
}

export type AppendEnvResult = {
  file: string;
  keys: string[];
  /** True when every variable was already defined in the file (nothing written). */
  skippedAll?: boolean;
};

/**
 * Appends KEY=value lines to `.env.local` (preferred) or `.env` if that file already exists and `.env.local` does not.
 * Creates `.env.local` when neither exists. Skips keys already present in the target file. Does not remove or rewrite existing lines.
 */
export function appendEnvVarsIfMissing(
  projectRoot: string,
  vars: Record<string, string | undefined>
): AppendEnvResult | null {
  const entries = Object.entries(vars).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return null;

  const envLocal = path.join(projectRoot, '.env.local');
  const envDefault = path.join(projectRoot, '.env');
  let target: string;
  if (fs.existsSync(envLocal)) target = envLocal;
  else if (fs.existsSync(envDefault)) target = envDefault;
  else target = envLocal;

  const existing = keysDefinedInFile(target);
  const lines: string[] = [];
  const appendedKeys: string[] = [];
  for (const [k, v] of entries) {
    if (existing.has(k)) continue;
    lines.push(formatEnvLine(k, v!));
    appendedKeys.push(k);
  }
  if (lines.length === 0) {
    return {
      file: path.basename(target),
      keys: [],
      skippedAll: entries.length > 0,
    };
  }

  let prefix = '';
  if (fs.existsSync(target)) {
    const cur = fs.readFileSync(target, 'utf8');
    prefix = cur.length === 0 ? '' : cur.endsWith('\n') ? cur : `${cur}\n`;
  }
  const block = lines.join('\n') + '\n';
  fs.writeFileSync(target, prefix + block, 'utf8');
  return { file: path.basename(target), keys: appendedKeys };
}
