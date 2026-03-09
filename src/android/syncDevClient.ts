import fs from "fs";
import path from "path";
import { resolveHostPaths } from "../common/hostConfig";
import {
  fetchAndPatchTemplateProvider,
  getDevClientManager,
  getProjectActivity,
  getStandaloneMainActivity,
} from "../explorer/patches";
import { getDevServerPrefs } from "../explorer/devLauncher";

async function syncDevClient() {
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

  const devMode = resolved.devMode;
  const devServer = config.devServer
    ? {
        host: config.devServer.host ?? "10.0.2.2",
        port: config.devServer.port ?? config.devServer.httpPort ?? 3000,
      }
    : undefined;

  const vars = { packageName, appName, devMode, devServer };

  const [templateProviderSource] = await Promise.all([
    fetchAndPatchTemplateProvider(vars),
  ]);

  fs.writeFileSync(path.join(javaDir, "TemplateProvider.java"), templateProviderSource);
  fs.writeFileSync(path.join(kotlinDir, "MainActivity.kt"), getStandaloneMainActivity(vars));

  const appDir = path.join(rootDir, "app");
  const mainDir = path.join(appDir, "src", "main");
  const manifestPath = path.join(mainDir, "AndroidManifest.xml");
  const devClientManagerSource = getDevClientManager(vars);
  if (devClientManagerSource) {
    fs.writeFileSync(path.join(kotlinDir, "DevClientManager.kt"), devClientManagerSource);
    fs.writeFileSync(path.join(kotlinDir, "DevServerPrefs.kt"), getDevServerPrefs(vars));
    fs.writeFileSync(path.join(kotlinDir, "ProjectActivity.kt"), getProjectActivity(vars));
    let manifest = fs.readFileSync(manifestPath, "utf-8");
    const projectActivityEntry = '        <activity android:name=".ProjectActivity" android:exported="false" android:taskAffinity="" android:launchMode="singleTask" android:documentLaunchMode="always" />';
    if (!manifest.includes("ProjectActivity")) {
      manifest = manifest.replace(
        /(\s*)(<\/application>)/,
        `${projectActivityEntry}\n$1$2`
      );
    } else {
      manifest = manifest.replace(
        /\s*<activity android:name="\.ProjectActivity"[^\/]*\/>\n?/g,
        projectActivityEntry + "\n"
      );
    }
    fs.writeFileSync(manifestPath, manifest);
    console.log("✅ Synced dev client (TemplateProvider, MainActivity, ProjectActivity, DevClientManager)");
  } else {
    for (const f of ["DevClientManager.kt", "DevServerPrefs.kt", "ProjectActivity.kt"]) {
      try { fs.rmSync(path.join(kotlinDir, f)); } catch { /* ignore */ }
    }
    let manifest = fs.readFileSync(manifestPath, "utf-8");
    manifest = manifest.replace(/\s*<activity android:name="\.ProjectActivity"[^\/]*\/>\n?/g, "");
    fs.writeFileSync(manifestPath, manifest);
    console.log("✅ Synced (dev client disabled - set dev.mode: \"embedded\" in tamer.config.json to enable)");
  }
}

export default syncDevClient;
