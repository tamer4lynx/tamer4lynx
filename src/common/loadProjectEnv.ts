import fs from 'fs';
import path from 'path';
import { parse } from 'dotenv';

const TAMER_CONFIG = 'tamer.config.json';

function findTamerProjectRoot(start: string): string {
  let dir = path.resolve(start);
  const root = path.parse(dir).root;
  while (dir !== root) {
    const p = path.join(dir, TAMER_CONFIG);
    if (fs.existsSync(p)) return dir;
    dir = path.dirname(dir);
  }
  return start;
}

export function loadProjectEnv(cwd: string = process.cwd()): void {
  const root = findTamerProjectRoot(cwd);
  const merged: Record<string, string> = {};
  for (const name of ['.env', '.env.local']) {
    const full = path.join(root, name);
    if (!fs.existsSync(full)) continue;
    try {
      Object.assign(merged, parse(fs.readFileSync(full)));
    } catch {
      /* ignore malformed .env */
    }
  }
  for (const [k, v] of Object.entries(merged)) {
    if (process.env[k] === undefined) {
      process.env[k] = v;
    }
  }
}
