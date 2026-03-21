import React, { useState, useEffect, useRef } from 'react';
import { render, Text, Box } from 'ink';
import fs from 'fs';
import path from 'path';
import { resolveHostPaths, HostConfig } from './hostConfig';
import { generateReleaseKeystore, keytoolAvailable } from './androidKeystore';
import { appendEnvVarsIfMissing, type AppendEnvResult } from './appendEnvFile';
import {
  TuiTextInput,
  TuiSelectInput,
  TuiSpinner,
  type SelectItem,
} from './tui';

type Platform = 'android' | 'ios' | 'both';

interface SigningState {
  platform: Platform | null;
  android: {
    keystoreFile: string;
    keyAlias: string;
    storePasswordEnv: string;
    keyPasswordEnv: string;
    keystoreMode: 'generate' | 'existing' | null;
    genKeystorePath: string;
    genPassword: string;
  };
  ios: {
    developmentTeam: string;
    codeSignIdentity: string;
    provisioningProfileSpecifier: string;
  };
  step:
    | 'platform'
    | 'android-keystore-mode'
    | 'android-gen-path'
    | 'android-gen-alias'
    | 'android-gen-password'
    | 'android-generating'
    | 'android-keystore'
    | 'android-alias'
    | 'android-password-env'
    | 'android-key-password-env'
    | 'ios-team'
    | 'ios-identity'
    | 'ios-profile'
    | 'saving'
    | 'done';
  generateError: string | null;
  androidEnvAppend: AppendEnvResult | null;
}

function AndroidKeystoreModeSelect({
  onSelect,
}: {
  onSelect: (mode: 'generate' | 'existing') => void;
}) {
  const canGen = keytoolAvailable();
  const items: SelectItem<'generate' | 'existing'>[] = canGen
    ? [
        { label: 'Generate a new release keystore (JDK keytool)', value: 'generate' },
        { label: 'Use an existing keystore file', value: 'existing' },
      ]
    : [
        {
          label: 'Use an existing keystore file (install a JDK for keytool to generate)',
          value: 'existing',
        },
      ];

  return (
    <Box flexDirection="column">
      <TuiSelectInput
        label="Android release keystore:"
        items={items}
        onSelect={onSelect}
      />
      {!canGen && (
        <Text dimColor>
          keytool not found on PATH / JAVA_HOME. Install a JDK or set JAVA_HOME, then run signing again to generate.
        </Text>
      )}
    </Box>
  );
}

function firstStepForPlatform(p: Platform | null): SigningState['step'] {
  if (p === 'ios') return 'ios-team';
  if (p === 'android' || p === 'both') return 'android-keystore-mode';
  return 'platform';
}

function SigningWizard({ platform: initialPlatform }: { platform?: 'android' | 'ios' }) {
  const [state, setState] = useState<SigningState>({
    platform: initialPlatform || null,
    android: {
      keystoreFile: '',
      keyAlias: 'release',
      storePasswordEnv: 'ANDROID_KEYSTORE_PASSWORD',
      keyPasswordEnv: 'ANDROID_KEY_PASSWORD',
      keystoreMode: null,
      genKeystorePath: 'android/release.keystore',
      genPassword: '',
    },
    ios: {
      developmentTeam: '',
      codeSignIdentity: '',
      provisioningProfileSpecifier: '',
    },
    step: initialPlatform ? firstStepForPlatform(initialPlatform) : 'platform',
    generateError: null,
    androidEnvAppend: null,
  });

  const nextStep = () => {
    setState((s) => {
      if (s.step === 'android-gen-path') {
        return { ...s, step: 'android-gen-alias' as const };
      }
      if (s.step === 'android-gen-alias') {
        return { ...s, step: 'android-gen-password' as const };
      }
      if (s.step === 'android-keystore') {
        return { ...s, step: 'android-alias' as const };
      }
      if (s.step === 'android-alias') {
        return { ...s, step: 'android-password-env' as const };
      }
      if (s.step === 'android-password-env') {
        return { ...s, step: 'android-key-password-env' as const };
      }
      if (s.step === 'android-key-password-env') {
        if (s.platform === 'both') {
          return { ...s, step: 'ios-team' as const };
        }
        return { ...s, step: 'saving' as const };
      }
      if (s.step === 'ios-team') {
        return { ...s, step: 'ios-identity' as const };
      }
      if (s.step === 'ios-identity') {
        return { ...s, step: 'ios-profile' as const };
      }
      if (s.step === 'ios-profile') {
        return { ...s, step: 'saving' as const };
      }
      return s;
    });
  };

  useEffect(() => {
    if (state.step === 'saving') {
      saveConfig();
    }
  }, [state.step]);

  const generateRunId = useRef(0);

  useEffect(() => {
    if (state.step !== 'android-generating') return;
    const runId = ++generateRunId.current;
    let cancelled = false;
    const run = () => {
      let abs = '';
      try {
        const resolved = resolveHostPaths();
        const rel = state.android.genKeystorePath.trim() || 'android/release.keystore';
        abs = path.isAbsolute(rel) ? rel : path.join(resolved.projectRoot, rel);
        const alias = state.android.keyAlias.trim() || 'release';
        const pw = state.android.genPassword;
        const pkg = resolved.config.android?.packageName ?? 'com.example.app';
        const safeOU = pkg.replace(/[,=+]/g, '_');
        const dname = `CN=Android Release, OU=${safeOU}, O=Android, C=US`;
        generateReleaseKeystore({
          keystoreAbsPath: abs,
          alias,
          storePassword: pw,
          keyPassword: pw,
          dname,
        });
        if (cancelled || runId !== generateRunId.current) return;
        setState((s) => ({
          ...s,
          android: {
            ...s.android,
            keystoreFile: rel,
            keyAlias: alias,
            keystoreMode: 'generate',
          },
          step: 'android-password-env',
          generateError: null,
        }));
      } catch (e) {
        const msg = (e as Error).message;
        if (
          abs &&
          fs.existsSync(abs) &&
          (msg.includes('already exists') || msg.includes('Keystore already exists'))
        ) {
          if (cancelled || runId !== generateRunId.current) return;
          const rel = state.android.genKeystorePath.trim() || 'android/release.keystore';
          const alias = state.android.keyAlias.trim() || 'release';
          setState((s) => ({
            ...s,
            android: {
              ...s.android,
              keystoreFile: rel,
              keyAlias: alias,
              keystoreMode: 'generate',
            },
            step: 'android-password-env',
            generateError: null,
          }));
          return;
        }
        if (cancelled || runId !== generateRunId.current) return;
        setState((s) => ({
          ...s,
          step: 'android-gen-password',
          generateError: msg,
        }));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [state.step, state.android.genKeystorePath, state.android.keyAlias, state.android.genPassword]);

  useEffect(() => {
    if (state.step === 'done') {
      setTimeout(() => {
        process.exit(0);
      }, 3000);
    }
  }, [state.step]);

  const saveConfig = async () => {
    try {
      const resolved = resolveHostPaths();
      const configPath = path.join(resolved.projectRoot, 'tamer.config.json');
      let config: HostConfig = {};
      let androidEnvAppend: AppendEnvResult | null = null;

      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }

      if (state.platform === 'android' || state.platform === 'both') {
        config.android = config.android || {};
        config.android.signing = {
          keystoreFile: state.android.keystoreFile,
          keyAlias: state.android.keyAlias,
          storePasswordEnv: state.android.storePasswordEnv,
          keyPasswordEnv: state.android.keyPasswordEnv,
        };

        if (
          state.android.keystoreMode === 'generate' &&
          state.android.genPassword
        ) {
          const storeEnv = state.android.storePasswordEnv.trim() || 'ANDROID_KEYSTORE_PASSWORD';
          const keyEnv = state.android.keyPasswordEnv.trim() || 'ANDROID_KEY_PASSWORD';
          androidEnvAppend = appendEnvVarsIfMissing(resolved.projectRoot, {
            [storeEnv]: state.android.genPassword,
            [keyEnv]: state.android.genPassword,
          });
        }
      }

      if (state.platform === 'ios' || state.platform === 'both') {
        config.ios = config.ios || {};
        config.ios.signing = {
          developmentTeam: state.ios.developmentTeam,
          ...(state.ios.codeSignIdentity && { codeSignIdentity: state.ios.codeSignIdentity }),
          ...(state.ios.provisioningProfileSpecifier && { provisioningProfileSpecifier: state.ios.provisioningProfileSpecifier }),
        };
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      const gitignorePath = path.join(resolved.projectRoot, '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        let gitignore = fs.readFileSync(gitignorePath, 'utf8');
        const additions = [
          '.env.local',
          '*.jks',
          '*.keystore',
        ];
        for (const addition of additions) {
          if (!gitignore.includes(addition)) {
            gitignore += `\n${addition}\n`;
          }
        }
        fs.writeFileSync(gitignorePath, gitignore);
      }

      setState((s) => ({
        ...s,
        step: 'done',
        androidEnvAppend:
          state.platform === 'android' || state.platform === 'both' ? androidEnvAppend : null,
      }));
    } catch (error) {
      console.error('Error saving config:', error);
      process.exit(1);
    }
  };

  if (state.step === 'done') {
    return (
      <Box flexDirection="column">
        <Text color="green">✅ Signing configuration saved to tamer.config.json</Text>
        {(state.platform === 'android' || state.platform === 'both') && (
          <Box flexDirection="column" marginTop={1}>
            <Text>Android signing configured:</Text>
            <Text dimColor>  Keystore: {state.android.keystoreFile}</Text>
            <Text dimColor>  Alias: {state.android.keyAlias}</Text>
            {state.androidEnvAppend?.keys.length ? (
              <Text>
                Appended {state.androidEnvAppend.keys.join(', ')} to {state.androidEnvAppend.file} (existing keys left unchanged).
              </Text>
            ) : state.androidEnvAppend?.skippedAll ? (
              <Text dimColor>
                {state.androidEnvAppend.file} already defines the signing env vars; left unchanged.
              </Text>
            ) : (
              <>
                <Text>Set environment variables (or add them to .env / .env.local):</Text>
                <Text dimColor>  export {state.android.storePasswordEnv}="your-keystore-password"</Text>
                <Text dimColor>  export {state.android.keyPasswordEnv}="your-key-password"</Text>
              </>
            )}
          </Box>
        )}
        {(state.platform === 'ios' || state.platform === 'both') && (
          <Box flexDirection="column" marginTop={1}>
            <Text>iOS signing configured:</Text>
            <Text dimColor>  Team ID: {state.ios.developmentTeam}</Text>
            {state.ios.codeSignIdentity && <Text dimColor>  Identity: {state.ios.codeSignIdentity}</Text>}
          </Box>
        )}
        <Box flexDirection="column" marginTop={1}>
          {state.platform === 'android' && (
            <>
              <Text>Run `t4l build android -p` to build this platform with signing.</Text>
              <Text dimColor>`t4l build -p` (no platform) builds both Android and iOS.</Text>
            </>
          )}
          {state.platform === 'ios' && (
            <>
              <Text>Run `t4l build ios -p` to build this platform with signing.</Text>
              <Text dimColor>`t4l build -p` (no platform) builds both Android and iOS.</Text>
            </>
          )}
          {state.platform === 'both' && (
            <>
              <Text>Run `t4l build -p` to build both platforms with signing.</Text>
              <Text dimColor>Or: `t4l build android -p` / `t4l build ios -p` for one platform.</Text>
            </>
          )}
        </Box>
      </Box>
    );
  }

  if (state.step === 'saving') {
    return (
      <Box>
        <TuiSpinner label="Saving configuration..." />
      </Box>
    );
  }

  if (state.step === 'android-generating') {
    return (
      <Box flexDirection="column">
        <TuiSpinner label="Running keytool to create release keystore..." />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {state.step === 'platform' && (
        <TuiSelectInput<Platform>
          label="Select platform(s) to configure signing:"
          items={[
            { label: 'Android', value: 'android' },
            { label: 'iOS', value: 'ios' },
            { label: 'Both', value: 'both' },
          ]}
          onSelect={(platform) => {
            setState((s) => ({ ...s, platform, step: firstStepForPlatform(platform) }));
          }}
        />
      )}
      {state.step === 'android-keystore-mode' && (
        <AndroidKeystoreModeSelect
          onSelect={(mode) => {
            setState((s) => ({
              ...s,
              android: { ...s.android, keystoreMode: mode },
              step: mode === 'generate' ? 'android-gen-path' : 'android-keystore',
              generateError: null,
            }));
          }}
        />
      )}
      {state.step === 'android-gen-path' && (
        <TuiTextInput
          label="Keystore output path (relative to project root):"
          defaultValue={state.android.genKeystorePath}
          onSubmitValue={(v) => {
            const p = v.trim() || 'android/release.keystore';
            setState((s) => ({ ...s, android: { ...s.android, genKeystorePath: p } }));
          }}
          onSubmit={nextStep}
          hint="Default: android/release.keystore (gitignored pattern *.keystore)"
        />
      )}
      {state.step === 'android-gen-alias' && (
        <TuiTextInput
          label="Android key alias:"
          defaultValue={state.android.keyAlias}
          onSubmitValue={(v) => {
            setState((s) => ({ ...s, android: { ...s.android, keyAlias: v } }));
          }}
          onSubmit={nextStep}
        />
      )}
      {state.step === 'android-gen-password' && (
        <Box flexDirection="column">
          {state.generateError ? (
            <Text color="red">{state.generateError}</Text>
          ) : null}
          <TuiTextInput
            label="Keystore and key password (same for both; shown as you type):"
            value={state.android.genPassword}
            onChange={(v) => setState((s) => ({ ...s, android: { ...s.android, genPassword: v } }))}
            onSubmitValue={(pw) => {
              setState((s) => ({
                ...s,
                android: { ...s.android, genPassword: pw.trim() },
                step: 'android-generating',
                generateError: null,
              }));
            }}
            onSubmit={() => {}}
            hint="At least 6 characters (JDK keytool). Same value used for -storepass and -keypass."
          />
        </Box>
      )}
      {state.step === 'android-keystore' && (
        <TuiTextInput
          label="Android keystore file path (relative to project root or android/):"
          defaultValue={state.android.keystoreFile}
          onSubmitValue={(v) => {
            setState((s) => ({ ...s, android: { ...s.android, keystoreFile: v } }));
          }}
          onSubmit={nextStep}
          hint="Example: android/app/my-release-key.keystore or ./my-release-key.keystore"
        />
      )}
      {state.step === 'android-alias' && (
        <TuiTextInput
          label="Android key alias:"
          defaultValue={state.android.keyAlias}
          onSubmitValue={(v) => {
            setState((s) => ({ ...s, android: { ...s.android, keyAlias: v } }));
          }}
          onSubmit={nextStep}
        />
      )}
      {state.step === 'android-password-env' && (
        <TuiTextInput
          label="Keystore password environment variable name:"
          defaultValue={state.android.storePasswordEnv || 'ANDROID_KEYSTORE_PASSWORD'}
          onSubmitValue={(v) => {
            setState((s) => ({ ...s, android: { ...s.android, storePasswordEnv: v } }));
          }}
          onSubmit={() => {
            setState((s) => ({ ...s, step: 'android-key-password-env' }));
          }}
          hint="Default: ANDROID_KEYSTORE_PASSWORD (will be written to .env / .env.local)"
        />
      )}
      {state.step === 'android-key-password-env' && (
        <TuiTextInput
          label="Key password environment variable name:"
          defaultValue={state.android.keyPasswordEnv || 'ANDROID_KEY_PASSWORD'}
          onSubmitValue={(v) => {
            setState((s) => ({ ...s, android: { ...s.android, keyPasswordEnv: v } }));
          }}
          onSubmit={() => {
            if (state.platform === 'both') {
              setState((s) => ({ ...s, step: 'ios-team' }));
            } else {
              setState((s) => ({ ...s, step: 'saving' }));
            }
          }}
          hint="Default: ANDROID_KEY_PASSWORD (will be written to .env / .env.local)"
        />
      )}
      {state.step === 'ios-team' && (
        <TuiTextInput
          label="iOS Development Team ID:"
          defaultValue={state.ios.developmentTeam}
          onSubmitValue={(v) => {
            setState((s) => ({ ...s, ios: { ...s.ios, developmentTeam: v } }));
          }}
          onSubmit={nextStep}
          hint="Example: ABC123DEF4 (found in Apple Developer account)"
        />
      )}
      {state.step === 'ios-identity' && (
        <TuiTextInput
          label="iOS Code Sign Identity (optional, press Enter to skip):"
          defaultValue={state.ios.codeSignIdentity}
          onSubmitValue={(v) => {
            setState((s) => ({ ...s, ios: { ...s.ios, codeSignIdentity: v } }));
          }}
          onSubmit={() => {
            setState((s) => ({ ...s, step: 'ios-profile' }));
          }}
          hint='Example: "iPhone Developer" or "Apple Development"'
        />
      )}
      {state.step === 'ios-profile' && (
        <TuiTextInput
          label="iOS Provisioning Profile Specifier (optional, press Enter to skip):"
          defaultValue={state.ios.provisioningProfileSpecifier}
          onSubmitValue={(v) => {
            setState((s) => ({ ...s, ios: { ...s.ios, provisioningProfileSpecifier: v } }));
          }}
          onSubmit={() => {
            setState((s) => ({ ...s, step: 'saving' }));
          }}
          hint="UUID of the provisioning profile"
        />
      )}
    </Box>
  );
}

export default async function signing(platform?: 'android' | 'ios') {
  const { waitUntilExit } = render(<SigningWizard platform={platform} />);
  await waitUntilExit();
}
