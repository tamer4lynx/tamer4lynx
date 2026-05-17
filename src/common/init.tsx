import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import React, { useState, useEffect, useCallback } from 'react';
import { fixTsconfigReferencesForBuild } from './tsconfigUtils';
import { runTamerComponentTypesPipeline } from './syncTamerComponentTypes';
import {
  detectPackageManager,
  installTamerStack,
  runPackageManagerInstall,
  type PackageManager,
  type TamerInstallStack,
} from './add';
import { render, Text, Box } from 'ink';
import {
  Wizard,
  TuiTextInput,
  TuiSelectInput,
  TuiConfirmInput,
  TuiMultiSelectInput,
  TuiSpinner,
  StatusBox,
  isValidAndroidPackage,
  isValidIosBundleId,
} from './tui';

type ScaffoldTemplate = 'rspeedy' | 'vue-lynx';
type InstallChoice = 'core' | 'dev';
type Step =
  | 'welcome'
  | 'scaffold-template'
  | 'scaffold-dir'
  | 'install-stack'
  | 'android-app'
  | 'android-pkg'
  | 'android-sdk'
  | 'ios-reuse'
  | 'ios-app'
  | 'ios-bundle'
  | 'saving'
  | 'done';

export type InitOptions = {
  template?: ScaffoldTemplate;
  dir?: string;
  install?: 'core' | 'dev' | 'none';
  pm?: PackageManager;
  yes?: boolean;
};

type LynxProjectInfo = {
  dir: string;
  rel: string;
  nested: boolean;
  source: 'root' | 'nested' | 'none';
};

type InitPlan = {
  root: string;
  lynxProject: LynxProjectInfo;
  shouldScaffold: boolean;
  scaffoldTemplate: ScaffoldTemplate;
  scaffoldDir: string;
  installRoot: string;
  pm: PackageManager;
  installStack: TamerInstallStack | 'none';
};

const LYNX_CONFIG_FILES = ['lynx.config.ts', 'lynx.config.js', 'lynx.config.mjs'];

function resolveSdkInput(raw: string): { resolved: string; message?: string } {
  let androidSdk = raw.trim();
  if (androidSdk.startsWith('$') && /^[A-Z0-9_]+$/.test(androidSdk.slice(1))) {
    const envVar = androidSdk.slice(1);
    const envValue = process.env[envVar];
    if (envValue) {
      androidSdk = envValue;
      return { resolved: androidSdk, message: `Using ${androidSdk} from $${envVar}` };
    }
    return {
      resolved: androidSdk,
      message: `Environment variable $${envVar} not found - path saved as typed.`,
    };
  }
  return { resolved: androidSdk };
}

function readJson(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function writeJson(filePath: string, value: Record<string, unknown>) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function hasLynxConfig(dir: string): boolean {
  return LYNX_CONFIG_FILES.some((name) => fs.existsSync(path.join(dir, name)));
}

function hasRspeedy(dir: string): boolean {
  const pkg = readJson(path.join(dir, 'package.json'));
  const deps = {
    ...((pkg?.dependencies as Record<string, unknown> | undefined) ?? {}),
    ...((pkg?.devDependencies as Record<string, unknown> | undefined) ?? {}),
  };
  return '@lynx-js/rspeedy' in deps;
}

function isLynxProject(dir: string): boolean {
  return hasLynxConfig(dir) || hasRspeedy(dir);
}

function isEffectivelyEmpty(dir: string): boolean {
  if (!fs.existsSync(dir)) return true;
  return fs.readdirSync(dir).filter((name) => !['.git', '.DS_Store'].includes(name)).length === 0;
}

function findNestedLynxProjects(root: string): LynxProjectInfo[] {
  const out: LynxProjectInfo[] = [];
  const ignored = new Set(['.git', 'node_modules', 'dist', 'android', 'ios', '.tamer']);
  function visit(dir: string, depth: number) {
    if (depth > 2 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || ignored.has(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      if (isLynxProject(abs)) {
        const rel = path.relative(root, abs).split(path.sep).join('/');
        out.push({ dir: abs, rel, nested: true, source: 'nested' });
        continue;
      }
      visit(abs, depth + 1);
    }
  }
  visit(root, 1);
  return out;
}

function detectLynxProject(root: string, dirOverride?: string): LynxProjectInfo {
  if (dirOverride?.trim()) {
    const rel = dirOverride.trim();
    const abs = path.resolve(root, rel);
    return {
      dir: abs,
      rel: rel === '.' ? '' : rel.split(path.sep).join('/'),
      nested: rel !== '.',
      source: fs.existsSync(abs) && isLynxProject(abs) ? (rel === '.' ? 'root' : 'nested') : 'none',
    };
  }

  if (isLynxProject(root)) {
    return { dir: root, rel: '', nested: false, source: 'root' };
  }

  const nested = findNestedLynxProjects(root);
  if (nested.length > 0) return nested[0]!;

  return { dir: root, rel: '', nested: false, source: 'none' };
}

function defaultAppName(root: string): string {
  const base = path.basename(root).replace(/[^a-zA-Z0-9]+/g, ' ').trim() || 'TamerApp';
  return base.replace(/\b\w/g, (m) => m.toUpperCase()).replace(/\s+/g, '');
}

function defaultProjectName(root: string): string {
  const base = path.basename(root).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || 'app';
}

function defaultPackageSegment(root: string): string {
  const base = path.basename(root).toLowerCase().replace(/[^a-z0-9_]+/g, '');
  if (!base) return 'app';
  return /^[a-z]/.test(base) ? base : `app${base}`;
}

function defaultPackageName(root: string): string {
  return `com.${defaultPackageSegment(root)}`;
}

function defaultAndroidSdk(): string {
  if (process.env.ANDROID_HOME) return process.env.ANDROID_HOME;
  if (process.env.ANDROID_SDK_ROOT) return process.env.ANDROID_SDK_ROOT;
  return '~/Library/Android/sdk';
}

function resolveScaffoldDir(root: string, opts: InitOptions, detected: LynxProjectInfo): string {
  if (opts.dir?.trim()) return opts.dir.trim();
  if (detected.source !== 'none') return detected.rel || '.';
  return isEffectivelyEmpty(root) ? '.' : defaultProjectName(root);
}

function mergeWorkspace(root: string, workspaceRel: string): string | null {
  if (!workspaceRel || workspaceRel === '.') return null;
  const pkgPath = path.join(root, 'package.json');
  const pkg = readJson(pkgPath) ?? {
    name: defaultProjectName(root),
    version: '0.0.0',
  };
  pkg.private = true;

  const existing = pkg.workspaces;
  if (Array.isArray(existing)) {
    if (!existing.includes(workspaceRel)) pkg.workspaces = [...existing, workspaceRel];
  } else if (existing && typeof existing === 'object' && Array.isArray((existing as { packages?: unknown }).packages)) {
    const current = [...((existing as { packages: string[] }).packages)];
    if (!current.includes(workspaceRel)) current.push(workspaceRel);
    pkg.workspaces = { ...(existing as Record<string, unknown>), packages: current };
  } else {
    pkg.workspaces = [workspaceRel];
  }

  writeJson(pkgPath, pkg);
  return `Ensured root workspace includes ${workspaceRel}`;
}

function createCommand(pm: PackageManager, template: ScaffoldTemplate, dir: string): { cmd: string; args: string[] } {
  const pkg = template === 'rspeedy' ? 'rspeedy@latest' : 'vue-lynx@latest';
  const packageName = defaultProjectName(process.cwd());
  const scaffoldArgs =
    template === 'rspeedy'
      ? [dir, '--template', 'react-ts', '--tools', 'biome', '--packageName', packageName]
      : [dir, '--template', 'vue-ts', '--tools', 'biome', '--packageName', packageName];

  if (pm === 'npm') return { cmd: 'npm', args: ['create', pkg, '--', ...scaffoldArgs] };
  if (pm === 'pnpm') return { cmd: 'pnpm', args: ['create', pkg, ...scaffoldArgs] };
  return { cmd: 'bun', args: ['create', pkg, ...scaffoldArgs] };
}

function runCommand(cmd: string, args: string[], cwd: string) {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with code ${result.status}`);
  }
}

function buildInitialPlan(opts: InitOptions): InitPlan {
  const root = process.cwd();
  const detected = detectLynxProject(root, opts.dir);
  const scaffoldDir = resolveScaffoldDir(root, opts, detected);
  const scaffoldAbs = path.resolve(root, scaffoldDir);
  const shouldScaffold = detected.source === 'none' && !isLynxProject(scaffoldAbs);
  const lynxProject = shouldScaffold
    ? {
        dir: scaffoldAbs,
        rel: scaffoldDir === '.' ? '' : scaffoldDir.split(path.sep).join('/'),
        nested: scaffoldDir !== '.',
        source: scaffoldDir === '.' ? 'root' : 'nested',
      } satisfies LynxProjectInfo
    : detected;
  return {
    root,
    lynxProject,
    shouldScaffold,
    scaffoldTemplate: opts.template ?? 'rspeedy',
    scaffoldDir,
    installRoot: root,
    pm: opts.pm ?? detectPackageManager(root),
    installStack: opts.install ?? 'core',
  };
}

function writeConfigAndTsconfig(plan: InitPlan, values: {
  androidAppName: string;
  androidPackageName: string;
  androidSdk: string;
  iosAppName: string;
  iosBundleId: string;
}): string[] {
  const config: Record<string, unknown> = {
    android: {
      appName: values.androidAppName || undefined,
      packageName: values.androidPackageName || undefined,
      sdk: values.androidSdk || undefined,
    },
    ios: {
      appName: values.iosAppName || undefined,
      bundleId: values.iosBundleId || undefined,
    },
    paths: { androidDir: 'android', iosDir: 'ios' },
    syncTamerComponentTypes: true,
  };
  if (plan.lynxProject.rel) config.lynxProject = plan.lynxProject.rel;

  const configPath = path.join(plan.root, 'tamer.config.json');
  writeJson(configPath, config);
  const lines = [`Generated tamer.config.json at ${configPath}`];

  const tsconfigCandidates = plan.lynxProject.rel
    ? [path.join(plan.root, plan.lynxProject.rel, 'tsconfig.json'), path.join(plan.root, 'tsconfig.json')]
    : [path.join(plan.root, 'tsconfig.json')];

  for (const tsconfigPath of tsconfigCandidates) {
    if (!fs.existsSync(tsconfigPath)) continue;
    try {
      if (fixTsconfigReferencesForBuild(tsconfigPath)) {
        lines.push(`Flattened ${path.relative(plan.root, tsconfigPath)} (fixed TS6310)`);
      }
      break;
    } catch (e) {
      lines.push(`Could not update ${tsconfigPath}: ${(e as Error).message}`);
    }
  }

  try {
    runTamerComponentTypesPipeline(plan.root);
    lines.push('Generated .tamer/tamer-components.d.ts and updated tsconfig include (when applicable)');
  } catch (e) {
    lines.push(`Could not sync tamer component types: ${(e as Error).message}`);
  }

  return lines;
}

function findLynxConfigFile(lynxDir: string): string | null {
  for (const name of LYNX_CONFIG_FILES) {
    const filePath = path.join(lynxDir, name);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function packageHasDependency(root: string, packageName: string): boolean {
  const pkg = readJson(path.join(root, 'package.json'));
  const deps = {
    ...((pkg?.dependencies as Record<string, unknown> | undefined) ?? {}),
    ...((pkg?.devDependencies as Record<string, unknown> | undefined) ?? {}),
  };
  return packageName in deps;
}

function shouldInjectTamerPlugin(plan: InitPlan): boolean {
  return plan.installStack !== 'none' || packageHasDependency(plan.installRoot, '@tamer4lynx/tamer-plugin');
}

function injectPluginTamerIntoLynxConfig(plan: InitPlan): string | null {
  if (!shouldInjectTamerPlugin(plan)) return null;
  const configPath = findLynxConfigFile(plan.lynxProject.dir);
  if (!configPath) return null;
  let source = fs.readFileSync(configPath, 'utf8');
  if (source.includes('@tamer4lynx/tamer-plugin') || source.includes('pluginTamer(')) {
    return null;
  }

  const importLine = `import { pluginTamer } from '@tamer4lynx/tamer-plugin';`;
  const importMatches = [...source.matchAll(/^import[\s\S]*?;$/gm)];
  if (importMatches.length > 0) {
    const last = importMatches[importMatches.length - 1]!;
    const insertAt = (last.index ?? 0) + last[0].length;
    source = `${source.slice(0, insertAt)}\n${importLine}${source.slice(insertAt)}`;
  } else {
    source = `${importLine}\n${source}`;
  }

  if (/plugins\s*:\s*\[/.test(source)) {
    source = source.replace(/plugins\s*:\s*\[/, 'plugins: [\n    pluginTamer(),\n    ');
    source = source.replace(/(pluginTamer\(\),\n\s*)([^\n\]]+)\],/, '$1$2\n  ],');
  } else if (/defineConfig\s*\(\s*\{/.test(source)) {
    source = source.replace(/defineConfig\s*\(\s*\{/, 'defineConfig({\n  plugins: [pluginTamer()],');
  } else if (/export\s+default\s+\{/.test(source)) {
    source = source.replace(/export\s+default\s+\{/, 'export default {\n  plugins: [pluginTamer()],');
  } else {
    return null;
  }

  fs.writeFileSync(configPath, source);
  return `Injected pluginTamer() into ${path.relative(plan.root, configPath)}`;
}

async function executePlan(plan: InitPlan, values: {
  androidAppName: string;
  androidPackageName: string;
  androidSdk: string;
  iosAppName: string;
  iosBundleId: string;
}): Promise<string[]> {
  const lines: string[] = [];

  if (plan.shouldScaffold) {
    const { cmd, args } = createCommand(plan.pm, plan.scaffoldTemplate, plan.scaffoldDir);
    lines.push(`Creating ${plan.scaffoldTemplate} Lynx project at ${plan.scaffoldDir}`);
    runCommand(cmd, args, plan.root);
  }

  const workspaceLine = mergeWorkspace(plan.root, plan.lynxProject.rel);
  if (workspaceLine) lines.push(workspaceLine);

  if (fs.existsSync(path.join(plan.root, 'package.json'))) {
    lines.push(`Installing workspace dependencies with ${plan.pm}`);
    runPackageManagerInstall(plan.root, plan.pm);
  }

  lines.push(...writeConfigAndTsconfig(plan, values));

  if (plan.installStack !== 'none') {
    await installTamerStack(plan.installStack, { cwd: plan.installRoot, pm: plan.pm });
    lines.push(`Installed ${plan.installStack === 'dev' ? 'dev stack' : 'core packages'} at ${plan.installRoot}`);
  }

  const injectLine = injectPluginTamerIntoLynxConfig(plan);
  if (injectLine) lines.push(injectLine);

  if (plan.installStack !== 'none' || injectLine) {
    runTamerComponentTypesPipeline(plan.root);
    lines.push('Refreshed Tamer component types');
  }

  return lines;
}

function InitWizard({ opts }: { opts: InitOptions }) {
  const [plan, setPlan] = useState<InitPlan>(() => buildInitialPlan(opts));
  const [step, setStep] = useState<Step>('welcome');
  const [androidAppName, setAndroidAppName] = useState(defaultAppName(process.cwd()));
  const [androidPackageName, setAndroidPackageName] = useState(defaultPackageName(process.cwd()));
  const [androidSdk, setAndroidSdk] = useState('');
  const [sdkHint, setSdkHint] = useState<string | undefined>();
  const [iosAppName, setIosAppName] = useState(defaultAppName(process.cwd()));
  const [iosBundleId, setIosBundleId] = useState(defaultPackageName(process.cwd()));
  const [customizeIos, setCustomizeIos] = useState(false);
  const [pkgError, setPkgError] = useState<string | undefined>();
  const [bundleError, setBundleError] = useState<string | undefined>();
  const [doneMessage, setDoneMessage] = useState<string[]>([]);

  const run = useCallback(async () => {
    try {
      const lines = await executePlan(plan, {
        androidAppName,
        androidPackageName,
        androidSdk,
        iosAppName: customizeIos ? iosAppName : androidAppName,
        iosBundleId: customizeIos ? iosBundleId : androidPackageName,
      });
      setDoneMessage(lines);
    } catch (e) {
      setDoneMessage([`Init failed: ${(e as Error).message}`]);
    }
    setStep('done');
    setTimeout(() => process.exit(0), 2000);
  }, [androidAppName, androidPackageName, androidSdk, iosAppName, iosBundleId, customizeIos, plan]);

  useEffect(() => {
    if (step !== 'saving') return;
    void run();
  }, [step, run]);

  if (step === 'welcome') {
    const projectLine =
      plan.lynxProject.source === 'root'
        ? 'Found a root Lynx project.'
        : plan.lynxProject.source === 'nested'
          ? `Found nested Lynx project: ${plan.lynxProject.rel}`
          : `No Lynx project found. Will create ${plan.scaffoldTemplate} at ${plan.scaffoldDir}.`;
    return (
      <Box flexDirection="column">
        <Text bold>Tamer4Lynx init</Text>
        <Text dimColor>{projectLine}</Text>
        <Text dimColor>Package manager: {plan.pm}</Text>
        <Box marginTop={1}>
          <TuiSelectInput<'start'>
            label="Continue?"
            items={[{ label: 'Start', value: 'start' }]}
            onSelect={() => setStep(plan.shouldScaffold && !opts.template ? 'scaffold-template' : 'install-stack')}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'scaffold-template') {
    return (
      <Wizard step={1} total={8} title="Lynx starter">
        <TuiSelectInput<ScaffoldTemplate>
          label="Choose a starter:"
          items={[
            { label: 'Rspeedy React TypeScript + Biome (default)', value: 'rspeedy' },
            { label: 'Vue Lynx TypeScript + Biome', value: 'vue-lynx' },
          ]}
          onSelect={(template) => {
            setPlan((p) => ({ ...p, scaffoldTemplate: template }));
            setStep(opts.dir ? 'install-stack' : 'scaffold-dir');
          }}
        />
      </Wizard>
    );
  }

  if (step === 'scaffold-dir') {
    return (
      <Wizard step={2} total={8} title="Project directory">
        <TuiTextInput
          key={step}
          label="Lynx project directory:"
          defaultValue=""
          placeholder={plan.scaffoldDir}
          submitDefaultOnEmpty
          emptySubmitValue={plan.scaffoldDir}
          onSubmitValue={(v) => {
            const dir = v.trim() || plan.scaffoldDir;
            const rel = dir === '.' ? '' : dir.split(path.sep).join('/');
            setPlan((p) => ({
              ...p,
              scaffoldDir: dir,
              lynxProject: {
                dir: path.resolve(p.root, dir),
                rel,
                nested: dir !== '.',
                source: dir === '.' ? 'root' : 'nested',
              },
            }));
          }}
          onSubmit={() => setStep('install-stack')}
        />
      </Wizard>
    );
  }

  if (step === 'install-stack') {
    return (
      <Wizard step={3} total={8} title="Tamer packages">
        <TuiMultiSelectInput<InstallChoice>
          label="Install Tamer packages:"
          items={[
            { label: 'Core packages', value: 'core', selected: plan.installStack === 'core' },
            { label: 'Dev packages', value: 'dev', selected: plan.installStack === 'dev' },
          ]}
          hint="Space toggles, Enter continues. Selecting dev installs the full dev stack."
          onSubmit={(values) => {
            const installStack = values.includes('dev') ? 'dev' : values.includes('core') ? 'core' : 'none';
            setPlan((p) => ({ ...p, installStack }));
            setStep('android-app');
          }}
        />
      </Wizard>
    );
  }

  if (step === 'android-app') {
    return (
      <Wizard step={4} total={8} title="Android app name">
        <TuiTextInput
          key={step}
          label="Android app name:"
          defaultValue=""
          placeholder={androidAppName}
          submitDefaultOnEmpty
          emptySubmitValue={androidAppName}
          onSubmitValue={(v) => setAndroidAppName(v)}
          onSubmit={() => setStep('android-pkg')}
        />
      </Wizard>
    );
  }

  if (step === 'android-pkg') {
    return (
      <Wizard step={5} total={8} title="Android package name">
        <TuiTextInput
          key={step}
          label="Android package name (e.g. com.example.app):"
          defaultValue=""
          placeholder={androidPackageName}
          submitDefaultOnEmpty
          emptySubmitValue={androidPackageName}
          error={pkgError}
          onChange={() => setPkgError(undefined)}
          onSubmitValue={(v) => {
            const t = v.trim();
            if (t && !isValidAndroidPackage(t)) {
              setPkgError('Use reverse-DNS form: com.mycompany.app');
              return false;
            }
            setAndroidPackageName(t);
            setPkgError(undefined);
          }}
          onSubmit={() => setStep('android-sdk')}
        />
      </Wizard>
    );
  }

  if (step === 'android-sdk') {
    return (
      <Wizard step={6} total={8} title="Android SDK">
        <TuiTextInput
          key={step}
          label="Android SDK path (e.g. ~/Library/Android/sdk or $ANDROID_HOME):"
          defaultValue=""
          placeholder={defaultAndroidSdk()}
          submitDefaultOnEmpty
          emptySubmitValue={defaultAndroidSdk()}
          onSubmitValue={(v) => {
            const { resolved, message } = resolveSdkInput(v);
            setAndroidSdk(resolved);
            setSdkHint(message);
          }}
          onSubmit={() => setStep('ios-reuse')}
          hint={sdkHint}
        />
      </Wizard>
    );
  }

  if (step === 'ios-reuse') {
    return (
      <Wizard step={7} total={8} title="iOS">
        <TuiConfirmInput
          label="Use the same app name and bundle ID for iOS as Android?"
          defaultYes
          onConfirm={(useSame) => {
            setCustomizeIos(!useSame);
            if (useSame) {
              setStep('saving');
            } else {
              setIosAppName(androidAppName);
              setIosBundleId(androidPackageName);
              setStep('ios-app');
            }
          }}
          hint="Yes = skip iOS fields and reuse Android values"
        />
      </Wizard>
    );
  }

  if (step === 'ios-app') {
    return (
      <Wizard step={8} total={8} title="iOS app name">
        <TuiTextInput
          key={step}
          label="iOS app name:"
          defaultValue=""
          placeholder={iosAppName}
          submitDefaultOnEmpty
          emptySubmitValue={iosAppName}
          onSubmitValue={(v) => setIosAppName(v)}
          onSubmit={() => setStep('ios-bundle')}
        />
      </Wizard>
    );
  }

  if (step === 'ios-bundle') {
    return (
      <Wizard step={8} total={8} title="iOS bundle ID">
        <TuiTextInput
          key={step}
          label="iOS bundle ID (e.g. com.example.app):"
          defaultValue=""
          placeholder={iosBundleId}
          submitDefaultOnEmpty
          emptySubmitValue={iosBundleId}
          error={bundleError}
          onChange={() => setBundleError(undefined)}
          onSubmitValue={(v) => {
            const t = v.trim();
            if (t && !isValidIosBundleId(t)) {
              setBundleError('Use reverse-DNS form: com.mycompany.App');
              return false;
            }
            setIosBundleId(t);
            setBundleError(undefined);
          }}
          onSubmit={() => setStep('saving')}
        />
      </Wizard>
    );
  }

  if (step === 'saving') {
    return (
      <Box>
        <TuiSpinner label="Bootstrapping Tamer4Lynx project..." />
      </Box>
    );
  }

  if (step === 'done') {
    const failed = doneMessage.some((line) => line.startsWith('Init failed:'));
    return (
      <Box flexDirection="column">
        <StatusBox variant={failed ? 'error' : 'success'} title={failed ? 'Failed' : 'Done'}>
          {doneMessage.map((line, i) => (
            <Text key={i} color={failed ? 'red' : 'green'}>
              {line}
            </Text>
          ))}
        </StatusBox>
      </Box>
    );
  }

  return null;
}

async function runYes(opts: InitOptions) {
  const plan = buildInitialPlan({ ...opts, yes: true });
  const appName = defaultAppName(plan.root);
  const packageName = defaultPackageName(plan.root);
  const lines = await executePlan(plan, {
    androidAppName: appName,
    androidPackageName: packageName,
    androidSdk: defaultAndroidSdk(),
    iosAppName: appName,
    iosBundleId: packageName,
  });
  for (const line of lines) console.log(line);
}

function normalizeOptions(opts: Record<string, unknown>): InitOptions {
  const out: InitOptions = {};
  if (typeof opts.template === 'string') {
    if (opts.template !== 'rspeedy' && opts.template !== 'vue-lynx') {
      throw new Error('--template must be one of: rspeedy, vue-lynx');
    }
    out.template = opts.template;
  }
  if (typeof opts.dir === 'string') out.dir = opts.dir;
  if (typeof opts.install === 'string') {
    if (opts.install !== 'core' && opts.install !== 'dev' && opts.install !== 'none') {
      throw new Error('--install must be one of: core, dev, none');
    }
    out.install = opts.install;
  }
  if (typeof opts.pm === 'string') {
    if (opts.pm !== 'npm' && opts.pm !== 'pnpm' && opts.pm !== 'bun') {
      throw new Error('--pm must be one of: npm, pnpm, bun');
    }
    out.pm = opts.pm;
  }
  if (opts.yes === true) out.yes = true;
  return out;
}

export default async function init(opts: InitOptions = {}) {
  const normalized = normalizeOptions(opts as Record<string, unknown>);
  if (normalized.yes) {
    await runYes(normalized);
    return;
  }
  const { waitUntilExit } = render(<InitWizard opts={normalized} />);
  await waitUntilExit();
}
