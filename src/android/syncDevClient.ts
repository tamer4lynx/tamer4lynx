import fs from "fs";
import path from "path";
import { resolveHostPaths, findDevClientPackage } from "../common/hostConfig";
import {
  fetchAndPatchTemplateProvider,
  getStandaloneMainActivity,
} from "../explorer/patches";

function readAndSubstituteTemplate(
  templatePath: string,
  vars: Record<string, string>
): string {
  const raw = fs.readFileSync(templatePath, "utf-8");
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
    raw
  );
}

function patchAppLogService(appPath: string): void {
  if (!fs.existsSync(appPath)) return;
  const raw = fs.readFileSync(appPath, "utf-8");
  const patched = raw.replace(
    /private void initLynxService\(\)\s*\{[\s\S]*?\n\s*}\s*\n\s*private void initFresco\(\)/,
    `private void initLynxService() {
    try {
      Object logService = Class.forName("com.nanofuxion.tamerdevclient.TamerRelogLogService")
        .getField("INSTANCE")
        .get(null);
      logService.getClass().getMethod("init", android.content.Context.class).invoke(logService, this);
      LynxServiceCenter.inst().registerService((com.lynx.tasm.service.ILynxLogService) logService);
    } catch (Exception ignored) {
      LynxServiceCenter.inst().registerService(LynxLogService.INSTANCE);
    }
    LynxServiceCenter.inst().registerService(LynxImageService.getInstance());
    LynxServiceCenter.inst().registerService(LynxHttpService.INSTANCE);
  }
  private void initFresco()`
  );
  if (patched !== raw) {
    fs.writeFileSync(appPath, patched);
  }
}

async function syncDevClient(opts?: { forceProduction?: boolean; includeDevClient?: boolean }) {
  let resolved: ReturnType<typeof resolveHostPaths>;
  try {
    resolved = resolveHostPaths();
  } catch (error: any) {
    console.error(`❌ Error loading configuration: ${error.message}`);
    process.exit(1);
  }

  const { config, androidDir: rootDir } = resolved;
  const packageName = config.android?.packageName!;
  const appName = config.android?.appName!;
  const packagePath = packageName.replace(/\./g, "/");
  const javaDir = path.join(rootDir, "app", "src", "main", "java", packagePath);
  const kotlinDir = path.join(rootDir, "app", "src", "main", "kotlin", packagePath);

  if (!fs.existsSync(javaDir) || !fs.existsSync(kotlinDir)) {
    console.error("❌ Android project not found. Run `tamer android create` first.");
    process.exit(1);
  }

  const devClientPkg = findDevClientPackage(resolved.projectRoot);
  const includeDevClient = opts?.includeDevClient ?? (opts?.forceProduction ? false : !!devClientPkg);
  const hasDevClient = includeDevClient && devClientPkg;
  const devMode = hasDevClient ? "embedded" : "standalone";
  const devServer = config.devServer
    ? {
        host: config.devServer.host ?? "10.0.2.2",
        port: config.devServer.port ?? config.devServer.httpPort ?? 3000,
      }
    : undefined;

  const vars = { packageName, appName, devMode, devServer, projectRoot: resolved.projectRoot };

  const [templateProviderSource] = await Promise.all([
    fetchAndPatchTemplateProvider(vars),
  ]);

  fs.writeFileSync(path.join(javaDir, "TemplateProvider.java"), templateProviderSource);
  fs.writeFileSync(path.join(kotlinDir, "MainActivity.kt"), getStandaloneMainActivity(vars));
  patchAppLogService(path.join(javaDir, "App.java"));

  const appDir = path.join(rootDir, "app");
  const mainDir = path.join(appDir, "src", "main");
  const manifestPath = path.join(mainDir, "AndroidManifest.xml");
  if (hasDevClient) {
    const templateDir = path.join(devClientPkg, "android", "templates");
    const templateVars = { PACKAGE_NAME: packageName, APP_NAME: appName };
    const devClientFiles = [
      "DevClientManager.kt",
      "DevServerPrefs.kt",
      "ProjectActivity.kt",
      "PortraitCaptureActivity.kt",
    ];
    for (const f of devClientFiles) {
      const src = path.join(templateDir, f);
      if (fs.existsSync(src)) {
        const content = readAndSubstituteTemplate(src, templateVars);
        fs.writeFileSync(path.join(kotlinDir, f), content);
      }
    }
    let manifest = fs.readFileSync(manifestPath, "utf-8");
    const projectActivityEntry = '        <activity android:name=".ProjectActivity" android:exported="false" android:taskAffinity="" android:launchMode="singleTask" android:documentLaunchMode="always" android:windowSoftInputMode="adjustResize" />';
    const portraitCaptureEntry = '        <activity android:name=".PortraitCaptureActivity" android:screenOrientation="portrait" android:stateNotNeeded="true" android:theme="@style/zxing_CaptureTheme" android:windowSoftInputMode="stateAlwaysHidden" />';
    if (!manifest.includes("ProjectActivity")) {
      manifest = manifest.replace(/(\s*)(<\/application>)/, `${projectActivityEntry}\n$1$2`);
    } else {
      manifest = manifest.replace(/\s*<activity android:name="\.ProjectActivity"[^\/]*\/>\n?/g, projectActivityEntry + "\n");
    }
    if (!manifest.includes("PortraitCaptureActivity")) {
      manifest = manifest.replace(/(\s*)(<\/application>)/, `${portraitCaptureEntry}\n$1$2`);
    } else {
      manifest = manifest.replace(/\s*<activity android:name="\.PortraitCaptureActivity"[^\/]*\/>\n?/g, portraitCaptureEntry + "\n");
    }
    const mainActivityTag = manifest.match(/<activity[^>]*android:name="\.MainActivity"[^>]*>/);
    if (mainActivityTag && !mainActivityTag[0].includes("windowSoftInputMode")) {
      manifest = manifest.replace(
        /(<activity\s+android:name="\.MainActivity"[^>]*)(>)/,
        "$1 android:windowSoftInputMode=\"adjustResize\"$2"
      );
    }
    fs.writeFileSync(manifestPath, manifest);
    console.log("✅ Synced dev client (TemplateProvider, MainActivity, ProjectActivity, DevClientManager)");
  } else {
    for (const f of ["DevClientManager.kt", "DevServerPrefs.kt", "ProjectActivity.kt", "PortraitCaptureActivity.kt", "DevLauncherActivity.kt"]) {
      try { fs.rmSync(path.join(kotlinDir, f)); } catch { /* ignore */ }
    }
    let manifest = fs.readFileSync(manifestPath, "utf-8");
    manifest = manifest.replace(/\s*<activity android:name="\.ProjectActivity"[^\/]*\/>\n?/g, "");
    manifest = manifest.replace(/\s*<activity android:name="\.PortraitCaptureActivity"[^\/]*\/>\n?/g, "");
    const mainActivityTag = manifest.match(/<activity[^>]*android:name="\.MainActivity"[^>]*>/);
    if (mainActivityTag && !mainActivityTag[0].includes("windowSoftInputMode")) {
      manifest = manifest.replace(
        /(<activity\s+android:name="\.MainActivity"[^>]*)(>)/,
        "$1 android:windowSoftInputMode=\"adjustResize\"$2"
      );
    }
    fs.writeFileSync(manifestPath, manifest);
    console.log("✅ Synced (dev client disabled - use -d for debug build with dev client)");
  }
}

export default syncDevClient;
