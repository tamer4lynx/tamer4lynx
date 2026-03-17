#!/usr/bin/env node

// index.ts
import fs25 from "fs";
import path25 from "path";
import { program } from "commander";

// package.json
var version = "0.0.1";

// src/android/create.ts
import fs3 from "fs";
import path3 from "path";
import os2 from "os";

// src/android/getGradle.ts
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import fetch2 from "node-fetch";
import AdmZip from "adm-zip";
async function downloadGradle(gradleVersion) {
  const gradleBaseUrl = `https://services.gradle.org/distributions/gradle-${gradleVersion}-bin.zip`;
  const downloadDir = path.join(process.cwd(), "gradle");
  const zipPath = path.join(downloadDir, `gradle-${gradleVersion}.zip`);
  const extractedPath = path.join(downloadDir, `gradle-${gradleVersion}`);
  if (fs.existsSync(extractedPath)) {
    console.log(`\u2705 Gradle ${gradleVersion} already exists at ${extractedPath}. Skipping download.`);
    return;
  }
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  console.log(`\u{1F4E5} Downloading Gradle ${gradleVersion} from ${gradleBaseUrl}...`);
  const response = await fetch2(gradleBaseUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }
  const fileStream = fs.createWriteStream(zipPath);
  await new Promise((resolve, reject) => {
    response.body?.pipe(fileStream);
    response.body?.on("error", reject);
    fileStream.on("finish", resolve);
  });
  console.log("\u2705 Download complete. Extracting...");
  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(downloadDir, true);
  } catch (err) {
    console.error(`\u274C Failed to extract Gradle zip: ${err}`);
    throw err;
  }
  fs.unlinkSync(zipPath);
  console.log(`\u2705 Gradle ${gradleVersion} extracted to ${extractedPath}`);
}
async function setupGradleWrapper(rootDir, gradleVersion) {
  try {
    console.log("\u{1F4E6} Setting up Gradle wrapper...");
    await downloadGradle(gradleVersion);
    const gradleBinDir = path.join(
      process.cwd(),
      "gradle",
      `gradle-${gradleVersion}`,
      "bin"
    );
    const gradleExecutable = os.platform() === "win32" ? "gradle.bat" : "gradle";
    const gradleExecutablePath = path.join(gradleBinDir, gradleExecutable);
    if (!fs.existsSync(gradleExecutablePath)) {
      throw new Error(`Gradle executable not found at ${gradleExecutablePath}`);
    }
    if (os.platform() !== "win32") {
      fs.chmodSync(gradleExecutablePath, "755");
    }
    console.log(`\u{1F680} Executing Gradle wrapper in: ${rootDir}`);
    execSync(`"${gradleExecutablePath}" wrapper`, {
      cwd: rootDir,
      stdio: "inherit"
    });
    console.log("\u2705 Gradle wrapper created successfully.");
  } catch (err) {
    console.error("\u274C Failed to create Gradle wrapper.", err.message);
    process.exit(1);
  }
}

// src/common/hostConfig.ts
import fs2 from "fs";
import path2 from "path";
var DEFAULT_ABI_FILTERS = ["armeabi-v7a", "arm64-v8a"];
var TAMER_CONFIG = "tamer.config.json";
var LYNX_CONFIG_FILES = ["lynx.config.ts", "lynx.config.js", "lynx.config.mjs"];
var DEFAULT_ANDROID_DIR = "android";
var DEFAULT_IOS_DIR = "ios";
var DEFAULT_BUNDLE_FILE = "main.lynx.bundle";
var DEFAULT_BUNDLE_ROOT = "dist";
function findProjectRoot(start2) {
  let dir = path2.resolve(start2);
  const root = path2.parse(dir).root;
  while (dir !== root) {
    const p = path2.join(dir, TAMER_CONFIG);
    if (fs2.existsSync(p)) return dir;
    dir = path2.dirname(dir);
  }
  return start2;
}
function loadTamerConfig(cwd) {
  const p = path2.join(cwd, TAMER_CONFIG);
  if (!fs2.existsSync(p)) return null;
  try {
    return JSON.parse(fs2.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}
function extractDistPathRoot(configPath) {
  try {
    const content = fs2.readFileSync(configPath, "utf8");
    const rootMatch = content.match(/distPath\s*:\s*\{\s*root\s*:\s*['"]([^'"]+)['"]/);
    if (rootMatch?.[1]) return rootMatch[1];
    const rootMatch2 = content.match(/root\s*:\s*['"]([^'"]+)['"]/);
    if (rootMatch2?.[1]) return rootMatch2[1];
  } catch {
  }
  return null;
}
function findLynxConfigInDir(dir) {
  for (const name of LYNX_CONFIG_FILES) {
    const p = path2.join(dir, name);
    if (fs2.existsSync(p)) return p;
  }
  return null;
}
function hasRspeedy(pkgDir) {
  const pkgJsonPath = path2.join(pkgDir, "package.json");
  if (!fs2.existsSync(pkgJsonPath)) return false;
  try {
    const pkg = JSON.parse(fs2.readFileSync(pkgJsonPath, "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return Object.keys(deps).some((k) => k === "@lynx-js/rspeedy");
  } catch {
    return false;
  }
}
function discoverLynxProject(cwd, explicitPath) {
  if (explicitPath) {
    const resolved = path2.isAbsolute(explicitPath) ? explicitPath : path2.join(cwd, explicitPath);
    if (fs2.existsSync(resolved)) {
      const lynxConfig2 = findLynxConfigInDir(resolved);
      const bundleRoot = lynxConfig2 ? extractDistPathRoot(lynxConfig2) ?? DEFAULT_BUNDLE_ROOT : DEFAULT_BUNDLE_ROOT;
      return { dir: resolved, bundleRoot };
    }
  }
  const rootPkgPath = path2.join(cwd, "package.json");
  if (fs2.existsSync(rootPkgPath)) {
    try {
      const rootPkg = JSON.parse(fs2.readFileSync(rootPkgPath, "utf8"));
      const lynxConfig2 = findLynxConfigInDir(cwd);
      if (lynxConfig2 || (rootPkg.dependencies?.["@lynx-js/rspeedy"] || rootPkg.devDependencies?.["@lynx-js/rspeedy"])) {
        const bundleRoot = lynxConfig2 ? extractDistPathRoot(lynxConfig2) ?? DEFAULT_BUNDLE_ROOT : DEFAULT_BUNDLE_ROOT;
        return { dir: cwd, bundleRoot };
      }
      const workspaces = rootPkg.workspaces;
      if (Array.isArray(workspaces)) {
        for (const ws of workspaces) {
          const isGlob = typeof ws === "string" && ws.includes("*");
          const dirsToCheck = isGlob ? (() => {
            const parentDir = path2.join(cwd, ws.replace(/\/\*$/, ""));
            if (!fs2.existsSync(parentDir)) return [];
            return fs2.readdirSync(parentDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path2.join(parentDir, e.name));
          })() : [path2.join(cwd, ws)];
          for (const pkgDir of dirsToCheck) {
            if (!fs2.existsSync(pkgDir)) continue;
            const lynxConfig3 = findLynxConfigInDir(pkgDir);
            if (lynxConfig3 || hasRspeedy(pkgDir)) {
              const bundleRoot = lynxConfig3 ? extractDistPathRoot(lynxConfig3) ?? DEFAULT_BUNDLE_ROOT : DEFAULT_BUNDLE_ROOT;
              return { dir: pkgDir, bundleRoot };
            }
          }
        }
      }
    } catch {
    }
  }
  const lynxConfig = findLynxConfigInDir(cwd);
  if (lynxConfig) {
    const bundleRoot = extractDistPathRoot(lynxConfig) ?? DEFAULT_BUNDLE_ROOT;
    return { dir: cwd, bundleRoot };
  }
  return null;
}
function findRepoRoot(start2) {
  let dir = path2.resolve(start2);
  const root = path2.parse(dir).root;
  while (dir !== root) {
    const pkgPath = path2.join(dir, "package.json");
    if (fs2.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs2.readFileSync(pkgPath, "utf8"));
        if (pkg.workspaces) return dir;
      } catch {
      }
    }
    dir = path2.dirname(dir);
  }
  return start2;
}
function findDevAppPackage(projectRoot) {
  const candidates = [
    path2.join(projectRoot, "node_modules", "tamer-dev-app"),
    path2.join(projectRoot, "packages", "tamer-dev-app"),
    path2.join(path2.dirname(projectRoot), "tamer-dev-app")
  ];
  for (const pkg of candidates) {
    if (fs2.existsSync(pkg) && fs2.existsSync(path2.join(pkg, "package.json"))) {
      return pkg;
    }
  }
  return null;
}
function findDevClientPackage(projectRoot) {
  const candidates = [
    path2.join(projectRoot, "node_modules", "tamer-dev-client"),
    path2.join(projectRoot, "packages", "tamer-dev-client"),
    path2.join(path2.dirname(projectRoot), "tamer-dev-client")
  ];
  for (const pkg of candidates) {
    if (fs2.existsSync(pkg) && fs2.existsSync(path2.join(pkg, "package.json"))) {
      return pkg;
    }
  }
  return null;
}
function findTamerHostPackage(projectRoot) {
  const candidates = [
    path2.join(projectRoot, "node_modules", "tamer-host"),
    path2.join(projectRoot, "packages", "tamer-host")
  ];
  for (const pkg of candidates) {
    if (fs2.existsSync(pkg) && fs2.existsSync(path2.join(pkg, "package.json"))) {
      return pkg;
    }
  }
  return null;
}
function resolveHostPaths(cwd = process.cwd()) {
  const projectRoot = findProjectRoot(cwd);
  const config = loadTamerConfig(projectRoot) ?? {};
  const paths = config.paths ?? {};
  const androidDirRel = paths.androidDir ?? DEFAULT_ANDROID_DIR;
  const iosDirRel = paths.iosDir ?? DEFAULT_IOS_DIR;
  const packageName = config.android?.packageName ?? "com.example.app";
  const explicitLynx = config.lynxProject ?? paths.lynxProject;
  const discovered = discoverLynxProject(projectRoot, explicitLynx);
  const lynxProjectDir = discovered?.dir ?? cwd;
  const bundleRoot = paths.lynxBundleRoot ?? discovered?.bundleRoot ?? DEFAULT_BUNDLE_ROOT;
  const bundleFile = paths.lynxBundleFile ?? DEFAULT_BUNDLE_FILE;
  const lynxBundlePath = path2.join(lynxProjectDir, bundleRoot, bundleFile);
  const androidDir = path2.join(projectRoot, androidDirRel);
  const devMode = resolveDevMode(config);
  const devAppDir = devMode === "embedded" ? findDevAppPackage(projectRoot) : null;
  const devClientPkg = findDevClientPackage(projectRoot);
  const devClientBundleInClient = devClientPkg ? path2.join(devClientPkg, DEFAULT_BUNDLE_ROOT, "dev-client.lynx.bundle") : null;
  const devClientBundleInApp = devAppDir ? path2.join(devAppDir, DEFAULT_BUNDLE_ROOT, "dev-client.lynx.bundle") : null;
  const devClientBundlePath = devMode === "embedded" ? devClientBundleInClient && fs2.existsSync(devClientBundleInClient) ? devClientBundleInClient : devClientBundleInApp ?? void 0 : void 0;
  return {
    projectRoot,
    androidDir,
    iosDir: path2.join(projectRoot, iosDirRel),
    androidAppDir: path2.join(projectRoot, androidDirRel, "app"),
    androidAssetsDir: path2.join(projectRoot, androidDirRel, "app", "src", "main", "assets"),
    androidKotlinDir: path2.join(projectRoot, androidDirRel, "app", "src", "main", "kotlin", packageName.replace(/\./g, "/")),
    lynxProjectDir,
    lynxBundlePath,
    lynxBundleFile: bundleFile,
    devMode,
    devClientBundlePath,
    config
  };
}
function resolveAbiFilters(config) {
  return config.android?.abiFilters ?? DEFAULT_ABI_FILTERS;
}
function resolveDevMode(config) {
  const explicit = config.dev?.mode;
  if (explicit) return explicit;
  if (config.devServer) return "embedded";
  return "off";
}
function loadHostConfig(cwd = process.cwd()) {
  const cfg = loadTamerConfig(cwd);
  if (!cfg) throw new Error("tamer.config.json not found in the project root.");
  return cfg;
}
function resolveIconPaths(projectRoot, config) {
  const raw = config.icon;
  if (!raw) return null;
  const join = (p) => path2.isAbsolute(p) ? p : path2.join(projectRoot, p);
  if (typeof raw === "string") {
    const p = join(raw);
    return fs2.existsSync(p) ? { source: p } : null;
  }
  const out = {};
  if (raw.source) {
    const p = join(raw.source);
    if (fs2.existsSync(p)) out.source = p;
  }
  if (raw.android) {
    const p = join(raw.android);
    if (fs2.existsSync(p)) out.android = p;
  }
  if (raw.ios) {
    const p = join(raw.ios);
    if (fs2.existsSync(p)) out.ios = p;
  }
  return Object.keys(out).length ? out : null;
}
function resolveDevAppPaths(repoRoot) {
  const devAppDir = path2.join(repoRoot, "packages", "tamer-dev-app");
  const configPath = path2.join(devAppDir, "tamer.config.json");
  if (!fs2.existsSync(configPath)) {
    throw new Error("packages/tamer-dev-app/tamer.config.json not found.");
  }
  const config = JSON.parse(fs2.readFileSync(configPath, "utf8"));
  const packageName = config.android?.packageName ?? "com.nanofuxion.tamerdevapp";
  const androidDirRel = config.paths?.androidDir ?? "android";
  const androidDir = path2.join(devAppDir, androidDirRel);
  const devClientDir = findDevClientPackage(repoRoot) ?? path2.join(repoRoot, "packages", "tamer-dev-client");
  const lynxBundlePath = path2.join(devClientDir, DEFAULT_BUNDLE_ROOT, "dev-client.lynx.bundle");
  return {
    projectRoot: devAppDir,
    androidDir,
    iosDir: path2.join(devAppDir, "ios"),
    androidAppDir: path2.join(androidDir, "app"),
    androidAssetsDir: path2.join(androidDir, "app", "src", "main", "assets"),
    androidKotlinDir: path2.join(androidDir, "app", "src", "main", "kotlin", packageName.replace(/\./g, "/")),
    lynxProjectDir: devClientDir,
    lynxBundlePath,
    lynxBundleFile: "dev-client.lynx.bundle",
    devMode: "embedded",
    devClientBundlePath: void 0,
    config
  };
}

// src/explorer/ref.ts
var LYNX_RAW_BASE = "https://raw.githubusercontent.com/lynx-family/lynx/develop/explorer";
async function fetchExplorerFile(relativePath) {
  const url = `${LYNX_RAW_BASE}/${relativePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

// src/explorer/patches.ts
var EXPLORER_APP = "android/lynx_explorer/src/main/java/com/lynx/explorer/ExplorerApplication.java";
var EXPLORER_PROVIDER = "android/lynx_explorer/src/main/java/com/lynx/explorer/provider/DemoTemplateProvider.java";
async function fetchAndPatchApplication(vars) {
  const raw = await fetchExplorerFile(EXPLORER_APP);
  let out = raw.replace(/package com\.lynx\.explorer;/, `package ${vars.packageName};`).replace(/public class ExplorerApplication/, "public class App").replace(
    /LynxEnv\.inst\(\)\.init\(this, null, new DemoTemplateProvider\(\), null\);/,
    `LynxEnv.inst().init(this, null, new TemplateProvider(this), null);`
  ).replace(/import com\.lynx\.explorer\.provider\.DemoTemplateProvider;/, "").replace(/import com\.lynx\.explorer\.modules\.LynxModuleAdapter;/, "").replace(/import com\.lynx\.explorer\.shell\.LynxRecorderDefaultActionCallback;/, "").replace(/import com\.lynx\.devtool\.recorder\.LynxRecorderPageManager;/, "").replace(/import com\.lynx\.service\.devtool\.LynxDevToolService;/, "").replace(/import com\.lynx\.tasm\.service\.ILynxHttpService;/, "").replace(/import com\.lynx\.tasm\.service\.ILynxImageService;/, "");
  out = out.replace(
    /@Override\s+public void onCreate\(\)\s*\{[\s\S]*?initLynxRecorder\(\);\s*\}/,
    `@Override
 public void onCreate() {
 super.onCreate();
 initLynxService();
 initFresco();
 initLynxEnv();
 }`
  );
  out = out.replace(
    /private void initLynxRecorder\(\)\s*{\s*LynxRecorderPageManager\.getInstance\(\)\.registerCallback\(new LynxRecorderDefaultActionCallback\(\)\);\s*}\s*/,
    ""
  );
  out = out.replace(
    /private void installLynxJSModule\(\)\s*{\s*LynxModuleAdapter\.getInstance\(\)\.Init\(this\);\s*}\s*/,
    ""
  );
  out = out.replace(/\n\s*\/\/ merge it into InitProcessor later\.\s*\n/, "\n");
  out = out.replace(
    /LynxServiceCenter\.inst\(\)\.registerService\(LynxDevToolService\.getINSTANCE\(\)\);\s*\n\s*\/\/ enable all sessions debug[\s\S]*?LynxDevToolService\.getINSTANCE\(\)\.setLoadV8Bridge\(true\);\s*/,
    ""
  );
  out = out.replace(
    /import com\.lynx\.tasm\.service\.LynxServiceCenter;/,
    `import com.lynx.tasm.service.LynxServiceCenter;
import ${vars.packageName}.generated.GeneratedLynxExtensions;
`
  );
  out = out.replace(
    /private void initLynxEnv\(\)\s*\{\s*LynxEnv\.inst\(\)\.init\(this, null, new TemplateProvider\(this\), null\);\s*}/,
    `private void initLynxEnv() {
 GeneratedLynxExtensions.INSTANCE.register(this);
 LynxEnv.inst().init(this, null, new TemplateProvider(this), null);
 }`
  );
  return out.replace(/\n{3,}/g, "\n\n");
}
function getLoadTemplateBody(vars) {
  const projectSegment = vars.projectRoot ? vars.projectRoot.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? "" : "";
  if (vars.devMode !== "embedded") {
    return `    @Override
    public void loadTemplate(String url, final Callback callback) {
        new Thread(() -> {
            try {
                java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                try (java.io.InputStream is = context.getAssets().open(url)) {
                    byte[] buf = new byte[1024];
                    int n;
                    while ((n = is.read(buf)) != -1) {
                        baos.write(buf, 0, n);
                    }
                }
                callback.onSuccess(baos.toByteArray());
            } catch (java.io.IOException e) {
                callback.onFailed(e.getMessage());
            }
        }).start();
    }`;
  }
  return `    private static final String DEV_CLIENT_BUNDLE = "dev-client.lynx.bundle";
    private static final String PROJECT_BUNDLE_SEGMENT = "${projectSegment}";

    @Override
    public void loadTemplate(String url, final Callback callback) {
        new Thread(() -> {
            if (url != null && (url.equals(DEV_CLIENT_BUNDLE) || url.endsWith("/" + DEV_CLIENT_BUNDLE) || url.contains(DEV_CLIENT_BUNDLE))) {
                try {
                    java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                    try (java.io.InputStream is = context.getAssets().open(DEV_CLIENT_BUNDLE)) {
                        byte[] buf = new byte[1024];
                        int n;
                        while ((n = is.read(buf)) != -1) baos.write(buf, 0, n);
                    }
                    callback.onSuccess(baos.toByteArray());
                } catch (java.io.IOException e) {
                    callback.onFailed(e.getMessage());
                }
                return;
            }
            if (BuildConfig.DEBUG) {
                String devUrl = DevServerPrefs.INSTANCE.getUrl(context);
                if (devUrl != null && !devUrl.isEmpty()) {
                    try {
                        java.net.URL u = new java.net.URL(devUrl);
                        String origin = u.getProtocol() + "://" + u.getHost() + (u.getPort() > 0 ? ":" + u.getPort() : ":3000");
                        String configuredPath = u.getPath() != null ? u.getPath() : "";
                        configuredPath = configuredPath.replaceAll("/+$", "");

                        java.util.ArrayList<String> candidatePaths = new java.util.ArrayList<>();
                        if (!configuredPath.isEmpty()) candidatePaths.add(configuredPath + "/" + url);
                        if (PROJECT_BUNDLE_SEGMENT != null && !PROJECT_BUNDLE_SEGMENT.isEmpty()) candidatePaths.add("/" + PROJECT_BUNDLE_SEGMENT + "/" + url);
                        candidatePaths.add("/" + url);

                        okhttp3.OkHttpClient client = new okhttp3.OkHttpClient.Builder()
                            .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                            .readTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
                            .build();
                        for (String candidatePath : candidatePaths) {
                            String fetchUrl = origin + (candidatePath.startsWith("/") ? candidatePath : "/" + candidatePath);
                            okhttp3.Request request = new okhttp3.Request.Builder().url(fetchUrl).build();
                            try (okhttp3.Response response = client.newCall(request).execute()) {
                                if (response.isSuccessful() && response.body() != null) {
                                    callback.onSuccess(response.body().bytes());
                                    return;
                                }
                            }
                        }
                        callback.onFailed("HTTP fetch failed for " + url + " via " + devUrl);
                    } catch (Exception e) {
                        callback.onFailed("Fetch failed: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
                        return;
                    }
                }
            }
            try {
                java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                try (java.io.InputStream is = context.getAssets().open(url)) {
                    byte[] buf = new byte[1024];
                    int n;
                    while ((n = is.read(buf)) != -1) {
                        baos.write(buf, 0, n);
                    }
                }
                callback.onSuccess(baos.toByteArray());
            } catch (java.io.IOException e) {
                callback.onFailed(e.getMessage());
            }
        }).start();
    }`;
}
async function fetchAndPatchTemplateProvider(vars) {
  const raw = await fetchExplorerFile(EXPLORER_PROVIDER);
  const loadBody = getLoadTemplateBody(vars);
  const out = raw.replace(/package com\.lynx\.explorer\.provider;/, `package ${vars.packageName};`).replace(/public class DemoTemplateProvider/, "public class TemplateProvider").replace(/extends AbsTemplateProvider \{/, `extends AbsTemplateProvider {
    private final android.content.Context context;

    public TemplateProvider(android.content.Context context) {
        this.context = context.getApplicationContext();
    }

`).replace(
    /@Override\s+public void loadTemplate\(String url, final Callback callback\)\s*\{[\s\S]*?\}\s*\)\s*;\s*\n\s*\}/,
    loadBody
  ).replace(/import okhttp3\.ResponseBody;[\s\n]*/, "").replace(/import retrofit2\.Call;[\s\n]*/, "").replace(/import retrofit2\.Response;[\s\n]*/, "").replace(/import retrofit2\.Retrofit;[\s\n]*/, "").replace(/import java\.io\.IOException;[\s\n]*/, "");
  const withBuildConfig = vars.devMode === "embedded" ? out.replace(
    /(package [^;]+;)/,
    `$1
import ${vars.packageName}.BuildConfig;
import ${vars.packageName}.DevServerPrefs;`
  ) : out;
  return withBuildConfig.replace(/\n{3,}/g, "\n\n");
}
function getDevClientManager(vars) {
  if (vars.devMode !== "embedded") return null;
  return `package ${vars.packageName}

import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener

class DevClientManager(private val context: Context, private val onReload: Runnable) {
    private var webSocket: WebSocket? = null
    private val handler = Handler(Looper.getMainLooper())
    private val client = OkHttpClient.Builder()
        .connectTimeout(5, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(0, java.util.concurrent.TimeUnit.SECONDS)
        .build()

    fun connect() {
        val devUrl = DevServerPrefs.getUrl(context) ?: return
        val uri = Uri.parse(devUrl)
        val scheme = if (uri.scheme == "https") "wss" else "ws"
        val host = uri.host ?: return
        val port = if (uri.port > 0) ":\${uri.port}" else ""
        val path = (uri.path ?: "").let { p -> (if (p.endsWith("/")) p else p + "/") + "__hmr" }
        val wsUrl = "$scheme://$host$port$path"
        val request = Request.Builder()
            .url(wsUrl)
            .build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    if (text.contains("\\"type\\":\\"reload\\"")) {
                        handler.post(onReload)
                    }
                } catch (_: Exception) { }
            }
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) { }
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) { }
        })
    }

    fun disconnect() {
        webSocket?.close(1000, null)
        webSocket = null
    }
}
`;
}
function getProjectActivity(vars) {
  const hasDevClient = vars.devMode === "embedded";
  const devClientInit = hasDevClient ? `
        devClientManager = DevClientManager(this) { reloadProjectView() }
        devClientManager?.connect()
` : "";
  const devClientField = hasDevClient ? `    private var devClientManager: DevClientManager? = null
` : "";
  const devClientCleanup = hasDevClient ? `
        devClientManager?.disconnect()
` : "";
  const devClientImports = hasDevClient ? `
import ${vars.packageName}.DevClientManager` : "";
  const reloadMethod = hasDevClient ? `
    private fun reloadProjectView() {
        GeneratedActivityLifecycle.onViewDetached()
        GeneratedLynxExtensions.onHostViewChanged(null)
        lynxView?.destroy()

        val nextView = buildLynxView()
        lynxView = nextView
        setContentView(nextView)
        GeneratedActivityLifecycle.onViewAttached(nextView)
        GeneratedLynxExtensions.onHostViewChanged(nextView)
        nextView.renderTemplateUrl("main.lynx.bundle", "")
        GeneratedActivityLifecycle.onCreateDelayed(handler)
    }
` : "";
  return `package ${vars.packageName}

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.MotionEvent
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.lynx.tasm.LynxView
import com.lynx.tasm.LynxViewBuilder${devClientImports}
import ${vars.packageName}.generated.GeneratedLynxExtensions
import ${vars.packageName}.generated.GeneratedActivityLifecycle

class ProjectActivity : AppCompatActivity() {
    private var lynxView: LynxView? = null
${devClientField}    private val handler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        GeneratedActivityLifecycle.onCreate(intent)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = true
        lynxView = buildLynxView()
        setContentView(lynxView)
        GeneratedActivityLifecycle.onViewAttached(lynxView)
        GeneratedLynxExtensions.onHostViewChanged(lynxView)
        lynxView?.renderTemplateUrl("main.lynx.bundle", "")${devClientInit}
        GeneratedActivityLifecycle.onCreateDelayed(handler)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        GeneratedActivityLifecycle.onWindowFocusChanged(hasFocus)
    }
${reloadMethod}
    override fun onResume() {
        super.onResume()
        GeneratedActivityLifecycle.onResume()
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        if (ev.action == MotionEvent.ACTION_DOWN) maybeClearFocusedInput(ev)
        return super.dispatchTouchEvent(ev)
    }

    private fun maybeClearFocusedInput(ev: MotionEvent) {
        val focused = currentFocus
        if (focused is EditText) {
            val loc = IntArray(2)
            focused.getLocationOnScreen(loc)
            val x = ev.rawX.toInt()
            val y = ev.rawY.toInt()
            if (x < loc[0] || x > loc[0] + focused.width || y < loc[1] || y > loc[1] + focused.height) {
                focused.clearFocus()
                (getSystemService(INPUT_METHOD_SERVICE) as? InputMethodManager)
                    ?.hideSoftInputFromWindow(focused.windowToken, 0)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        GeneratedActivityLifecycle.onNewIntent(intent)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        GeneratedActivityLifecycle.onBackPressed { consumed ->
            if (!consumed) {
                runOnUiThread { super.onBackPressed() }
            }
        }
    }

    override fun onDestroy() {
        GeneratedActivityLifecycle.onViewDetached()
        GeneratedLynxExtensions.onHostViewChanged(null)
        lynxView?.destroy()
        lynxView = null${devClientCleanup}
        super.onDestroy()
    }

    private fun buildLynxView(): LynxView {
        val viewBuilder = LynxViewBuilder()
        viewBuilder.setTemplateProvider(TemplateProvider(this))
        return viewBuilder.build(this)
    }
}
`;
}
function getStandaloneMainActivity(vars) {
  const hasDevClient = vars.devMode === "embedded";
  const devClientImports = hasDevClient ? `
import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.activity.result.contract.ActivityResultContracts
import com.google.zxing.integration.android.IntentIntegrator
import com.google.zxing.integration.android.IntentResult
import com.nanofuxion.tamerdevclient.DevClientModule
` : "";
  const devClientInit = hasDevClient ? `
        DevClientModule.attachHostActivity(this)
        DevClientModule.attachLynxView(lynxView)
        DevClientModule.attachCameraPermissionRequester { onGranted ->
            pendingScanOnPermissionGranted = onGranted
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
        DevClientModule.attachScanLauncher {
            scanResultLauncher.launch(IntentIntegrator(this).setCaptureActivity(PortraitCaptureActivity::class.java).setPrompt("Scan dev server QR").createScanIntent())
        }
        DevClientModule.attachReloadProjectLauncher {
            startActivity(Intent(this@MainActivity, ProjectActivity::class.java).addFlags(
                Intent.FLAG_ACTIVITY_NEW_DOCUMENT or Intent.FLAG_ACTIVITY_MULTIPLE_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            ))
        }
        reloadReceiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context, intent: Intent) {
                if (intent.action == DevClientModule.ACTION_RELOAD_PROJECT) {
                    runOnUiThread {
                        startActivity(Intent(this@MainActivity, ProjectActivity::class.java).addFlags(
                            Intent.FLAG_ACTIVITY_NEW_DOCUMENT or Intent.FLAG_ACTIVITY_MULTIPLE_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        ))
                    }
                }
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(reloadReceiver, IntentFilter(DevClientModule.ACTION_RELOAD_PROJECT), Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(reloadReceiver, IntentFilter(DevClientModule.ACTION_RELOAD_PROJECT))
        }
` : "";
  const devClientField = hasDevClient ? `    private var reloadReceiver: BroadcastReceiver? = null
    private val currentUri = "dev-client.lynx.bundle"
    private var pendingScanOnPermissionGranted: Runnable? = null
    private val cameraPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) pendingScanOnPermissionGranted?.run()
        pendingScanOnPermissionGranted = null
    }
    private val scanResultLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val scanResult = IntentIntegrator.parseActivityResult(result.resultCode, result.data)
        scanResult?.contents?.let { DevClientModule.instance?.deliverScanResult(it) }
    }
` : "";
  const devClientCleanup = hasDevClient ? `
    override fun onDestroy() {
        reloadReceiver?.let { unregisterReceiver(it) }
        GeneratedActivityLifecycle.onViewDetached()
        GeneratedLynxExtensions.onHostViewChanged(null)
        lynxView?.destroy()
        lynxView = null
        DevClientModule.attachReloadProjectLauncher(null)
        DevClientModule.attachLynxView(null)
        super.onDestroy()
    }
` : "";
  const standaloneLifecycle = !hasDevClient ? `
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        GeneratedActivityLifecycle.onWindowFocusChanged(hasFocus)
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        GeneratedActivityLifecycle.onNewIntent(intent)
    }

    override fun onDestroy() {
        GeneratedActivityLifecycle.onViewDetached()
        GeneratedLynxExtensions.onHostViewChanged(null)
        lynxView?.destroy()
        lynxView = null
        super.onDestroy()
    }
` : "";
  return `package ${vars.packageName}

import android.os.Build
import android.os.Bundle
import android.view.MotionEvent
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.lynx.tasm.LynxView
import com.lynx.tasm.LynxViewBuilder${devClientImports}
import ${vars.packageName}.generated.GeneratedLynxExtensions
import ${vars.packageName}.generated.GeneratedActivityLifecycle

class MainActivity : AppCompatActivity() {
${devClientField}    private var lynxView: LynxView? = null${!hasDevClient ? "\n    private val handler = android.os.Handler(android.os.Looper.getMainLooper())" : ""}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ${!hasDevClient ? "GeneratedActivityLifecycle.onCreate(intent)\n        " : ""}WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = true
        lynxView = buildLynxView()
        setContentView(lynxView)
        GeneratedActivityLifecycle.onViewAttached(lynxView)
        GeneratedLynxExtensions.onHostViewChanged(lynxView)
        lynxView?.renderTemplateUrl(${hasDevClient ? "currentUri" : '"main.lynx.bundle"'}, "")${devClientInit}${!hasDevClient ? "\n        GeneratedActivityLifecycle.onCreateDelayed(handler)" : ""}
    }

    override fun onPause() {
        super.onPause()
        GeneratedActivityLifecycle.onPause()
    }

    override fun onResume() {
        super.onResume()
        GeneratedActivityLifecycle.onResume()
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        if (ev.action == MotionEvent.ACTION_DOWN) maybeClearFocusedInput(ev)
        return super.dispatchTouchEvent(ev)
    }

    private fun maybeClearFocusedInput(ev: MotionEvent) {
        val focused = currentFocus
        if (focused is EditText) {
            val loc = IntArray(2)
            focused.getLocationOnScreen(loc)
            val x = ev.rawX.toInt()
            val y = ev.rawY.toInt()
            if (x < loc[0] || x > loc[0] + focused.width || y < loc[1] || y > loc[1] + focused.height) {
                focused.clearFocus()
                (getSystemService(INPUT_METHOD_SERVICE) as? InputMethodManager)
                    ?.hideSoftInputFromWindow(focused.windowToken, 0)
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        GeneratedActivityLifecycle.onBackPressed { consumed ->
            if (!consumed) {
                runOnUiThread { super.onBackPressed() }
            }
        }
    }

    private fun buildLynxView(): LynxView {
        val viewBuilder = LynxViewBuilder()
        viewBuilder.setTemplateProvider(TemplateProvider(this))
        return viewBuilder.build(this)
    }${standaloneLifecycle}${devClientCleanup}
}
`;
}

// src/explorer/devLauncher.ts
function getDevServerPrefs(vars) {
  return `package ${vars.packageName}

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray

object DevServerPrefs {
    private const val PREFS = "tamer_dev_server"
    private const val KEY_URL = "dev_server_url"
    private const val KEY_RECENT = "dev_server_recent"

    fun getUrl(context: Context): String? {
        return prefs(context).getString(KEY_URL, null)
    }

    fun setUrl(context: Context, url: String) {
        prefs(context).edit().putString(KEY_URL, url).apply()
        addRecent(context, url)
    }

    fun getRecentUrls(context: Context): List<String> {
        val json = prefs(context).getString(KEY_RECENT, "[]") ?: "[]"
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { arr.getString(it) }.distinct().take(10)
        } catch (_: Exception) { emptyList() }
    }

    fun addRecent(context: Context, url: String) {
        val current = getRecentUrls(context).filter { it != url }
        val updated = listOf(url) + current
        prefs(context).edit()
            .putString(KEY_RECENT, JSONArray(updated.take(10)).toString())
            .apply()
    }

    fun clear(context: Context) {
        prefs(context).edit().clear().apply()
    }

    private fun prefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }
}
`;
}

// src/android/create.ts
function readAndSubstituteTemplate(templatePath, vars) {
  const raw = fs3.readFileSync(templatePath, "utf-8");
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
    raw
  );
}
function findRepoRoot2(start2) {
  let dir = path3.resolve(start2);
  const root = path3.parse(dir).root;
  while (dir !== root) {
    const pkgPath = path3.join(dir, "package.json");
    if (fs3.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs3.readFileSync(pkgPath, "utf8"));
        if (pkg.workspaces) return dir;
      } catch {
      }
    }
    dir = path3.dirname(dir);
  }
  return start2;
}
var create = async (opts = {}) => {
  const target = opts.target ?? "host";
  const origCwd = process.cwd();
  if (target === "dev-app") {
    const repoRoot = findRepoRoot2(origCwd);
    const devAppDir = path3.join(repoRoot, "packages", "tamer-dev-app");
    if (!fs3.existsSync(path3.join(devAppDir, "tamer.config.json"))) {
      console.error("\u274C packages/tamer-dev-app/tamer.config.json not found.");
      process.exit(1);
    }
    process.chdir(devAppDir);
  }
  let appName;
  let packageName;
  let androidSdk;
  let config;
  try {
    config = loadHostConfig();
    packageName = config.android?.packageName;
    appName = config.android?.appName;
    androidSdk = config.android?.sdk;
    if (androidSdk && androidSdk.startsWith("~")) {
      androidSdk = androidSdk.replace(/^~/, os2.homedir());
    }
    if (!appName || !packageName) {
      throw new Error(
        '"android.appName" and "android.packageName" must be defined in tamer.config.json'
      );
    }
  } catch (error) {
    console.error(`\u274C Error loading configuration: ${error.message}`);
    process.exit(1);
  }
  const packagePath = packageName.replace(/\./g, "/");
  const gradleVersion = "8.14.2";
  const androidDir = config.paths?.androidDir ?? "android";
  const rootDir = path3.join(process.cwd(), androidDir);
  const appDir = path3.join(rootDir, "app");
  const mainDir = path3.join(appDir, "src", "main");
  const javaDir = path3.join(mainDir, "java", packagePath);
  const kotlinDir = path3.join(mainDir, "kotlin", packagePath);
  const kotlinGeneratedDir = path3.join(kotlinDir, "generated");
  const assetsDir = path3.join(mainDir, "assets");
  const themesDir = path3.join(mainDir, "res", "values");
  const gradleDir = path3.join(rootDir, "gradle");
  function writeFile3(filePath, content, options) {
    fs3.mkdirSync(path3.dirname(filePath), { recursive: true });
    fs3.writeFileSync(
      filePath,
      content.trimStart(),
      options?.encoding ?? "utf8"
    );
  }
  if (fs3.existsSync(rootDir)) {
    console.log(`\u{1F9F9} Removing existing directory: ${rootDir}`);
    fs3.rmSync(rootDir, { recursive: true, force: true });
  }
  console.log(`\u{1F680} Creating a new Tamer4Lynx project in: ${rootDir}`);
  writeFile3(
    path3.join(gradleDir, "libs.versions.toml"),
    `
[versions]
agp = "8.9.1"
biometric = "1.1.0"
commonsCompress = "1.26.1"
commonsLang3 = "3.14.0"
fresco = "2.3.0"
kotlin = "2.0.21"
coreKtx = "1.10.1"
junit = "4.13.2"
junitVersion = "1.1.5"
espressoCore = "3.5.1"
appcompat = "1.6.1"
lynx = "3.3.1"
material = "1.10.0"
activity = "1.8.0"
constraintlayout = "2.1.4"
okhttp = "4.9.0"
primjs = "2.12.0"
zxing = "4.3.0"

[libraries]
androidx-biometric = { group = "androidx.biometric", name = "biometric", version.ref = "biometric" }
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
animated-base = { module = "com.facebook.fresco:animated-base", version.ref = "fresco" }
animated-gif = { module = "com.facebook.fresco:animated-gif", version.ref = "fresco" }
animated-webp = { module = "com.facebook.fresco:animated-webp", version.ref = "fresco" }
commons-compress = { module = "org.apache.commons:commons-compress", version.ref = "commonsCompress" }
commons-lang3 = { module = "org.apache.commons:commons-lang3", version.ref = "commonsLang3" }
fresco = { module = "com.facebook.fresco:fresco", version.ref = "fresco" }
junit = { group = "junit", name = "junit", version.ref = "junit" }
androidx-junit = { group = "androidx.test.ext", name = "junit", version.ref = "junitVersion" }
androidx-espresso-core = { group = "androidx.test.espresso", name = "espresso-core", version.ref = "espressoCore" }
androidx-appcompat = { group = "androidx.appcompat", name = "appcompat", version.ref = "appcompat" }
lynx = { module = "org.lynxsdk.lynx:lynx", version.ref = "lynx" }
lynx-jssdk = { module = "org.lynxsdk.lynx:lynx-jssdk", version.ref = "lynx" }
lynx-processor = { module = "org.lynxsdk.lynx:lynx-processor", version.ref = "lynx" }
lynx-service-http = { module = "org.lynxsdk.lynx:lynx-service-http", version.ref = "lynx" }
lynx-service-image = { module = "org.lynxsdk.lynx:lynx-service-image", version.ref = "lynx" }
lynx-service-log = { module = "org.lynxsdk.lynx:lynx-service-log", version.ref = "lynx" }
lynx-trace = { module = "org.lynxsdk.lynx:lynx-trace", version.ref = "lynx" }
material = { group = "com.google.android.material", name = "material", version.ref = "material" }
androidx-activity = { group = "androidx.activity", name = "activity", version.ref = "activity" }
androidx-constraintlayout = { group = "androidx.constraintlayout", name = "constraintlayout", version.ref = "constraintlayout" }
okhttp = { module = "com.squareup.okhttp3:okhttp", version.ref = "okhttp" }
primjs = { module = "org.lynxsdk.lynx:primjs", version.ref = "primjs" }
webpsupport = { module = "com.facebook.fresco:webpsupport", version.ref = "fresco" }
zxing = { module = "com.journeyapps:zxing-android-embedded", version.ref = "zxing" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
android-library = { id = "com.android.library", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
kotlin-kapt = { id = "org.jetbrains.kotlin.kapt", version.ref = "kotlin" }
`
  );
  writeFile3(
    path3.join(rootDir, "settings.gradle.kts"),
    `
pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "${appName}"
include(":app")

// GENERATED AUTOLINK START
// This section is automatically generated by Tamer4Lynx.
// Manual edits will be overwritten.
println("If you have native modules please run tamer android link")
// GENERATED AUTOLINK END
`
  );
  writeFile3(
    path3.join(rootDir, "build.gradle.kts"),
    `
// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
}
`
  );
  writeFile3(
    path3.join(rootDir, "gradle.properties"),
    `
org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
kotlin.code.style=official
android.enableJetifier=true
`
  );
  writeFile3(
    path3.join(appDir, "build.gradle.kts"),
    `
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    id("org.jetbrains.kotlin.kapt")
}

android {
    namespace = "${packageName}"
    compileSdk = 35

    defaultConfig {
        applicationId = "${packageName}"
        minSdk = 28
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        ndk {
            abiFilters += listOf(${resolveAbiFilters(config).map((a) => `"${a}"`).join(", ")})
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }

    sourceSets {
        getByName("main") {
            jniLibs.srcDirs("src/main/jniLibs")
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity)
    implementation(libs.androidx.constraintlayout)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    implementation(libs.lynx)
    implementation(libs.lynx.jssdk)
    implementation(libs.lynx.trace)
    implementation(libs.primjs)
    implementation(libs.lynx.service.image)
    implementation(libs.fresco)
    implementation(libs.animated.gif)
    implementation(libs.animated.webp)
    implementation(libs.webpsupport)
    implementation(libs.animated.base)
    implementation(libs.lynx.service.log)
    implementation(libs.lynx.service.http)
    implementation(libs.okhttp)
    implementation(libs.zxing)
    kapt(libs.lynx.processor)
    implementation(libs.commons.lang3)
    implementation(libs.commons.compress)

    // GENERATED AUTOLINK DEPENDENCIES START
    // This section is automatically generated by Tamer4Lynx.
    // Manual edits will be overwritten.
    // GENERATED AUTOLINK DEPENDENCIES END
}
`
  );
  writeFile3(
    path3.join(themesDir, "themes.xml"),
    `
<resources>
    <style name="Theme.MyApp" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
    </style>
</resources>
`
  );
  const devMode = resolveDevMode(config);
  const hasDevLauncher = devMode === "embedded";
  const manifestActivities = hasDevLauncher ? `
        <activity android:name=".MainActivity" android:exported="true" android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        <activity android:name=".ProjectActivity" android:exported="false" android:taskAffinity="" android:launchMode="singleTask" android:documentLaunchMode="always" android:windowSoftInputMode="adjustResize" />
` : `
        <activity android:name=".MainActivity" android:exported="true" android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
`;
  const manifestPermissions = hasDevLauncher ? `    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />` : `    <uses-permission android:name="android.permission.INTERNET" />`;
  const iconPaths = resolveIconPaths(process.cwd(), config);
  const manifestIconAttrs = iconPaths ? '        android:icon="@mipmap/ic_launcher"\n        android:roundIcon="@mipmap/ic_launcher"\n' : "";
  writeFile3(
    path3.join(mainDir, "AndroidManifest.xml"),
    `
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
${manifestPermissions}
    <application
        android:name=".App"
        android:label="${appName}"
${manifestIconAttrs}        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.MyApp">${manifestActivities}
    </application>
</manifest>
`
  );
  writeFile3(
    path3.join(kotlinGeneratedDir, "GeneratedLynxExtensions.kt"),
    `
package ${packageName}.generated

import android.content.Context
import com.lynx.tasm.LynxEnv

/**
 * This file is generated by the Tamer4Lynx autolinker.
 * Do not edit this file manually.
 */
object GeneratedLynxExtensions {
    fun register(context: Context) {
        // This will be populated by the autolinker.
    }
}
`
  );
  const devServer = config.devServer ? {
    host: config.devServer.host ?? "10.0.2.2",
    port: config.devServer.port ?? config.devServer.httpPort ?? 3e3
  } : void 0;
  const resolved = resolveHostPaths(process.cwd());
  const vars = { packageName, appName, devMode, devServer, projectRoot: resolved.lynxProjectDir };
  const templateVars = { PACKAGE_NAME: packageName, APP_NAME: appName };
  const hostPkg = findTamerHostPackage(process.cwd());
  const devClientPkg = findDevClientPackage(process.cwd());
  if (!hasDevLauncher && hostPkg) {
    const templateDir = path3.join(hostPkg, "android", "templates");
    for (const [src, dst] of [
      ["App.java", path3.join(javaDir, "App.java")],
      ["TemplateProvider.java", path3.join(javaDir, "TemplateProvider.java")],
      ["MainActivity.kt", path3.join(kotlinDir, "MainActivity.kt")]
    ]) {
      const srcPath = path3.join(templateDir, src);
      if (fs3.existsSync(srcPath)) {
        writeFile3(dst, readAndSubstituteTemplate(srcPath, templateVars));
      }
    }
  } else {
    const [applicationSource, templateProviderSource] = await Promise.all([
      fetchAndPatchApplication(vars),
      fetchAndPatchTemplateProvider(vars)
    ]);
    writeFile3(path3.join(javaDir, "App.java"), applicationSource);
    writeFile3(path3.join(javaDir, "TemplateProvider.java"), templateProviderSource);
    writeFile3(path3.join(kotlinDir, "MainActivity.kt"), getStandaloneMainActivity(vars));
    if (hasDevLauncher) {
      if (devClientPkg) {
        const templateDir = path3.join(devClientPkg, "android", "templates");
        for (const [src, dst] of [
          ["ProjectActivity.kt", path3.join(kotlinDir, "ProjectActivity.kt")],
          ["DevClientManager.kt", path3.join(kotlinDir, "DevClientManager.kt")],
          ["DevServerPrefs.kt", path3.join(kotlinDir, "DevServerPrefs.kt")]
        ]) {
          const srcPath = path3.join(templateDir, src);
          if (fs3.existsSync(srcPath)) {
            writeFile3(dst, readAndSubstituteTemplate(srcPath, templateVars));
          }
        }
      } else {
        writeFile3(path3.join(kotlinDir, "ProjectActivity.kt"), getProjectActivity(vars));
        const devClientManagerSource = getDevClientManager(vars);
        if (devClientManagerSource) {
          writeFile3(path3.join(kotlinDir, "DevClientManager.kt"), devClientManagerSource);
          writeFile3(path3.join(kotlinDir, "DevServerPrefs.kt"), getDevServerPrefs(vars));
        }
      }
    }
  }
  if (iconPaths) {
    const resDir = path3.join(mainDir, "res");
    if (iconPaths.android) {
      const src = iconPaths.android;
      const entries = fs3.readdirSync(src, { withFileTypes: true });
      for (const e of entries) {
        const dest = path3.join(resDir, e.name);
        if (e.isDirectory()) {
          fs3.cpSync(path3.join(src, e.name), dest, { recursive: true });
        } else {
          fs3.mkdirSync(resDir, { recursive: true });
          fs3.copyFileSync(path3.join(src, e.name), dest);
        }
      }
      console.log("\u2705 Copied Android icon from tamer.config.json icon.android");
    } else if (iconPaths.source) {
      const mipmapDensities = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
      for (const d of mipmapDensities) {
        const dir = path3.join(resDir, `mipmap-${d}`);
        fs3.mkdirSync(dir, { recursive: true });
        fs3.copyFileSync(iconPaths.source, path3.join(dir, "ic_launcher.png"));
      }
      console.log("\u2705 Copied app icon from tamer.config.json icon.source");
    }
  }
  fs3.mkdirSync(assetsDir, { recursive: true });
  fs3.writeFileSync(path3.join(assetsDir, ".gitkeep"), "");
  console.log(`\u2705 Android Kotlin project created at ${rootDir}`);
  async function finalizeProjectSetup() {
    if (androidSdk) {
      try {
        const sdkDirContent = `sdk.dir=${androidSdk.replace(/\\/g, "/")}`;
        writeFile3(path3.join(rootDir, "local.properties"), sdkDirContent);
        console.log("\u{1F4E6} Created local.properties from tamer.config.json.");
      } catch (err) {
        console.error(`\u274C Failed to create local.properties: ${err.message}`);
      }
    } else {
      const localPropsPath = path3.join(process.cwd(), "local.properties");
      if (fs3.existsSync(localPropsPath)) {
        try {
          fs3.copyFileSync(localPropsPath, path3.join(rootDir, "local.properties"));
          console.log("\u{1F4E6} Copied existing local.properties to the android project.");
        } catch (err) {
          console.error("\u274C Failed to copy local.properties:", err);
        }
      } else {
        console.warn(
          "\u26A0\uFE0F `android.sdk` not found in tamer.config.json. You may need to create local.properties manually."
        );
      }
    }
    await setupGradleWrapper(rootDir, gradleVersion);
  }
  await finalizeProjectSetup();
  if (target === "dev-app") process.chdir(origCwd);
};
var create_default = create;

// src/android/autolink.ts
import fs6 from "fs";
import path6 from "path";

// src/common/discoverModules.ts
import fs5 from "fs";
import path5 from "path";

// src/common/config.ts
import fs4 from "fs";
import path4 from "path";
var LYNX_EXT_JSON = "lynx.ext.json";
var TAMER_JSON = "tamer.json";
function loadLynxExtJson(packagePath) {
  const p = path4.join(packagePath, LYNX_EXT_JSON);
  if (!fs4.existsSync(p)) return null;
  try {
    return JSON.parse(fs4.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}
function loadTamerJson(packagePath) {
  const p = path4.join(packagePath, TAMER_JSON);
  if (!fs4.existsSync(p)) return null;
  try {
    return JSON.parse(fs4.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}
function loadExtensionConfig(packagePath) {
  const lynxExt = loadLynxExtJson(packagePath);
  const tamer = loadTamerJson(packagePath);
  const raw = lynxExt ?? tamer;
  if (!raw) return null;
  const normalized = {};
  if (raw.platforms?.android || raw.android) {
    const a = raw.platforms?.android ?? raw.android;
    const moduleClassName = a?.moduleClassName ?? raw.android?.moduleClassName;
    const moduleClassNames = a?.moduleClassNames ?? raw.android?.moduleClassNames;
    const elements = a?.elements ?? raw.android?.elements;
    const permissions = a?.permissions ?? raw.android?.permissions;
    const attachHostView = a?.attachHostView ?? raw.android?.attachHostView;
    const activityPatches = a?.activityPatches ?? raw.android?.activityPatches;
    const classes = Array.isArray(moduleClassNames) && moduleClassNames.length > 0 ? moduleClassNames : moduleClassName ? [moduleClassName] : [];
    if (classes.length > 0 || elements || permissions || attachHostView || activityPatches) {
      normalized.android = {
        ...classes.length === 1 ? { moduleClassName: classes[0] } : classes.length > 1 ? { moduleClassNames: classes } : {},
        sourceDir: a?.sourceDir ?? raw.android?.sourceDir ?? "android",
        ...elements && Object.keys(elements).length > 0 && { elements },
        ...permissions && Array.isArray(permissions) && permissions.length > 0 && { permissions },
        ...attachHostView && { attachHostView: true },
        ...activityPatches && { activityPatches }
      };
    }
  }
  if (raw.platforms?.ios || raw.ios) {
    const i = raw.platforms?.ios ?? raw.ios;
    const moduleClassName = i?.moduleClassName ?? raw.ios?.moduleClassName;
    const moduleClassNames = i?.moduleClassNames ?? raw.ios?.moduleClassNames;
    const elements = i?.elements ?? raw.ios?.elements;
    const attachHostView = i?.attachHostView ?? raw.ios?.attachHostView;
    const classes = Array.isArray(moduleClassNames) && moduleClassNames.length > 0 ? moduleClassNames : moduleClassName ? [moduleClassName] : [];
    const iosPermissions = i?.iosPermissions ?? raw.ios?.iosPermissions;
    if (classes.length > 0 || elements || attachHostView || iosPermissions && Object.keys(iosPermissions).length > 0) {
      normalized.ios = {
        ...classes.length === 1 ? { moduleClassName: classes[0] } : classes.length > 1 ? { moduleClassNames: classes } : {},
        podspecPath: i?.podspecPath ?? raw.ios?.podspecPath ?? ".",
        ...elements && Object.keys(elements).length > 0 && { elements },
        ...iosPermissions && Object.keys(iosPermissions).length > 0 && { iosPermissions },
        ...attachHostView && { attachHostView: true }
      };
    }
  }
  if (Object.keys(normalized).length === 0) return null;
  return normalized;
}
function hasExtensionConfig(packagePath) {
  return fs4.existsSync(path4.join(packagePath, LYNX_EXT_JSON)) || fs4.existsSync(path4.join(packagePath, TAMER_JSON));
}
function getAndroidModuleClassNames(config) {
  if (!config) return [];
  if (config.moduleClassNames?.length) return config.moduleClassNames;
  if (config.moduleClassName) return [config.moduleClassName];
  return [];
}
function getIosModuleClassNames(config) {
  if (!config) return [];
  if (config.moduleClassNames?.length) return config.moduleClassNames;
  if (config.moduleClassName) return [config.moduleClassName];
  return [];
}
function getIosElements(config) {
  return config?.elements ?? {};
}
function getNodeModulesPath(projectRoot) {
  let nodeModulesPath = path4.join(projectRoot, "node_modules");
  const workspaceRoot = path4.join(projectRoot, "..", "..");
  const rootNodeModules = path4.join(workspaceRoot, "node_modules");
  if (fs4.existsSync(path4.join(workspaceRoot, "package.json")) && fs4.existsSync(rootNodeModules) && path4.basename(path4.dirname(projectRoot)) === "packages") {
    nodeModulesPath = rootNodeModules;
  } else if (!fs4.existsSync(nodeModulesPath)) {
    const altRoot = path4.join(projectRoot, "..", "..");
    const altNodeModules = path4.join(altRoot, "node_modules");
    if (fs4.existsSync(path4.join(altRoot, "package.json")) && fs4.existsSync(altNodeModules)) {
      nodeModulesPath = altNodeModules;
    }
  }
  return nodeModulesPath;
}
function discoverNativeExtensions(projectRoot) {
  const nodeModulesPath = getNodeModulesPath(projectRoot);
  const result = [];
  if (!fs4.existsSync(nodeModulesPath)) return result;
  const packageDirs = fs4.readdirSync(nodeModulesPath);
  const check = (name, packagePath) => {
    if (!hasExtensionConfig(packagePath)) return;
    const config = loadExtensionConfig(packagePath);
    const classes = getAndroidModuleClassNames(config?.android);
    for (const className of classes) {
      result.push({ packageName: name, moduleClassName: className, attachHostView: config?.android?.attachHostView });
    }
  };
  for (const dirName of packageDirs) {
    const fullPath = path4.join(nodeModulesPath, dirName);
    if (dirName.startsWith("@")) {
      try {
        for (const scopedDirName of fs4.readdirSync(fullPath)) {
          check(`${dirName}/${scopedDirName}`, path4.join(fullPath, scopedDirName));
        }
      } catch {
      }
    } else {
      check(dirName, fullPath);
    }
  }
  return result;
}

// src/common/discoverModules.ts
function resolveNodeModulesPath(projectRoot) {
  let nodeModulesPath = path5.join(projectRoot, "node_modules");
  const workspaceRoot = path5.join(projectRoot, "..", "..");
  const rootNodeModules = path5.join(workspaceRoot, "node_modules");
  if (fs5.existsSync(path5.join(workspaceRoot, "package.json")) && fs5.existsSync(rootNodeModules) && path5.basename(path5.dirname(projectRoot)) === "packages") {
    nodeModulesPath = rootNodeModules;
  } else if (!fs5.existsSync(nodeModulesPath)) {
    const altRoot = path5.join(projectRoot, "..", "..");
    const altNodeModules = path5.join(altRoot, "node_modules");
    if (fs5.existsSync(path5.join(altRoot, "package.json")) && fs5.existsSync(altNodeModules)) {
      nodeModulesPath = altNodeModules;
    }
  }
  return nodeModulesPath;
}
function discoverModules(projectRoot) {
  const nodeModulesPath = resolveNodeModulesPath(projectRoot);
  const packages = [];
  if (!fs5.existsSync(nodeModulesPath)) {
    return [];
  }
  const packageDirs = fs5.readdirSync(nodeModulesPath);
  for (const dirName of packageDirs) {
    const fullPath = path5.join(nodeModulesPath, dirName);
    const checkPackage = (name, packagePath) => {
      if (!hasExtensionConfig(packagePath)) return;
      const config = loadExtensionConfig(packagePath);
      if (!config || !config.android && !config.ios) return;
      packages.push({ name, config, packagePath });
    };
    if (dirName.startsWith("@")) {
      try {
        const scopedDirs = fs5.readdirSync(fullPath);
        for (const scopedDirName of scopedDirs) {
          const scopedPackagePath = path5.join(fullPath, scopedDirName);
          checkPackage(`${dirName}/${scopedDirName}`, scopedPackagePath);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`\u26A0\uFE0F Could not read scoped package directory ${fullPath}: ${msg}`);
      }
    } else {
      checkPackage(dirName, fullPath);
    }
  }
  return packages;
}

// src/common/generateExtCode.ts
function generateLynxExtensionsKotlin(packages, projectPackage) {
  const modulePackages = packages.filter((p) => getAndroidModuleClassNames(p.config.android).length > 0);
  const elementPackages = packages.filter((p) => p.config.android?.elements && Object.keys(p.config.android.elements).length > 0);
  const seenNames = /* @__PURE__ */ new Set();
  const allModuleClasses = modulePackages.flatMap((p) => getAndroidModuleClassNames(p.config.android)).filter((fullClassName) => {
    const simple = fullClassName.split(".").pop();
    if (seenNames.has(simple)) return false;
    seenNames.add(simple);
    return true;
  });
  const moduleImports = allModuleClasses.map((c) => `import ${c}`).join("\n");
  const elementImports = elementPackages.flatMap((p) => Object.values(p.config.android.elements).map((cls) => `import ${cls}`)).filter((v, i, a) => a.indexOf(v) === i).join("\n");
  const moduleRegistrations = allModuleClasses.map((fullClassName) => {
    const simpleClassName = fullClassName.split(".").pop();
    return `        LynxEnv.inst().registerModule("${simpleClassName}", ${simpleClassName}::class.java)`;
  }).join("\n");
  const behaviorRegistrations = elementPackages.flatMap(
    (p) => Object.entries(p.config.android.elements).map(([tag, fullClassName]) => {
      const simpleClassName = fullClassName.split(".").pop();
      return `        LynxEnv.inst().addBehavior(object : com.lynx.tasm.behavior.Behavior("${tag}") {
            override fun createUI(context: com.lynx.tasm.behavior.LynxContext): com.lynx.tasm.behavior.ui.LynxUI<*> {
                return ${simpleClassName}(context)
            }
        })`;
    })
  ).join("\n");
  const allRegistrations = [moduleRegistrations, behaviorRegistrations].filter(Boolean).join("\n");
  const hostViewPackages = modulePackages.filter((p) => p.config.android?.attachHostView);
  const hostViewLines = hostViewPackages.flatMap(
    (p) => getAndroidModuleClassNames(p.config.android).map((fullClassName) => {
      const simpleClassName = fullClassName.split(".").pop();
      return `        ${simpleClassName}.attachHostView(view)`;
    })
  ).join("\n");
  const hostViewMethod = hostViewPackages.length > 0 ? `
    fun onHostViewChanged(view: android.view.View?) {
${hostViewLines}
    }` : "\n    fun onHostViewChanged(view: android.view.View?) {}\n";
  return `package ${projectPackage}.generated

import android.content.Context
import com.lynx.tasm.LynxEnv
${moduleImports}
${elementImports}

object GeneratedLynxExtensions {
    fun register(context: Context) {
${allRegistrations}
    }${hostViewMethod}
}
`;
}
function generateActivityLifecycleKotlin(packages, projectPackage) {
  const hooks = {
    onCreate: [],
    onNewIntent: [],
    onResume: [],
    onPause: [],
    onDestroy: [],
    onViewAttached: [],
    onViewDetached: [],
    onBackPressed: [],
    onWindowFocusChanged: [],
    onCreateDelayed: []
  };
  for (const pkg of packages) {
    const patches = pkg.config.android?.activityPatches;
    if (!patches) continue;
    for (const [hook, call] of Object.entries(patches)) {
      if (hook in hooks) hooks[hook].push(call);
    }
  }
  const bodyLines = (arr) => arr.length > 0 ? arr.map((c) => `        ${c}`).join("\n") : "        // no patches";
  const backPressedBody = hooks.onBackPressed.length > 0 ? hooks.onBackPressed.map((c) => `        ${c}(fallback)`).join("\n") : "        fallback(false)";
  const windowFocusBody = hooks.onWindowFocusChanged.length > 0 ? `        if (hasFocus) {
${hooks.onWindowFocusChanged.map((c) => `            ${c}`).join("\n")}
        }` : "        // no patches";
  const createDelayedBody = hooks.onCreateDelayed.length > 0 ? `        listOf(150L, 400L, 800L).forEach { delay ->
            handler.postDelayed({
${hooks.onCreateDelayed.map((c) => `                ${c}`).join("\n")}
            }, delay)
        }` : "        // no patches";
  return `package ${projectPackage}.generated

import android.content.Intent
import com.lynx.tasm.LynxView

object GeneratedActivityLifecycle {
    fun onCreate(intent: Intent?) {
${bodyLines(hooks.onCreate)}
    }

    fun onNewIntent(intent: Intent?) {
${bodyLines(hooks.onNewIntent)}
    }

    fun onViewAttached(lynxView: LynxView?) {
${bodyLines(hooks.onViewAttached)}
    }

    fun onViewDetached() {
${bodyLines(hooks.onViewDetached)}
    }

    fun onResume() {
${bodyLines(hooks.onResume)}
    }

    fun onPause() {
${bodyLines(hooks.onPause)}
    }

    fun onDestroy() {
${bodyLines(hooks.onDestroy)}
    }

    fun onBackPressed(fallback: (Boolean) -> Unit) {
${backPressedBody}
    }

    fun onWindowFocusChanged(hasFocus: Boolean) {
${windowFocusBody}
    }

    fun onCreateDelayed(handler: android.os.Handler) {
${createDelayedBody}
    }
}
`;
}

// src/android/autolink.ts
var REQUIRED_CATALOG_ENTRIES = {
  "androidx.biometric": {
    versionRef: "biometric",
    version: "1.1.0",
    libraryKey: "androidx-biometric",
    libraryLine: 'androidx-biometric = { group = "androidx.biometric", name = "biometric", version.ref = "biometric" }'
  }
};
var REQUIRED_PLUGIN_ENTRIES = {
  "android.library": {
    pluginKey: "android-library",
    pluginLine: 'android-library = { id = "com.android.library", version.ref = "agp" }'
  },
  "kotlin.compose": {
    pluginKey: "kotlin-compose",
    pluginLine: 'kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }'
  }
};
var autolink = () => {
  let resolved;
  try {
    resolved = resolveHostPaths();
    if (!resolved.config.android?.packageName) {
      throw new Error('"android.packageName" must be defined in tamer.config.json');
    }
  } catch (error) {
    console.error(`\u274C Error loading configuration: ${error.message}`);
    process.exit(1);
  }
  const { androidDir: appAndroidPath, config } = resolved;
  const packageName = config.android.packageName;
  const projectRoot = resolved.projectRoot;
  function updateGeneratedSection(filePath, newContent, startMarker, endMarker) {
    if (!fs6.existsSync(filePath)) {
      console.warn(`\u26A0\uFE0F File not found, skipping update: ${filePath}`);
      return;
    }
    let fileContent = fs6.readFileSync(filePath, "utf8");
    const escapedStartMarker = startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedEndMarker = endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escapedStartMarker}[\\s\\S]*?${escapedEndMarker}`, "g");
    const replacementBlock = `${startMarker}
${newContent}
${endMarker}`;
    if (regex.test(fileContent)) {
      fileContent = fileContent.replace(regex, replacementBlock);
    } else {
      console.warn(`\u26A0\uFE0F Could not find autolink markers in ${path6.basename(filePath)}. Appending to the end of the file.`);
      fileContent += `
${replacementBlock}
`;
    }
    fs6.writeFileSync(filePath, fileContent);
    console.log(`\u2705 Updated autolinked section in ${path6.basename(filePath)}`);
  }
  function updateSettingsGradle(packages) {
    const settingsFilePath = path6.join(appAndroidPath, "settings.gradle.kts");
    let scriptContent = `// This section is automatically generated by Tamer4Lynx.
// Manual edits will be overwritten.`;
    const androidPackages = packages.filter((p) => p.config.android);
    if (androidPackages.length > 0) {
      androidPackages.forEach((pkg) => {
        const gradleProjectName = pkg.name.replace(/^@/, "").replace(/\//g, "_");
        const sourceDir = pkg.config.android?.sourceDir || "android";
        const projectPath = path6.join(pkg.packagePath, sourceDir).replace(/\\/g, "/");
        const relativePath = path6.relative(appAndroidPath, projectPath).replace(/\\/g, "/");
        scriptContent += `
include(":${gradleProjectName}")`;
        scriptContent += `
project(":${gradleProjectName}").projectDir = file("${relativePath}")`;
      });
    } else {
      scriptContent += `
println("No native modules found by Tamer4Lynx autolinker.")`;
    }
    updateGeneratedSection(settingsFilePath, scriptContent.trim(), "// GENERATED AUTOLINK START", "// GENERATED AUTOLINK END");
  }
  function updateAppBuildGradle(packages) {
    const appBuildGradlePath = path6.join(appAndroidPath, "app", "build.gradle.kts");
    const androidPackages = packages.filter((p) => p.config.android);
    const implementationLines = androidPackages.map((p) => {
      const gradleProjectName = p.name.replace(/^@/, "").replace(/\//g, "_");
      return `    implementation(project(":${gradleProjectName}"))`;
    }).join("\n");
    const scriptContent = `// This section is automatically generated by Tamer4Lynx.
    // Manual edits will be overwritten.
${implementationLines || "    // No native dependencies found to link."}`;
    updateGeneratedSection(
      appBuildGradlePath,
      scriptContent,
      "// GENERATED AUTOLINK DEPENDENCIES START",
      "// GENERATED AUTOLINK DEPENDENCIES END"
    );
  }
  function generateKotlinExtensionsFile(packages, projectPackage) {
    const packagePath = projectPackage.replace(/\./g, "/");
    const generatedDir = path6.join(appAndroidPath, "app", "src", "main", "kotlin", packagePath, "generated");
    const kotlinExtensionsPath = path6.join(generatedDir, "GeneratedLynxExtensions.kt");
    const content = `/**
 * This file is generated by the Tamer4Lynx autolinker.
 * Do not edit this file manually.
 */
${generateLynxExtensionsKotlin(packages, projectPackage)}`;
    fs6.mkdirSync(generatedDir, { recursive: true });
    fs6.writeFileSync(kotlinExtensionsPath, content.trimStart());
    console.log(`\u2705 Generated Kotlin extensions at ${kotlinExtensionsPath}`);
  }
  function generateActivityLifecycleFile(packages, projectPackage) {
    const packageKotlinPath = projectPackage.replace(/\./g, "/");
    const generatedDir = path6.join(appAndroidPath, "app", "src", "main", "kotlin", packageKotlinPath, "generated");
    const outputPath = path6.join(generatedDir, "GeneratedActivityLifecycle.kt");
    const content = `/**
 * This file is generated by the Tamer4Lynx autolinker.
 * Do not edit this file manually.
 */
${generateActivityLifecycleKotlin(packages, projectPackage)}`;
    fs6.mkdirSync(generatedDir, { recursive: true });
    fs6.writeFileSync(outputPath, content);
    console.log(`\u2705 Generated activity lifecycle patches at ${outputPath}`);
  }
  function syncDeepLinkIntentFilters() {
    const deepLinks = config.android?.deepLinks;
    if (!deepLinks || deepLinks.length === 0) return;
    const manifestPath = path6.join(appAndroidPath, "app", "src", "main", "AndroidManifest.xml");
    if (!fs6.existsSync(manifestPath)) return;
    const intentFilters = deepLinks.map((link) => {
      const dataAttrs = [
        `android:scheme="${link.scheme}"`,
        link.host ? `android:host="${link.host}"` : "",
        link.pathPrefix ? `android:pathPrefix="${link.pathPrefix}"` : ""
      ].filter(Boolean).join(" ");
      return `        <intent-filter>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data ${dataAttrs} />
        </intent-filter>`;
    }).join("\n");
    updateGeneratedSection(
      manifestPath,
      intentFilters,
      "        <!-- GENERATED DEEP LINKS START -->",
      "        <!-- GENERATED DEEP LINKS END -->"
    );
  }
  function run() {
    console.log("\u{1F50E} Finding Lynx extension packages (lynx.ext.json / tamer.json)...");
    const packages = discoverModules(projectRoot).filter((p) => p.config.android);
    if (packages.length > 0) {
      console.log(`Found ${packages.length} package(s): ${packages.map((p) => p.name).join(", ")}`);
    } else {
      console.log("\u2139\uFE0F No Tamer4Lynx native packages found.");
    }
    updateSettingsGradle(packages);
    updateAppBuildGradle(packages);
    generateKotlinExtensionsFile(packages, packageName);
    generateActivityLifecycleFile(packages, packageName);
    syncManifestPermissions(packages);
    syncDeepLinkIntentFilters();
    syncVersionCatalog(packages);
    ensureReleaseSigning();
    console.log("\u2728 Autolinking complete.");
  }
  function syncVersionCatalog(packages) {
    const libsTomlPath = path6.join(appAndroidPath, "gradle", "libs.versions.toml");
    if (!fs6.existsSync(libsTomlPath)) return;
    const requiredAliases = /* @__PURE__ */ new Set();
    const requiredPluginAliases = /* @__PURE__ */ new Set();
    for (const pkg of packages) {
      const buildPath = path6.join(pkg.packagePath, pkg.config.android?.sourceDir || "android", "build.gradle.kts");
      if (!fs6.existsSync(buildPath)) continue;
      const content = fs6.readFileSync(buildPath, "utf8");
      for (const m of content.matchAll(/libs\.([\w.]+)/g)) {
        const alias = m[1];
        if (alias && alias in REQUIRED_CATALOG_ENTRIES) requiredAliases.add(alias);
      }
      for (const m of content.matchAll(/libs\.plugins\.([\w.]+)/g)) {
        const alias = m[1];
        if (alias && alias in REQUIRED_PLUGIN_ENTRIES) requiredPluginAliases.add(alias);
      }
    }
    if (requiredAliases.size === 0 && requiredPluginAliases.size === 0) return;
    let toml = fs6.readFileSync(libsTomlPath, "utf8");
    let updated = false;
    for (const alias of requiredAliases) {
      const entry = REQUIRED_CATALOG_ENTRIES[alias];
      if (!entry) continue;
      if (!toml.includes(`${entry.versionRef} = "`)) {
        toml = toml.replace(/(\[versions\]\n)/, `$1${entry.versionRef} = "${entry.version}"
`);
        updated = true;
      }
      if (!toml.includes(`${entry.libraryKey} = `)) {
        toml = toml.replace(/(\[libraries\]\n)/, `$1${entry.libraryLine}
`);
        updated = true;
      }
    }
    for (const alias of requiredPluginAliases) {
      const entry = REQUIRED_PLUGIN_ENTRIES[alias];
      if (!entry || toml.includes(`${entry.pluginKey} = `)) continue;
      toml = toml.replace(/(\[plugins\]\n)/, `$1${entry.pluginLine}
`);
      updated = true;
    }
    if (updated) {
      fs6.writeFileSync(libsTomlPath, toml);
      console.log("\u2705 Synced version catalog (libs.versions.toml) for linked modules.");
    }
  }
  function ensureReleaseSigning() {
    const appBuildPath = path6.join(appAndroidPath, "app", "build.gradle.kts");
    if (!fs6.existsSync(appBuildPath)) return;
    let content = fs6.readFileSync(appBuildPath, "utf8");
    if (content.includes('signingConfig = signingConfigs.getByName("debug")')) return;
    const releaseBlock = /(release\s*\{)([\s\S]*?)(\n        \}\s*\n(\s*\}|\s*compileOptions))/;
    const match = content.match(releaseBlock);
    if (match) {
      content = content.replace(
        releaseBlock,
        `$1$2
            signingConfig = signingConfigs.getByName("debug")
        $3`
      );
      fs6.writeFileSync(appBuildPath, content);
      console.log("\u2705 Set release signing to debug so installRelease works without a keystore.");
    }
  }
  function syncManifestPermissions(packages) {
    const manifestPath = path6.join(appAndroidPath, "app", "src", "main", "AndroidManifest.xml");
    if (!fs6.existsSync(manifestPath)) return;
    const allPermissions = /* @__PURE__ */ new Set();
    for (const pkg of packages) {
      const perms = pkg.config.android?.permissions;
      if (Array.isArray(perms)) {
        for (const p of perms) {
          const name = p.startsWith("android.permission.") ? p : `android.permission.${p}`;
          allPermissions.add(name);
        }
      }
    }
    if (allPermissions.size === 0) return;
    let manifest = fs6.readFileSync(manifestPath, "utf8");
    const existingMatch = [...manifest.matchAll(/<uses-permission android:name="(android\.permission\.\w+)"\s*\/>/g)];
    const existing = new Set(existingMatch.map((m) => m[1]));
    const toAdd = [...allPermissions].filter((p) => !existing.has(p));
    if (toAdd.length === 0) return;
    const newLines = toAdd.map((p) => `    <uses-permission android:name="${p}" />`).join("\n");
    manifest = manifest.replace(
      /(\s*)(<application)/,
      `${newLines}
$1$2`
    );
    fs6.writeFileSync(manifestPath, manifest);
    console.log(`\u2705 Synced manifest permissions: ${toAdd.map((p) => p.split(".").pop()).join(", ")}`);
  }
  run();
};
var autolink_default = autolink;

// src/android/bundle.ts
import fs9 from "fs";
import path9 from "path";
import { execSync as execSync2 } from "child_process";

// src/common/copyDistAssets.ts
import fs7 from "fs";
import path7 from "path";
var SKIP = /* @__PURE__ */ new Set([".rspeedy", "stats.json"]);
function copyDistAssets(distDir, destDir, bundleFile) {
  if (!fs7.existsSync(distDir)) return;
  for (const entry of fs7.readdirSync(distDir)) {
    if (SKIP.has(entry)) continue;
    const src = path7.join(distDir, entry);
    const dest = path7.join(destDir, entry);
    const stat = fs7.statSync(src);
    if (stat.isDirectory()) {
      fs7.mkdirSync(dest, { recursive: true });
      copyDistAssets(src, dest, bundleFile);
    } else {
      fs7.copyFileSync(src, dest);
      if (entry !== bundleFile) {
        console.log(`\u2728 Copied asset: ${entry}`);
      }
    }
  }
}

// src/android/syncDevClient.ts
import fs8 from "fs";
import path8 from "path";
function readAndSubstituteTemplate2(templatePath, vars) {
  const raw = fs8.readFileSync(templatePath, "utf-8");
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
    raw
  );
}
async function syncDevClient(opts) {
  let resolved;
  try {
    resolved = resolveHostPaths();
  } catch (error) {
    console.error(`\u274C Error loading configuration: ${error.message}`);
    process.exit(1);
  }
  const { config, androidDir: rootDir } = resolved;
  const packageName = config.android?.packageName;
  const appName = config.android?.appName;
  const packagePath = packageName.replace(/\./g, "/");
  const javaDir = path8.join(rootDir, "app", "src", "main", "java", packagePath);
  const kotlinDir = path8.join(rootDir, "app", "src", "main", "kotlin", packagePath);
  if (!fs8.existsSync(javaDir) || !fs8.existsSync(kotlinDir)) {
    console.error("\u274C Android project not found. Run `tamer android create` first.");
    process.exit(1);
  }
  const devMode = opts?.forceProduction ? "standalone" : resolved.devMode;
  const devServer = config.devServer ? {
    host: config.devServer.host ?? "10.0.2.2",
    port: config.devServer.port ?? config.devServer.httpPort ?? 3e3
  } : void 0;
  const vars = { packageName, appName, devMode, devServer, projectRoot: resolved.projectRoot };
  const [templateProviderSource] = await Promise.all([
    fetchAndPatchTemplateProvider(vars)
  ]);
  fs8.writeFileSync(path8.join(javaDir, "TemplateProvider.java"), templateProviderSource);
  fs8.writeFileSync(path8.join(kotlinDir, "MainActivity.kt"), getStandaloneMainActivity(vars));
  const appDir = path8.join(rootDir, "app");
  const mainDir = path8.join(appDir, "src", "main");
  const manifestPath = path8.join(mainDir, "AndroidManifest.xml");
  const devClientPkg = findDevClientPackage(resolved.projectRoot);
  const hasDevClient = devMode === "embedded" && devClientPkg;
  if (hasDevClient) {
    const templateDir = path8.join(devClientPkg, "android", "templates");
    const templateVars = { PACKAGE_NAME: packageName, APP_NAME: appName };
    const devClientFiles = [
      "DevClientManager.kt",
      "DevServerPrefs.kt",
      "ProjectActivity.kt",
      "PortraitCaptureActivity.kt"
    ];
    for (const f of devClientFiles) {
      const src = path8.join(templateDir, f);
      if (fs8.existsSync(src)) {
        const content = readAndSubstituteTemplate2(src, templateVars);
        fs8.writeFileSync(path8.join(kotlinDir, f), content);
      }
    }
    let manifest = fs8.readFileSync(manifestPath, "utf-8");
    const projectActivityEntry = '        <activity android:name=".ProjectActivity" android:exported="false" android:taskAffinity="" android:launchMode="singleTask" android:documentLaunchMode="always" android:windowSoftInputMode="adjustResize" />';
    const portraitCaptureEntry = '        <activity android:name=".PortraitCaptureActivity" android:screenOrientation="portrait" android:stateNotNeeded="true" android:theme="@style/zxing_CaptureTheme" android:windowSoftInputMode="stateAlwaysHidden" />';
    if (!manifest.includes("ProjectActivity")) {
      manifest = manifest.replace(/(\s*)(<\/application>)/, `${projectActivityEntry}
$1$2`);
    } else {
      manifest = manifest.replace(/\s*<activity android:name="\.ProjectActivity"[^\/]*\/>\n?/g, projectActivityEntry + "\n");
    }
    if (!manifest.includes("PortraitCaptureActivity")) {
      manifest = manifest.replace(/(\s*)(<\/application>)/, `${portraitCaptureEntry}
$1$2`);
    } else {
      manifest = manifest.replace(/\s*<activity android:name="\.PortraitCaptureActivity"[^\/]*\/>\n?/g, portraitCaptureEntry + "\n");
    }
    const mainActivityTag = manifest.match(/<activity[^>]*android:name="\.MainActivity"[^>]*>/);
    if (mainActivityTag && !mainActivityTag[0].includes("windowSoftInputMode")) {
      manifest = manifest.replace(
        /(<activity\s+android:name="\.MainActivity"[^>]*)(>)/,
        '$1 android:windowSoftInputMode="adjustResize"$2'
      );
    }
    fs8.writeFileSync(manifestPath, manifest);
    console.log("\u2705 Synced dev client (TemplateProvider, MainActivity, ProjectActivity, DevClientManager)");
  } else {
    for (const f of ["DevClientManager.kt", "DevServerPrefs.kt", "ProjectActivity.kt", "PortraitCaptureActivity.kt", "DevLauncherActivity.kt"]) {
      try {
        fs8.rmSync(path8.join(kotlinDir, f));
      } catch {
      }
    }
    let manifest = fs8.readFileSync(manifestPath, "utf-8");
    manifest = manifest.replace(/\s*<activity android:name="\.ProjectActivity"[^\/]*\/>\n?/g, "");
    manifest = manifest.replace(/\s*<activity android:name="\.PortraitCaptureActivity"[^\/]*\/>\n?/g, "");
    const mainActivityTag = manifest.match(/<activity[^>]*android:name="\.MainActivity"[^>]*>/);
    if (mainActivityTag && !mainActivityTag[0].includes("windowSoftInputMode")) {
      manifest = manifest.replace(
        /(<activity\s+android:name="\.MainActivity"[^>]*)(>)/,
        '$1 android:windowSoftInputMode="adjustResize"$2'
      );
    }
    fs8.writeFileSync(manifestPath, manifest);
    console.log('\u2705 Synced (dev client disabled - set dev.mode: "embedded" in tamer.config.json to enable)');
  }
}
var syncDevClient_default = syncDevClient;

// src/android/bundle.ts
function findRepoRoot3(start2) {
  let dir = path9.resolve(start2);
  const root = path9.parse(dir).root;
  while (dir !== root) {
    const pkgPath = path9.join(dir, "package.json");
    if (fs9.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs9.readFileSync(pkgPath, "utf8"));
        if (pkg.workspaces) return dir;
      } catch {
      }
    }
    dir = path9.dirname(dir);
  }
  return start2;
}
async function bundleAndDeploy(opts = {}) {
  const target = opts.target ?? "host";
  const release = opts.release === true;
  const origCwd = process.cwd();
  let resolved;
  try {
    if (target === "dev-app") {
      const repoRoot = findRepoRoot3(origCwd);
      resolved = resolveDevAppPaths(repoRoot);
      const devAppDir = resolved.projectRoot;
      const androidDir = resolved.androidDir;
      if (!fs9.existsSync(androidDir)) {
        console.log("\u{1F4F1} Creating Tamer Dev App Android project...");
        await create_default({ target: "dev-app" });
      }
      process.chdir(devAppDir);
    } else {
      resolved = resolveHostPaths();
    }
  } catch (error) {
    console.error(`\u274C Error loading configuration: ${error.message}`);
    process.exit(1);
  }
  const { lynxProjectDir, lynxBundlePath, androidAssetsDir, devClientBundlePath, devMode } = resolved;
  const destinationDir = androidAssetsDir;
  autolink_default();
  if (release) {
    await syncDevClient_default({ forceProduction: true });
  } else if (devMode === "embedded") {
    await syncDevClient_default();
  }
  try {
    console.log("\u{1F4E6} Building Lynx bundle...");
    execSync2("npm run build", { stdio: "inherit", cwd: lynxProjectDir });
    console.log("\u2705 Build completed successfully.");
  } catch (error) {
    console.error("\u274C Build process failed.");
    process.exit(1);
  }
  if (target === "dev-app") {
    process.chdir(origCwd);
  }
  if (target !== "dev-app" && !release && devMode === "embedded" && devClientBundlePath && !fs9.existsSync(devClientBundlePath)) {
    const devClientDir = path9.dirname(path9.dirname(devClientBundlePath));
    try {
      console.log("\u{1F4E6} Building dev launcher (tamer-dev-client)...");
      execSync2("npm run build", { stdio: "inherit", cwd: devClientDir });
      console.log("\u2705 Dev launcher build completed.");
    } catch (error) {
      console.error("\u274C Dev launcher build failed.");
      process.exit(1);
    }
  }
  try {
    fs9.mkdirSync(destinationDir, { recursive: true });
    if (target !== "dev-app" && release) {
      const devClientAsset = path9.join(destinationDir, "dev-client.lynx.bundle");
      if (fs9.existsSync(devClientAsset)) {
        fs9.rmSync(devClientAsset);
        console.log(`\u2728 Removed dev-client.lynx.bundle from assets (production build)`);
      }
    } else if (target !== "dev-app" && devMode === "embedded" && devClientBundlePath && fs9.existsSync(devClientBundlePath)) {
      fs9.copyFileSync(devClientBundlePath, path9.join(destinationDir, "dev-client.lynx.bundle"));
      console.log(`\u2728 Copied dev-client.lynx.bundle to assets`);
    }
    if (!fs9.existsSync(lynxBundlePath)) {
      console.error(`\u274C Build output not found at: ${lynxBundlePath}`);
      process.exit(1);
    }
    const distDir = path9.dirname(lynxBundlePath);
    copyDistAssets(distDir, destinationDir, resolved.lynxBundleFile);
    console.log(`\u2728 Copied ${resolved.lynxBundleFile} to assets`);
  } catch (error) {
    console.error(`\u274C Failed to copy bundle: ${error.message}`);
    process.exit(1);
  }
}
var bundle_default = bundleAndDeploy;

// src/android/build.ts
import fs10 from "fs";
import path10 from "path";
import { execSync as execSync3 } from "child_process";
function findRepoRoot4(start2) {
  let dir = path10.resolve(start2);
  const root = path10.parse(dir).root;
  while (dir !== root) {
    const pkgPath = path10.join(dir, "package.json");
    if (fs10.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs10.readFileSync(pkgPath, "utf8"));
        if (pkg.workspaces) return dir;
      } catch {
      }
    }
    dir = path10.dirname(dir);
  }
  return start2;
}
async function buildApk(opts = {}) {
  const target = opts.target ?? "host";
  const resolved = target === "dev-app" ? resolveDevAppPaths(findRepoRoot4(process.cwd())) : resolveHostPaths();
  await bundle_default({ target, release: opts.release });
  const androidDir = resolved.androidDir;
  const gradlew = path10.join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");
  const variant = opts.release ? "Release" : "Debug";
  const task = opts.install ? `install${variant}` : `assemble${variant}`;
  console.log(`
\u{1F528} Building ${variant.toLowerCase()} APK${opts.install ? " and installing" : ""}...`);
  execSync3(`"${gradlew}" ${task}`, { stdio: "inherit", cwd: androidDir });
  console.log(`\u2705 APK ${opts.install ? "installed" : "built"} successfully.`);
  if (opts.install) {
    const packageName = resolved.config.android?.packageName;
    if (packageName) {
      try {
        console.log(`\u{1F680} Launching ${packageName}...`);
        execSync3(`adb shell am start -n ${packageName}/.MainActivity`, { stdio: "inherit" });
        console.log("\u2705 App launched.");
      } catch (e) {
        console.warn("\u26A0\uFE0F Could not launch app. Is a device/emulator connected?");
      }
    } else {
      console.log('\u2139\uFE0F Set "android.packageName" in tamer.config.json to auto-launch.');
    }
  }
}
var build_default = buildApk;

// src/ios/create.ts
import fs12 from "fs";
import path12 from "path";

// src/ios/getPod.ts
import { execSync as execSync4 } from "child_process";
import fs11 from "fs";
import path11 from "path";
function isCocoaPodsInstalled() {
  try {
    execSync4("command -v pod >/dev/null 2>&1");
    return true;
  } catch (error) {
    return false;
  }
}
async function setupCocoaPods(rootDir) {
  if (!isCocoaPodsInstalled()) {
    console.error("\u274C CocoaPods is not installed.");
    console.log("   CocoaPods is required to manage native dependencies for iOS development.");
    console.log("   Please install it using one of the following commands:");
    console.log("\n   Using Homebrew (Recommended):");
    console.log("   brew install cocoapods");
    console.log("\n   Using RubyGems:");
    console.log("   sudo gem install cocoapods\n");
    process.exit(1);
  }
  try {
    console.log("\u{1F4E6} CocoaPods is installed. Proceeding with dependency installation...");
    const podfilePath = path11.join(rootDir, "Podfile");
    if (!fs11.existsSync(podfilePath)) {
      throw new Error(`Podfile not found at ${podfilePath}`);
    }
    console.log(`\u{1F680} Executing pod install in: ${rootDir}`);
    execSync4(`pod install`, {
      cwd: rootDir,
      stdio: "inherit"
    });
    console.log("\u2705 CocoaPods dependencies installed successfully.");
  } catch (err) {
    console.error("\u274C Failed to install CocoaPods dependencies.", err.message);
    process.exit(1);
  }
}

// src/ios/create.ts
import { randomBytes } from "crypto";
function readAndSubstituteTemplate3(templatePath, vars) {
  const raw = fs12.readFileSync(templatePath, "utf-8");
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
    raw
  );
}
var create2 = () => {
  const generateId2 = () => randomBytes(12).toString("hex").toUpperCase();
  let appName;
  let bundleId;
  let config;
  try {
    config = loadHostConfig();
    appName = config.ios?.appName;
    bundleId = config.ios?.bundleId;
    if (!appName && !bundleId) {
      throw new Error('"ios.appName" and "ios.bundleId" must be defined in tamer.config.json');
    }
  } catch (error) {
    console.error(`\u274C Error loading configuration: ${error.message}`);
    process.exit(1);
  }
  const iosDir = config.paths?.iosDir ?? "ios";
  const rootDir = path12.join(process.cwd(), iosDir);
  const projectDir = path12.join(rootDir, appName);
  const xcodeprojDir = path12.join(rootDir, `${appName}.xcodeproj`);
  const bridgingHeader = `${appName}-Bridging-Header.h`;
  function writeFile3(filePath, content) {
    fs12.mkdirSync(path12.dirname(filePath), { recursive: true });
    fs12.writeFileSync(filePath, content.trimStart(), "utf8");
  }
  if (fs12.existsSync(rootDir)) {
    console.log(`\u{1F9F9} Removing existing directory: ${rootDir}`);
    fs12.rmSync(rootDir, { recursive: true, force: true });
  }
  console.log(`\u{1F680} Creating a new Tamer4Lynx project in: ${rootDir}`);
  const ids = {
    project: generateId2(),
    mainGroup: generateId2(),
    appGroup: generateId2(),
    productsGroup: generateId2(),
    frameworksGroup: generateId2(),
    appFile: generateId2(),
    appDelegateRef: generateId2(),
    sceneDelegateRef: generateId2(),
    sceneDelegateBaseRef: generateId2(),
    viewControllerRef: generateId2(),
    assetsRef: generateId2(),
    lynxProviderRef: generateId2(),
    lynxInitRef: generateId2(),
    bridgingHeaderRef: generateId2(),
    nativeTarget: generateId2(),
    appDelegateBuildFile: generateId2(),
    sceneDelegateBuildFile: generateId2(),
    sceneDelegateSourceBuildFile: generateId2(),
    viewControllerBuildFile: generateId2(),
    lynxProviderBuildFile: generateId2(),
    lynxInitBuildFile: generateId2(),
    assetsBuildFile: generateId2(),
    frameworksBuildPhase: generateId2(),
    resourcesBuildPhase: generateId2(),
    sourcesBuildPhase: generateId2(),
    projectBuildConfigList: generateId2(),
    targetBuildConfigList: generateId2(),
    projectDebugConfig: generateId2(),
    projectReleaseConfig: generateId2(),
    targetDebugConfig: generateId2(),
    targetReleaseConfig: generateId2()
  };
  writeFile3(path12.join(rootDir, "Podfile"), `
source 'https://cdn.cocoapods.org/'

platform :ios, '13.0'

target '${appName}' do
  pod 'Lynx', '3.6.0', :subspecs => [
	'Framework',
  ], :modular_headers => true

  pod 'PrimJS', '3.6.1', :subspecs => ['quickjs', 'napi']

  pod 'LynxService', '3.6.0', :subspecs => [
	  'Image',
	  'Log',
	  'Http',
  ]
  pod 'SDWebImage','5.15.5'
  pod 'SDWebImageWebPCoder', '0.11.0'

  # GENERATED AUTOLINK DEPENDENCIES START
  # This section is automatically generated by Tamer4Lynx.
  # Manual edits will be overwritten.
  # GENERATED AUTOLINK DEPENDENCIES END
end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
    end

    if target.name == 'Lynx'
      target.build_configurations.each do |config|
        flags = [
          '-Wno-vla-extension',
          '-Wno-vla',
          '-Wno-error=vla-extension',
          '-Wno-deprecated-declarations',
          '-Wno-deprecated',
          '-Wno-macro-redefined',
          '-Wno-enum-compare',
          '-Wno-enum-compare-conditional',
          '-Wno-enum-conversion'
        ].join(' ')

        config.build_settings['OTHER_CPLUSPLUSFLAGS'] = "$(inherited) #{flags}"
        config.build_settings['OTHER_CFLAGS'] = "$(inherited) #{flags}"
        config.build_settings['CLANG_WARN_VLA'] = 'NO'
        config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
        config.build_settings['CLANG_WARN_ENUM_CONVERSION'] = 'NO'
      end
    end
  end
end
	`);
  const hostPkg = findTamerHostPackage(process.cwd());
  const templateVars = { PACKAGE_NAME: bundleId, APP_NAME: appName, BUNDLE_ID: bundleId };
  if (hostPkg) {
    const templateDir = path12.join(hostPkg, "ios", "templates");
    for (const f of ["AppDelegate.swift", "SceneDelegate.swift", "ViewController.swift", "LynxProvider.swift", "LynxInitProcessor.swift"]) {
      const srcPath = path12.join(templateDir, f);
      if (fs12.existsSync(srcPath)) {
        writeFile3(path12.join(projectDir, f), readAndSubstituteTemplate3(srcPath, templateVars));
      }
    }
  } else {
    writeFile3(path12.join(projectDir, "AppDelegate.swift"), `
import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
      LynxInitProcessor.shared.setupEnvironment()
      return true
  }

  func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
      return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
  }
}
	`);
    writeFile3(path12.join(projectDir, "SceneDelegate.swift"), `
import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
      guard let windowScene = scene as? UIWindowScene else { return }
      window = UIWindow(windowScene: windowScene)
      window?.rootViewController = ViewController()
      window?.makeKeyAndVisible()
  }
}
	`);
    writeFile3(path12.join(projectDir, "ViewController.swift"), `
import UIKit
import Lynx
import tamerinsets

class ViewController: UIViewController {
  private var lynxView: LynxView?

  override func viewDidLoad() {
	super.viewDidLoad()
	view.backgroundColor = .black
	edgesForExtendedLayout = .all
	extendedLayoutIncludesOpaqueBars = true
	additionalSafeAreaInsets = .zero
	view.insetsLayoutMarginsFromSafeArea = false
	view.preservesSuperviewLayoutMargins = false
	viewRespectsSystemMinimumLayoutMargins = false
  }

  override func viewDidLayoutSubviews() {
	super.viewDidLayoutSubviews()
	guard view.bounds.width > 0, view.bounds.height > 0 else { return }
	if lynxView == nil {
	  setupLynxView()
	} else {
	  applyFullscreenLayout(to: lynxView!)
	}
  }

  override func viewSafeAreaInsetsDidChange() {
	super.viewSafeAreaInsetsDidChange()
	TamerInsetsModule.reRequestInsets()
  }

  override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

  private func buildLynxView() -> LynxView {
	let bounds = view.bounds
	let lv = LynxView { builder in
	  builder.config = LynxConfig(provider: LynxProvider())
	  builder.screenSize = bounds.size
	  builder.fontScale = 1.0
	}
	lv.autoresizingMask = [.flexibleWidth, .flexibleHeight]
	lv.insetsLayoutMarginsFromSafeArea = false
	lv.preservesSuperviewLayoutMargins = false
	applyFullscreenLayout(to: lv)
	return lv
  }

  private func setupLynxView() {
	let lv = buildLynxView()
	view.addSubview(lv)
	lv.loadTemplate(fromURL: "main.lynx.bundle", initData: nil)
	self.lynxView = lv
  }

  private func applyFullscreenLayout(to lynxView: LynxView) {
	let bounds = view.bounds
	let size = bounds.size
	lynxView.frame = bounds
	lynxView.updateScreenMetrics(withWidth: size.width, height: size.height)
	lynxView.updateViewport(withPreferredLayoutWidth: size.width, preferredLayoutHeight: size.height, needLayout: true)
	lynxView.preferredLayoutWidth = size.width
	lynxView.preferredLayoutHeight = size.height
	lynxView.layoutWidthMode = .exact
	lynxView.layoutHeightMode = .exact
  }
}
	`);
    writeFile3(path12.join(projectDir, "LynxProvider.swift"), `
import Foundation

class LynxProvider: NSObject, LynxTemplateProvider {
    func loadTemplate(withUrl url: String!, onComplete callback: LynxTemplateLoadBlock!) {
        DispatchQueue.global(qos: .background).async {
            guard let url = url,
                  let bundleUrl = Bundle.main.url(forResource: url, withExtension: nil),
                  let data = try? Data(contentsOf: bundleUrl) else {
                let err = NSError(domain: "LynxProvider", code: 404,
                                  userInfo: [NSLocalizedDescriptionKey: "Bundle not found: \\(url ?? "nil")"])
                callback?(nil, err)
                return
            }
            callback?(data, nil)
        }
    }
}
	`);
    writeFile3(path12.join(projectDir, "LynxInitProcessor.swift"), `
// Copyright 2024 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import Foundation

// GENERATED IMPORTS START
// This section is automatically generated by Tamer4Lynx.
// Manual edits will be overwritten.
// GENERATED IMPORTS END

final class LynxInitProcessor {
	static let shared = LynxInitProcessor()
	private init() {}

	func setupEnvironment() {
		TamerIconElement.registerFonts()
		setupLynxEnv()
		setupLynxService()
	}

	private func setupLynxEnv() {
		let env = LynxEnv.sharedInstance()
		let globalConfig = LynxConfig(provider: env.config.templateProvider)

		// GENERATED AUTOLINK START
        
		// GENERATED AUTOLINK END

		env.prepareConfig(globalConfig)
	}

	private func setupLynxService() {
		let webPCoder = SDImageWebPCoder.shared
		SDImageCodersManager.shared.addCoder(webPCoder)
	}
}
	`);
  }
  writeFile3(path12.join(projectDir, bridgingHeader), `
#import <Lynx/LynxConfig.h>
#import <Lynx/LynxEnv.h>
#import <Lynx/LynxTemplateProvider.h>
#import <Lynx/LynxView.h>
#import <Lynx/LynxModule.h>
#import <SDWebImage/SDWebImage.h>
#import <SDWebImageWebPCoder/SDWebImageWebPCoder.h>
	`);
  writeFile3(path12.join(projectDir, "Info.plist"), `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>UILaunchStoryboardName</key>
	<string>LaunchScreen</string>
	<key>UIApplicationSceneManifest</key>
	<dict>
		<key>UIApplicationSupportsMultipleScenes</key>
		<false/>
		<key>UISceneConfigurations</key>
		<dict>
			<key>UIWindowSceneSessionRoleApplication</key>
			<array>
				<dict>
					<key>UISceneConfigurationName</key>
					<string>Default Configuration</string>
					<key>UISceneDelegateClassName</key>
					<string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>
				</dict>
			</array>
		</dict>
	</dict>
	<key>UIRequiredDeviceCapabilities</key>
	<array>
		<string>armv7</string>
	</array>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsArbitraryLoads</key>
		<true/>
	</dict>
</dict>
</plist>
	`);
  const appIconDir = path12.join(projectDir, "Assets.xcassets", "AppIcon.appiconset");
  fs12.mkdirSync(appIconDir, { recursive: true });
  const iconPaths = resolveIconPaths(process.cwd(), config);
  if (iconPaths?.ios) {
    const entries = fs12.readdirSync(iconPaths.ios, { withFileTypes: true });
    for (const e of entries) {
      const dest = path12.join(appIconDir, e.name);
      if (e.isDirectory()) {
        fs12.cpSync(path12.join(iconPaths.ios, e.name), dest, { recursive: true });
      } else {
        fs12.copyFileSync(path12.join(iconPaths.ios, e.name), dest);
      }
    }
    console.log("\u2705 Copied iOS icon from tamer.config.json icon.ios");
  } else if (iconPaths?.source) {
    const ext = path12.extname(iconPaths.source) || ".png";
    const icon1024 = `Icon-1024${ext}`;
    fs12.copyFileSync(iconPaths.source, path12.join(appIconDir, icon1024));
    writeFile3(path12.join(appIconDir, "Contents.json"), JSON.stringify({
      images: [{ filename: icon1024, idiom: "universal", platform: "ios", size: "1024x1024" }],
      info: { author: "xcode", version: 1 }
    }, null, 2));
    console.log("\u2705 Copied app icon from tamer.config.json icon.source");
  } else {
    writeFile3(path12.join(appIconDir, "Contents.json"), `
{
  "images" : [ { "idiom" : "universal", "platform" : "ios", "size" : "1024x1024" } ],
  "info" : { "author" : "xcode", "version" : 1 }
}
	`);
  }
  fs12.mkdirSync(xcodeprojDir, { recursive: true });
  writeFile3(path12.join(xcodeprojDir, "project.pbxproj"), `
// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {};
	objectVersion = 56;
	objects = {
/* Begin PBXBuildFile section */
		${ids.appDelegateBuildFile} /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.appDelegateRef} /* AppDelegate.swift */; };
		${ids.sceneDelegateSourceBuildFile} /* SceneDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.sceneDelegateBaseRef} /* SceneDelegate.swift */; };
		${ids.viewControllerBuildFile} /* ViewController.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.viewControllerRef} /* ViewController.swift */; };
		${ids.assetsBuildFile} /* Assets.xcassets in Resources */ = {isa = PBXBuildFile; fileRef = ${ids.assetsRef} /* Assets.xcassets */; };
		${ids.lynxProviderBuildFile} /* LynxProvider.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.lynxProviderRef} /* LynxProvider.swift */; };
		${ids.lynxInitBuildFile} /* LynxInitProcessor.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.lynxInitRef} /* LynxInitProcessor.swift */; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		${ids.appFile} /* ${appName}.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = "${appName}.app"; sourceTree = BUILT_PRODUCTS_DIR; };
		${ids.appDelegateRef} /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "AppDelegate.swift"; sourceTree = "<group>"; };
		${ids.sceneDelegateBaseRef} /* SceneDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "SceneDelegate.swift"; sourceTree = "<group>"; };
		${ids.viewControllerRef} /* ViewController.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "ViewController.swift"; sourceTree = "<group>"; };
		${ids.assetsRef} /* Assets.xcassets */ = {isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = "Assets.xcassets"; sourceTree = "<group>"; };
		${ids.lynxProviderRef} /* LynxProvider.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "LynxProvider.swift"; sourceTree = "<group>"; };
		${ids.lynxInitRef} /* LynxInitProcessor.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "LynxInitProcessor.swift"; sourceTree = "<group>"; };
		${ids.bridgingHeaderRef} /* ${bridgingHeader} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.h; path = "${bridgingHeader}"; sourceTree = "<group>"; };
/* End PBXFileReference section */

/* Begin PBXInfoPlist section */
/* Info.plist is managed as a project resource, not a build file */
/* End PBXInfoPlist section */

/* Begin PBXFrameworksBuildPhase section */
		${ids.frameworksBuildPhase} /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		${ids.mainGroup} = {
			isa = PBXGroup;
			children = (
				${ids.appGroup} /* ${appName} */,
				${ids.productsGroup} /* Products */,
				${ids.frameworksGroup} /* Frameworks */,
			);
			sourceTree = "<group>";
		};
		${ids.productsGroup} /* Products */ = {
			isa = PBXGroup;
			children = (
				${ids.appFile} /* ${appName}.app */,
			);
			name = Products;
			sourceTree = "<group>";
		};
		${ids.frameworksGroup} /* Frameworks */ = {
			isa = PBXGroup;
			children = (
			);
			name = Frameworks;
			sourceTree = "<group>";
		};
		${ids.appGroup} /* ${appName} */ = {
			isa = PBXGroup;
			children = (
				${ids.appDelegateRef} /* AppDelegate.swift */,
				${ids.sceneDelegateBaseRef} /* SceneDelegate.swift */,
				${ids.viewControllerRef} /* ViewController.swift */,
				${ids.assetsRef} /* Assets.xcassets */,
				${ids.lynxProviderRef} /* LynxProvider.swift */,
				${ids.lynxInitRef} /* LynxInitProcessor.swift */,
				${ids.bridgingHeaderRef} /* ${bridgingHeader} */,
			);
			path = "${appName}";
			sourceTree = "<group>";
		};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		${ids.nativeTarget} /* ${appName} */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = ${ids.targetBuildConfigList} /* Build configuration list for PBXNativeTarget "${appName}" */;
			buildPhases = (
				${ids.sourcesBuildPhase} /* Sources */,
				${ids.frameworksBuildPhase} /* Frameworks */,
				${ids.resourcesBuildPhase} /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = "${appName}";
			productName = "${appName}";
			productReference = ${ids.appFile} /* ${appName}.app */;
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		${ids.project} /* Project object */ = {
			isa = PBXProject;
			attributes = {
				LastUpgradeCheck = 1530;
			};
			buildConfigurationList = ${ids.projectBuildConfigList} /* Build configuration list for PBXProject "${appName}" */;
			compatibilityVersion = "Xcode 14.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = ${ids.mainGroup};
			productRefGroup = ${ids.productsGroup} /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				${ids.nativeTarget} /* ${appName} */,
			);
		};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		${ids.resourcesBuildPhase} /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				${ids.assetsBuildFile} /* Assets.xcassets in Resources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		${ids.sourcesBuildPhase} /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				${ids.lynxProviderBuildFile} /* LynxProvider.swift in Sources */,
				${ids.lynxInitBuildFile} /* LynxInitProcessor.swift in Sources */,
				${ids.sceneDelegateSourceBuildFile} /* SceneDelegate.swift in Sources */,
				${ids.viewControllerBuildFile} /* ViewController.swift in Sources */,
				${ids.appDelegateBuildFile} /* AppDelegate.swift in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin PBXVariantGroup section */
/* End PBXVariantGroup section */

/* Begin XCBuildConfiguration section */
		${ids.projectDebugConfig} /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ANALYZER_NONNULL = YES;
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++14";
				CLANG_CXX_LIBRARY = "libc++";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				CLANG_WARN_CONSTANT_CONVERSION = YES;
				CLANG_WARN_DIRECT_OBJC_ISA_USAGE = YES_ERROR;
				CLANG_WARN_EMPTY_BODY = YES;
				CLANG_WARN_INT_CONVERSION = YES;
				CLANG_WARN_OBJC_LITERAL_CONVERSION = YES;
				CLANG_WARN_UNREACHABLE_CODE = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = dwarf;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				GCC_C_LANGUAGE_STANDARD = gnu11;
				GCC_NO_COMMON_BLOCKS = YES;
				GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR;
				GCC_WARN_UNINITIALIZED_AUTOS = YES_AGGRESSIVE;
				GCC_WARN_UNUSED_VARIABLE = YES;
				IPHONEOS_DEPLOYMENT_TARGET = 13.0;
				MTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;
				SDKROOT = iphoneos;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
			};
			name = Debug;
		};
		${ids.projectReleaseConfig} /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ANALYZER_NONNULL = YES;
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++14";
				CLANG_CXX_LIBRARY = "libc++";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				CLANG_WARN_CONSTANT_CONVERSION = YES;
				CLANG_WARN_DIRECT_OBJC_ISA_USAGE = YES_ERROR;
				CLANG_WARN_EMPTY_BODY = YES;
				CLANG_WARN_INT_CONVERSION = YES;
				CLANG_WARN_OBJC_LITERAL_CONVERSION = YES;
				CLANG_WARN_UNREACHABLE_CODE = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
				ENABLE_NS_ASSERTIONS = NO;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				GCC_C_LANGUAGE_STANDARD = gnu11;
				GCC_NO_COMMON_BLOCKS = YES;
				GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR;
				GCC_WARN_UNINITIALIZED_AUTOS = YES_AGGRESSIVE;
				GCC_WARN_UNUSED_VARIABLE = YES;
				IPHONEOS_DEPLOYMENT_TARGET = 13.0;
				MTL_ENABLE_DEBUG_INFO = NO;
				SDKROOT = iphoneos;
				SWIFT_COMPILATION_MODE = wholemodule;
				SWIFT_OPTIMIZATION_LEVEL = "-O";
			};
			name = Release;
		};
		${ids.targetDebugConfig} /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CURRENT_PROJECT_VERSION = 1;
				INFOPLIST_FILE = "${appName}/Info.plist";
				LD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/Frameworks";
				MARKETING_VERSION = "1.0";
				PRODUCT_BUNDLE_IDENTIFIER = "${bundleId}";
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_OBJC_BRIDGING_HEADER = "${appName}/${bridgingHeader}";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Debug;
		};
		${ids.targetReleaseConfig} /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CURRENT_PROJECT_VERSION = 1;
				INFOPLIST_FILE = "${appName}/Info.plist";
				LD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/Frameworks";
				MARKETING_VERSION = "1.0";
				PRODUCT_BUNDLE_IDENTIFIER = "${bundleId}";
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_OBJC_BRIDGING_HEADER = "${appName}/${bridgingHeader}";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		${ids.projectBuildConfigList} /* Build configuration list for PBXProject "${appName}" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${ids.projectDebugConfig} /* Debug */,
				${ids.projectReleaseConfig} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		${ids.targetBuildConfigList} /* Build configuration list for PBXNativeTarget "${appName}" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${ids.targetDebugConfig} /* Debug */,
				${ids.targetReleaseConfig} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
	rootObject = ${ids.project} /* Project object */;
}
	`);
  console.log(`\u2705 iOS Swift project created at ${rootDir}`);
  async function finalizeProjectSetup() {
    await setupCocoaPods(rootDir);
  }
  finalizeProjectSetup();
};
var create_default2 = create2;

// src/ios/autolink.ts
import fs13 from "fs";
import path13 from "path";
import { execSync as execSync5 } from "child_process";
var autolink2 = () => {
  let resolved;
  try {
    resolved = resolveHostPaths();
  } catch (error) {
    console.error(`\u274C Error loading configuration: ${error.message}`);
    process.exit(1);
  }
  const projectRoot = resolved.projectRoot;
  const iosProjectPath = resolved.iosDir;
  function updateGeneratedSection(filePath, newContent, startMarker, endMarker) {
    if (!fs13.existsSync(filePath)) {
      console.warn(`\u26A0\uFE0F File not found, skipping update: ${filePath}`);
      return;
    }
    let fileContent = fs13.readFileSync(filePath, "utf8");
    const escapedStartMarker = startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedEndMarker = endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escapedStartMarker}[\\s\\S]*?${escapedEndMarker}`, "g");
    const replacementBlock = `${startMarker}
${newContent}
${endMarker}`;
    if (regex.test(fileContent)) {
      const firstStartIdx = fileContent.indexOf(startMarker);
      fileContent = fileContent.replace(regex, "");
      if (firstStartIdx !== -1) {
        const before = fileContent.slice(0, firstStartIdx);
        const after = fileContent.slice(firstStartIdx);
        fileContent = `${before}${replacementBlock}${after}`;
      } else {
        fileContent += `
${replacementBlock}
`;
      }
    } else {
      console.warn(`\u26A0\uFE0F Could not find autolink markers in ${path13.basename(filePath)}. Appending to the end of the file.`);
      fileContent += `
${replacementBlock}
`;
    }
    fs13.writeFileSync(filePath, fileContent, "utf8");
    console.log(`\u2705 Updated autolinked section in ${path13.basename(filePath)}`);
  }
  function resolvePodName(pkg) {
    const podspecDir = pkg.config.ios?.podspecPath || ".";
    const fullPodspecDir = path13.join(pkg.packagePath, podspecDir);
    if (fs13.existsSync(fullPodspecDir)) {
      try {
        const files = fs13.readdirSync(fullPodspecDir);
        const podspecFile = files.find((f) => f.endsWith(".podspec"));
        if (podspecFile) return podspecFile.replace(".podspec", "");
      } catch {
      }
    }
    return pkg.name.split("/").pop().replace(/-/g, "");
  }
  function updatePodfile(packages) {
    const podfilePath = path13.join(iosProjectPath, "Podfile");
    let scriptContent = `  # This section is automatically generated by Tamer4Lynx.
  # Manual edits will be overwritten.`;
    const iosPackages = packages.filter((p) => p.config.ios);
    if (iosPackages.length > 0) {
      iosPackages.forEach((pkg) => {
        const podspecPath = pkg.config.ios?.podspecPath || ".";
        const relativePath = path13.relative(iosProjectPath, path13.join(pkg.packagePath, podspecPath));
        const podName = resolvePodName(pkg);
        scriptContent += `
  pod '${podName}', :path => '${relativePath}'`;
      });
    } else {
      scriptContent += `
  # No native modules found by Tamer4Lynx autolinker.`;
    }
    updateGeneratedSection(podfilePath, scriptContent.trim(), "# GENERATED AUTOLINK DEPENDENCIES START", "# GENERATED AUTOLINK DEPENDENCIES END");
  }
  function updateLynxInitProcessor(packages) {
    const appNameFromConfig = resolved.config.ios?.appName;
    const candidatePaths = [];
    if (appNameFromConfig) {
      candidatePaths.push(path13.join(iosProjectPath, appNameFromConfig, "LynxInitProcessor.swift"));
    }
    candidatePaths.push(path13.join(iosProjectPath, "LynxInitProcessor.swift"));
    const found = candidatePaths.find((p) => fs13.existsSync(p));
    const lynxInitPath = found ?? candidatePaths[0];
    const iosPackages = packages.filter((p) => getIosModuleClassNames(p.config.ios).length > 0 || Object.keys(getIosElements(p.config.ios)).length > 0);
    function updateImportsSection(filePath, pkgs) {
      const startMarker = "// GENERATED IMPORTS START";
      const endMarker = "// GENERATED IMPORTS END";
      if (pkgs.length === 0) {
        const placeholder = "// No native imports found by Tamer4Lynx autolinker.";
        updateGeneratedSection(filePath, placeholder, startMarker, endMarker);
        return;
      }
      const imports = pkgs.map((pkg) => {
        const podName = resolvePodName(pkg);
        return `import ${podName}`;
      }).join("\n");
      const fileContent = fs13.readFileSync(filePath, "utf8");
      if (fileContent.indexOf(startMarker) !== -1) {
        updateGeneratedSection(filePath, imports, startMarker, endMarker);
        return;
      }
      const importRegex = /^(import\s+[^\r\n]+)\r?\n/gm;
      let match = null;
      let lastMatchEnd = -1;
      while ((match = importRegex.exec(fileContent)) !== null) {
        lastMatchEnd = importRegex.lastIndex;
      }
      const block = `${startMarker}
${imports}
${endMarker}`;
      let newContent;
      if (lastMatchEnd !== -1) {
        const before = fileContent.slice(0, lastMatchEnd);
        const after = fileContent.slice(lastMatchEnd);
        newContent = `${before}
${block}
${after}`;
      } else {
        const foundationIdx = fileContent.indexOf("import Foundation");
        if (foundationIdx !== -1) {
          const lineEnd = fileContent.indexOf("\n", foundationIdx);
          const insertPos = lineEnd !== -1 ? lineEnd + 1 : foundationIdx + "import Foundation".length;
          const before = fileContent.slice(0, insertPos);
          const after = fileContent.slice(insertPos);
          newContent = `${before}
${block}
${after}`;
        } else {
          newContent = `${block}

${fileContent}`;
        }
      }
      fs13.writeFileSync(filePath, newContent, "utf8");
      console.log(`\u2705 Updated imports in ${path13.basename(filePath)}`);
    }
    updateImportsSection(lynxInitPath, iosPackages);
    if (iosPackages.length === 0) {
      const placeholder = "        // No native modules found by Tamer4Lynx autolinker.";
      updateGeneratedSection(lynxInitPath, placeholder, "// GENERATED AUTOLINK START", "// GENERATED AUTOLINK END");
      return;
    }
    const blocks = iosPackages.flatMap((pkg) => {
      const classNames = getIosModuleClassNames(pkg.config.ios);
      const moduleBlocks = classNames.map((classNameRaw) => [
        `        // Register module from package: ${pkg.name}`,
        `        globalConfig.register(${classNameRaw}.self)`
      ].join("\n"));
      const elementBlocks = Object.entries(getIosElements(pkg.config.ios)).map(([tagName, classNameRaw]) => [
        `        // Register element from package: ${pkg.name}`,
        `        globalConfig.registerUI(${classNameRaw}.self, withName: "${tagName}")`
      ].join("\n"));
      return [...moduleBlocks, ...elementBlocks];
    });
    const content = blocks.join("\n\n");
    updateGeneratedSection(lynxInitPath, content, "// GENERATED AUTOLINK START", "// GENERATED AUTOLINK END");
  }
  function findInfoPlist() {
    const appNameFromConfig = resolved.config.ios?.appName;
    const candidates = [];
    if (appNameFromConfig) {
      candidates.push(path13.join(iosProjectPath, appNameFromConfig, "Info.plist"));
    }
    candidates.push(path13.join(iosProjectPath, "Info.plist"));
    return candidates.find((p) => fs13.existsSync(p)) ?? null;
  }
  function readPlistXml(plistPath) {
    return fs13.readFileSync(plistPath, "utf8");
  }
  function syncInfoPlistPermissions(packages) {
    const plistPath = findInfoPlist();
    if (!plistPath) return;
    const allPermissions = {};
    for (const pkg of packages) {
      const iosPerms = pkg.config.ios?.iosPermissions;
      if (iosPerms) {
        for (const [key, desc] of Object.entries(iosPerms)) {
          if (!allPermissions[key]) {
            allPermissions[key] = desc;
          }
        }
      }
    }
    if (Object.keys(allPermissions).length === 0) return;
    let plist = readPlistXml(plistPath);
    let added = 0;
    for (const [key, desc] of Object.entries(allPermissions)) {
      if (plist.includes(`<key>${key}</key>`)) continue;
      const insertion = `	<key>${key}</key>
	<string>${desc}</string>
`;
      plist = plist.replace(
        /(<\/dict>\s*<\/plist>)/,
        `${insertion}$1`
      );
      added++;
    }
    if (added > 0) {
      fs13.writeFileSync(plistPath, plist, "utf8");
      console.log(`\u2705 Synced ${added} Info.plist permission description(s)`);
    }
  }
  function syncInfoPlistUrlSchemes() {
    const urlSchemes = resolved.config.ios?.urlSchemes;
    if (!urlSchemes || urlSchemes.length === 0) return;
    const plistPath = findInfoPlist();
    if (!plistPath) return;
    let plist = readPlistXml(plistPath);
    const schemesXml = urlSchemes.map((s) => {
      const role = s.role ?? "Editor";
      return `			<dict>
				<key>CFBundleTypeRole</key>
				<string>${role}</string>
				<key>CFBundleURLSchemes</key>
				<array>
					<string>${s.scheme}</string>
				</array>
			</dict>`;
    }).join("\n");
    const generatedBlock = `	<key>CFBundleURLTypes</key>
	<array>
		<!-- GENERATED URL SCHEMES START -->
${schemesXml}
		<!-- GENERATED URL SCHEMES END -->
	</array>`;
    const startMarker = "<!-- GENERATED URL SCHEMES START -->";
    const endMarker = "<!-- GENERATED URL SCHEMES END -->";
    if (plist.includes(startMarker) && plist.includes(endMarker)) {
      const regex = new RegExp(
        `${startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        "g"
      );
      plist = plist.replace(regex, `${startMarker}
${schemesXml}
		${endMarker}`);
    } else if (plist.includes("<key>CFBundleURLTypes</key>")) {
      console.log("\u2139\uFE0F CFBundleURLTypes exists but has no generated markers. Skipping URL scheme sync.");
      return;
    } else {
      plist = plist.replace(
        /(<\/dict>\s*<\/plist>)/,
        `${generatedBlock}
$1`
      );
    }
    fs13.writeFileSync(plistPath, plist, "utf8");
    console.log(`\u2705 Synced ${urlSchemes.length} iOS URL scheme(s) into Info.plist`);
  }
  function runPodInstall(forcePath) {
    const podfilePath = forcePath ?? path13.join(iosProjectPath, "Podfile");
    if (!fs13.existsSync(podfilePath)) {
      console.log("\u2139\uFE0F No Podfile found in ios directory; skipping `pod install`.");
      return;
    }
    const cwd = path13.dirname(podfilePath);
    try {
      console.log(`\u2139\uFE0F Running \`pod install\` in ${cwd}...`);
      execSync5("pod install", { cwd, stdio: "inherit" });
      console.log("\u2705 `pod install` completed successfully.");
    } catch (e) {
      console.warn(`\u26A0\uFE0F 'pod install' failed: ${e.message}`);
      console.log("\u26A0\uFE0F You can run `pod install` manually in the ios directory.");
    }
  }
  function run() {
    console.log("\u{1F50E} Finding Lynx extension packages (lynx.ext.json / tamer.json)...");
    const packages = discoverModules(projectRoot).filter((p) => p.config.ios);
    if (packages.length > 0) {
      console.log(`Found ${packages.length} package(s): ${packages.map((p) => p.name).join(", ")}`);
    } else {
      console.log("\u2139\uFE0F No Tamer4Lynx native packages found.");
    }
    updatePodfile(packages);
    updateLynxInitProcessor(packages);
    syncInfoPlistPermissions(packages);
    syncInfoPlistUrlSchemes();
    const appNameFromConfig = resolved.config.ios?.appName;
    if (appNameFromConfig) {
      const appPodfile = path13.join(iosProjectPath, appNameFromConfig, "Podfile");
      if (fs13.existsSync(appPodfile)) {
        runPodInstall(appPodfile);
        console.log("\u2728 Autolinking complete for iOS.");
        return;
      }
    }
    runPodInstall();
    console.log("\u2728 Autolinking complete for iOS.");
  }
  run();
};
var autolink_default2 = autolink2;

// src/ios/bundle.ts
import fs15 from "fs";
import path15 from "path";
import { execSync as execSync6 } from "child_process";

// src/ios/syncHost.ts
import fs14 from "fs";
import path14 from "path";
import crypto from "crypto";
function deterministicUUID(seed) {
  return crypto.createHash("sha256").update(seed).digest("hex").substring(0, 24).toUpperCase();
}
function getLaunchScreenStoryboard() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0"
    toolsVersion="13122.16" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none"
    useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES"
    colorMatched="YES" initialViewController="01J-lp-oVM">
  <device id="retina6_12" orientation="portrait" appearance="light"/>
  <dependencies>
    <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="13104.12"/>
    <capability name="Safe area layout guides" minToolsVersion="9.0"/>
    <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
  </dependencies>
  <scenes>
    <scene sceneID="EHf-IW-A2E">
      <objects>
        <viewController id="01J-lp-oVM" sceneMemberID="viewController">
          <view key="view" contentMode="scaleToFill" id="Ze5-6b-2t3">
            <rect key="frame" x="0.0" y="0.0" width="390" height="844"/>
            <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
            <subviews>
              <view contentMode="scaleToFill" translatesAutoresizingMaskIntoConstraints="NO" id="Bg9-1M-mhb">
                <rect key="frame" x="0.0" y="0.0" width="390" height="844"/>
                <color key="backgroundColor" white="0.0" alpha="1" colorSpace="custom" customColorSpace="genericGamma22GrayColorSpace"/>
              </view>
            </subviews>
            <viewLayoutGuide key="safeArea" id="Bcu-3y-fUS"/>
            <color key="backgroundColor" white="0.0" alpha="1" colorSpace="custom" customColorSpace="genericGamma22GrayColorSpace"/>
            <constraints>
              <constraint firstItem="Bg9-1M-mhb" firstAttribute="top" secondItem="Ze5-6b-2t3" secondAttribute="top" id="3M4-v9-a3l"/>
              <constraint firstItem="Bg9-1M-mhb" firstAttribute="bottom" secondItem="Ze5-6b-2t3" secondAttribute="bottom" id="Sbc-LM-HvA"/>
              <constraint firstItem="Bg9-1M-mhb" firstAttribute="leading" secondItem="Ze5-6b-2t3" secondAttribute="leading" id="cJ0-4h-f4M"/>
              <constraint firstAttribute="trailing" secondItem="Bg9-1M-mhb" secondAttribute="trailing" id="g0s-pf-rxW"/>
            </constraints>
          </view>
        </viewController>
        <placeholder placeholderIdentifier="IBFirstResponder" id="iYj-Kq-Ea1" userLabel="First Responder" sceneMemberID="firstResponder"/>
      </objects>
    </scene>
  </scenes>
</document>
`;
}
function addLaunchScreenToXcodeProject(pbxprojPath, appName) {
  let content = fs14.readFileSync(pbxprojPath, "utf8");
  if (content.includes("LaunchScreen.storyboard")) return;
  const baseFileRefUUID = deterministicUUID(`launchScreenBase:${appName}`);
  const variantGroupUUID = deterministicUUID(`launchScreenGroup:${appName}`);
  const buildFileUUID = deterministicUUID(`launchScreenBuild:${appName}`);
  content = content.replace(
    "/* End PBXFileReference section */",
    `		${baseFileRefUUID} /* Base */ = {isa = PBXFileReference; lastKnownFileType = file.storyboard; name = Base; path = Base.lproj/LaunchScreen.storyboard; sourceTree = "<group>"; };
/* End PBXFileReference section */`
  );
  content = content.replace(
    "/* End PBXBuildFile section */",
    `		${buildFileUUID} /* LaunchScreen.storyboard in Resources */ = {isa = PBXBuildFile; fileRef = ${variantGroupUUID} /* LaunchScreen.storyboard */; };
/* End PBXBuildFile section */`
  );
  content = content.replace(
    "/* End PBXVariantGroup section */",
    `		${variantGroupUUID} /* LaunchScreen.storyboard */ = {
			isa = PBXVariantGroup;
			children = (
				${baseFileRefUUID} /* Base */,
			);
			name = LaunchScreen.storyboard;
			sourceTree = "<group>";
		};
/* End PBXVariantGroup section */`
  );
  content = content.replace(
    /(isa = PBXResourcesBuildPhase;[\s\S]*?files = \()/,
    `$1
				${buildFileUUID} /* LaunchScreen.storyboard in Resources */,`
  );
  const groupPattern = new RegExp(
    `(\\/\\* ${appName} \\*\\/ = \\{[\\s\\S]*?isa = PBXGroup;[\\s\\S]*?children = \\()`
  );
  content = content.replace(groupPattern, `$1
				${variantGroupUUID} /* LaunchScreen.storyboard */,`);
  fs14.writeFileSync(pbxprojPath, content, "utf8");
  console.log("\u2705 Registered LaunchScreen.storyboard in Xcode project");
}
function addSwiftSourceToXcodeProject(pbxprojPath, appName, filename) {
  let content = fs14.readFileSync(pbxprojPath, "utf8");
  const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`path = ${escaped};`).test(content)) return;
  const fileRefUUID = deterministicUUID(`fileRef:${appName}:${filename}`);
  const buildFileUUID = deterministicUUID(`buildFile:${appName}:${filename}`);
  content = content.replace(
    "/* End PBXFileReference section */",
    `		${fileRefUUID} /* ${filename} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ${filename}; sourceTree = "<group>"; };
/* End PBXFileReference section */`
  );
  content = content.replace(
    "/* End PBXBuildFile section */",
    `		${buildFileUUID} /* ${filename} in Sources */ = {isa = PBXBuildFile; fileRef = ${fileRefUUID} /* ${filename} */; };
/* End PBXBuildFile section */`
  );
  content = content.replace(
    /(isa = PBXSourcesBuildPhase;[\s\S]*?files = \()/,
    `$1
				${buildFileUUID} /* ${filename} in Sources */,`
  );
  const groupPattern = new RegExp(
    `(\\/\\* ${appName} \\*\\/ = \\{[\\s\\S]*?isa = PBXGroup;[\\s\\S]*?children = \\()`
  );
  content = content.replace(groupPattern, `$1
				${fileRefUUID} /* ${filename} */,`);
  fs14.writeFileSync(pbxprojPath, content, "utf8");
  console.log(`\u2705 Registered ${filename} in Xcode project sources`);
}
function addResourceToXcodeProject(pbxprojPath, appName, filename) {
  let content = fs14.readFileSync(pbxprojPath, "utf8");
  const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`path = ${escaped};`).test(content)) return;
  const fileRefUUID = deterministicUUID(`fileRef:${appName}:${filename}`);
  const buildFileUUID = deterministicUUID(`buildFile:${appName}:${filename}`);
  content = content.replace(
    "/* End PBXFileReference section */",
    `		${fileRefUUID} /* ${filename} */ = {isa = PBXFileReference; lastKnownFileType = file; path = ${filename}; sourceTree = "<group>"; };
/* End PBXFileReference section */`
  );
  content = content.replace(
    "/* End PBXBuildFile section */",
    `		${buildFileUUID} /* ${filename} in Resources */ = {isa = PBXBuildFile; fileRef = ${fileRefUUID} /* ${filename} */; };
/* End PBXBuildFile section */`
  );
  content = content.replace(
    /(isa = PBXResourcesBuildPhase;[\s\S]*?files = \()/,
    `$1
				${buildFileUUID} /* ${filename} in Resources */,`
  );
  const groupPattern = new RegExp(
    `(\\/\\* ${appName} \\*\\/ = \\{[\\s\\S]*?isa = PBXGroup;[\\s\\S]*?children = \\()`
  );
  content = content.replace(groupPattern, `$1
				${fileRefUUID} /* ${filename} */,`);
  fs14.writeFileSync(pbxprojPath, content, "utf8");
  console.log(`\u2705 Registered ${filename} in Xcode project resources`);
}
function writeFile(filePath, content) {
  fs14.mkdirSync(path14.dirname(filePath), { recursive: true });
  fs14.writeFileSync(filePath, content, "utf8");
}
function getAppDelegateSwift() {
  return `import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        LynxInitProcessor.shared.setupEnvironment()
        return true
    }

    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }
}
`;
}
function getSceneDelegateSwift() {
  return `import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = ViewController()
        window?.makeKeyAndVisible()
    }
}
`;
}
function getViewControllerSwift() {
  return `import UIKit
import Lynx
import tamerinsets

class ViewController: UIViewController {
    private var lynxView: LynxView?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        edgesForExtendedLayout = .all
        extendedLayoutIncludesOpaqueBars = true
        additionalSafeAreaInsets = .zero
        view.insetsLayoutMarginsFromSafeArea = false
        view.preservesSuperviewLayoutMargins = false
        viewRespectsSystemMinimumLayoutMargins = false
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        guard view.bounds.width > 0, view.bounds.height > 0 else { return }
        if lynxView == nil {
            setupLynxView()
        } else {
            applyFullscreenLayout(to: lynxView!)
        }
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        TamerInsetsModule.reRequestInsets()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    private func buildLynxView() -> LynxView {
        let bounds = view.bounds
        let lv = LynxView { builder in
            builder.config = LynxConfig(provider: LynxProvider())
            builder.screenSize = bounds.size
            builder.fontScale = 1.0
        }
        lv.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        lv.insetsLayoutMarginsFromSafeArea = false
        lv.preservesSuperviewLayoutMargins = false
        applyFullscreenLayout(to: lv)
        return lv
    }

    private func setupLynxView() {
        let lv = buildLynxView()
        view.addSubview(lv)
        lv.loadTemplate(fromURL: "main.lynx.bundle", initData: nil)
        self.lynxView = lv
    }

    private func applyFullscreenLayout(to lynxView: LynxView) {
        let bounds = view.bounds
        let size = bounds.size
        lynxView.frame = bounds
        lynxView.updateScreenMetrics(withWidth: size.width, height: size.height)
        lynxView.updateViewport(withPreferredLayoutWidth: size.width, preferredLayoutHeight: size.height, needLayout: true)
        lynxView.preferredLayoutWidth = size.width
        lynxView.preferredLayoutHeight = size.height
        lynxView.layoutWidthMode = .exact
        lynxView.layoutHeightMode = .exact
    }
}
`;
}
function getDevViewControllerSwift() {
  return `import UIKit
import Lynx
import tamerdevclient
import tamerinsets

class ViewController: UIViewController {
    private var lynxView: LynxView?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        edgesForExtendedLayout = .all
        extendedLayoutIncludesOpaqueBars = true
        additionalSafeAreaInsets = .zero
        view.insetsLayoutMarginsFromSafeArea = false
        view.preservesSuperviewLayoutMargins = false
        viewRespectsSystemMinimumLayoutMargins = false
        setupLynxView()
        setupDevClientModule()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let lynxView = lynxView {
            applyFullscreenLayout(to: lynxView)
        }
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        TamerInsetsModule.reRequestInsets()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    private func setupLynxView() {
        let size = fullscreenBounds().size
        let lv = LynxView { builder in
            builder.config = LynxConfig(provider: DevTemplateProvider())
            builder.screenSize = size
            builder.fontScale = 1.0
        }
        lv.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        lv.insetsLayoutMarginsFromSafeArea = false
        lv.preservesSuperviewLayoutMargins = false
        view.addSubview(lv)
        applyFullscreenLayout(to: lv)
        lv.loadTemplate(fromURL: "dev-client.lynx.bundle", initData: nil)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self, weak lv] in
            guard let self, let lv else { return }
            self.applyFullscreenLayout(to: lv)
        }
        self.lynxView = lv
    }

    private func applyFullscreenLayout(to lynxView: LynxView) {
        let bounds = fullscreenBounds()
        let size = bounds.size
        lynxView.frame = bounds
        lynxView.updateScreenMetrics(withWidth: size.width, height: size.height)
        lynxView.updateViewport(withPreferredLayoutWidth: size.width, preferredLayoutHeight: size.height, needLayout: true)
        lynxView.preferredLayoutWidth = size.width
        lynxView.preferredLayoutHeight = size.height
        lynxView.layoutWidthMode = .exact
        lynxView.layoutHeightMode = .exact
    }

    private func fullscreenBounds() -> CGRect {
        let bounds = view.bounds
        if bounds.width > 0, bounds.height > 0 { return bounds }
        return UIScreen.main.bounds
    }

    private func setupDevClientModule() {
        DevClientModule.presentQRScanner = { [weak self] completion in
            let scanner = QRScannerViewController()
            scanner.onResult = { url in
                scanner.dismiss(animated: true) { completion(url) }
            }
            scanner.modalPresentationStyle = .fullScreen
            self?.present(scanner, animated: true)
        }

        DevClientModule.reloadProjectHandler = { [weak self] in
            guard let self = self else { return }
            let projectVC = ProjectViewController()
            projectVC.modalPresentationStyle = .fullScreen
            self.present(projectVC, animated: true)
        }
    }
}
`;
}
function patchInfoPlist(infoPlistPath) {
  if (!fs14.existsSync(infoPlistPath)) return;
  let content = fs14.readFileSync(infoPlistPath, "utf8");
  content = content.replace(/\s*<key>UIMainStoryboardFile<\/key>\s*<string>[^<]*<\/string>/g, "");
  if (!content.includes("UILaunchStoryboardName")) {
    content = content.replace("</dict>\n</plist>", `	<key>UILaunchStoryboardName</key>
	<string>LaunchScreen</string>
</dict>
</plist>`);
    console.log("\u2705 Added UILaunchStoryboardName to Info.plist");
  }
  if (!content.includes("UIApplicationSceneManifest")) {
    const sceneManifest = `	<key>UIApplicationSceneManifest</key>
	<dict>
		<key>UIApplicationSupportsMultipleScenes</key>
		<false/>
		<key>UISceneConfigurations</key>
		<dict>
			<key>UIWindowSceneSessionRoleApplication</key>
			<array>
				<dict>
					<key>UISceneConfigurationName</key>
					<string>Default Configuration</string>
					<key>UISceneDelegateClassName</key>
					<string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>
				</dict>
			</array>
		</dict>
	</dict>`;
    content = content.replace("</dict>\n</plist>", `${sceneManifest}
</dict>
</plist>`);
    console.log("\u2705 Added UIApplicationSceneManifest to Info.plist");
  }
  fs14.writeFileSync(infoPlistPath, content, "utf8");
}
function getSimpleLynxProviderSwift() {
  return `import Foundation
import Lynx

class LynxProvider: NSObject, LynxTemplateProvider {
    func loadTemplate(withUrl url: String!, onComplete callback: LynxTemplateLoadBlock!) {
        DispatchQueue.global(qos: .background).async {
            guard let url = url,
                  let bundleUrl = Bundle.main.url(forResource: url, withExtension: nil),
                  let data = try? Data(contentsOf: bundleUrl) else {
                let err = NSError(domain: "LynxProvider", code: 404,
                                  userInfo: [NSLocalizedDescriptionKey: "Bundle not found: \\(url ?? "nil")"])
                callback?(nil, err)
                return
            }
            callback?(data, nil)
        }
    }
}
`;
}
function readTemplateOrFallback(devClientPkg, templateName, fallback, vars = {}) {
  if (devClientPkg) {
    const tplPath = path14.join(devClientPkg, "ios", "templates", templateName);
    if (fs14.existsSync(tplPath)) {
      let content = fs14.readFileSync(tplPath, "utf8");
      for (const [k, v] of Object.entries(vars)) {
        content = content.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
      }
      return content;
    }
  }
  return fallback;
}
function syncHostIos(opts) {
  const resolved = resolveHostPaths();
  const appName = resolved.config.ios?.appName;
  const devMode = resolveDevMode(resolved.config);
  const release = opts?.release === true;
  const useDevClient = devMode === "embedded" && !release;
  if (!appName) {
    throw new Error('"ios.appName" must be defined in tamer.config.json');
  }
  const projectDir = path14.join(resolved.iosDir, appName);
  const infoPlistPath = path14.join(projectDir, "Info.plist");
  if (!fs14.existsSync(projectDir)) {
    throw new Error(`iOS project not found at ${projectDir}. Run \`tamer ios create\` first.`);
  }
  const pbxprojPath = path14.join(resolved.iosDir, `${appName}.xcodeproj`, "project.pbxproj");
  const baseLprojDir = path14.join(projectDir, "Base.lproj");
  const launchScreenPath = path14.join(baseLprojDir, "LaunchScreen.storyboard");
  patchInfoPlist(infoPlistPath);
  writeFile(path14.join(projectDir, "AppDelegate.swift"), getAppDelegateSwift());
  writeFile(path14.join(projectDir, "SceneDelegate.swift"), getSceneDelegateSwift());
  if (!fs14.existsSync(launchScreenPath)) {
    fs14.mkdirSync(baseLprojDir, { recursive: true });
    writeFile(launchScreenPath, getLaunchScreenStoryboard());
    addLaunchScreenToXcodeProject(pbxprojPath, appName);
  }
  addSwiftSourceToXcodeProject(pbxprojPath, appName, "SceneDelegate.swift");
  if (useDevClient) {
    const devClientPkg = findDevClientPackage(resolved.projectRoot);
    const segment = resolved.lynxProjectDir.split("/").filter(Boolean).pop() ?? "";
    const tplVars = { PROJECT_BUNDLE_SEGMENT: segment };
    writeFile(path14.join(projectDir, "ViewController.swift"), getDevViewControllerSwift());
    writeFile(path14.join(projectDir, "LynxProvider.swift"), getSimpleLynxProviderSwift());
    addSwiftSourceToXcodeProject(pbxprojPath, appName, "LynxProvider.swift");
    const devTPContent = readTemplateOrFallback(devClientPkg, "DevTemplateProvider.swift", "", tplVars);
    if (devTPContent) {
      writeFile(path14.join(projectDir, "DevTemplateProvider.swift"), devTPContent);
      addSwiftSourceToXcodeProject(pbxprojPath, appName, "DevTemplateProvider.swift");
    }
    const projectVCContent = readTemplateOrFallback(devClientPkg, "ProjectViewController.swift", "", tplVars);
    if (projectVCContent) {
      writeFile(path14.join(projectDir, "ProjectViewController.swift"), projectVCContent);
      addSwiftSourceToXcodeProject(pbxprojPath, appName, "ProjectViewController.swift");
    }
    const devCMContent = readTemplateOrFallback(devClientPkg, "DevClientManager.swift", "", tplVars);
    if (devCMContent) {
      writeFile(path14.join(projectDir, "DevClientManager.swift"), devCMContent);
      addSwiftSourceToXcodeProject(pbxprojPath, appName, "DevClientManager.swift");
    }
    const qrContent = readTemplateOrFallback(devClientPkg, "QRScannerViewController.swift", "", tplVars);
    if (qrContent) {
      writeFile(path14.join(projectDir, "QRScannerViewController.swift"), qrContent);
      addSwiftSourceToXcodeProject(pbxprojPath, appName, "QRScannerViewController.swift");
    }
    console.log("\u2705 Synced iOS host app (embedded dev mode) \u2014 ViewController, DevTemplateProvider, ProjectViewController, DevClientManager, QRScannerViewController");
  } else {
    writeFile(path14.join(projectDir, "ViewController.swift"), getViewControllerSwift());
    writeFile(path14.join(projectDir, "LynxProvider.swift"), getSimpleLynxProviderSwift());
    addSwiftSourceToXcodeProject(pbxprojPath, appName, "LynxProvider.swift");
    console.log("\u2705 Synced iOS host app controller files");
  }
}
var syncHost_default = syncHostIos;

// src/ios/bundle.ts
function bundleAndDeploy2(opts = {}) {
  const target = opts.target ?? "host";
  const release = opts.release === true;
  let resolved;
  try {
    resolved = resolveHostPaths();
    if (!resolved.config.ios?.appName) {
      throw new Error('"ios.appName" must be defined in tamer.config.json');
    }
  } catch (error) {
    console.error(`\u274C Error loading configuration: ${error.message}`);
    process.exit(1);
  }
  const appName = resolved.config.ios.appName;
  const sourceBundlePath = resolved.lynxBundlePath;
  const destinationDir = path15.join(resolved.iosDir, appName);
  const destinationBundlePath = path15.join(destinationDir, resolved.lynxBundleFile);
  const devMode = resolveDevMode(resolved.config);
  if (target === "dev-app") {
    console.error("\u274C iOS dev-app target not yet implemented.");
    process.exit(1);
  }
  syncHost_default({ release });
  autolink_default2();
  try {
    console.log("\u{1F4E6} Building Lynx bundle...");
    execSync6("npm run build", { stdio: "inherit", cwd: resolved.lynxProjectDir });
    console.log("\u2705 Build completed successfully.");
  } catch (error) {
    console.error("\u274C Build process failed. Please check the errors above.");
    process.exit(1);
  }
  try {
    if (!fs15.existsSync(sourceBundlePath)) {
      console.error(`\u274C Build output not found at: ${sourceBundlePath}`);
      process.exit(1);
    }
    if (!fs15.existsSync(destinationDir)) {
      console.error(`Destination directory not found at: ${destinationDir}`);
      process.exit(1);
    }
    const distDir = path15.dirname(sourceBundlePath);
    console.log(`\u{1F69A} Copying bundle and assets to iOS project...`);
    copyDistAssets(distDir, destinationDir, resolved.lynxBundleFile);
    console.log(`\u2728 Successfully copied bundle to: ${destinationBundlePath}`);
    const pbxprojPath = path15.join(resolved.iosDir, `${appName}.xcodeproj`, "project.pbxproj");
    if (fs15.existsSync(pbxprojPath)) {
      const skip = /* @__PURE__ */ new Set([".rspeedy", "stats.json"]);
      for (const entry of fs15.readdirSync(distDir)) {
        if (skip.has(entry) || fs15.statSync(path15.join(distDir, entry)).isDirectory()) continue;
        addResourceToXcodeProject(pbxprojPath, appName, entry);
      }
    }
    if (devMode === "embedded") {
      const devClientBundle = path15.join(destinationDir, "dev-client.lynx.bundle");
      if (!release) {
        const devClientPkg = findDevClientPackage(resolved.projectRoot);
        if (devClientPkg) {
          console.log("\u{1F4E6} Building dev-client bundle...");
          try {
            execSync6("npm run build", { stdio: "inherit", cwd: devClientPkg });
          } catch {
            console.warn("\u26A0\uFE0F  dev-client build failed; skipping dev-client bundle");
          }
          const builtBundle = path15.join(devClientPkg, "dist", "dev-client.lynx.bundle");
          if (fs15.existsSync(builtBundle)) {
            fs15.copyFileSync(builtBundle, devClientBundle);
            console.log("\u2728 Copied dev-client.lynx.bundle to iOS project");
            const pbxprojPath2 = path15.join(resolved.iosDir, `${appName}.xcodeproj`, "project.pbxproj");
            if (fs15.existsSync(pbxprojPath2)) {
              addResourceToXcodeProject(pbxprojPath2, appName, "dev-client.lynx.bundle");
            }
          }
        }
      } else {
        if (!fs15.existsSync(devClientBundle)) {
          fs15.writeFileSync(devClientBundle, "");
        }
        console.log("\u2139\uFE0F  Skipped dev-client bundle (release build)");
      }
    }
  } catch (error) {
    console.error("\u274C Failed to copy bundle assets.");
    console.error(error.message);
    process.exit(1);
  }
}
var bundle_default2 = bundleAndDeploy2;

// src/ios/build.ts
import fs17 from "fs";
import path17 from "path";
import { execSync as execSync8 } from "child_process";

// src/ios/syncDevClient.ts
import fs16 from "fs";
import path16 from "path";
import { execSync as execSync7 } from "child_process";
import { randomBytes as randomBytes2 } from "crypto";
function readAndSubstituteTemplate4(templatePath, vars) {
  const raw = fs16.readFileSync(templatePath, "utf-8");
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
    raw
  );
}
var APP_NAME = "TamerDevApp";
var BUNDLE_ID = "com.nanofuxion.tamerdevapp";
var BRIDGING_HEADER = `${APP_NAME}-Bridging-Header.h`;
function generateId() {
  return randomBytes2(12).toString("hex").toUpperCase();
}
function writeFile2(filePath, content) {
  fs16.mkdirSync(path16.dirname(filePath), { recursive: true });
  fs16.writeFileSync(filePath, content, "utf8");
}
function getAppDelegateSwift2() {
  return `import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        LynxInitProcessor.shared.setupEnvironment()

        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = DevLauncherViewController()
        window?.makeKeyAndVisible()
        return true
    }

    func application(_ app: UIApplication, open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        if url.scheme == "tamerdevapp", let host = url.host, host == "project" {
            presentProjectViewController()
        }
        return true
    }

    @objc func presentProjectViewController() {
        guard let root = window?.rootViewController else { return }
        let projectVC = ProjectViewController()
        projectVC.modalPresentationStyle = .fullScreen
        root.present(projectVC, animated: true)
    }
}
`;
}
function getDevLauncherViewControllerSwift() {
  return `import UIKit
import Lynx
import tamerdevclient
import tamerinsets

class DevLauncherViewController: UIViewController {
    private var lynxView: LynxView?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        edgesForExtendedLayout = .all
        extendedLayoutIncludesOpaqueBars = true
        additionalSafeAreaInsets = .zero
        view.insetsLayoutMarginsFromSafeArea = false
        view.preservesSuperviewLayoutMargins = false
        viewRespectsSystemMinimumLayoutMargins = false
        setupLynxView()
        setupDevClientModule()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let lynxView = lynxView {
            applyFullscreenLayout(to: lynxView)
        }
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        TamerInsetsModule.reRequestInsets()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    private func setupLynxView() {
        let size = fullscreenBounds().size
        let lv = LynxView { builder in
            builder.config = LynxConfig(provider: DevTemplateProvider())
            builder.screenSize = size
            builder.fontScale = 1.0
        }
        lv.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        lv.insetsLayoutMarginsFromSafeArea = false
        lv.preservesSuperviewLayoutMargins = false
        view.addSubview(lv)
        applyFullscreenLayout(to: lv)
        lv.loadTemplate(fromURL: "dev-client.lynx.bundle", initData: nil)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self, weak lv] in
            guard let self, let lv else { return }
            self.logViewport("devclient post-load", lynxView: lv)
            self.applyFullscreenLayout(to: lv)
        }
        self.lynxView = lv
    }

    private func applyFullscreenLayout(to lynxView: LynxView) {
        let bounds = fullscreenBounds()
        let size = bounds.size
        lynxView.frame = bounds
        lynxView.updateScreenMetrics(withWidth: size.width, height: size.height)
        lynxView.updateViewport(withPreferredLayoutWidth: size.width, preferredLayoutHeight: size.height, needLayout: true)
        lynxView.preferredLayoutWidth = size.width
        lynxView.preferredLayoutHeight = size.height
        lynxView.layoutWidthMode = .exact
        lynxView.layoutHeightMode = .exact
        logViewport("devclient apply", lynxView: lynxView)
    }

    private func fullscreenBounds() -> CGRect {
        let bounds = view.bounds
        if bounds.width > 0, bounds.height > 0 {
            return bounds
        }
        return UIScreen.main.bounds
    }

    private func logViewport(_ label: String, lynxView: LynxView) {
        let rootWidth = lynxView.rootWidth()
        let rootHeight = lynxView.rootHeight()
        let intrinsic = lynxView.intrinsicContentSize
        NSLog("[DevLauncher] %@ view=%@ safe=%@ lynxFrame=%@ lynxBounds=%@ root=%0.2fx%0.2f intrinsic=%@", label, NSCoder.string(for: view.bounds), NSCoder.string(for: view.safeAreaInsets), NSCoder.string(for: lynxView.frame), NSCoder.string(for: lynxView.bounds), rootWidth, rootHeight, NSCoder.string(for: intrinsic))
    }

    private func setupDevClientModule() {
        DevClientModule.presentQRScanner = { [weak self] completion in
            let scanner = QRScannerViewController()
            scanner.onResult = { url in
                scanner.dismiss(animated: true) { completion(url) }
            }
            scanner.modalPresentationStyle = .fullScreen
            self?.present(scanner, animated: true)
        }

        DevClientModule.reloadProjectHandler = { [weak self] in
            guard let self = self else { return }
            let projectVC = ProjectViewController()
            projectVC.modalPresentationStyle = .fullScreen
            self.present(projectVC, animated: true)
        }
    }
}
`;
}
function getProjectViewControllerSwift() {
  return `import UIKit
import Lynx
import tamerinsets

class ProjectViewController: UIViewController {
    private var lynxView: LynxView?
    private var devClientManager: DevClientManager?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        edgesForExtendedLayout = .all
        extendedLayoutIncludesOpaqueBars = true
        additionalSafeAreaInsets = .zero
        view.insetsLayoutMarginsFromSafeArea = false
        view.preservesSuperviewLayoutMargins = false
        viewRespectsSystemMinimumLayoutMargins = false
        setupLynxView()
        devClientManager = DevClientManager(onReload: { [weak self] in
            self?.reloadLynxView()
        })
        devClientManager?.connect()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let lynxView = lynxView {
            applyFullscreenLayout(to: lynxView)
        }
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        TamerInsetsModule.reRequestInsets()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    private func buildLynxView() -> LynxView {
        let size = fullscreenBounds().size
        let lv = LynxView { builder in
            builder.config = LynxConfig(provider: DevTemplateProvider())
            builder.screenSize = size
            builder.fontScale = 1.0
        }
        lv.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        lv.insetsLayoutMarginsFromSafeArea = false
        lv.preservesSuperviewLayoutMargins = false
        applyFullscreenLayout(to: lv)
        return lv
    }

    private func setupLynxView() {
        let lv = buildLynxView()
        view.addSubview(lv)
        lv.loadTemplate(fromURL: "main.lynx.bundle", initData: nil)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self, weak lv] in
            guard let self, let lv else { return }
            self.logViewport("project post-load", lynxView: lv)
            self.applyFullscreenLayout(to: lv)
        }
        self.lynxView = lv
    }

    private func reloadLynxView() {
        lynxView?.removeFromSuperview()
        lynxView = nil
        setupLynxView()
    }

    private func applyFullscreenLayout(to lynxView: LynxView) {
        let bounds = fullscreenBounds()
        let size = bounds.size
        lynxView.frame = bounds
        lynxView.updateScreenMetrics(withWidth: size.width, height: size.height)
        lynxView.updateViewport(withPreferredLayoutWidth: size.width, preferredLayoutHeight: size.height, needLayout: true)
        lynxView.preferredLayoutWidth = size.width
        lynxView.preferredLayoutHeight = size.height
        lynxView.layoutWidthMode = .exact
        lynxView.layoutHeightMode = .exact
        logViewport("project apply", lynxView: lynxView)
    }

    private func fullscreenBounds() -> CGRect {
        let bounds = view.bounds
        if bounds.width > 0, bounds.height > 0 {
            return bounds
        }
        return UIScreen.main.bounds
    }

    private func logViewport(_ label: String, lynxView: LynxView) {
        let rootWidth = lynxView.rootWidth()
        let rootHeight = lynxView.rootHeight()
        let intrinsic = lynxView.intrinsicContentSize
        NSLog("[ProjectVC] %@ view=%@ safe=%@ lynxFrame=%@ lynxBounds=%@ root=%0.2fx%0.2f intrinsic=%@", label, NSCoder.string(for: view.bounds), NSCoder.string(for: view.safeAreaInsets), NSCoder.string(for: lynxView.frame), NSCoder.string(for: lynxView.bounds), rootWidth, rootHeight, NSCoder.string(for: intrinsic))
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if isBeingDismissed || isMovingFromParent {
            devClientManager?.disconnect()
        }
    }
}
`;
}
function getDevTemplateProviderSwift() {
  return `import Foundation
import Lynx
import tamerdevclient

class DevTemplateProvider: NSObject, LynxTemplateProvider {
    private static let devClientBundle = "dev-client.lynx.bundle"

    func loadTemplate(withUrl url: String!, onComplete callback: LynxTemplateLoadBlock!) {
        DispatchQueue.global(qos: .background).async {
            // dev-client.lynx.bundle always loads from the embedded asset
            if url == Self.devClientBundle || url?.hasSuffix("/" + Self.devClientBundle) == true {
                self.loadFromBundle(url: Self.devClientBundle, callback: callback)
                return
            }

            // Try the dev server first
            if let devUrl = DevServerPrefs.getUrl(), !devUrl.isEmpty {
                let origin: String
                if let parsed = URL(string: devUrl) {
                    let scheme = parsed.scheme ?? "http"
                    let host = parsed.host ?? "localhost"
                    let port = parsed.port.map { ":\\($0)" } ?? ""
                    origin = "\\(scheme)://\\(host)\\(port)"
                } else {
                    origin = devUrl
                }

                let candidates = ["/\\(url!)", "/tamer-dev-app/\\(url!)"]
                for candidate in candidates {
                    if let data = self.httpFetch(url: origin + candidate) {
                        callback?(data, nil)
                        return
                    }
                }
            }

            // Fall back to embedded bundle
            self.loadFromBundle(url: url, callback: callback)
        }
    }

    private func loadFromBundle(url: String?, callback: LynxTemplateLoadBlock!) {
        guard let url = url,
              let bundleUrl = Bundle.main.url(forResource: url, withExtension: nil),
              let data = try? Data(contentsOf: bundleUrl) else {
            let err = NSError(domain: "DevTemplateProvider", code: 404,
                              userInfo: [NSLocalizedDescriptionKey: "Bundle not found: \\(url ?? "nil")"])
            callback?(nil, err)
            return
        }
        callback?(data, nil)
    }

    private func httpFetch(url: String) -> Data? {
        guard let u = URL(string: url) else { return nil }
        var req = URLRequest(url: u)
        req.timeoutInterval = 10
        var result: Data?
        let sem = DispatchSemaphore(value: 0)
        URLSession.shared.dataTask(with: req) { data, response, _ in
            if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                result = data
            }
            sem.signal()
        }.resume()
        sem.wait()
        return result
    }
}
`;
}
function getDevClientManagerSwift() {
  return `import Foundation
import tamerdevclient

class DevClientManager {
    private var webSocketTask: URLSessionWebSocketTask?
    private let onReload: () -> Void
    private var session: URLSession?

    init(onReload: @escaping () -> Void) {
        self.onReload = onReload
    }

    func connect() {
        guard let devUrl = DevServerPrefs.getUrl(), !devUrl.isEmpty else { return }
        guard let base = URL(string: devUrl) else { return }

        let scheme = (base.scheme == "https") ? "wss" : "ws"
        let host = base.host ?? "localhost"
        let port = base.port.map { ":\\($0)" } ?? ""
        let rawPath = base.path.isEmpty ? "/" : base.path
        let dir = rawPath.hasSuffix("/") ? rawPath : rawPath + "/"
        guard let wsUrl = URL(string: "\\(scheme)://\\(host)\\(port)\\(dir)__hmr") else { return }

        session = URLSession(configuration: .default)
        let task = session!.webSocketTask(with: wsUrl)
        webSocketTask = task
        task.resume()
        receive()
    }

    private func receive() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }
            switch result {
            case .success(let msg):
                if case .string(let text) = msg, text.contains("\\"type\\":\\"reload\\"") {
                    DispatchQueue.main.async { self.onReload() }
                }
                self.receive()
            case .failure:
                break
            }
        }
    }

    func disconnect() {
        webSocketTask?.cancel(with: .normalClosure, reason: nil)
        webSocketTask = nil
        session = nil
    }
}
`;
}
function getQRScannerViewControllerSwift() {
  return `import UIKit
import AVFoundation

class QRScannerViewController: UIViewController {
    var onResult: ((String?) -> Void)?

    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        setupCamera()
        addCancelButton()
    }

    private func setupCamera() {
        let session = AVCaptureSession()
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else {
            onResult?(nil)
            return
        }

        let output = AVCaptureMetadataOutput()
        session.addInput(input)
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = [.qr]

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.frame = view.layer.bounds
        preview.videoGravity = .resizeAspectFill
        view.layer.insertSublayer(preview, at: 0)
        previewLayer = preview

        DispatchQueue.global(qos: .userInitiated).async { session.startRunning() }
        captureSession = session
    }

    private func addCancelButton() {
        let btn = UIButton(type: .system)
        btn.setTitle("Cancel", for: .normal)
        btn.setTitleColor(.white, for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 18, weight: .medium)
        btn.addTarget(self, action: #selector(cancel), for: .touchUpInside)
        btn.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(btn)
        NSLayoutConstraint.activate([
            btn.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            btn.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
        ])
    }

    @objc private func cancel() {
        captureSession?.stopRunning()
        onResult?(nil)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if captureSession?.isRunning == false {
            DispatchQueue.global(qos: .userInitiated).async { self.captureSession?.startRunning() }
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        captureSession?.stopRunning()
    }
}

extension QRScannerViewController: AVCaptureMetadataOutputObjectsDelegate {
    func metadataOutput(_ output: AVCaptureMetadataOutput,
                        didOutput objects: [AVMetadataObject],
                        from connection: AVCaptureConnection) {
        captureSession?.stopRunning()
        if let obj = objects.first as? AVMetadataMachineReadableCodeObject,
           let value = obj.stringValue {
            onResult?(value)
        }
    }
}
`;
}
function getLynxInitProcessorSwift() {
  return `// Copyright 2024 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import Foundation

// GENERATED IMPORTS START
// This section is automatically generated by Tamer4Lynx.
// Manual edits will be overwritten.
// GENERATED IMPORTS END

final class LynxInitProcessor {
    static let shared = LynxInitProcessor()
    private init() {}

    func setupEnvironment() {
        TamerIconElement.registerFonts()
        setupLynxEnv()
        setupLynxService()
    }

    private func setupLynxEnv() {
        let env = LynxEnv.sharedInstance()
        let globalConfig = LynxConfig(provider: env.config.templateProvider)

        // GENERATED AUTOLINK START

        // GENERATED AUTOLINK END

        env.prepareConfig(globalConfig)
    }

    private func setupLynxService() {
        let webPCoder = SDImageWebPCoder.shared
        SDImageCodersManager.shared.addCoder(webPCoder)
    }
}
`;
}
function getBridgingHeader() {
  return `#import <Lynx/LynxConfig.h>
#import <Lynx/LynxEnv.h>
#import <Lynx/LynxTemplateProvider.h>
#import <Lynx/LynxView.h>
#import <Lynx/LynxModule.h>
#import <SDWebImage/SDWebImage.h>
#import <SDWebImageWebPCoder/SDWebImageWebPCoder.h>
`;
}
function getInfoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>UILaunchStoryboardName</key>
	<string>LaunchScreen</string>
	<key>CFBundleURLTypes</key>
	<array>
		<dict>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>tamerdevapp</string>
			</array>
		</dict>
	</array>
	<key>NSCameraUsageDescription</key>
	<string>Used to scan QR codes for connecting to the dev server</string>
	<key>NSLocalNetworkUsageDescription</key>
	<string>Used to discover Tamer dev servers on your local network</string>
	<key>NSBonjourServices</key>
	<array>
		<string>_tamer._tcp.</string>
	</array>
	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsArbitraryLoads</key>
		<true/>
	</dict>
	<key>UIRequiredDeviceCapabilities</key>
	<array>
		<string>armv7</string>
	</array>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
</dict>
</plist>
`;
}
function getPodfile() {
  return `source 'https://cdn.cocoapods.org/'

platform :ios, '13.0'

target '${APP_NAME}' do
  pod 'Lynx', '3.6.0', :subspecs => [
    'Framework',
  ], :modular_headers => true

  pod 'PrimJS', '3.6.1', :subspecs => ['quickjs', 'napi']

  pod 'LynxService', '3.6.0', :subspecs => [
    'Image',
    'Log',
    'Http',
  ]
  pod 'SDWebImage','5.15.5'
  pod 'SDWebImageWebPCoder', '0.11.0'

  # GENERATED AUTOLINK DEPENDENCIES START
  # This section is automatically generated by Tamer4Lynx.
  # Manual edits will be overwritten.
  # GENERATED AUTOLINK DEPENDENCIES END
end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'gnu++17'
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
      config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
    end

    if target.name == 'Lynx'
      target.build_configurations.each do |config|
        flags = [
          '-Wno-vla-extension',
          '-Wno-vla',
          '-Wno-error=vla-extension',
          '-Wno-deprecated-declarations',
          '-Wno-deprecated',
          '-Wno-deprecated-implementations',
          '-Wno-macro-redefined',
          '-Wno-enum-compare',
          '-Wno-enum-compare-conditional',
          '-Wno-enum-conversion'
        ].join(' ')

        config.build_settings['OTHER_CPLUSPLUSFLAGS'] = "$(inherited) #{flags}"
        config.build_settings['OTHER_CFLAGS'] = "$(inherited) #{flags}"
        config.build_settings['CLANG_WARN_VLA'] = 'NO'
        config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
        config.build_settings['CLANG_WARN_ENUM_CONVERSION'] = 'NO'
      end
    end
  end
end
`;
}
function getMainStoryboard() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0"
    toolsVersion="13122.16" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none"
    useAutolayout="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES"
    initialViewController="BYZ-38-t0r">
  <dependencies>
    <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="13104.12"/>
    <capability name="Safe area layout guides" minToolsVersion="9.0"/>
  </dependencies>
  <scenes>
    <scene sceneID="tne-QT-ifu">
      <objects>
        <viewController id="BYZ-38-t0r" customClass="DevLauncherViewController"
            customModuleProvider="target" sceneMemberID="viewController">
          <view key="view" contentMode="scaleToFill" id="8bC-Xf-vdC">
            <rect key="frame" x="0.0" y="0.0" width="390" height="844"/>
            <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
            <color key="backgroundColor" systemColor="systemBackgroundColor"/>
            <viewLayoutGuide key="safeArea" id="6Tk-OE-BBY"/>
          </view>
        </viewController>
        <placeholder placeholderIdentifier="IBFirstResponder" id="dkx-z0-nzr"
            sceneMemberID="firstResponder"/>
      </objects>
    </scene>
  </scenes>
</document>
`;
}
function getLaunchScreenStoryboard2() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0"
    toolsVersion="13122.16" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none"
    useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES"
    colorMatched="YES" initialViewController="01J-lp-oVM">
  <device id="retina6_12" orientation="portrait" appearance="light"/>
  <dependencies>
    <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="13104.12"/>
    <capability name="Safe area layout guides" minToolsVersion="9.0"/>
    <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
  </dependencies>
  <scenes>
    <scene sceneID="EHf-IW-A2E">
      <objects>
        <viewController id="01J-lp-oVM" sceneMemberID="viewController">
          <view key="view" contentMode="scaleToFill" id="Ze5-6b-2t3">
            <rect key="frame" x="0.0" y="0.0" width="390" height="844"/>
            <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
            <subviews>
              <view contentMode="scaleToFill" translatesAutoresizingMaskIntoConstraints="NO" id="Bg9-1M-mhb">
                <rect key="frame" x="0.0" y="0.0" width="390" height="844"/>
                <color key="backgroundColor" white="0.0" alpha="1" colorSpace="custom" customColorSpace="genericGamma22GrayColorSpace"/>
              </view>
            </subviews>
            <viewLayoutGuide key="safeArea" id="Bcu-3y-fUS"/>
            <color key="backgroundColor" white="0.0" alpha="1" colorSpace="custom" customColorSpace="genericGamma22GrayColorSpace"/>
            <constraints>
              <constraint firstItem="Bg9-1M-mhb" firstAttribute="top" secondItem="Ze5-6b-2t3" secondAttribute="top" id="3M4-v9-a3l"/>
              <constraint firstItem="Bg9-1M-mhb" firstAttribute="bottom" secondItem="Ze5-6b-2t3" secondAttribute="bottom" id="Sbc-LM-HvA"/>
              <constraint firstItem="Bg9-1M-mhb" firstAttribute="leading" secondItem="Ze5-6b-2t3" secondAttribute="leading" id="cJ0-4h-f4M"/>
              <constraint firstAttribute="trailing" secondItem="Bg9-1M-mhb" secondAttribute="trailing" id="g0s-pf-rxW"/>
            </constraints>
          </view>
        </viewController>
        <placeholder placeholderIdentifier="IBFirstResponder" id="iYj-Kq-Ea1" userLabel="First Responder" sceneMemberID="firstResponder"/>
      </objects>
    </scene>
  </scenes>
</document>
`;
}
function generatePbxproj(ids) {
  return `// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {};
	objectVersion = 56;
	objects = {
/* Begin PBXBuildFile section */
		${ids.appDelegateBuildFile} /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.appDelegateRef}; };
		${ids.devLauncherBuildFile} /* DevLauncherViewController.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.devLauncherRef}; };
		${ids.projectVCBuildFile} /* ProjectViewController.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.projectVCRef}; };
		${ids.templateProviderBuildFile} /* DevTemplateProvider.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.templateProviderRef}; };
		${ids.devClientManagerBuildFile} /* DevClientManager.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.devClientManagerRef}; };
		${ids.devServerPrefsBuildFile} /* DevServerPrefs in Sources (via DevClientModule) */ = {isa = PBXBuildFile; fileRef = ${ids.devClientModuleRef}; };
		${ids.qrScannerBuildFile} /* QRScannerViewController.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.qrScannerRef}; };
		${ids.lynxInitBuildFile} /* LynxInitProcessor.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.lynxInitRef}; };
		${ids.mainStoryboardBuildFile} /* Base in Resources */ = {isa = PBXBuildFile; fileRef = ${ids.mainStoryboardBaseRef}; };
		${ids.launchStoryboardBuildFile} /* Base in Resources */ = {isa = PBXBuildFile; fileRef = ${ids.launchStoryboardBaseRef}; };
		${ids.assetsBuildFile} /* Assets.xcassets in Resources */ = {isa = PBXBuildFile; fileRef = ${ids.assetsRef}; };
		${ids.bundleBuildFile} /* dev-client.lynx.bundle in Resources */ = {isa = PBXBuildFile; fileRef = ${ids.bundleRef}; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		${ids.appFile} /* ${APP_NAME}.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = "${APP_NAME}.app"; sourceTree = BUILT_PRODUCTS_DIR; };
		${ids.appDelegateRef} /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "AppDelegate.swift"; sourceTree = "<group>"; };
		${ids.devLauncherRef} /* DevLauncherViewController.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "DevLauncherViewController.swift"; sourceTree = "<group>"; };
		${ids.projectVCRef} /* ProjectViewController.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "ProjectViewController.swift"; sourceTree = "<group>"; };
		${ids.templateProviderRef} /* DevTemplateProvider.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "DevTemplateProvider.swift"; sourceTree = "<group>"; };
		${ids.devClientManagerRef} /* DevClientManager.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "DevClientManager.swift"; sourceTree = "<group>"; };
		${ids.devClientModuleRef} /* DevClientModule (via pod) */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "DevClientModule.swift"; sourceTree = "<group>"; };
		${ids.qrScannerRef} /* QRScannerViewController.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "QRScannerViewController.swift"; sourceTree = "<group>"; };
		${ids.lynxInitRef} /* LynxInitProcessor.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "LynxInitProcessor.swift"; sourceTree = "<group>"; };
		${ids.bridgingHeaderRef} /* ${BRIDGING_HEADER} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.h; path = "${BRIDGING_HEADER}"; sourceTree = "<group>"; };
		${ids.mainStoryboardBaseRef} /* Base */ = {isa = PBXFileReference; lastKnownFileType = file.storyboard; name = Base; path = "Base.lproj/Main.storyboard"; sourceTree = "<group>"; };
		${ids.launchStoryboardBaseRef} /* Base */ = {isa = PBXFileReference; lastKnownFileType = file.storyboard; name = Base; path = "Base.lproj/LaunchScreen.storyboard"; sourceTree = "<group>"; };
		${ids.assetsRef} /* Assets.xcassets */ = {isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = "Assets.xcassets"; sourceTree = "<group>"; };
		${ids.bundleRef} /* dev-client.lynx.bundle */ = {isa = PBXFileReference; lastKnownFileType = "file"; path = "dev-client.lynx.bundle"; sourceTree = "<group>"; };
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
		${ids.frameworksBuildPhase} /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		${ids.mainGroup} = {
			isa = PBXGroup;
			children = (
				${ids.appGroup} /* ${APP_NAME} */,
				${ids.productsGroup} /* Products */,
				${ids.frameworksGroup} /* Frameworks */,
			);
			sourceTree = "<group>";
		};
		${ids.productsGroup} /* Products */ = {
			isa = PBXGroup;
			children = (
				${ids.appFile} /* ${APP_NAME}.app */,
			);
			name = Products;
			sourceTree = "<group>";
		};
		${ids.frameworksGroup} /* Frameworks */ = {
			isa = PBXGroup;
			children = (
			);
			name = Frameworks;
			sourceTree = "<group>";
		};
		${ids.appGroup} /* ${APP_NAME} */ = {
			isa = PBXGroup;
			children = (
				${ids.appDelegateRef} /* AppDelegate.swift */,
				${ids.devLauncherRef} /* DevLauncherViewController.swift */,
				${ids.projectVCRef} /* ProjectViewController.swift */,
				${ids.templateProviderRef} /* DevTemplateProvider.swift */,
				${ids.devClientManagerRef} /* DevClientManager.swift */,
				${ids.devClientModuleRef} /* DevClientModule.swift */,
				${ids.qrScannerRef} /* QRScannerViewController.swift */,
				${ids.lynxInitRef} /* LynxInitProcessor.swift */,
				${ids.bridgingHeaderRef} /* ${BRIDGING_HEADER} */,
				${ids.mainStoryboardRef} /* Main.storyboard */,
				${ids.launchStoryboardRef} /* LaunchScreen.storyboard */,
				${ids.assetsRef} /* Assets.xcassets */,
				${ids.bundleRef} /* dev-client.lynx.bundle */,
			);
			path = "${APP_NAME}";
			sourceTree = "<group>";
		};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		${ids.nativeTarget} /* ${APP_NAME} */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = ${ids.targetBuildConfigList};
			buildPhases = (
				${ids.sourcesBuildPhase} /* Sources */,
				${ids.frameworksBuildPhase} /* Frameworks */,
				${ids.resourcesBuildPhase} /* Resources */,
				${ids.fontCopyScriptPhase} /* [Tamer] Copy Icon Fonts */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = "${APP_NAME}";
			productName = "${APP_NAME}";
			productReference = ${ids.appFile};
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		${ids.project} /* Project object */ = {
			isa = PBXProject;
			attributes = {
				LastUpgradeCheck = 1530;
			};
			buildConfigurationList = ${ids.projectBuildConfigList};
			compatibilityVersion = "Xcode 14.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = ${ids.mainGroup};
			productRefGroup = ${ids.productsGroup} /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				${ids.nativeTarget} /* ${APP_NAME} */,
			);
		};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		${ids.resourcesBuildPhase} /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				${ids.assetsBuildFile} /* Assets.xcassets in Resources */,
				${ids.mainStoryboardBuildFile} /* Base in Resources */,
				${ids.launchStoryboardBuildFile} /* Base in Resources */,
				${ids.bundleBuildFile} /* dev-client.lynx.bundle in Resources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */

/* Begin PBXShellScriptBuildPhase section */
		${ids.fontCopyScriptPhase} /* [Tamer] Copy Icon Fonts */ = {
			isa = PBXShellScriptBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			inputPaths = (
			);
			name = "[Tamer] Copy Icon Fonts";
			outputPaths = (
			);
			runOnlyForDeploymentPostprocessing = 0;
			shellPath = /bin/sh;
			shellScript = "FONTS_SRC=\\"${SRCROOT}/../../tamer-icons/fonts\\"\\nif [ -d \\"$FONTS_SRC\\" ]; then\\n  cp -f \\"$FONTS_SRC/MaterialSymbolsOutlined.ttf\\" \\"${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app/\\" 2>/dev/null || true\\n  cp -f \\"$FONTS_SRC/fa-solid-900.ttf\\" \\"${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app/\\" 2>/dev/null || true\\nfi\\nCP_SRC=\\"${SRCROOT}/../../tamer-icons/android/src/main/assets/fonts/material-codepoints.txt\\"\\n[ -f \\"$CP_SRC\\" ] && cp -f \\"$CP_SRC\\" \\"${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app/\\" 2>/dev/null || true\\n";
		};
/* End PBXShellScriptBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		${ids.sourcesBuildPhase} /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				${ids.appDelegateBuildFile} /* AppDelegate.swift in Sources */,
				${ids.devLauncherBuildFile} /* DevLauncherViewController.swift in Sources */,
				${ids.projectVCBuildFile} /* ProjectViewController.swift in Sources */,
				${ids.templateProviderBuildFile} /* DevTemplateProvider.swift in Sources */,
				${ids.devClientManagerBuildFile} /* DevClientManager.swift in Sources */,
				${ids.qrScannerBuildFile} /* QRScannerViewController.swift in Sources */,
				${ids.lynxInitBuildFile} /* LynxInitProcessor.swift in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin PBXVariantGroup section */
		${ids.mainStoryboardRef} /* Main.storyboard */ = {
			isa = PBXVariantGroup;
			children = (
				${ids.mainStoryboardBaseRef} /* Base */,
			);
			name = "Main.storyboard";
			sourceTree = "<group>";
		};
		${ids.launchStoryboardRef} /* LaunchScreen.storyboard */ = {
			isa = PBXVariantGroup;
			children = (
				${ids.launchStoryboardBaseRef} /* Base */,
			);
			name = "LaunchScreen.storyboard";
			sourceTree = "<group>";
		};
/* End PBXVariantGroup section */

/* Begin XCBuildConfiguration section */
		${ids.projectDebugConfig} /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++17";
				CLANG_CXX_LIBRARY = "libc++";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = dwarf;
				GCC_C_LANGUAGE_STANDARD = gnu11;
				GCC_NO_COMMON_BLOCKS = YES;
				IPHONEOS_DEPLOYMENT_TARGET = 13.0;
				SDKROOT = iphoneos;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
			};
			name = Debug;
		};
		${ids.projectReleaseConfig} /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++17";
				CLANG_CXX_LIBRARY = "libc++";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
				GCC_C_LANGUAGE_STANDARD = gnu11;
				GCC_NO_COMMON_BLOCKS = YES;
				IPHONEOS_DEPLOYMENT_TARGET = 13.0;
				SDKROOT = iphoneos;
				SWIFT_COMPILATION_MODE = wholemodule;
				SWIFT_OPTIMIZATION_LEVEL = "-O";
			};
			name = Release;
		};
		${ids.targetDebugConfig} /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CURRENT_PROJECT_VERSION = 1;
				INFOPLIST_FILE = "${APP_NAME}/Info.plist";
				LD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/Frameworks";
				MARKETING_VERSION = "1.0";
				PRODUCT_BUNDLE_IDENTIFIER = "${BUNDLE_ID}";
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_OBJC_BRIDGING_HEADER = "${APP_NAME}/${BRIDGING_HEADER}";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Debug;
		};
		${ids.targetReleaseConfig} /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CURRENT_PROJECT_VERSION = 1;
				INFOPLIST_FILE = "${APP_NAME}/Info.plist";
				LD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/Frameworks";
				MARKETING_VERSION = "1.0";
				PRODUCT_BUNDLE_IDENTIFIER = "${BUNDLE_ID}";
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_OBJC_BRIDGING_HEADER = "${APP_NAME}/${BRIDGING_HEADER}";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		${ids.projectBuildConfigList} = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${ids.projectDebugConfig} /* Debug */,
				${ids.projectReleaseConfig} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		${ids.targetBuildConfigList} = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${ids.targetDebugConfig} /* Debug */,
				${ids.targetReleaseConfig} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
	rootObject = ${ids.project} /* Project object */;
}
`;
}
async function createDevAppProject(iosDir, repoRoot) {
  const projectDir = path16.join(iosDir, APP_NAME);
  const xcodeprojDir = path16.join(iosDir, `${APP_NAME}.xcodeproj`);
  if (fs16.existsSync(iosDir)) {
    fs16.rmSync(iosDir, { recursive: true, force: true });
  }
  console.log(`\u{1F680} Creating TamerDevApp iOS project at: ${iosDir}`);
  const ids = {};
  const idKeys = [
    "project",
    "mainGroup",
    "appGroup",
    "productsGroup",
    "frameworksGroup",
    "appFile",
    "appDelegateRef",
    "devLauncherRef",
    "projectVCRef",
    "templateProviderRef",
    "devClientManagerRef",
    "devClientModuleRef",
    "qrScannerRef",
    "lynxInitRef",
    "bridgingHeaderRef",
    "mainStoryboardRef",
    "mainStoryboardBaseRef",
    "launchStoryboardRef",
    "launchStoryboardBaseRef",
    "assetsRef",
    "bundleRef",
    "nativeTarget",
    "appDelegateBuildFile",
    "devLauncherBuildFile",
    "projectVCBuildFile",
    "templateProviderBuildFile",
    "devClientManagerBuildFile",
    "devServerPrefsBuildFile",
    "qrScannerBuildFile",
    "lynxInitBuildFile",
    "mainStoryboardBuildFile",
    "launchStoryboardBuildFile",
    "assetsBuildFile",
    "bundleBuildFile",
    "frameworksBuildPhase",
    "resourcesBuildPhase",
    "sourcesBuildPhase",
    "fontCopyScriptPhase",
    "projectBuildConfigList",
    "targetBuildConfigList",
    "projectDebugConfig",
    "projectReleaseConfig",
    "targetDebugConfig",
    "targetReleaseConfig"
  ];
  for (const k of idKeys) ids[k] = generateId();
  writeFile2(path16.join(iosDir, "Podfile"), getPodfile());
  writeFile2(path16.join(projectDir, "AppDelegate.swift"), getAppDelegateSwift2());
  const devClientPkg = findDevClientPackage(repoRoot);
  const templateDir = devClientPkg ? path16.join(devClientPkg, "ios", "templates") : null;
  const templateVars = { PROJECT_BUNDLE_SEGMENT: "tamer-dev-app" };
  const templateFiles = [
    "DevLauncherViewController.swift",
    "ProjectViewController.swift",
    "DevTemplateProvider.swift",
    "DevClientManager.swift",
    "QRScannerViewController.swift",
    "LynxInitProcessor.swift"
  ];
  for (const f of templateFiles) {
    const src = templateDir ? path16.join(templateDir, f) : null;
    if (src && fs16.existsSync(src)) {
      writeFile2(path16.join(projectDir, f), readAndSubstituteTemplate4(src, templateVars));
    } else {
      const fallback = (() => {
        switch (f) {
          case "DevLauncherViewController.swift":
            return getDevLauncherViewControllerSwift();
          case "ProjectViewController.swift":
            return getProjectViewControllerSwift();
          case "DevTemplateProvider.swift":
            return getDevTemplateProviderSwift();
          case "DevClientManager.swift":
            return getDevClientManagerSwift();
          case "QRScannerViewController.swift":
            return getQRScannerViewControllerSwift();
          case "LynxInitProcessor.swift":
            return getLynxInitProcessorSwift();
          default:
            return "";
        }
      })();
      if (fallback) writeFile2(path16.join(projectDir, f), fallback);
    }
  }
  writeFile2(path16.join(projectDir, BRIDGING_HEADER), getBridgingHeader());
  writeFile2(path16.join(projectDir, "Info.plist"), getInfoPlist());
  writeFile2(path16.join(projectDir, "Base.lproj", "Main.storyboard"), getMainStoryboard());
  writeFile2(path16.join(projectDir, "Base.lproj", "LaunchScreen.storyboard"), getLaunchScreenStoryboard2());
  writeFile2(
    path16.join(projectDir, "Assets.xcassets", "AppIcon.appiconset", "Contents.json"),
    JSON.stringify({ images: [{ idiom: "universal", platform: "ios", size: "1024x1024" }], info: { author: "xcode", version: 1 } }, null, 2)
  );
  writeFile2(
    path16.join(projectDir, "Assets.xcassets", "Contents.json"),
    JSON.stringify({ info: { author: "xcode", version: 1 } }, null, 2)
  );
  writeFile2(path16.join(projectDir, "dev-client.lynx.bundle"), "");
  fs16.mkdirSync(xcodeprojDir, { recursive: true });
  writeFile2(path16.join(xcodeprojDir, "project.pbxproj"), generatePbxproj(ids));
  console.log(`\u2705 TamerDevApp iOS project created at ${iosDir}`);
  await setupCocoaPods(iosDir);
}
async function syncDevClientIos() {
  let resolved;
  let repoRoot;
  try {
    repoRoot = findRepoRoot(process.cwd());
    resolved = resolveDevAppPaths(repoRoot);
  } catch (e) {
    console.error(`\u274C ${e.message}`);
    process.exit(1);
  }
  const iosDir = resolved.iosDir;
  const workspacePath = path16.join(iosDir, `${APP_NAME}.xcworkspace`);
  const projectDir = path16.join(iosDir, APP_NAME);
  const hasCommittedSource = fs16.existsSync(path16.join(projectDir, "AppDelegate.swift"));
  if (!hasCommittedSource) {
    await createDevAppProject(iosDir, repoRoot);
  } else if (!fs16.existsSync(workspacePath)) {
    await setupCocoaPods(iosDir);
    console.log(`\u2139\uFE0F  iOS dev-app project exists; ran pod install`);
  } else {
    console.log(`\u2139\uFE0F  iOS dev-app project already exists at ${iosDir}`);
  }
  const prev = process.cwd();
  process.chdir(resolved.projectRoot);
  try {
    autolink_default2();
  } finally {
    process.chdir(prev);
  }
  const devClientDir = resolved.lynxProjectDir;
  console.log("\u{1F4E6} Building dev-client Lynx bundle...");
  execSync7("npm run build", { stdio: "inherit", cwd: devClientDir });
  const bundleSrc = resolved.lynxBundlePath;
  const bundleDst = path16.join(iosDir, APP_NAME, "dev-client.lynx.bundle");
  if (fs16.existsSync(bundleSrc)) {
    fs16.copyFileSync(bundleSrc, bundleDst);
    console.log(`\u2728 Copied dev-client.lynx.bundle to iOS project`);
  } else {
    console.warn(`\u26A0\uFE0F  Bundle not found at ${bundleSrc}`);
  }
}
var syncDevClient_default2 = syncDevClientIos;

// src/ios/build.ts
var DEV_APP_NAME = "TamerDevApp";
var SIMULATOR_ID = "A07F36D8-873A-41E0-8B90-3DF328A6B614";
function findBootedSimulator() {
  try {
    const out = execSync8("xcrun simctl list devices --json", { encoding: "utf8" });
    const json = JSON.parse(out);
    for (const runtimes of Object.values(json.devices)) {
      for (const device of runtimes) {
        if (device.state === "Booted") return device.udid;
      }
    }
  } catch {
  }
  return null;
}
async function buildIpa(opts = {}) {
  const target = opts.target ?? "host";
  const resolved = resolveHostPaths();
  if (!resolved.config.ios?.appName) {
    throw new Error('"ios.appName" must be defined in tamer.config.json');
  }
  if (target === "dev-app") {
    await buildIosDevApp(opts.install, opts.release);
    return;
  }
  const appName = resolved.config.ios.appName;
  const bundleId = resolved.config.ios.bundleId;
  const iosDir = resolved.iosDir;
  const configuration = opts.release ? "Release" : "Debug";
  bundle_default2({ target, release: opts.release });
  const scheme = appName;
  const workspacePath = path17.join(iosDir, `${appName}.xcworkspace`);
  const projectPath = path17.join(iosDir, `${appName}.xcodeproj`);
  const xcproject = fs17.existsSync(workspacePath) ? workspacePath : projectPath;
  const flag = xcproject.endsWith(".xcworkspace") ? "-workspace" : "-project";
  const derivedDataPath = path17.join(iosDir, "build");
  const sdk = opts.install ? "iphonesimulator" : "iphoneos";
  console.log(`
\u{1F528} Building ${configuration} (${sdk})...`);
  execSync8(
    `xcodebuild ${flag} "${xcproject}" -scheme "${scheme}" -configuration ${configuration} -sdk ${sdk} -derivedDataPath "${derivedDataPath}"`,
    { stdio: "inherit", cwd: iosDir }
  );
  console.log(`\u2705 Build completed.`);
  if (opts.install) {
    const appGlob = path17.join(
      derivedDataPath,
      "Build",
      "Products",
      `${configuration}-iphonesimulator`,
      `${appName}.app`
    );
    if (!fs17.existsSync(appGlob)) {
      console.error(`\u274C Built app not found at: ${appGlob}`);
      process.exit(1);
    }
    const udid = findBootedSimulator();
    if (!udid) {
      console.error("\u274C No booted simulator found. Start one with: xcrun simctl boot <udid>");
      process.exit(1);
    }
    console.log(`\u{1F4F2} Installing on simulator ${udid}...`);
    execSync8(`xcrun simctl install "${udid}" "${appGlob}"`, { stdio: "inherit" });
    if (bundleId) {
      console.log(`\u{1F680} Launching ${bundleId}...`);
      execSync8(`xcrun simctl launch "${udid}" "${bundleId}"`, { stdio: "inherit" });
      console.log("\u2705 App launched.");
    } else {
      console.log('\u2705 App installed. (Set "ios.bundleId" in tamer.config.json to auto-launch.)');
    }
  }
}
async function buildIosDevApp(install, release) {
  const repoRoot = findRepoRoot(process.cwd());
  const resolved = resolveDevAppPaths(repoRoot);
  const iosDir = resolved.iosDir;
  const configuration = release ? "Release" : "Debug";
  await syncDevClient_default2();
  const workspacePath = path17.join(iosDir, `${DEV_APP_NAME}.xcworkspace`);
  const projectPath = path17.join(iosDir, `${DEV_APP_NAME}.xcodeproj`);
  const xcproject = fs17.existsSync(workspacePath) ? workspacePath : projectPath;
  const flag = xcproject.endsWith(".xcworkspace") ? "workspace" : "project";
  console.log(`
\u{1F528} Building TamerDevApp for simulator (${configuration})...`);
  execSync8(
    `xcodebuild -${flag} "${xcproject}" -scheme "${DEV_APP_NAME}" -configuration ${configuration} -sdk iphonesimulator -destination "platform=iOS Simulator,name=iPhone 16 Pro,OS=18.5" -derivedDataPath build`,
    { stdio: "inherit", cwd: iosDir }
  );
  console.log("\u2705 TamerDevApp built successfully.");
  if (install) {
    const appPath = path17.join(iosDir, "build", "Build", "Products", `${configuration}-iphonesimulator`, `${DEV_APP_NAME}.app`);
    console.log("\n\u{1F4F2} Installing to simulator...");
    try {
      execSync8(`xcrun simctl boot "${SIMULATOR_ID}" 2>/dev/null`);
    } catch {
    }
    execSync8(`xcrun simctl install "${SIMULATOR_ID}" "${appPath}"`, { stdio: "inherit" });
    execSync8(`xcrun simctl launch "${SIMULATOR_ID}" "com.nanofuxion.tamerdevapp"`, { stdio: "inherit" });
    execSync8("open -a Simulator", { stdio: "inherit" });
    console.log("\u2705 TamerDevApp launched in simulator.");
  }
}
var build_default2 = buildIpa;

// src/common/init.ts
import fs18 from "fs";
import path18 from "path";
import readline from "readline";
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}
async function init() {
  process.removeAllListeners("warning");
  console.log("Tamer4Lynx Init: Let's set up your tamer.config.json\n");
  const androidAppName = await ask("Android app name: ");
  const androidPackageName = await ask("Android package name (e.g. com.example.app): ");
  let androidSdk = await ask("Android SDK path (e.g. ~/Library/Android/sdk or $ANDROID_HOME): ");
  if (androidSdk.startsWith("$") && /^[A-Z0-9_]+$/.test(androidSdk.slice(1))) {
    const envVar = androidSdk.slice(1);
    const envValue = process.env[envVar];
    if (envValue) {
      androidSdk = envValue;
      console.log(`Resolved ${androidSdk} from $${envVar}`);
    } else {
      console.warn(`Environment variable $${envVar} not found. SDK path will be left as-is.`);
    }
  }
  const useSame = await ask("Use same name and bundle ID for iOS as Android? (y/N): ");
  let iosAppName;
  let iosBundleId;
  if (/^y(es)?$/i.test(useSame)) {
    iosAppName = androidAppName;
    iosBundleId = androidPackageName;
  } else {
    iosAppName = await ask("iOS app name: ");
    iosBundleId = await ask("iOS bundle ID (e.g. com.example.app): ");
  }
  const lynxProject = await ask("Lynx project path (relative to project root, e.g. packages/example) [optional]: ");
  const config = {
    android: {
      appName: androidAppName || void 0,
      packageName: androidPackageName || void 0,
      sdk: androidSdk || void 0
    },
    ios: {
      appName: iosAppName || void 0,
      bundleId: iosBundleId || void 0
    },
    paths: { androidDir: "android", iosDir: "ios" }
  };
  if (lynxProject) config.lynxProject = lynxProject;
  const configPath = path18.join(process.cwd(), "tamer.config.json");
  fs18.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`
\u2705 Generated tamer.config.json at ${configPath}`);
  rl.close();
}
var init_default = init;

// src/common/create.ts
import fs19 from "fs";
import path19 from "path";
import readline2 from "readline";
var rl2 = readline2.createInterface({ input: process.stdin, output: process.stdout });
function ask2(question) {
  return new Promise((resolve) => rl2.question(question, (answer) => resolve(answer.trim())));
}
async function create3() {
  console.log("Tamer4Lynx: Create Lynx Extension\n");
  console.log("Select extension types (space to toggle, enter to confirm):");
  console.log("  [ ] Native Module");
  console.log("  [ ] Element");
  console.log("  [ ] Service\n");
  const includeModule = /^y(es)?$/i.test(await ask2("Include Native Module? (Y/n): ") || "y");
  const includeElement = /^y(es)?$/i.test(await ask2("Include Element? (y/N): ") || "n");
  const includeService = /^y(es)?$/i.test(await ask2("Include Service? (y/N): ") || "n");
  if (!includeModule && !includeElement && !includeService) {
    console.error("\u274C At least one extension type is required.");
    rl2.close();
    process.exit(1);
  }
  const extName = await ask2("Extension package name (e.g. my-lynx-module): ");
  if (!extName || !/^[a-z0-9-_]+$/.test(extName)) {
    console.error("\u274C Invalid package name. Use lowercase letters, numbers, hyphens, underscores.");
    rl2.close();
    process.exit(1);
  }
  const packageName = await ask2("Android package name (e.g. com.example.mymodule): ") || `com.example.${extName.replace(/-/g, "")}`;
  const simpleModuleName = extName.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("") + "Module";
  const fullModuleClassName = `${packageName}.${simpleModuleName}`;
  const cwd = process.cwd();
  const root = path19.join(cwd, extName);
  if (fs19.existsSync(root)) {
    console.error(`\u274C Directory ${extName} already exists.`);
    rl2.close();
    process.exit(1);
  }
  fs19.mkdirSync(root, { recursive: true });
  const lynxExt = {
    platforms: {
      android: {
        packageName,
        moduleClassName: fullModuleClassName,
        sourceDir: "android"
      },
      ios: {
        podspecPath: `ios/${extName}`,
        moduleClassName: simpleModuleName
      },
      web: {}
    }
  };
  fs19.writeFileSync(path19.join(root, "lynx.ext.json"), JSON.stringify(lynxExt, null, 2));
  const pkg = {
    name: extName,
    version: "0.0.1",
    type: "module",
    main: "index.js",
    description: `Lynx extension: ${extName}`,
    scripts: { codegen: "t4l codegen" },
    devDependencies: { typescript: "^5" },
    peerDependencies: { typescript: "^5" },
    engines: { node: ">=18" }
  };
  if (includeModule) pkg.types = "src/index.d.ts";
  fs19.writeFileSync(path19.join(root, "package.json"), JSON.stringify(pkg, null, 2));
  const pkgPath = packageName.replace(/\./g, "/");
  if (includeModule) {
    fs19.mkdirSync(path19.join(root, "src"), { recursive: true });
    fs19.writeFileSync(path19.join(root, "src", "index.d.ts"), `/** @lynxmodule */
export declare class ${simpleModuleName} {
  // Add your module methods here
}
`);
    fs19.mkdirSync(path19.join(root, "android", "src", "main", "kotlin", pkgPath), { recursive: true });
    fs19.writeFileSync(path19.join(root, "android", "build.gradle.kts"), `plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "${packageName}"
    compileSdk = 35
    defaultConfig { minSdk = 28 }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(libs.lynx)
    implementation(libs.lynx.jssdk)
}
`);
    fs19.writeFileSync(path19.join(root, "android", "src", "main", "AndroidManifest.xml"), `<?xml version="1.0" encoding="utf-8"?>
<manifest />
`);
    const ktContent = `package ${packageName}

import android.content.Context
import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule

class ${simpleModuleName}(context: Context) : LynxModule(context) {

    @LynxMethod
    fun example(): String {
        return "Hello from ${extName}"
    }
}
`;
    fs19.writeFileSync(path19.join(root, "android", "src", "main", "kotlin", pkgPath, `${simpleModuleName}.kt`), ktContent);
    fs19.mkdirSync(path19.join(root, "ios", extName, extName, "Classes"), { recursive: true });
    const podspec = `Pod::Spec.new do |s|
  s.name             = '${extName}'
  s.version          = '0.0.1'
  s.summary          = 'Lynx extension: ${extName}'
  s.homepage         = ''
  s.license          = { :type => 'MIT' }
  s.author           = ''
  s.source           = { :git => '' }
  s.platform         = :ios, '12.0'
  s.source_files     = 'Classes/**/*'
  s.dependency       'Lynx'
end
`;
    fs19.writeFileSync(path19.join(root, "ios", extName, `${extName}.podspec`), podspec);
    const swiftContent = `import Foundation

@objc public class ${simpleModuleName}: NSObject {
    @objc public func example() -> String {
        return "Hello from ${extName}"
    }
}
`;
    fs19.writeFileSync(path19.join(root, "ios", extName, extName, "Classes", `${simpleModuleName}.swift`), swiftContent);
  }
  fs19.writeFileSync(path19.join(root, "index.js"), `'use strict';
module.exports = {};
`);
  fs19.writeFileSync(path19.join(root, "tsconfig.json"), JSON.stringify({
    compilerOptions: { target: "ES2020", module: "ESNext", moduleResolution: "bundler", strict: true },
    include: ["src"]
  }, null, 2));
  fs19.writeFileSync(path19.join(root, "README.md"), `# ${extName}

Lynx extension for ${extName}.

## Usage

\`\`\`bash
npm install ${extName}
\`\`\`

## Configuration

This package uses \`lynx.ext.json\` (RFC-compliant) for autolinking.
`);
  console.log(`
\u2705 Created extension at ${root}`);
  console.log("\nNext steps:");
  console.log(`  cd ${extName}`);
  console.log("  npm install");
  if (includeModule) console.log("  npm run codegen");
  rl2.close();
}
var create_default3 = create3;

// src/common/codegen.ts
import fs20 from "fs";
import path20 from "path";
function codegen() {
  const cwd = process.cwd();
  const config = loadExtensionConfig(cwd);
  if (!config) {
    console.error("\u274C No lynx.ext.json or tamer.json found. Run from an extension package root.");
    process.exit(1);
  }
  const srcDir = path20.join(cwd, "src");
  const generatedDir = path20.join(cwd, "generated");
  fs20.mkdirSync(generatedDir, { recursive: true });
  const dtsFiles = findDtsFiles(srcDir);
  const modules = extractLynxModules(dtsFiles);
  if (modules.length === 0) {
    console.log("\u2139\uFE0F No @lynxmodule declarations found in src/. Add /** @lynxmodule */ to your module class.");
    return;
  }
  for (const mod of modules) {
    const tsContent = `export type { ${mod} } from '../src/index.js';
`;
    const outPath = path20.join(generatedDir, `${mod}.ts`);
    fs20.writeFileSync(outPath, tsContent);
    console.log(`\u2705 Generated ${outPath}`);
  }
  if (config.android) {
    const androidGenerated = path20.join(cwd, "android", "src", "main", "kotlin", config.android.moduleClassName.replace(/\./g, "/").replace(/[^/]+$/, ""), "generated");
    fs20.mkdirSync(androidGenerated, { recursive: true });
    console.log(`\u2139\uFE0F Android generated dir: ${androidGenerated} (spec generation coming soon)`);
  }
  if (config.ios) {
    const iosGenerated = path20.join(cwd, "ios", "generated");
    fs20.mkdirSync(iosGenerated, { recursive: true });
    console.log(`\u2139\uFE0F iOS generated dir: ${iosGenerated} (spec generation coming soon)`);
  }
  console.log("\u2728 Codegen complete.");
}
function findDtsFiles(dir) {
  const result = [];
  if (!fs20.existsSync(dir)) return result;
  const entries = fs20.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path20.join(dir, e.name);
    if (e.isDirectory()) result.push(...findDtsFiles(full));
    else if (e.name.endsWith(".d.ts")) result.push(full);
  }
  return result;
}
function extractLynxModules(files) {
  const modules = [];
  const seen = /* @__PURE__ */ new Set();
  for (const file of files) {
    const content = fs20.readFileSync(file, "utf8");
    const regex = /\/\*\*\s*@lynxmodule\s*\*\/\s*export\s+declare\s+class\s+(\w+)/g;
    let m;
    while ((m = regex.exec(content)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        modules.push(m[1]);
      }
    }
  }
  return modules;
}
var codegen_default = codegen;

// src/common/devServer.ts
import { spawn } from "child_process";
import fs21 from "fs";
import http from "http";
import os3 from "os";
import path21 from "path";
import { WebSocketServer } from "ws";
var DEFAULT_PORT = 3e3;
function getLanIp() {
  const nets = os3.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const addrs = nets[name];
    if (!addrs) continue;
    for (const a of addrs) {
      if (a.family === "IPv4" && !a.internal) return a.address;
    }
  }
  return "localhost";
}
async function startDevServer(opts) {
  const verbose = opts?.verbose ?? false;
  const resolved = resolveHostPaths();
  const { projectRoot, lynxProjectDir, lynxBundlePath, lynxBundleFile, config } = resolved;
  const distDir = path21.dirname(lynxBundlePath);
  const port = config.devServer?.port ?? config.devServer?.httpPort ?? DEFAULT_PORT;
  let buildProcess = null;
  function runBuild() {
    return new Promise((resolve, reject) => {
      buildProcess = spawn("npm", ["run", "build"], {
        cwd: lynxProjectDir,
        stdio: "pipe"
      });
      let stderr = "";
      buildProcess.stderr?.on("data", (d) => {
        stderr += d.toString();
      });
      buildProcess.on("close", (code) => {
        buildProcess = null;
        if (code === 0) resolve();
        else reject(new Error(stderr || `Build exited ${code}`));
      });
    });
  }
  const projectName = path21.basename(lynxProjectDir);
  const basePath = `/${projectName}`;
  const iconPaths = resolveIconPaths(projectRoot, config);
  let iconFilePath = null;
  if (iconPaths?.source && fs21.statSync(iconPaths.source).isFile()) {
    iconFilePath = iconPaths.source;
  } else if (iconPaths?.android) {
    const androidIcon = path21.join(iconPaths.android, "mipmap-xxxhdpi", "ic_launcher.png");
    if (fs21.existsSync(androidIcon)) iconFilePath = androidIcon;
  } else if (iconPaths?.ios) {
    const iosIcon = path21.join(iconPaths.ios, "Icon-1024.png");
    if (fs21.existsSync(iosIcon)) iconFilePath = iosIcon;
  }
  const iconExt = iconFilePath ? path21.extname(iconFilePath) || ".png" : "";
  const iconMime = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon"
  };
  const httpServer = http.createServer((req, res) => {
    let reqPath = (req.url || "/").split("?")[0];
    if (reqPath === `${basePath}/status`) {
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end("packager-status:running");
      return;
    }
    if (reqPath === `${basePath}/meta.json`) {
      const lanIp = getLanIp();
      const nativeModules = discoverNativeExtensions(projectRoot);
      const meta = {
        name: projectName,
        slug: projectName,
        bundleUrl: `http://${lanIp}:${port}${basePath}/${lynxBundleFile}`,
        bundleFile: lynxBundleFile,
        hostUri: `http://${lanIp}:${port}${basePath}`,
        debuggerHost: `${lanIp}:${port}`,
        developer: { tool: "tamer4lynx" },
        packagerStatus: "running",
        nativeModules: nativeModules.map((m) => ({ packageName: m.packageName, moduleClassName: m.moduleClassName }))
      };
      if (iconFilePath) {
        meta.icon = `http://${lanIp}:${port}${basePath}/icon${iconExt}`;
      }
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify(meta, null, 2));
      return;
    }
    if (iconFilePath && (reqPath === `${basePath}/icon` || reqPath === `${basePath}/icon${iconExt}`)) {
      fs21.readFile(iconFilePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end();
          return;
        }
        res.setHeader("Content-Type", iconMime[iconExt] ?? "image/png");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(data);
      });
      return;
    }
    if (reqPath === "/" || reqPath === basePath || reqPath === `${basePath}/`) {
      reqPath = `${basePath}/${lynxBundleFile}`;
    } else if (!reqPath.startsWith(basePath)) {
      reqPath = basePath + (reqPath.startsWith("/") ? reqPath : "/" + reqPath);
    }
    const relPath = reqPath.replace(basePath, "").replace(/^\//, "") || lynxBundleFile;
    const filePath = path21.resolve(distDir, relPath);
    const distResolved = path21.resolve(distDir);
    if (!filePath.startsWith(distResolved + path21.sep) && filePath !== distResolved) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs21.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", reqPath.endsWith(".bundle") ? "application/octet-stream" : "application/javascript");
      res.end(data);
    });
  });
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on("upgrade", (request, socket, head) => {
    const reqPath = (request.url || "").split("?")[0];
    if (reqPath === `${basePath}/__hmr` || reqPath === "/__hmr" || reqPath.endsWith("/__hmr")) {
      wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
    } else {
      socket.destroy();
    }
  });
  wss.on("connection", (ws, req) => {
    const clientIp = req.socket.remoteAddress ?? "unknown";
    console.log(`\x1B[90m[WS] client connected: ${clientIp}\x1B[0m`);
    ws.send(JSON.stringify({ type: "connected" }));
    ws.on("close", () => {
      console.log(`\x1B[90m[WS] client disconnected: ${clientIp}\x1B[0m`);
    });
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg?.type === "console_log" && Array.isArray(msg.message)) {
          const skip = msg.message.includes("[rspeedy-dev-server]") || msg.message.includes("[HMR]");
          if (skip) return;
          const isJs = msg.tag === "lynx-console" || msg.tag == null;
          if (!verbose && !isJs) return;
          const prefix = isJs ? "\x1B[36m[APP]:\x1B[0m" : "\x1B[33m[NATIVE]:\x1B[0m";
          console.log(prefix, ...msg.message);
        }
      } catch {
      }
    });
  });
  function broadcastReload() {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(JSON.stringify({ type: "reload" }));
    });
  }
  let chokidar = null;
  try {
    chokidar = await import("chokidar");
  } catch {
  }
  if (chokidar) {
    const watchPaths = [
      path21.join(lynxProjectDir, "src"),
      path21.join(lynxProjectDir, "lynx.config.ts"),
      path21.join(lynxProjectDir, "lynx.config.js")
    ].filter((p) => fs21.existsSync(p));
    if (watchPaths.length > 0) {
      const watcher = chokidar.watch(watchPaths, { ignoreInitial: true });
      watcher.on("change", async () => {
        try {
          await runBuild();
          broadcastReload();
          console.log("\u{1F504} Rebuilt, clients notified");
        } catch (e) {
          console.error("Build failed:", e.message);
        }
      });
    }
  }
  try {
    await runBuild();
  } catch (e) {
    console.error("\u274C Initial build failed:", e.message);
    process.exit(1);
  }
  let stopBonjour;
  httpServer.listen(port, "0.0.0.0", () => {
    void import("dnssd-advertise").then(({ advertise }) => {
      stopBonjour = advertise({
        name: projectName,
        type: "tamer",
        protocol: "tcp",
        port,
        txt: {
          name: projectName.slice(0, 255),
          path: basePath.slice(0, 255)
        }
      });
    }).catch(() => {
    });
    const lanIp = getLanIp();
    const devUrl = `http://${lanIp}:${port}${basePath}`;
    const wsUrl = `ws://${lanIp}:${port}${basePath}/__hmr`;
    console.log(`
\u{1F680} Tamer4Lynx dev server (${projectName})`);
    if (verbose) console.log(`   Logs: \x1B[33mverbose\x1B[0m (native + JS)`);
    console.log(`   Bundle:  ${devUrl}/${lynxBundleFile}`);
    console.log(`   Meta:    ${devUrl}/meta.json`);
    console.log(`   HMR WS:  ${wsUrl}`);
    if (stopBonjour) console.log(`   mDNS:    _tamer._tcp (discoverable on LAN)`);
    console.log(`
   Scan QR or enter in app: ${devUrl}
`);
    void import("qrcode-terminal").then((mod) => {
      const qrcode = mod.default ?? mod;
      qrcode.generate(devUrl, { small: true });
    }).catch(() => {
    });
  });
  const cleanup = async () => {
    buildProcess?.kill();
    await stopBonjour?.();
    httpServer.close();
    wss.close();
    process.exit(0);
  };
  process.on("SIGINT", () => {
    void cleanup();
  });
  process.on("SIGTERM", () => {
    void cleanup();
  });
  await new Promise(() => {
  });
}
var devServer_default = startDevServer;

// src/common/start.ts
async function start(opts) {
  await devServer_default({ verbose: opts?.verbose });
}
var start_default = start;

// src/common/injectHost.ts
import fs22 from "fs";
import path22 from "path";
function readAndSubstitute(templatePath, vars) {
  const raw = fs22.readFileSync(templatePath, "utf-8");
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
    raw
  );
}
async function injectHostAndroid(opts) {
  const config = loadHostConfig();
  const packageName = config.android?.packageName;
  const appName = config.android?.appName ?? "App";
  if (!packageName) {
    console.error("\u274C android.packageName required in tamer.config.json");
    process.exit(1);
  }
  const projectRoot = process.cwd();
  const hostPkg = findTamerHostPackage(projectRoot);
  if (!hostPkg) {
    console.error("\u274C tamer-host not found. Install it: npm install tamer-host");
    process.exit(1);
  }
  const androidDir = config.paths?.androidDir ?? "android";
  const rootDir = path22.join(projectRoot, androidDir);
  const packagePath = packageName.replace(/\./g, "/");
  const javaDir = path22.join(rootDir, "app", "src", "main", "java", packagePath);
  const kotlinDir = path22.join(rootDir, "app", "src", "main", "kotlin", packagePath);
  if (!fs22.existsSync(javaDir) || !fs22.existsSync(kotlinDir)) {
    console.error("\u274C Android project not found. Run `t4l android create` first or ensure android/ exists.");
    process.exit(1);
  }
  const templateDir = path22.join(hostPkg, "android", "templates");
  const vars = { PACKAGE_NAME: packageName, APP_NAME: appName };
  const files = [
    { src: "App.java", dst: path22.join(javaDir, "App.java") },
    { src: "TemplateProvider.java", dst: path22.join(javaDir, "TemplateProvider.java") },
    { src: "MainActivity.kt", dst: path22.join(kotlinDir, "MainActivity.kt") }
  ];
  for (const { src, dst } of files) {
    const srcPath = path22.join(templateDir, src);
    if (!fs22.existsSync(srcPath)) continue;
    if (fs22.existsSync(dst) && !opts?.force) {
      console.log(`\u23ED\uFE0F  Skipping ${path22.basename(dst)} (use --force to overwrite)`);
      continue;
    }
    const content = readAndSubstitute(srcPath, vars);
    fs22.mkdirSync(path22.dirname(dst), { recursive: true });
    fs22.writeFileSync(dst, content);
    console.log(`\u2705 Injected ${path22.basename(dst)}`);
  }
}
async function injectHostIos(opts) {
  const config = loadHostConfig();
  const appName = config.ios?.appName;
  const bundleId = config.ios?.bundleId ?? "com.example.app";
  if (!appName) {
    console.error("\u274C ios.appName required in tamer.config.json");
    process.exit(1);
  }
  const projectRoot = process.cwd();
  const hostPkg = findTamerHostPackage(projectRoot);
  if (!hostPkg) {
    console.error("\u274C tamer-host not found. Install it: npm install tamer-host");
    process.exit(1);
  }
  const iosDir = config.paths?.iosDir ?? "ios";
  const rootDir = path22.join(projectRoot, iosDir);
  const projectDir = path22.join(rootDir, appName);
  if (!fs22.existsSync(projectDir)) {
    console.error("\u274C iOS project not found. Run `t4l ios create` first or ensure ios/ exists.");
    process.exit(1);
  }
  const templateDir = path22.join(hostPkg, "ios", "templates");
  const vars = { PACKAGE_NAME: bundleId, APP_NAME: appName, BUNDLE_ID: bundleId };
  const files = [
    "AppDelegate.swift",
    "SceneDelegate.swift",
    "ViewController.swift",
    "LynxProvider.swift",
    "LynxInitProcessor.swift"
  ];
  for (const f of files) {
    const srcPath = path22.join(templateDir, f);
    const dstPath = path22.join(projectDir, f);
    if (!fs22.existsSync(srcPath)) continue;
    if (fs22.existsSync(dstPath) && !opts?.force) {
      console.log(`\u23ED\uFE0F  Skipping ${f} (use --force to overwrite)`);
      continue;
    }
    const content = readAndSubstitute(srcPath, vars);
    fs22.writeFileSync(dstPath, content);
    console.log(`\u2705 Injected ${f}`);
  }
}

// src/common/buildEmbeddable.ts
import fs23 from "fs";
import path23 from "path";
import { execSync as execSync9 } from "child_process";
var EMBEDDABLE_DIR = "embeddable";
var LIB_PACKAGE = "com.tamer.embeddable";
var GRADLE_VERSION = "8.14.2";
var LIBS_VERSIONS_TOML = `[versions]
agp = "8.9.1"
lynx = "3.3.1"
kotlin = "2.0.21"
primjs = "2.12.0"

[libraries]
lynx = { module = "org.lynxsdk.lynx:lynx", version.ref = "lynx" }
lynx-jssdk = { module = "org.lynxsdk.lynx:lynx-jssdk", version.ref = "lynx" }
lynx-processor = { module = "org.lynxsdk.lynx:lynx-processor", version.ref = "lynx" }
lynx-trace = { module = "org.lynxsdk.lynx:lynx-trace", version.ref = "lynx" }
lynx-service-http = { module = "org.lynxsdk.lynx:lynx-service-http", version.ref = "lynx" }
lynx-service-image = { module = "org.lynxsdk.lynx:lynx-service-image", version.ref = "lynx" }
lynx-service-log = { module = "org.lynxsdk.lynx:lynx-service-log", version.ref = "lynx" }
primjs = { module = "org.lynxsdk.lynx:primjs", version.ref = "primjs" }
fresco = { module = "com.facebook.fresco:fresco", version = "2.3.0" }
animated-gif = { module = "com.facebook.fresco:animated-gif", version = "2.3.0" }
animated-webp = { module = "com.facebook.fresco:animated-webp", version = "2.3.0" }
webpsupport = { module = "com.facebook.fresco:webpsupport", version = "2.3.0" }
animated-base = { module = "com.facebook.fresco:animated-base", version = "2.3.0" }
okhttp = { module = "com.squareup.okhttp3:okhttp", version = "4.9.0" }

[plugins]
android-library = { id = "com.android.library", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-kapt = { id = "org.jetbrains.kotlin.kapt", version.ref = "kotlin" }
`;
var LYNX_EMBEDDABLE_KT = `package ${LIB_PACKAGE}

import android.content.Context
import android.view.ViewGroup
import com.lynx.tasm.LynxView
import com.lynx.tasm.LynxViewBuilder
import com.lynx.tasm.provider.AbsTemplateProvider

object LynxEmbeddable {
    fun init(context: Context) {
        ${LIB_PACKAGE}.generated.GeneratedLynxExtensions.register(context)
    }

    fun buildLynxView(parent: ViewGroup, bundleUrl: String = "main.lynx.bundle"): LynxView {
        val ctx = parent.context
        val provider = object : AbsTemplateProvider() {
            override fun loadTemplate(url: String, callback: Callback) {
                Thread {
                    try {
                        ctx.assets.open(url).use { input ->
                            callback.onSuccess(input.readBytes())
                        }
                    } catch (e: Exception) {
                        callback.onFailed(e.message ?: "Load failed")
                    }
                }.start()
            }
        }
        val lv = LynxViewBuilder()
            .setTemplateProvider(provider)
            .build(ctx)
        lv.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        parent.addView(lv)
        lv.renderTemplateUrl(bundleUrl, "")
        ${LIB_PACKAGE}.generated.GeneratedLynxExtensions.onHostViewChanged(lv)
        return lv
    }
}
`;
function generateAndroidLibrary(outDir, androidDir, projectRoot, lynxBundlePath, lynxBundleFile, modules, abiFilters) {
  const libDir = path23.join(androidDir, "lib");
  const libSrcMain = path23.join(libDir, "src", "main");
  const assetsDir = path23.join(libSrcMain, "assets");
  const kotlinDir = path23.join(libSrcMain, "kotlin", LIB_PACKAGE.replace(/\./g, "/"));
  const generatedDir = path23.join(kotlinDir, "generated");
  fs23.mkdirSync(path23.join(androidDir, "gradle"), { recursive: true });
  fs23.mkdirSync(generatedDir, { recursive: true });
  fs23.mkdirSync(assetsDir, { recursive: true });
  const androidModules = modules.filter((m) => m.config.android);
  const abiList = abiFilters.map((a) => `"${a}"`).join(", ");
  const settingsContent = `pluginManagement {
    repositories {
        google { content { includeGroupByRegex("com\\\\.android.*"); includeGroupByRegex("com\\\\.google.*"); includeGroupByRegex("androidx.*") } }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}

rootProject.name = "TamerEmbeddable"
include(":lib")
${androidModules.map((p) => {
    const gradleName = p.name.replace(/^@/, "").replace(/\//g, "_");
    const sourceDir = p.config.android?.sourceDir || "android";
    const absPath = path23.join(p.packagePath, sourceDir).replace(/\\/g, "/");
    return `include(":${gradleName}")
project(":${gradleName}").projectDir = file("${absPath}")`;
  }).join("\n")}
`;
  const libDeps = androidModules.map((p) => {
    const gradleName = p.name.replace(/^@/, "").replace(/\//g, "_");
    return `    implementation(project(":${gradleName}"))`;
  }).join("\n");
  const libBuildContent = `plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    id("org.jetbrains.kotlin.kapt")
}

android {
    namespace = "${LIB_PACKAGE}"
    compileSdk = 35
    defaultConfig {
        minSdk = 28
        ndk { abiFilters += listOf(${abiList}) }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(libs.lynx)
    implementation(libs.lynx.jssdk)
    implementation(libs.lynx.trace)
    implementation(libs.primjs)
    implementation(libs.lynx.service.image)
    implementation(libs.lynx.service.http)
    implementation(libs.lynx.service.log)
    implementation(libs.fresco)
    implementation(libs.animated.gif)
    implementation(libs.animated.webp)
    implementation(libs.webpsupport)
    implementation(libs.animated.base)
    implementation(libs.okhttp)
    kapt(libs.lynx.processor)
${libDeps}
}
`;
  fs23.writeFileSync(path23.join(androidDir, "gradle", "libs.versions.toml"), LIBS_VERSIONS_TOML);
  fs23.writeFileSync(path23.join(androidDir, "settings.gradle.kts"), settingsContent);
  fs23.writeFileSync(
    path23.join(androidDir, "build.gradle.kts"),
    `plugins {
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.kapt) apply false
}
`
  );
  fs23.writeFileSync(
    path23.join(androidDir, "gradle.properties"),
    `org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
kotlin.code.style=official
`
  );
  fs23.writeFileSync(path23.join(libDir, "build.gradle.kts"), libBuildContent);
  fs23.writeFileSync(
    path23.join(libSrcMain, "AndroidManifest.xml"),
    '<?xml version="1.0" encoding="utf-8"?>\n<manifest />'
  );
  fs23.copyFileSync(lynxBundlePath, path23.join(assetsDir, lynxBundleFile));
  fs23.writeFileSync(path23.join(kotlinDir, "LynxEmbeddable.kt"), LYNX_EMBEDDABLE_KT);
  fs23.writeFileSync(
    path23.join(generatedDir, "GeneratedLynxExtensions.kt"),
    generateLynxExtensionsKotlin(modules, LIB_PACKAGE)
  );
  fs23.writeFileSync(
    path23.join(generatedDir, "GeneratedActivityLifecycle.kt"),
    generateActivityLifecycleKotlin(modules, LIB_PACKAGE)
  );
}
async function buildEmbeddable(opts = {}) {
  const resolved = resolveHostPaths();
  const { lynxProjectDir, lynxBundlePath, lynxBundleFile, projectRoot, config } = resolved;
  console.log("\u{1F4E6} Building Lynx project (release)...");
  execSync9("npm run build", { stdio: "inherit", cwd: lynxProjectDir });
  if (!fs23.existsSync(lynxBundlePath)) {
    console.error(`\u274C Bundle not found at ${lynxBundlePath}`);
    process.exit(1);
  }
  const outDir = path23.join(projectRoot, EMBEDDABLE_DIR);
  fs23.mkdirSync(outDir, { recursive: true });
  const distDir = path23.dirname(lynxBundlePath);
  copyDistAssets(distDir, outDir, lynxBundleFile);
  const modules = discoverModules(projectRoot);
  const androidModules = modules.filter((m) => m.config.android);
  const abiFilters = resolveAbiFilters(config);
  const androidDir = path23.join(outDir, "android");
  if (fs23.existsSync(androidDir)) fs23.rmSync(androidDir, { recursive: true });
  fs23.mkdirSync(androidDir, { recursive: true });
  generateAndroidLibrary(
    outDir,
    androidDir,
    projectRoot,
    lynxBundlePath,
    lynxBundleFile,
    modules,
    abiFilters
  );
  const gradlewPath = path23.join(androidDir, "gradlew");
  const devAppDir = findDevAppPackage(projectRoot);
  const existingGradleDirs = [
    path23.join(projectRoot, "android"),
    devAppDir ? path23.join(devAppDir, "android") : null
  ].filter(Boolean);
  let hasWrapper = false;
  for (const d of existingGradleDirs) {
    if (fs23.existsSync(path23.join(d, "gradlew"))) {
      for (const name of ["gradlew", "gradlew.bat", "gradle"]) {
        const src = path23.join(d, name);
        if (fs23.existsSync(src)) {
          const dest = path23.join(androidDir, name);
          if (fs23.statSync(src).isDirectory()) {
            fs23.cpSync(src, dest, { recursive: true });
          } else {
            fs23.copyFileSync(src, dest);
          }
        }
      }
      hasWrapper = true;
      break;
    }
  }
  if (!hasWrapper) {
    console.log("\u{1F4E6} Setting up Gradle wrapper...");
    await setupGradleWrapper(androidDir, GRADLE_VERSION);
  }
  try {
    console.log("\u{1F4E6} Building Android AAR...");
    execSync9("./gradlew :lib:assembleRelease", { cwd: androidDir, stdio: "inherit" });
  } catch (e) {
    console.error("\u274C Android AAR build failed. Run manually: cd embeddable/android && ./gradlew :lib:assembleRelease");
    throw e;
  }
  const aarSrc = path23.join(androidDir, "lib", "build", "outputs", "aar", "lib-release.aar");
  const aarDest = path23.join(outDir, "tamer-embeddable.aar");
  if (fs23.existsSync(aarSrc)) {
    fs23.copyFileSync(aarSrc, aarDest);
    console.log(`   - tamer-embeddable.aar`);
  }
  const snippetAndroid = `// Add to your app's build.gradle:
// implementation(files("embeddable/tamer-embeddable.aar"))
// Or: implementation(project(":embeddable-android")) if you add the embeddable/android project
//
// In your Activity onCreate:
// LynxEmbeddable.init(applicationContext)
// val lynxView = LynxEmbeddable.buildLynxView(containerViewGroup)
`;
  fs23.writeFileSync(path23.join(outDir, "snippet-android.kt"), snippetAndroid);
  generateIosPod(outDir, projectRoot, lynxBundlePath, lynxBundleFile, modules);
  const readme = `# Embeddable Lynx Bundle

Production-ready Lynx bundle and native artifacts to add LynxView to your existing app.

## Contents

- \`main.lynx.bundle\` \u2014 Built Lynx bundle
- \`tamer-embeddable.aar\` \u2014 Android library (Lynx + native modules + bundle)
- \`android/\` \u2014 Gradle project source (for reference or local dependency)
- \`ios/\` \u2014 CocoaPod (podspec + Swift init + bundle)
- \`snippet-android.kt\` \u2014 Android integration snippet
- \`Podfile.snippet\` \u2014 iOS Podfile entries

## Android

\`\`\`
implementation(files("embeddable/tamer-embeddable.aar"))
\`\`\`

Call \`LynxEmbeddable.init(applicationContext)\` before creating views. Use \`LynxEmbeddable.buildLynxView(parent)\` to embed.

## iOS

Add the \`Podfile.snippet\` entries to your Podfile (inside your app target), then run \`pod install\`. Call \`LynxEmbeddable.initEnvironment()\` in your AppDelegate or SceneDelegate before presenting any LynxView. The bundle (\`main.lynx.bundle\`) is included in the pod resources.

## Docs

- [Embedding LynxView](https://lynxjs.org/guide/embed-lynx-to-native)
`;
  fs23.writeFileSync(path23.join(outDir, "README.md"), readme);
  console.log(`
\u2705 Embeddable output at ${outDir}/`);
  console.log("   - main.lynx.bundle");
  console.log("   - tamer-embeddable.aar");
  console.log("   - android/");
  console.log("   - ios/");
  console.log("   - snippet-android.kt");
  console.log("   - Podfile.snippet");
  console.log("   - README.md");
}
function generateIosPod(outDir, projectRoot, lynxBundlePath, lynxBundleFile, modules) {
  const iosDir = path23.join(outDir, "ios");
  const podDir = path23.join(iosDir, "TamerEmbeddable");
  const resourcesDir = path23.join(podDir, "Resources");
  fs23.mkdirSync(resourcesDir, { recursive: true });
  fs23.copyFileSync(lynxBundlePath, path23.join(resourcesDir, lynxBundleFile));
  const iosModules = modules.filter((m) => m.config.ios);
  const podDeps = iosModules.map((p) => {
    const podspecPath = p.config.ios?.podspecPath || ".";
    const podspecDir = path23.join(p.packagePath, podspecPath);
    if (!fs23.existsSync(podspecDir)) return null;
    const files = fs23.readdirSync(podspecDir);
    const podspecFile = files.find((f) => f.endsWith(".podspec"));
    const podName = podspecFile ? podspecFile.replace(".podspec", "") : p.name.split("/").pop().replace(/-/g, "");
    const absPath = path23.resolve(podspecDir);
    return { podName, absPath };
  }).filter(Boolean);
  const podDepLines = podDeps.map((d) => `  s.dependency '${d.podName}'`).join("\n");
  const podspecContent = `Pod::Spec.new do |s|
  s.name = 'TamerEmbeddable'
  s.version = '1.0.0'
  s.summary = 'Embeddable Lynx bundle with native modules'
  s.homepage = 'https://github.com/tamer4lynx/tamer4lynx'
  s.license = 'Apache-2.0'
  s.author = 'Tamer4Lynx'
  s.source = { :path => '.' }
  s.ios.deployment_target = '13.0'
  s.swift_version = '5.0'
  s.source_files = 'TamerEmbeddable/**/*.swift'
  s.resources = 'TamerEmbeddable/Resources/**/*'
  s.dependency 'Lynx', '3.6.0', :subspecs => ['Framework']
  s.dependency 'PrimJS', '3.6.1', :subspecs => ['quickjs', 'napi']
  s.dependency 'LynxService', '3.6.0', :subspecs => ['Image', 'Log', 'Http']
  s.dependency 'SDWebImage', '5.15.5'
  s.dependency 'SDWebImageWebPCoder', '0.11.0'
${podDepLines}
end
`;
  const swiftRegistrations = iosModules.flatMap((pkg) => {
    const blocks = [];
    const iosConfig = pkg.config.ios;
    if (!iosConfig) return blocks;
    const moduleClasses = iosConfig.moduleClassNames ?? (iosConfig.moduleClassName ? [iosConfig.moduleClassName] : []);
    for (const cls of moduleClasses) {
      blocks.push(`        globalConfig.register(${cls}.self)`);
    }
    const elements = iosConfig.elements ?? {};
    for (const [tag, cls] of Object.entries(elements)) {
      blocks.push(`        globalConfig.registerUI(${cls}.self, withName: "${tag}")`);
    }
    return blocks;
  });
  const swiftImports = iosModules.map((p) => {
    const podspecPath = p.config.ios?.podspecPath || ".";
    const podspecDir = path23.join(p.packagePath, podspecPath);
    if (!fs23.existsSync(podspecDir)) return null;
    const files = fs23.readdirSync(podspecDir);
    const podspecFile = files.find((f) => f.endsWith(".podspec"));
    return podspecFile ? podspecFile.replace(".podspec", "") : null;
  }).filter(Boolean);
  const importBlock = swiftImports.length > 0 ? swiftImports.map((i) => `import ${i}`).join("\n") + "\n" : "";
  const regBlock = swiftRegistrations.length > 0 ? swiftRegistrations.map((r) => `        ${r}`).join("\n") + "\n" : "        // no native modules\n";
  const lynxEmbeddableSwift = `import Foundation
import Lynx

${importBlock}
public enum LynxEmbeddable {
    public static func initEnvironment() {
        let env = LynxEnv.sharedInstance()
        let globalConfig = LynxConfig(provider: env.config.templateProvider)
${regBlock}
        env.prepareConfig(globalConfig)
    }
}
`;
  fs23.writeFileSync(path23.join(iosDir, "TamerEmbeddable.podspec"), podspecContent);
  fs23.writeFileSync(path23.join(podDir, "LynxEmbeddable.swift"), lynxEmbeddableSwift);
  const absIosDir = path23.resolve(iosDir);
  const podfileSnippet = `# Paste into your app target in Podfile:

pod 'TamerEmbeddable', :path => '${absIosDir}'
${podDeps.map((d) => `pod '${d.podName}', :path => '${d.absPath}'`).join("\n")}
`;
  fs23.writeFileSync(path23.join(iosDir, "Podfile.snippet"), podfileSnippet);
  fs23.writeFileSync(
    path23.join(outDir, "snippet-ios.swift"),
    `// Add LynxEmbeddable.initEnvironment() in your AppDelegate/SceneDelegate before presenting LynxView.
// Then create LynxView with your bundle URL (main.lynx.bundle is in the pod resources).
`
  );
}

// src/common/add.ts
import fs24 from "fs";
import path24 from "path";
import { execSync as execSync10 } from "child_process";
var CORE_PACKAGES = [
  "@tamer4lynx/tamer-app-shell",
  "@tamer4lynx/tamer-screen",
  "@tamer4lynx/tamer-router",
  "@tamer4lynx/tamer-insets",
  "@tamer4lynx/tamer-transports",
  "@tamer4lynx/tamer-text-input",
  "@tamer4lynx/tamer-system-ui",
  "@tamer4lynx/tamer-icons"
];
function detectPackageManager(cwd) {
  const dir = path24.resolve(cwd);
  if (fs24.existsSync(path24.join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs24.existsSync(path24.join(dir, "bun.lockb"))) return "bun";
  return "npm";
}
function runInstall(cwd, packages, pm) {
  const args = pm === "npm" ? ["install", ...packages] : ["add", ...packages];
  const cmd = pm === "npm" ? "npm" : pm === "pnpm" ? "pnpm" : "bun";
  execSync10(`${cmd} ${args.join(" ")}`, { stdio: "inherit", cwd });
}
function addCore() {
  const { lynxProjectDir } = resolveHostPaths();
  const pm = detectPackageManager(lynxProjectDir);
  console.log(`Adding core packages to ${lynxProjectDir} (using ${pm})...`);
  runInstall(lynxProjectDir, CORE_PACKAGES, pm);
  console.log("\u2705 Core packages installed. Run `t4l link` to link native modules.");
}
function add(packages = []) {
  const list = Array.isArray(packages) ? packages : [];
  if (list.length === 0) {
    console.log("Usage: t4l add <package> [package...]");
    console.log("Example: t4l add @tamer4lynx/tamer-auth");
    console.log("");
    console.log("Future: t4l add will track installed versions for compatibility (Expo-style).");
    return;
  }
  const { lynxProjectDir } = resolveHostPaths();
  const pm = detectPackageManager(lynxProjectDir);
  const normalized = list.map(
    (p) => p.startsWith("@") ? p : `@tamer4lynx/${p}`
  );
  console.log(`Adding ${normalized.join(", ")} to ${lynxProjectDir} (using ${pm})...`);
  runInstall(lynxProjectDir, normalized, pm);
  console.log("\u2705 Packages installed. Run `t4l link` to link native modules.");
}

// index.ts
function validateDebugRelease(debug, release) {
  if (debug && release) {
    console.error("Cannot use --debug and --release together.");
    process.exit(1);
  }
}
program.version(version).description("Tamer4Lynx CLI - A tool for managing Lynx projects");
program.command("init").description("Initialize tamer.config.json interactively").action(() => {
  init_default();
});
var android = program.command("android").description("Android project commands");
android.command("create").option("-t, --target <target>", "Create target: host (default) or dev-app", "host").description("Create a new Android project").action(async (opts) => {
  await create_default({ target: opts.target });
});
android.command("link").description("Link native modules to the Android project").action(() => {
  autolink_default();
});
android.command("bundle").option("-t, --target <target>", "Bundle target: host (default) or dev-app", "host").option("-d, --debug", "Build debug (development) bundle").option("-r, --release", "Build release (production) bundle").description("Build Lynx bundle and copy to Android assets (runs autolink first)").action(async (opts) => {
  validateDebugRelease(opts.debug, opts.release);
  const release = opts.release === true;
  await bundle_default({ target: opts.target, release });
});
var androidBuildCmd = android.command("build").option("-i, --install", "Install APK to connected device and launch app after building").option("-t, --target <target>", "Build target: host (default) or dev-app", "host").option("-e, --embeddable", "Build for embedding in existing app (host only). Use with --release for production-ready embeddable.").option("-d, --debug", "Build debug (development) APK").option("-r, --release", "Build release (production) APK").description("Build APK (autolink + bundle + gradle)").action(async () => {
  const opts = androidBuildCmd.opts();
  validateDebugRelease(opts.debug, opts.release);
  const release = opts.release === true;
  if (opts.embeddable) {
    await buildEmbeddable({ release: true });
    return;
  }
  await build_default({ install: opts.install, target: opts.target, release });
});
android.command("sync").description("Sync dev client files (TemplateProvider, MainActivity, DevClientManager) from tamer.config.json").action(async () => {
  await syncDevClient_default();
});
android.command("inject").option("-f, --force", "Overwrite existing files").description("Inject tamer-host templates into an existing Android project").action(async (opts) => {
  await injectHostAndroid({ force: opts.force });
});
var ios = program.command("ios").description("iOS project commands");
ios.command("create").description("Create a new iOS project").action(() => {
  create_default2();
});
ios.command("inject").option("-f, --force", "Overwrite existing files").description("Inject tamer-host templates into an existing iOS project").action(async (opts) => {
  await injectHostIos({ force: opts.force });
});
ios.command("link").description("Link native modules to the iOS project").action(() => {
  autolink_default2();
});
ios.command("bundle").option("-t, --target <target>", "Bundle target: host (default) or dev-app", "host").option("-d, --debug", "Build debug (development) bundle").option("-r, --release", "Build release (production) bundle").description("Build Lynx bundle and copy to iOS project (runs autolink first)").action((opts) => {
  validateDebugRelease(opts.debug, opts.release);
  const release = opts.release === true;
  bundle_default2({ target: opts.target, release });
});
var iosBuildCmd = ios.command("build").option("-t, --target <target>", "Build target: host (default) or dev-app", "host").option("-e, --embeddable", "Output bundle + code snippets to embeddable/ for adding LynxView to an existing app. Use with --release.").option("-i, --install", "Install and launch on booted simulator after building").option("-d, --debug", "Build debug (development) configuration").option("-r, --release", "Build release (production) configuration").description("Build iOS app (autolink + bundle + xcodebuild)").action(async () => {
  const opts = iosBuildCmd.opts();
  validateDebugRelease(opts.debug, opts.release);
  const release = opts.release === true;
  if (opts.embeddable) {
    await buildEmbeddable({ release: true });
    return;
  }
  await build_default2({ target: opts.target, install: opts.install, release });
});
var linkCmd = program.command("link").option("-i, --ios", "Link iOS native modules").option("-a, --android", "Link Android native modules").option("-b, --both", "Link both iOS and Android native modules").option("-s, --silent", "Run in silent mode without outputting messages").description("Link native modules to the project").action(() => {
  const opts = linkCmd.opts();
  if (opts.silent) {
    console.log = () => {
    };
    console.error = () => {
    };
    console.warn = () => {
    };
  }
  if (opts.ios) {
    autolink_default2();
    return;
  }
  if (opts.android) {
    autolink_default();
    return;
  }
  autolink_default2();
  autolink_default();
});
program.command("start").option("-v, --verbose", "Show all logs (native + JS); default shows JS only").description("Start dev server with HMR and WebSocket support (Expo-like)").action(async (opts) => {
  await start_default({ verbose: opts.verbose });
});
var buildCmd = program.command("build").option("-p, --platform <platform>", "android, ios, or all (default: all)", "all").option("-t, --target <target>", "host or dev-app (default: dev-app)", "dev-app").option("-e, --embeddable", "Output bundle + code snippets to embeddable/ for adding LynxView to an existing app. Use with --release.").option("-d, --debug", "Debug build (default)").option("-r, --release", "Release build").option("-i, --install", "Install after building").description("Build app (unified: delegates to android/ios build)").action(async () => {
  const opts = buildCmd.opts();
  validateDebugRelease(opts.debug, opts.release);
  const release = opts.release === true;
  if (opts.embeddable) {
    await buildEmbeddable({ release: true });
    return;
  }
  const p = opts.platform?.toLowerCase();
  const platform = p === "ios" || p === "android" ? p : "all";
  const target = opts.target ?? "dev-app";
  if (platform === "android" || platform === "all") {
    await build_default({ install: opts.install, target, release });
  }
  if (platform === "ios" || platform === "all") {
    await build_default2({ target, install: opts.install, release });
  }
});
program.command("build-dev-app").option("-p, --platform <platform>", "Platform: android, ios, or all (default)", "all").option("-i, --install", "Install APK to connected device and launch app after building").description("(Deprecated) Use: t4l build --platform <platform> --install").action(async (opts) => {
  console.warn("\u26A0\uFE0F  build-dev-app is deprecated. Use: t4l build --platform <platform> [--install]");
  const p = opts.platform?.toLowerCase();
  const platform = p === "ios" || p === "android" ? p : "all";
  if (platform === "android" || platform === "all") {
    await build_default({ install: opts.install, target: "dev-app", release: false });
  }
  if (platform === "ios" || platform === "all") {
    await build_default2({ target: "dev-app", install: opts.install, release: false });
  }
});
program.command("add [packages...]").description("Add @tamer4lynx packages to the Lynx project. Future: will track versions for compatibility (Expo-style).").action((packages) => add(packages));
program.command("add-core").description("Add core packages (app-shell, screen, router, insets, transports, text-input, system-ui, icons)").action(() => addCore());
program.command("create").description("Create a new Lynx extension project (RFC-compliant)").action(() => create_default3());
program.command("codegen").description("Generate code from @lynxmodule declarations").action(() => {
  codegen_default();
});
program.command("autolink-toggle").alias("autolink").description("Toggle autolink on/off in tamer.config.json (controls postinstall linking)").action(async () => {
  const configPath = path25.join(process.cwd(), "tamer.config.json");
  let config = {};
  if (fs25.existsSync(configPath)) {
    config = JSON.parse(fs25.readFileSync(configPath, "utf8"));
  }
  if (config.autolink) {
    delete config.autolink;
    console.log("Autolink disabled in tamer.config.json");
  } else {
    config.autolink = true;
    console.log("Autolink enabled in tamer.config.json");
  }
  fs25.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Updated ${configPath}`);
});
if (process.argv.length <= 2 || process.argv.length === 3 && process.argv[2] === "init") {
  Promise.resolve(init_default()).then(() => process.exit(0));
} else {
  program.parseAsync().then(() => process.exit(0)).catch(() => process.exit(1));
}
