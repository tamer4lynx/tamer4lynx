import fs from 'fs';
import path from 'path';
import { loadExtensionConfig } from './config';

function codegen() {
  const cwd = process.cwd();
  const config = loadExtensionConfig(cwd);

  if (!config) {
    console.error('❌ No lynx.ext.json or tamer.json found. Run from an extension package root.');
    process.exit(1);
  }

  const srcDir = path.join(cwd, 'src');
  const generatedDir = path.join(cwd, 'generated');
  fs.mkdirSync(generatedDir, { recursive: true });

  const dtsFiles = findDtsFiles(srcDir);
  const modules = extractLynxModules(dtsFiles);

  if (modules.length === 0) {
    console.log('ℹ️ No @lynxmodule declarations found in src/. Add /** @lynxmodule */ to your module class.');
    return;
  }

  for (const mod of modules) {
    const tsContent = `export type { ${mod} } from '../src/index.js';
`;
    const outPath = path.join(generatedDir, `${mod}.ts`);
    fs.writeFileSync(outPath, tsContent);
    console.log(`✅ Generated ${outPath}`);
  }

  if (config.android) {
    const androidGenerated = path.join(cwd, 'android', 'src', 'main', 'kotlin', config.android.moduleClassName.replace(/\./g, '/').replace(/[^/]+$/, ''), 'generated');
    fs.mkdirSync(androidGenerated, { recursive: true });
    console.log(`ℹ️ Android generated dir: ${androidGenerated} (spec generation coming soon)`);
  }

  if (config.ios) {
    const iosGenerated = path.join(cwd, 'ios', 'generated');
    fs.mkdirSync(iosGenerated, { recursive: true });
    console.log(`ℹ️ iOS generated dir: ${iosGenerated} (spec generation coming soon)`);
  }

  console.log('✨ Codegen complete.');
}

function findDtsFiles(dir: string): string[] {
  const result: string[] = [];
  if (!fs.existsSync(dir)) return result;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) result.push(...findDtsFiles(full));
    else if (e.name.endsWith('.d.ts')) result.push(full);
  }
  return result;
}

function extractLynxModules(files: string[]): string[] {
  const modules: string[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const regex = /\/\*\*\s*@lynxmodule\s*\*\/\s*export\s+declare\s+class\s+(\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        modules.push(m[1]);
      }
    }
  }
  return modules;
}

export default codegen;
