import fs from 'fs';
import path from 'path';
import React, { useState, useEffect, useCallback } from 'react';
import { fixTsconfigReferencesForBuild } from './tsconfigUtils';
import { runTamerComponentTypesPipeline } from './syncTamerComponentTypes';
import { render, Text, Box } from 'ink';
import {
  Wizard,
  TuiTextInput,
  TuiSelectInput,
  TuiConfirmInput,
  TuiSpinner,
  StatusBox,
  isValidAndroidPackage,
  isValidIosBundleId,
} from './tui';

type Step =
  | 'welcome'
  | 'android-app'
  | 'android-pkg'
  | 'android-sdk'
  | 'ios-reuse'
  | 'ios-app'
  | 'ios-bundle'
  | 'lynx-path'
  | 'saving'
  | 'done';

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
      message: `Environment variable $${envVar} not found — path saved as typed.`,
    };
  }
  return { resolved: androidSdk };
}

function InitWizard() {
  const [step, setStep] = useState<Step>('welcome');
  const [androidAppName, setAndroidAppName] = useState('');
  const [androidPackageName, setAndroidPackageName] = useState('');
  const [androidSdk, setAndroidSdk] = useState('');
  const [sdkHint, setSdkHint] = useState<string | undefined>();
  const [iosAppName, setIosAppName] = useState('');
  const [iosBundleId, setIosBundleId] = useState('');
  const [lynxProject, setLynxProject] = useState('');
  const [pkgError, setPkgError] = useState<string | undefined>();
  const [bundleError, setBundleError] = useState<string | undefined>();
  const [doneMessage, setDoneMessage] = useState<string[]>([]);

  const writeConfigAndTsconfig = useCallback(() => {
    const config: Record<string, unknown> = {
      android: {
        appName: androidAppName || undefined,
        packageName: androidPackageName || undefined,
        sdk: androidSdk || undefined,
      },
      ios: {
        appName: iosAppName || undefined,
        bundleId: iosBundleId || undefined,
      },
      paths: { androidDir: 'android', iosDir: 'ios' },
      syncTamerComponentTypes: true,
    };
    if (lynxProject.trim()) config.lynxProject = lynxProject.trim();

    const configPath = path.join(process.cwd(), 'tamer.config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    const lines = [`Generated tamer.config.json at ${configPath}`];

    const tsconfigCandidates = lynxProject.trim()
      ? [
          path.join(process.cwd(), lynxProject.trim(), 'tsconfig.json'),
          path.join(process.cwd(), 'tsconfig.json'),
        ]
      : [path.join(process.cwd(), 'tsconfig.json')];

    for (const tsconfigPath of tsconfigCandidates) {
      if (!fs.existsSync(tsconfigPath)) continue;
      try {
        if (fixTsconfigReferencesForBuild(tsconfigPath)) {
          lines.push(`Flattened ${path.relative(process.cwd(), tsconfigPath)} (fixed TS6310)`);
        }
        break;
      } catch (e) {
        lines.push(`Could not update ${tsconfigPath}: ${(e as Error).message}`);
      }
    }

    try {
      runTamerComponentTypesPipeline(process.cwd());
      lines.push('Generated .tamer/tamer-components.d.ts and updated tsconfig include (when applicable)');
    } catch (e) {
      lines.push(`Could not sync tamer component types: ${(e as Error).message}`);
    }

    setDoneMessage(lines);
    setStep('done');
    setTimeout(() => process.exit(0), 2000);
  }, [androidAppName, androidPackageName, androidSdk, iosAppName, iosBundleId, lynxProject]);

  useEffect(() => {
    if (step !== 'saving') return;
    writeConfigAndTsconfig();
  }, [step, writeConfigAndTsconfig]);

  if (step === 'welcome') {
    return (
      <Box flexDirection="column">
        <Text bold>Tamer4Lynx init</Text>
        <Text dimColor>Set up tamer.config.json for your project.</Text>
        <Box marginTop={1}>
          <TuiSelectInput<'start'>
            label="Continue?"
            items={[{ label: 'Start', value: 'start' }]}
            onSelect={() => setStep('android-app')}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'android-app') {
    return (
      <Wizard step={1} total={6} title="Android app name">
        <TuiTextInput
          key={step}
          label="Android app name:"
          defaultValue={androidAppName}
          onSubmitValue={(v) => setAndroidAppName(v)}
          onSubmit={() => setStep('android-pkg')}
        />
      </Wizard>
    );
  }

  if (step === 'android-pkg') {
    return (
      <Wizard step={2} total={6} title="Android package name">
        <TuiTextInput
          key={step}
          label="Android package name (e.g. com.example.app):"
          defaultValue={androidPackageName}
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
      <Wizard step={3} total={6} title="Android SDK">
        <TuiTextInput
          key={step}
          label="Android SDK path (e.g. ~/Library/Android/sdk or $ANDROID_HOME):"
          defaultValue={androidSdk}
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
      <Wizard step={4} total={6} title="iOS">
        <TuiConfirmInput
          label="Use the same app name and bundle ID for iOS as Android?"
          defaultYes={false}
          onConfirm={(yes) => {
            if (yes) {
              setIosAppName(androidAppName);
              setIosBundleId(androidPackageName);
              setStep('lynx-path');
            } else {
              setStep('ios-app');
            }
          }}
          hint="No = enter iOS-specific values next"
        />
      </Wizard>
    );
  }

  if (step === 'ios-app') {
    return (
      <Wizard step={4} total={6} title="iOS app name">
        <TuiTextInput
          key={step}
          label="iOS app name:"
          defaultValue={iosAppName}
          onSubmitValue={(v) => setIosAppName(v)}
          onSubmit={() => setStep('ios-bundle')}
        />
      </Wizard>
    );
  }

  if (step === 'ios-bundle') {
    return (
      <Wizard step={5} total={6} title="iOS bundle ID">
        <TuiTextInput
          key={step}
          label="iOS bundle ID (e.g. com.example.app):"
          defaultValue={iosBundleId}
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
          onSubmit={() => setStep('lynx-path')}
        />
      </Wizard>
    );
  }

  if (step === 'lynx-path') {
    return (
      <Wizard step={6} total={6} title="Lynx project">
        <TuiTextInput
          key={step}
          label="Lynx project path relative to project root (optional, e.g. packages/example):"
          defaultValue={lynxProject}
          onSubmitValue={(v) => setLynxProject(v)}
          onSubmit={() => setStep('saving')}
          hint="Press Enter with empty to skip"
        />
      </Wizard>
    );
  }

  if (step === 'saving') {
    return (
      <Box>
        <TuiSpinner label="Writing tamer.config.json and updating tsconfig…" />
      </Box>
    );
  }

  if (step === 'done') {
    return (
      <Box flexDirection="column">
        <StatusBox variant="success" title="Done">
          {doneMessage.map((line, i) => (
            <Text key={i} color="green">
              {line}
            </Text>
          ))}
        </StatusBox>
      </Box>
    );
  }

  return null;
}

export default async function init() {
  const { waitUntilExit } = render(<InitWizard />);
  await waitUntilExit();
}
