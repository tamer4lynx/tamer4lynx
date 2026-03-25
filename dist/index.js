#!/usr/bin/env node

// src/suppress-punycode-warning.ts
process.on("warning", (w) => {
  if (w.name === "DeprecationWarning" && /punycode/i.test(w.message)) return;
  console.warn(w.toString());
});

// index.ts
import fs38 from "fs";
import path38 from "path";
import { program } from "commander";

// src/common/cliVersion.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
function getCliVersion() {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 12; i++) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.name === "@tamer4lynx/cli" && typeof pkg.version === "string") {
          return pkg.version;
        }
      } catch {
      }
    }
    const next = path.dirname(dir);
    if (next === dir) break;
    dir = next;
  }
  return "0.0.0";
}

// src/common/loadProjectEnv.ts
import fs2 from "fs";
import path2 from "path";
import { parse } from "dotenv";
var TAMER_CONFIG = "tamer.config.json";
function findTamerProjectRoot(start2) {
  let dir = path2.resolve(start2);
  const root = path2.parse(dir).root;
  while (dir !== root) {
    const p = path2.join(dir, TAMER_CONFIG);
    if (fs2.existsSync(p)) return dir;
    dir = path2.dirname(dir);
  }
  return start2;
}
function loadProjectEnv(cwd = process.cwd()) {
  const root = findTamerProjectRoot(cwd);
  const merged = {};
  for (const name of [".env", ".env.local"]) {
    const full = path2.join(root, name);
    if (!fs2.existsSync(full)) continue;
    try {
      Object.assign(merged, parse(fs2.readFileSync(full)));
    } catch {
    }
  }
  for (const [k, v] of Object.entries(merged)) {
    if (process.env[k] === void 0) {
      process.env[k] = v;
    }
  }
}

// src/android/create.ts
import fs6 from "fs";
import path6 from "path";
import os2 from "os";

// src/android/getGradle.ts
import fs3 from "fs";
import path3 from "path";
import os from "os";
import { execSync } from "child_process";
import fetch2 from "node-fetch";
import AdmZip from "adm-zip";
async function downloadGradle(gradleVersion) {
  const gradleBaseUrl = `https://services.gradle.org/distributions/gradle-${gradleVersion}-bin.zip`;
  const downloadDir = path3.join(process.cwd(), "gradle");
  const zipPath = path3.join(downloadDir, `gradle-${gradleVersion}.zip`);
  const extractedPath = path3.join(downloadDir, `gradle-${gradleVersion}`);
  if (fs3.existsSync(extractedPath)) {
    console.log(`\u2705 Gradle ${gradleVersion} already exists at ${extractedPath}. Skipping download.`);
    return;
  }
  if (!fs3.existsSync(downloadDir)) {
    fs3.mkdirSync(downloadDir, { recursive: true });
  }
  console.log(`\u{1F4E5} Downloading Gradle ${gradleVersion} from ${gradleBaseUrl}...`);
  const response = await fetch2(gradleBaseUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }
  const fileStream = fs3.createWriteStream(zipPath);
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
  fs3.unlinkSync(zipPath);
  console.log(`\u2705 Gradle ${gradleVersion} extracted to ${extractedPath}`);
}
async function setupGradleWrapper(rootDir, gradleVersion) {
  try {
    console.log("\u{1F4E6} Setting up Gradle wrapper...");
    await downloadGradle(gradleVersion);
    const gradleBinDir = path3.join(
      process.cwd(),
      "gradle",
      `gradle-${gradleVersion}`,
      "bin"
    );
    const gradleExecutable = os.platform() === "win32" ? "gradle.bat" : "gradle";
    const gradleExecutablePath = path3.join(gradleBinDir, gradleExecutable);
    if (!fs3.existsSync(gradleExecutablePath)) {
      throw new Error(`Gradle executable not found at ${gradleExecutablePath}`);
    }
    if (os.platform() !== "win32") {
      fs3.chmodSync(gradleExecutablePath, "755");
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
import fs4 from "fs";
import path4 from "path";
var DEFAULT_ABI_FILTERS = ["armeabi-v7a", "arm64-v8a"];
var TAMER_CONFIG2 = "tamer.config.json";
var LYNX_CONFIG_FILES = ["lynx.config.ts", "lynx.config.js", "lynx.config.mjs"];
var DEFAULT_ANDROID_DIR = "android";
var DEFAULT_IOS_DIR = "ios";
var DEFAULT_BUNDLE_FILE = "main.lynx.bundle";
var DEFAULT_BUNDLE_ROOT = "dist";
function findProjectRoot(start2) {
  let dir = path4.resolve(start2);
  const root = path4.parse(dir).root;
  while (dir !== root) {
    const p = path4.join(dir, TAMER_CONFIG2);
    if (fs4.existsSync(p)) return dir;
    dir = path4.dirname(dir);
  }
  return start2;
}
function loadTamerConfig(cwd) {
  const p = path4.join(cwd, TAMER_CONFIG2);
  if (!fs4.existsSync(p)) return null;
  try {
    return JSON.parse(fs4.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}
function extractDistPathRoot(configPath) {
  try {
    const content = fs4.readFileSync(configPath, "utf8");
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
    const p = path4.join(dir, name);
    if (fs4.existsSync(p)) return p;
  }
  return null;
}
function hasRspeedy(pkgDir) {
  const pkgJsonPath = path4.join(pkgDir, "package.json");
  if (!fs4.existsSync(pkgJsonPath)) return false;
  try {
    const pkg = JSON.parse(fs4.readFileSync(pkgJsonPath, "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return Object.keys(deps).some((k) => k === "@lynx-js/rspeedy");
  } catch {
    return false;
  }
}
function discoverLynxProject(cwd, explicitPath) {
  if (explicitPath) {
    const resolved = path4.isAbsolute(explicitPath) ? explicitPath : path4.join(cwd, explicitPath);
    if (fs4.existsSync(resolved)) {
      const lynxConfig2 = findLynxConfigInDir(resolved);
      const bundleRoot = lynxConfig2 ? extractDistPathRoot(lynxConfig2) ?? DEFAULT_BUNDLE_ROOT : DEFAULT_BUNDLE_ROOT;
      return { dir: resolved, bundleRoot };
    }
  }
  const rootPkgPath = path4.join(cwd, "package.json");
  if (fs4.existsSync(rootPkgPath)) {
    try {
      const rootPkg = JSON.parse(fs4.readFileSync(rootPkgPath, "utf8"));
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
            const parentDir = path4.join(cwd, ws.replace(/\/\*$/, ""));
            if (!fs4.existsSync(parentDir)) return [];
            return fs4.readdirSync(parentDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path4.join(parentDir, e.name));
          })() : [path4.join(cwd, ws)];
          for (const pkgDir of dirsToCheck) {
            if (!fs4.existsSync(pkgDir)) continue;
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
  let dir = path4.resolve(start2);
  const root = path4.parse(dir).root;
  while (dir !== root) {
    const pkgPath = path4.join(dir, "package.json");
    if (fs4.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs4.readFileSync(pkgPath, "utf8"));
        if (pkg.workspaces) return dir;
      } catch {
      }
    }
    dir = path4.dirname(dir);
  }
  return start2;
}
function findDevAppPackage(projectRoot) {
  const candidates = [
    path4.join(projectRoot, "node_modules", "@tamer4lynx", "tamer-dev-app"),
    path4.join(projectRoot, "node_modules", "tamer-dev-app"),
    path4.join(projectRoot, "packages", "tamer-dev-app"),
    path4.join(path4.dirname(projectRoot), "tamer-dev-app")
  ];
  for (const pkg of candidates) {
    if (fs4.existsSync(pkg) && fs4.existsSync(path4.join(pkg, "package.json"))) {
      return pkg;
    }
  }
  return null;
}
function findDevClientPackage(projectRoot) {
  const candidates = [
    path4.join(projectRoot, "node_modules", "@tamer4lynx", "tamer-dev-client"),
    path4.join(projectRoot, "node_modules", "tamer-dev-client"),
    path4.join(projectRoot, "packages", "tamer-dev-client"),
    path4.join(path4.dirname(projectRoot), "tamer-dev-client")
  ];
  for (const pkg of candidates) {
    if (fs4.existsSync(pkg) && fs4.existsSync(path4.join(pkg, "package.json"))) {
      return pkg;
    }
  }
  return null;
}
function findTamerHostPackage(projectRoot) {
  const candidates = [
    path4.join(projectRoot, "node_modules", "tamer-host"),
    path4.join(projectRoot, "packages", "tamer-host")
  ];
  for (const pkg of candidates) {
    if (fs4.existsSync(pkg) && fs4.existsSync(path4.join(pkg, "package.json"))) {
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
  const extra = Array.isArray(paths.lynxAdditionalBundles) ? paths.lynxAdditionalBundles : [];
  const lynxBundleFiles = [];
  const seen = /* @__PURE__ */ new Set();
  for (const f of [bundleFile, ...extra]) {
    const name = typeof f === "string" ? f.trim() : "";
    if (!name || seen.has(name)) continue;
    seen.add(name);
    lynxBundleFiles.push(name);
  }
  if (lynxBundleFiles.length === 0) lynxBundleFiles.push(bundleFile);
  const lynxBundlePath = path4.join(lynxProjectDir, bundleRoot, bundleFile);
  const androidDir = path4.join(projectRoot, androidDirRel);
  const devMode = resolveDevMode(config);
  const devClientPkg = findDevClientPackage(projectRoot);
  const devClientBundlePath = devClientPkg ? path4.join(devClientPkg, DEFAULT_BUNDLE_ROOT, "dev-client.lynx.bundle") : void 0;
  return {
    projectRoot,
    androidDir,
    iosDir: path4.join(projectRoot, iosDirRel),
    androidAppDir: path4.join(projectRoot, androidDirRel, "app"),
    androidAssetsDir: path4.join(projectRoot, androidDirRel, "app", "src", "main", "assets"),
    androidKotlinDir: path4.join(projectRoot, androidDirRel, "app", "src", "main", "kotlin", packageName.replace(/\./g, "/")),
    lynxProjectDir,
    lynxBundlePath,
    lynxBundleFile: bundleFile,
    lynxBundleFiles,
    lynxBundleRootRel: bundleRoot,
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
function formatAdaptiveInsetValue(v, fallback) {
  if (v === void 0) return fallback;
  if (typeof v === "number") {
    if (!Number.isFinite(v) || v < 0 || v > 50) return fallback;
    return `${v}%`;
  }
  const s = String(v).trim();
  if (s.endsWith("%") || s.endsWith("dp")) return s;
  if (/^\d+(\.\d+)?$/.test(s)) return `${s}%`;
  return fallback;
}
function resolveAdaptiveForegroundLayoutFromConfig(ad) {
  const hasLayoutOpt = ad.foregroundScale != null || ad.foregroundPadding != null;
  if (!hasLayoutOpt) return void 0;
  let scale = ad.foregroundScale;
  if (scale != null && typeof scale === "number") {
    if (!Number.isFinite(scale)) scale = void 0;
    else scale = Math.min(1, Math.max(0.05, scale));
  }
  let padding;
  if (ad.foregroundPadding != null) {
    const pad = ad.foregroundPadding;
    if (typeof pad === "number" || typeof pad === "string") {
      const u = formatAdaptiveInsetValue(pad, "0%");
      padding = { left: u, top: u, right: u, bottom: u };
    } else {
      const d = "0%";
      padding = {
        left: formatAdaptiveInsetValue(pad.left, d),
        top: formatAdaptiveInsetValue(pad.top, d),
        right: formatAdaptiveInsetValue(pad.right, d),
        bottom: formatAdaptiveInsetValue(pad.bottom, d)
      };
    }
  }
  return { scale, padding };
}
function normalizeAndroidAdaptiveColor(input) {
  const raw = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(raw)) return null;
  let h = raw;
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (h.length === 6) {
    h = "FF" + h;
  }
  return `#${h.toUpperCase()}`;
}
function resolveIconPaths(projectRoot, config) {
  const raw = config.icon;
  if (!raw) return null;
  const join = (p) => path4.isAbsolute(p) ? p : path4.join(projectRoot, p);
  if (typeof raw === "string") {
    const p = join(raw);
    return fs4.existsSync(p) ? { source: p } : null;
  }
  const out = {};
  if (raw.source) {
    const p = join(raw.source);
    if (fs4.existsSync(p)) out.source = p;
  }
  if (raw.android) {
    const p = join(raw.android);
    if (fs4.existsSync(p)) out.android = p;
  }
  if (raw.ios) {
    const p = join(raw.ios);
    if (fs4.existsSync(p)) out.ios = p;
  }
  const ad = raw.androidAdaptive;
  if (ad?.foreground) {
    const fg = join(ad.foreground);
    if (fs4.existsSync(fg)) {
      let usedAdaptive = false;
      if (ad.background) {
        const bg = join(ad.background);
        if (fs4.existsSync(bg)) {
          out.androidAdaptiveForeground = fg;
          out.androidAdaptiveBackground = bg;
          usedAdaptive = true;
        }
      }
      if (!usedAdaptive && ad.backgroundColor) {
        const norm = normalizeAndroidAdaptiveColor(ad.backgroundColor);
        if (norm) {
          out.androidAdaptiveForeground = fg;
          out.androidAdaptiveBackgroundColor = norm;
        }
      }
      if (out.androidAdaptiveForeground) {
        const lay = resolveAdaptiveForegroundLayoutFromConfig(ad);
        if (lay) out.androidAdaptiveForegroundLayout = lay;
      }
    }
  }
  return Object.keys(out).length ? out : null;
}

// src/common/syncAppIcons.ts
import fs5 from "fs";
import path5 from "path";
function purgeAdaptiveForegroundArtifacts(drawableDir) {
  for (const base of ["ic_launcher_fg_src", "ic_launcher_fg_bm", "ic_launcher_fg_sc"]) {
    for (const ext of [".png", ".webp", ".jpg", ".jpeg", ".xml"]) {
      try {
        fs5.unlinkSync(path5.join(drawableDir, base + ext));
      } catch {
      }
    }
  }
  try {
    fs5.unlinkSync(path5.join(drawableDir, "ic_launcher_foreground.xml"));
  } catch {
  }
}
function parsePadDp(v) {
  if (v.endsWith("dp")) return Math.max(0, Math.min(54, parseFloat(v)));
  if (v.endsWith("%")) return Math.max(0, Math.min(54, parseFloat(v) / 100 * 108));
  return 0;
}
function writeAdaptiveForegroundLayer(drawableDir, fgSourcePath, fgExt, layout) {
  purgeAdaptiveForegroundArtifacts(drawableDir);
  for (const ext of [".png", ".webp", ".jpg", ".jpeg"]) {
    try {
      fs5.unlinkSync(path5.join(drawableDir, `ic_launcher_foreground${ext}`));
    } catch {
    }
  }
  if (!layout) {
    fs5.copyFileSync(fgSourcePath, path5.join(drawableDir, `ic_launcher_foreground${fgExt}`));
    return;
  }
  fs5.copyFileSync(fgSourcePath, path5.join(drawableDir, `ic_launcher_fg_src${fgExt}`));
  const CANVAS_DP = 108;
  const scale = layout.scale ?? 1;
  const shrinkDp = (1 - scale) / 2 * CANVAS_DP;
  const pad = layout.padding;
  const parsedPad = {
    left: pad ? parsePadDp(pad.left) : 0,
    top: pad ? parsePadDp(pad.top) : 0,
    right: pad ? parsePadDp(pad.right) : 0,
    bottom: pad ? parsePadDp(pad.bottom) : 0
  };
  const insetLeft = Math.round(shrinkDp + parsedPad.left);
  const insetTop = Math.round(shrinkDp + parsedPad.top);
  const insetRight = Math.round(shrinkDp + parsedPad.right);
  const insetBottom = Math.round(shrinkDp + parsedPad.bottom);
  const layerXml = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item
        android:left="${insetLeft}dp"
        android:top="${insetTop}dp"
        android:right="${insetRight}dp"
        android:bottom="${insetBottom}dp"
        android:drawable="@drawable/ic_launcher_fg_src" />
</layer-list>`;
  fs5.writeFileSync(path5.join(drawableDir, "ic_launcher_foreground.xml"), layerXml);
}
function ensureAndroidManifestLauncherIcon(manifestPath) {
  if (!fs5.existsSync(manifestPath)) return;
  let content = fs5.readFileSync(manifestPath, "utf8");
  if (content.includes("android:icon=")) return;
  const next = content.replace(/<application(\s[^>]*)>/, (full, attrs) => {
    if (String(attrs).includes("android:icon")) return full;
    return `<application${attrs}
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher">`;
  });
  if (next !== content) {
    fs5.writeFileSync(manifestPath, next, "utf8");
    console.log("\u2705 Added android:icon / roundIcon to AndroidManifest.xml");
  }
}
function applyAndroidLauncherIcons(resDir, iconPaths) {
  if (!iconPaths) return false;
  fs5.mkdirSync(resDir, { recursive: true });
  const fgAd = iconPaths.androidAdaptiveForeground;
  const bgAd = iconPaths.androidAdaptiveBackground;
  const bgColor = iconPaths.androidAdaptiveBackgroundColor;
  if (fgAd && (bgAd || bgColor)) {
    const drawableDir = path5.join(resDir, "drawable");
    fs5.mkdirSync(drawableDir, { recursive: true });
    const fgExt = path5.extname(fgAd) || ".png";
    writeAdaptiveForegroundLayer(drawableDir, fgAd, fgExt, iconPaths.androidAdaptiveForegroundLayout);
    if (bgColor) {
      for (const ext of [".png", ".webp", ".jpg", ".jpeg"]) {
        try {
          fs5.unlinkSync(path5.join(drawableDir, `ic_launcher_background${ext}`));
        } catch {
        }
      }
      try {
        fs5.unlinkSync(path5.join(drawableDir, "ic_launcher_background.xml"));
      } catch {
      }
      const shapeXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="${bgColor}" />
</shape>
`;
      fs5.writeFileSync(path5.join(drawableDir, "ic_launcher_background.xml"), shapeXml);
    } else {
      try {
        fs5.unlinkSync(path5.join(drawableDir, "ic_launcher_background.xml"));
      } catch {
      }
      const bgExt = path5.extname(bgAd) || ".png";
      fs5.copyFileSync(bgAd, path5.join(drawableDir, `ic_launcher_background${bgExt}`));
    }
    const anyDpi = path5.join(resDir, "mipmap-anydpi-v26");
    fs5.mkdirSync(anyDpi, { recursive: true });
    const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;
    fs5.writeFileSync(path5.join(anyDpi, "ic_launcher.xml"), adaptiveXml);
    fs5.writeFileSync(path5.join(anyDpi, "ic_launcher_round.xml"), adaptiveXml);
    const legacySrc = iconPaths.source ?? fgAd;
    const legacyExt = path5.extname(legacySrc) || ".png";
    const mipmapDensities = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
    for (const d of mipmapDensities) {
      const dir = path5.join(resDir, `mipmap-${d}`);
      fs5.mkdirSync(dir, { recursive: true });
      fs5.copyFileSync(legacySrc, path5.join(dir, `ic_launcher${legacyExt}`));
    }
    return true;
  }
  if (iconPaths.android) {
    const src = iconPaths.android;
    const entries = fs5.readdirSync(src, { withFileTypes: true });
    for (const e of entries) {
      const dest = path5.join(resDir, e.name);
      if (e.isDirectory()) {
        fs5.cpSync(path5.join(src, e.name), dest, { recursive: true });
      } else {
        fs5.copyFileSync(path5.join(src, e.name), dest);
      }
    }
    return true;
  }
  if (iconPaths.source) {
    const mipmapDensities = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
    for (const d of mipmapDensities) {
      const dir = path5.join(resDir, `mipmap-${d}`);
      fs5.mkdirSync(dir, { recursive: true });
      fs5.copyFileSync(iconPaths.source, path5.join(dir, "ic_launcher.png"));
    }
    return true;
  }
  return false;
}
function applyIosAppIconAssets(appIconDir, iconPaths) {
  if (!iconPaths) return false;
  fs5.mkdirSync(appIconDir, { recursive: true });
  if (iconPaths.ios) {
    const entries = fs5.readdirSync(iconPaths.ios, { withFileTypes: true });
    for (const e of entries) {
      const dest = path5.join(appIconDir, e.name);
      if (e.isDirectory()) {
        fs5.cpSync(path5.join(iconPaths.ios, e.name), dest, { recursive: true });
      } else {
        fs5.copyFileSync(path5.join(iconPaths.ios, e.name), dest);
      }
    }
    return true;
  }
  if (iconPaths.source) {
    const ext = path5.extname(iconPaths.source) || ".png";
    const icon1024 = `Icon-1024${ext}`;
    fs5.copyFileSync(iconPaths.source, path5.join(appIconDir, icon1024));
    fs5.writeFileSync(
      path5.join(appIconDir, "Contents.json"),
      JSON.stringify(
        {
          images: [{ filename: icon1024, idiom: "universal", platform: "ios", size: "1024x1024" }],
          info: { author: "xcode", version: 1 }
        },
        null,
        2
      )
    );
    return true;
  }
  return false;
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
  out = out.replace(
    /LynxServiceCenter\.inst\(\)\.registerService\(LynxLogService\.INSTANCE\);/,
    `try {
      Object logService = Class.forName("com.nanofuxion.tamerdevclient.TamerRelogLogService")
        .getField("INSTANCE")
        .get(null);
      logService.getClass().getMethod("init", android.content.Context.class).invoke(logService, this);
      LynxServiceCenter.inst().registerService((com.lynx.tasm.service.ILynxLogService) logService);
    } catch (Exception ignored) {
      LynxServiceCenter.inst().registerService(LynxLogService.INSTANCE);
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
    private var shouldReconnect = false
    private val handler = Handler(Looper.getMainLooper())
    private val reconnectDelayMs = 3000L
    private val client = OkHttpClient.Builder()
        .connectTimeout(5, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(0, java.util.concurrent.TimeUnit.SECONDS)
        .build()

    fun connect() {
        shouldReconnect = true
        connectInternal()
    }

    private fun connectInternal() {
        if (webSocket != null) return
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
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                clearSocket()
                scheduleReconnect()
            }
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                clearSocket()
                scheduleReconnect()
            }
        })
    }

    private fun clearSocket() {
        webSocket = null
    }

    private fun scheduleReconnect() {
        if (!shouldReconnect) return
        handler.postDelayed({ connectInternal() }, reconnectDelayMs)
    }

    fun disconnect() {
        shouldReconnect = false
        handler.removeCallbacksAndMessages(null)
        webSocket?.close(1000, null)
        webSocket = null
    }
}
`;
}
function getProjectActivity(vars) {
  const hasDevClient = vars.devMode === "embedded";
  const devClientInit = hasDevClient ? `
        TamerRelogLogService.init(this)
        TamerRelogLogService.connect()
        devClientManager = DevClientManager(this) { reloadProjectView() }
        devClientManager?.connect()
` : "";
  const devClientField = hasDevClient ? `    private var devClientManager: DevClientManager? = null
` : "";
  const devClientCleanup = hasDevClient ? `
        devClientManager?.disconnect()
        TamerRelogLogService.disconnect()
` : "";
  const devClientImports = hasDevClient ? `
import ${vars.packageName}.DevClientManager
import com.nanofuxion.tamerdevclient.DevClientModule
import com.nanofuxion.tamerdevclient.TamerRelogLogService` : "";
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
        nextView.renderTemplateUrl("main.lynx.bundle", DevClientModule.getProjectInitDataJson(this))
        GeneratedActivityLifecycle.onCreateDelayed(handler)
    }
` : "";
  return `package ${vars.packageName}

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
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
        lynxView?.renderTemplateUrl("main.lynx.bundle", ${hasDevClient ? "DevClientModule.getProjectInitDataJson(this)" : '""'})${devClientInit}
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
        GeneratedLynxExtensions.configureViewBuilder(viewBuilder)
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
        GeneratedLynxExtensions.configureViewBuilder(viewBuilder)
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
  const raw = fs6.readFileSync(templatePath, "utf-8");
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
    raw
  );
}
var create = async (opts = {}) => {
  const target = opts.target ?? "host";
  const origCwd = process.cwd();
  if (target === "dev-app") {
    const devAppDir = findDevAppPackage(origCwd) ?? findDevAppPackage(findRepoRoot(origCwd));
    if (!devAppDir || !fs6.existsSync(path6.join(devAppDir, "tamer.config.json"))) {
      console.error("\u274C tamer-dev-app not found. Add @tamer4lynx/tamer-dev-app to dependencies.");
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
  const rootDir = path6.join(process.cwd(), androidDir);
  const appDir = path6.join(rootDir, "app");
  const mainDir = path6.join(appDir, "src", "main");
  const javaDir = path6.join(mainDir, "java", packagePath);
  const kotlinDir = path6.join(mainDir, "kotlin", packagePath);
  const kotlinGeneratedDir = path6.join(kotlinDir, "generated");
  const assetsDir = path6.join(mainDir, "assets");
  const themesDir = path6.join(mainDir, "res", "values");
  const gradleDir = path6.join(rootDir, "gradle");
  function writeFile2(filePath, content, options) {
    fs6.mkdirSync(path6.dirname(filePath), { recursive: true });
    fs6.writeFileSync(
      filePath,
      content.trimStart(),
      options?.encoding ?? "utf8"
    );
  }
  if (fs6.existsSync(rootDir)) {
    console.log(`\u{1F9F9} Removing existing directory: ${rootDir}`);
    fs6.rmSync(rootDir, { recursive: true, force: true });
  }
  console.log(`\u{1F680} Creating a new Tamer4Lynx project in: ${rootDir}`);
  writeFile2(
    path6.join(gradleDir, "libs.versions.toml"),
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
lynx = "3.6.0"
material = "1.10.0"
activity = "1.8.0"
constraintlayout = "2.1.4"
okhttp = "4.9.0"
primjs = "3.6.1"
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
lynx-xelement = { module = "org.lynxsdk.lynx:xelement", version.ref = "lynx" }
lynx-xelement-input = { module = "org.lynxsdk.lynx:xelement-input", version.ref = "lynx" }
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
  writeFile2(
    path6.join(rootDir, "settings.gradle.kts"),
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
  writeFile2(
    path6.join(rootDir, "build.gradle.kts"),
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
  writeFile2(
    path6.join(rootDir, "gradle.properties"),
    `
org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
kotlin.code.style=official
android.enableJetifier=true
`
  );
  writeFile2(
    path6.join(appDir, "build.gradle.kts"),
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
    implementation(libs.lynx.xelement)
    implementation(libs.lynx.xelement.input)
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
  writeFile2(
    path6.join(themesDir, "themes.xml"),
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
        <activity android:name=".ProjectActivity" android:exported="true" android:taskAffinity="" android:launchMode="singleTask" android:documentLaunchMode="always" android:windowSoftInputMode="adjustResize">
        <!-- GENERATED DEEP LINKS START -->
        <!-- GENERATED DEEP LINKS END -->
        </activity>
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
  writeFile2(
    path6.join(mainDir, "AndroidManifest.xml"),
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
  writeFile2(
    path6.join(kotlinGeneratedDir, "GeneratedLynxExtensions.kt"),
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
    const templateDir = path6.join(hostPkg, "android", "templates");
    for (const [src, dst] of [
      ["App.java", path6.join(javaDir, "App.java")],
      ["TemplateProvider.java", path6.join(javaDir, "TemplateProvider.java")],
      ["MainActivity.kt", path6.join(kotlinDir, "MainActivity.kt")]
    ]) {
      const srcPath = path6.join(templateDir, src);
      if (fs6.existsSync(srcPath)) {
        writeFile2(dst, readAndSubstituteTemplate(srcPath, templateVars));
      }
    }
  } else {
    const [applicationSource, templateProviderSource] = await Promise.all([
      fetchAndPatchApplication(vars),
      fetchAndPatchTemplateProvider(vars)
    ]);
    writeFile2(path6.join(javaDir, "App.java"), applicationSource);
    writeFile2(path6.join(javaDir, "TemplateProvider.java"), templateProviderSource);
    writeFile2(path6.join(kotlinDir, "MainActivity.kt"), getStandaloneMainActivity(vars));
    if (hasDevLauncher) {
      if (devClientPkg) {
        const templateDir = path6.join(devClientPkg, "android", "templates");
        for (const [src, dst] of [
          ["ProjectActivity.kt", path6.join(kotlinDir, "ProjectActivity.kt")],
          ["DevClientManager.kt", path6.join(kotlinDir, "DevClientManager.kt")],
          ["DevServerPrefs.kt", path6.join(kotlinDir, "DevServerPrefs.kt")]
        ]) {
          const srcPath = path6.join(templateDir, src);
          if (fs6.existsSync(srcPath)) {
            writeFile2(dst, readAndSubstituteTemplate(srcPath, templateVars));
          }
        }
      } else {
        writeFile2(path6.join(kotlinDir, "ProjectActivity.kt"), getProjectActivity(vars));
        const devClientManagerSource = getDevClientManager(vars);
        if (devClientManagerSource) {
          writeFile2(path6.join(kotlinDir, "DevClientManager.kt"), devClientManagerSource);
          writeFile2(path6.join(kotlinDir, "DevServerPrefs.kt"), getDevServerPrefs(vars));
        }
      }
    }
  }
  if (iconPaths) {
    const resDir = path6.join(mainDir, "res");
    if (applyAndroidLauncherIcons(resDir, iconPaths)) {
      if (iconPaths.androidAdaptiveForeground && (iconPaths.androidAdaptiveBackground || iconPaths.androidAdaptiveBackgroundColor)) {
        console.log("\u2705 Android adaptive launcher from tamer.config.json icon.androidAdaptive");
      } else if (iconPaths.android) {
        console.log("\u2705 Copied Android icon from tamer.config.json icon.android");
      } else if (iconPaths.source) {
        console.log("\u2705 Copied app icon from tamer.config.json icon.source");
      }
    }
  }
  fs6.mkdirSync(assetsDir, { recursive: true });
  fs6.writeFileSync(path6.join(assetsDir, ".gitkeep"), "");
  console.log(`\u2705 Android Kotlin project created at ${rootDir}`);
  async function finalizeProjectSetup() {
    if (androidSdk) {
      try {
        const sdkDirContent = `sdk.dir=${androidSdk.replace(/\\/g, "/")}`;
        writeFile2(path6.join(rootDir, "local.properties"), sdkDirContent);
        console.log("\u{1F4E6} Created local.properties from tamer.config.json.");
      } catch (err) {
        console.error(`\u274C Failed to create local.properties: ${err.message}`);
      }
    } else {
      const localPropsPath = path6.join(process.cwd(), "local.properties");
      if (fs6.existsSync(localPropsPath)) {
        try {
          fs6.copyFileSync(localPropsPath, path6.join(rootDir, "local.properties"));
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
import fs12 from "fs";
import path12 from "path";
import { execSync as execSync2 } from "child_process";

// src/common/discoverModules.ts
import fs8 from "fs";
import path8 from "path";

// src/common/config.ts
import fs7 from "fs";
import path7 from "path";
var LYNX_EXT_JSON = "lynx.ext.json";
var TAMER_JSON = "tamer.json";
function loadLynxExtJson(packagePath) {
  const p = path7.join(packagePath, LYNX_EXT_JSON);
  if (!fs7.existsSync(p)) return null;
  try {
    return JSON.parse(fs7.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}
function loadTamerJson(packagePath) {
  const p = path7.join(packagePath, TAMER_JSON);
  if (!fs7.existsSync(p)) return null;
  try {
    return JSON.parse(fs7.readFileSync(p, "utf8"));
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
  return fs7.existsSync(path7.join(packagePath, LYNX_EXT_JSON)) || fs7.existsSync(path7.join(packagePath, TAMER_JSON));
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
  let nodeModulesPath = path7.join(projectRoot, "node_modules");
  const workspaceRoot = path7.join(projectRoot, "..", "..");
  const rootNodeModules = path7.join(workspaceRoot, "node_modules");
  if (fs7.existsSync(path7.join(workspaceRoot, "package.json")) && fs7.existsSync(rootNodeModules) && path7.basename(path7.dirname(projectRoot)) === "packages") {
    nodeModulesPath = rootNodeModules;
  } else if (!fs7.existsSync(nodeModulesPath)) {
    const altRoot = path7.join(projectRoot, "..", "..");
    const altNodeModules = path7.join(altRoot, "node_modules");
    if (fs7.existsSync(path7.join(altRoot, "package.json")) && fs7.existsSync(altNodeModules)) {
      nodeModulesPath = altNodeModules;
    }
  }
  return nodeModulesPath;
}
function discoverNativeExtensions(projectRoot) {
  const nodeModulesPath = getNodeModulesPath(projectRoot);
  const result = [];
  if (!fs7.existsSync(nodeModulesPath)) return result;
  const packageDirs = fs7.readdirSync(nodeModulesPath);
  const check = (name, packagePath) => {
    if (!hasExtensionConfig(packagePath)) return;
    const config = loadExtensionConfig(packagePath);
    const classes = getAndroidModuleClassNames(config?.android);
    for (const className of classes) {
      result.push({ packageName: name, moduleClassName: className, attachHostView: config?.android?.attachHostView });
    }
  };
  for (const dirName of packageDirs) {
    const fullPath = path7.join(nodeModulesPath, dirName);
    if (dirName.startsWith("@")) {
      try {
        for (const scopedDirName of fs7.readdirSync(fullPath)) {
          check(`${dirName}/${scopedDirName}`, path7.join(fullPath, scopedDirName));
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
  let nodeModulesPath = path8.join(projectRoot, "node_modules");
  const workspaceRoot = path8.join(projectRoot, "..", "..");
  const rootNodeModules = path8.join(workspaceRoot, "node_modules");
  if (fs8.existsSync(path8.join(workspaceRoot, "package.json")) && fs8.existsSync(rootNodeModules) && path8.basename(path8.dirname(projectRoot)) === "packages") {
    nodeModulesPath = rootNodeModules;
  } else if (!fs8.existsSync(nodeModulesPath)) {
    const altRoot = path8.join(projectRoot, "..", "..");
    const altNodeModules = path8.join(altRoot, "node_modules");
    if (fs8.existsSync(path8.join(altRoot, "package.json")) && fs8.existsSync(altNodeModules)) {
      nodeModulesPath = altNodeModules;
    }
  }
  return nodeModulesPath;
}
function resolvePackageRoot(projectRoot, packageName) {
  const nodeModulesPath = resolveNodeModulesPath(projectRoot);
  const hasPkg = (dir) => fs8.existsSync(path8.join(dir, "package.json"));
  if (packageName.startsWith("@")) {
    const parts = packageName.split("/");
    if (parts.length !== 2 || !parts[0].startsWith("@")) return null;
    const direct2 = path8.join(nodeModulesPath, parts[0], parts[1]);
    if (hasPkg(direct2)) return direct2;
    const underDevClient = path8.join(
      nodeModulesPath,
      "@tamer4lynx",
      "tamer-dev-client",
      "node_modules",
      parts[0],
      parts[1]
    );
    if (hasPkg(underDevClient)) return underDevClient;
    return null;
  }
  const direct = path8.join(nodeModulesPath, packageName);
  return hasPkg(direct) ? direct : null;
}
function collectTransitiveTamer4LynxPackageNames(projectRoot) {
  const hostPjPath = path8.join(projectRoot, "package.json");
  if (!fs8.existsSync(hostPjPath)) return null;
  const hostPj = JSON.parse(fs8.readFileSync(hostPjPath, "utf8"));
  if (hostPj.name !== "@tamer4lynx/tamer-dev-app") return null;
  const visited = /* @__PURE__ */ new Set();
  const queue = [];
  const enqueue = (deps) => {
    if (!deps) return;
    for (const name of Object.keys(deps)) {
      if (name.startsWith("@tamer4lynx/")) queue.push(name);
    }
  };
  enqueue(hostPj.dependencies);
  enqueue(hostPj.optionalDependencies);
  while (queue.length) {
    const name = queue.shift();
    if (visited.has(name)) continue;
    visited.add(name);
    const pkgRoot = resolvePackageRoot(projectRoot, name);
    if (!pkgRoot || !fs8.existsSync(path8.join(pkgRoot, "package.json"))) continue;
    const sub = JSON.parse(fs8.readFileSync(path8.join(pkgRoot, "package.json"), "utf8"));
    const merged = { ...sub.dependencies, ...sub.optionalDependencies };
    for (const dep of Object.keys(merged)) {
      if (dep.startsWith("@tamer4lynx/") && !visited.has(dep)) queue.push(dep);
    }
  }
  return visited;
}
function discoverModules(projectRoot) {
  const nodeModulesPath = resolveNodeModulesPath(projectRoot);
  const packages = [];
  if (!fs8.existsSync(nodeModulesPath)) {
    return [];
  }
  const packageDirs = fs8.readdirSync(nodeModulesPath);
  for (const dirName of packageDirs) {
    const fullPath = path8.join(nodeModulesPath, dirName);
    const checkPackage = (name, packagePath) => {
      if (!hasExtensionConfig(packagePath)) return;
      const config = loadExtensionConfig(packagePath);
      if (!config || !config.android && !config.ios) return;
      packages.push({ name, config, packagePath });
    };
    if (dirName.startsWith("@")) {
      try {
        const scopedDirs = fs8.readdirSync(fullPath);
        for (const scopedDirName of scopedDirs) {
          const scopedPackagePath = path8.join(fullPath, scopedDirName);
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
  const allowed = collectTransitiveTamer4LynxPackageNames(projectRoot);
  if (allowed) {
    return packages.filter((p) => allowed.has(p.name));
  }
  return packages;
}

// src/common/generateExtCode.ts
function getDedupedAndroidModuleClassNames(packages) {
  const seenNames = /* @__PURE__ */ new Set();
  return packages.flatMap((p) => getAndroidModuleClassNames(p.config.android)).filter((fullClassName) => {
    const simple = fullClassName.split(".").pop();
    if (seenNames.has(simple)) return false;
    seenNames.add(simple);
    return true;
  });
}
function generateLynxExtensionsKotlin(packages, projectPackage) {
  const modulePackages = packages.filter((p) => getAndroidModuleClassNames(p.config.android).length > 0);
  const elementPackages = packages.filter((p) => p.config.android?.elements && Object.keys(p.config.android.elements).length > 0);
  const allModuleClasses = getDedupedAndroidModuleClassNames(packages);
  const hasDevClient = packages.some((p) => p.name === "@tamer4lynx/tamer-dev-client");
  const devClientSupportedBlock = hasDevClient && allModuleClasses.length > 0 ? `
        com.nanofuxion.tamerdevclient.DevClientModule.attachSupportedModuleClassNames(listOf(
${allModuleClasses.map((c) => `            "${c.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",\n")}
        ))
` : hasDevClient ? "\n        com.nanofuxion.tamerdevclient.DevClientModule.attachSupportedModuleClassNames(emptyList())\n" : "";
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
  const devToolBootstrapPrefix = hasDevClient ? "        com.nanofuxion.tamerdevclient.LynxDevToolBootstrap.configure(context)\n" : "";
  const devToolBootstrapSuffix = hasDevClient ? "        com.nanofuxion.tamerdevclient.LynxDevToolBootstrap.enableLynxDebugFlags()\n" : "";
  return `package ${projectPackage}.generated

import android.content.Context
import com.lynx.tasm.LynxEnv
import com.lynx.tasm.LynxViewBuilder
import com.lynx.xelement.XElementBehaviors
${moduleImports}
${elementImports}

object GeneratedLynxExtensions {
    fun register(context: Context) {
${devToolBootstrapPrefix}${allRegistrations}${devClientSupportedBlock}${devToolBootstrapSuffix}
    }

    fun configureViewBuilder(viewBuilder: LynxViewBuilder) {
        viewBuilder.addBehaviors(XElementBehaviors().create())
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

// src/common/syncTamerComponentTypes.ts
import fs10 from "fs";
import path10 from "path";

// src/common/tsconfigUtils.ts
import fs9 from "fs";
import path9 from "path";
function stripJsonCommentsAndTrailingCommas(str) {
  return str.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/,\s*([\]}])/g, "$1");
}
function parseTsconfigJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(stripJsonCommentsAndTrailingCommas(raw));
  }
}
function readTsconfig(filePath) {
  if (!fs9.existsSync(filePath)) return null;
  try {
    return parseTsconfigJson(fs9.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}
function resolveExtends(tsconfig, dir) {
  if (!tsconfig.extends) return tsconfig;
  const basePath = path9.resolve(dir, tsconfig.extends);
  const base = readTsconfig(basePath);
  if (!base) return tsconfig;
  const baseDir = path9.dirname(basePath);
  const resolved = resolveExtends(base, baseDir);
  return {
    ...resolved,
    ...tsconfig,
    compilerOptions: { ...resolved.compilerOptions, ...tsconfig.compilerOptions }
  };
}
function fixTsconfigReferencesForBuild(tsconfigPath) {
  const dir = path9.dirname(tsconfigPath);
  const tsconfig = readTsconfig(tsconfigPath);
  if (!tsconfig?.references?.length) return false;
  const refsWithNoEmit = [];
  for (const ref of tsconfig.references) {
    const refPath = path9.resolve(dir, ref.path);
    const refConfigPath = refPath.endsWith(".json") ? refPath : path9.join(refPath, "tsconfig.json");
    const refConfig = readTsconfig(refConfigPath);
    if (refConfig?.compilerOptions?.noEmit === true) {
      refsWithNoEmit.push(refConfigPath);
    }
  }
  if (refsWithNoEmit.length === 0) return false;
  const merged = {
    ...tsconfig,
    references: void 0,
    files: void 0
  };
  const includes = [];
  const compilerOpts = { ...tsconfig.compilerOptions };
  for (const ref of tsconfig.references) {
    const refPath = path9.resolve(dir, ref.path);
    const refConfigPath = refPath.endsWith(".json") ? refPath : path9.join(refPath, "tsconfig.json");
    const refConfig = readTsconfig(refConfigPath);
    if (!refConfig) continue;
    const refDir = path9.dirname(refConfigPath);
    const resolved = resolveExtends(refConfig, refDir);
    const inc = resolved.include;
    if (inc) {
      const arr = Array.isArray(inc) ? inc : [inc];
      const baseDir = path9.relative(dir, refDir);
      for (const p of arr) {
        const clean = typeof p === "string" && p.startsWith("./") ? p.slice(2) : p;
        includes.push(!baseDir || baseDir === "." ? clean : `${baseDir}/${clean}`);
      }
    }
    const opts = resolved.compilerOptions;
    if (opts) {
      for (const [k, v] of Object.entries(opts)) {
        if (k !== "composite" && k !== "noEmit" && compilerOpts[k] === void 0) {
          compilerOpts[k] = v;
        }
      }
    }
  }
  if (includes.length > 0) merged.include = [...new Set(includes)];
  compilerOpts.noEmit = true;
  merged.compilerOptions = compilerOpts;
  fs9.writeFileSync(tsconfigPath, JSON.stringify(merged, null, 2));
  return true;
}
var OLD_TAMER_GLOB_PATTERNS = [
  "node_modules/@tamer4lynx/tamer-*/src/**/*.d.ts",
  "node_modules/@tamer4lynx/tamer-*/**/*.d.ts"
];
var TAMER_COMPONENTS_MARKERS = [".tamer/tamer-components.d.ts", "../.tamer/tamer-components.d.ts"];
function findTsconfigCandidates(projectRoot, lynxProjectRelative) {
  const out = [];
  if (lynxProjectRelative?.trim()) {
    const lp = lynxProjectRelative.trim();
    out.push(path9.join(projectRoot, lp, "tsconfig.json"));
    const lynxSrc = path9.join(projectRoot, lp, "src", "tsconfig.json");
    if (fs9.existsSync(lynxSrc)) out.push(lynxSrc);
  }
  const rootSrc = path9.join(projectRoot, "src", "tsconfig.json");
  if (fs9.existsSync(rootSrc)) out.push(rootSrc);
  out.push(path9.join(projectRoot, "tsconfig.json"));
  return [...new Set(out)];
}
function normalizeIncludePathForCompare(p) {
  return p.replace(/\\/g, "/");
}
function migrateOldTamerGlobIncludes(tsconfigPath) {
  const tsconfig = readTsconfig(tsconfigPath);
  if (!tsconfig?.include) return false;
  const include = tsconfig.include;
  const arr = Array.isArray(include) ? include : [include];
  const oldSet = new Set(OLD_TAMER_GLOB_PATTERNS.map(normalizeIncludePathForCompare));
  const next = arr.filter((p) => {
    if (typeof p !== "string") return true;
    const n = normalizeIncludePathForCompare(p);
    return !oldSet.has(n);
  });
  if (next.length === arr.length) return false;
  tsconfig.include = next;
  fs9.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  return true;
}
function ensureTamerComponentsIncludeForProject(tsconfigPath, projectRoot) {
  const tsconfig = readTsconfig(tsconfigPath);
  if (!tsconfig) return false;
  const tsDir = path9.dirname(path9.resolve(tsconfigPath));
  const target = path9.join(projectRoot, ".tamer", "tamer-components.d.ts");
  let rel = path9.relative(tsDir, target);
  if (!rel.startsWith(".")) {
    rel = `./${rel}`;
  }
  rel = rel.split(path9.sep).join("/");
  const include = tsconfig.include ?? [];
  const arr = Array.isArray(include) ? [...include] : [include];
  const hasMarker = arr.some((p) => {
    if (typeof p !== "string") return false;
    const n = normalizeIncludePathForCompare(p);
    return TAMER_COMPONENTS_MARKERS.some((m) => n.endsWith(m) || n.includes(".tamer/tamer-components.d.ts"));
  });
  if (hasMarker) return false;
  arr.push(rel);
  tsconfig.include = arr;
  fs9.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  return true;
}

// src/common/syncTamerComponentTypes.ts
var HEADER = "// Generated by t4l \u2014 do not edit.\n";
function readPackageJson(pkgDir) {
  const p = path10.join(pkgDir, "package.json");
  if (!fs10.existsSync(p)) return null;
  try {
    return JSON.parse(fs10.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}
function collectAmbientTypeExports(pkgDir) {
  const pj = readPackageJson(pkgDir);
  if (!pj?.name?.startsWith("@tamer4lynx/")) return [];
  const explicit = pj.tamer?.ambientTypeExports;
  if (Array.isArray(explicit) && explicit.length > 0) {
    return explicit.map((s) => String(s).replace(/^\.\//, ""));
  }
  const out = [];
  const ex = pj.exports;
  if (ex && typeof ex === "object") {
    if (typeof ex["./webview-jsx"] === "object" || typeof ex["./webview-jsx"] === "string") {
      out.push("webview-jsx");
    }
    if (typeof ex["./icon-jsx"] === "object" || typeof ex["./icon-jsx"] === "string") {
      out.push("icon-jsx");
    }
  }
  return [...new Set(out)];
}
function packageDirFromName(projectRoot, packageName) {
  const parts = packageName.split("/");
  if (parts.length >= 2 && packageName.startsWith("@")) {
    const scoped = path10.join(projectRoot, "node_modules", parts[0], parts[1]);
    if (fs10.existsSync(path10.join(scoped, "package.json"))) return scoped;
  }
  const flat = path10.join(projectRoot, "node_modules", packageName);
  if (fs10.existsSync(path10.join(flat, "package.json"))) return flat;
  return null;
}
function resolveAmbientDtsFile(pkgDir, subpath) {
  const pj = readPackageJson(pkgDir);
  const key = `./${subpath}`;
  const ex = pj?.exports;
  if (ex && typeof ex === "object" && ex !== null && key in ex) {
    const entry = ex[key];
    if (entry && typeof entry === "object" && entry !== null && "types" in entry) {
      const types = entry.types;
      if (typeof types === "string") {
        const rel = types.replace(/^\.\//, "");
        const abs = path10.join(pkgDir, rel);
        if (fs10.existsSync(abs)) return abs;
      }
    }
  }
  const fallback = path10.join(pkgDir, "dist", `${subpath}.d.ts`);
  return fs10.existsSync(fallback) ? fallback : null;
}
function referencePathForAmbientDts(projectRoot, packageName, subpath) {
  const pkgDir = packageDirFromName(projectRoot, packageName);
  if (!pkgDir) return null;
  const abs = resolveAmbientDtsFile(pkgDir, subpath);
  if (!abs) return null;
  const outDir = path10.join(projectRoot, ".tamer");
  let rel = path10.relative(outDir, abs);
  if (!rel.startsWith(".")) {
    rel = `./${rel}`;
  }
  return rel.split(path10.sep).join("/");
}
function listAmbientTypeRefs(projectRoot) {
  const nm = path10.join(projectRoot, "node_modules", "@tamer4lynx");
  if (!fs10.existsSync(nm)) return [];
  const refs = [];
  for (const name of fs10.readdirSync(nm)) {
    const pkgDir = path10.join(nm, name);
    let st;
    try {
      st = fs10.statSync(pkgDir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    const pj = readPackageJson(pkgDir);
    if (!pj?.name) continue;
    for (const sub of collectAmbientTypeExports(pkgDir)) {
      refs.push({ packageName: pj.name, subpath: sub });
    }
  }
  refs.sort(
    (a, b) => a.packageName === b.packageName ? a.subpath.localeCompare(b.subpath) : a.packageName.localeCompare(b.packageName)
  );
  return refs;
}
function writeTamerComponentsDts(projectRoot, refs) {
  const outDir = path10.join(projectRoot, ".tamer");
  fs10.mkdirSync(outDir, { recursive: true });
  const outPath = path10.join(outDir, "tamer-components.d.ts");
  const lines = [HEADER.trim()];
  for (const r of refs) {
    const refPath = referencePathForAmbientDts(projectRoot, r.packageName, r.subpath);
    if (refPath) {
      lines.push(`/// <reference path="${refPath}" />`);
    } else {
      lines.push(`/// <reference types="${r.packageName}/${r.subpath}" />`);
    }
  }
  const content = lines.join("\n") + "\n";
  fs10.writeFileSync(outPath, content, "utf8");
  return outPath;
}
function syncTamerComponentTypes(projectRoot) {
  const refs = listAmbientTypeRefs(projectRoot);
  if (refs.length === 0) {
    const outDir = path10.join(projectRoot, ".tamer");
    const outPath2 = path10.join(outDir, "tamer-components.d.ts");
    fs10.mkdirSync(outDir, { recursive: true });
    fs10.writeFileSync(outPath2, `${HEADER.trim()}
`, "utf8");
    return { outPath: outPath2, refs: [] };
  }
  const outPath = writeTamerComponentsDts(projectRoot, refs);
  return { outPath, refs };
}
function shouldSyncTamerComponentTypes(config) {
  return config.syncTamerComponentTypes !== false;
}
function runTamerComponentTypesPipeline(projectRoot) {
  const cwd = projectRoot ?? process.cwd();
  let resolved;
  try {
    resolved = resolveHostPaths(cwd);
  } catch {
    return;
  }
  const { projectRoot: root, config } = resolved;
  if (!shouldSyncTamerComponentTypes(config)) return;
  syncTamerComponentTypes(root);
  const lynxRel = config.lynxProject ?? config.paths?.lynxProject;
  const lynxProject = typeof lynxRel === "string" && lynxRel.trim() ? lynxRel.trim() : void 0;
  for (const tsconfigPath of findTsconfigCandidates(root, lynxProject)) {
    if (!fs10.existsSync(tsconfigPath)) continue;
    migrateOldTamerGlobIncludes(tsconfigPath);
    ensureTamerComponentsIncludeForProject(tsconfigPath, root);
  }
}

// src/android/cleanTamerAndroidCaches.ts
import fs11 from "fs";
import path11 from "path";
var MARKER_REL = path11.join(".tamer", "android-lib-versions.json");
function readTamerPackageVersions(projectRoot) {
  const out = {};
  const nm = path11.join(projectRoot, "node_modules", "@tamer4lynx");
  if (!fs11.existsSync(nm)) return out;
  for (const name of fs11.readdirSync(nm, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const pj = path11.join(nm, name.name, "package.json");
    if (!fs11.existsSync(pj)) continue;
    try {
      const v = JSON.parse(fs11.readFileSync(pj, "utf-8")).version;
      if (typeof v === "string") out[name.name] = v;
    } catch {
    }
  }
  return out;
}
function versionsEqual(a, b) {
  const keys = /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}
function cleanTamerAndroidLibBuildsIfVersionsChanged(projectRoot) {
  const markerPath = path11.join(projectRoot, MARKER_REL);
  let previous = {};
  if (fs11.existsSync(markerPath)) {
    try {
      previous = JSON.parse(fs11.readFileSync(markerPath, "utf-8"));
    } catch {
      previous = {};
    }
  }
  const current = readTamerPackageVersions(projectRoot);
  if (versionsEqual(previous, current)) return;
  const nm = path11.join(projectRoot, "node_modules", "@tamer4lynx");
  if (fs11.existsSync(nm)) {
    for (const name of fs11.readdirSync(nm, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const buildDir = path11.join(nm, name.name, "android", "build");
      if (fs11.existsSync(buildDir)) {
        fs11.rmSync(buildDir, { recursive: true, force: true });
      }
    }
  }
  fs11.mkdirSync(path11.dirname(markerPath), { recursive: true });
  fs11.writeFileSync(markerPath, JSON.stringify(current, null, 0), "utf-8");
  console.log(
    "\u2139\uFE0F  Cleared @tamer4lynx Android library build dirs (linked package versions changed)."
  );
}
function invalidateTamerAndroidLibVersionMarker(projectRoot) {
  const markerPath = path11.join(projectRoot, MARKER_REL);
  try {
    if (fs11.existsSync(markerPath)) fs11.unlinkSync(markerPath);
  } catch {
  }
}

// src/android/autolink.ts
var TAMER_DEV_CLIENT_FALLBACK = {
  name: "@tamer4lynx/tamer-dev-client",
  packagePath: "",
  config: {
    android: {
      moduleClassName: "com.nanofuxion.tamerdevclient.DevClientModule",
      sourceDir: "android",
      permissions: ["CAMERA", "ACCESS_NETWORK_STATE", "ACCESS_WIFI_STATE"]
    }
  }
};
var REQUIRED_CATALOG_ENTRIES = {
  "androidx.biometric": {
    versionRef: "biometric",
    version: "1.1.0",
    libraryKey: "androidx-biometric",
    libraryLine: 'androidx-biometric = { group = "androidx.biometric", name = "biometric", version.ref = "biometric" }'
  }
};
var DEV_TAMER_LINKING_SCHEME = "tamerdevapp";
function normalizeTamerLinkingScheme(schema) {
  let s = schema.trim();
  const idx = s.indexOf("://");
  if (idx !== -1) s = s.slice(0, idx);
  return s;
}
function resolveDefaultTamerLinkingScheme(android, release) {
  if (!release) return DEV_TAMER_LINKING_SCHEME;
  const schema = android?.schema?.trim();
  if (schema) return normalizeTamerLinkingScheme(schema);
  const raw = android?.appName?.trim();
  if (raw) {
    const slug = raw.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
    if (slug.length > 0) return slug;
  }
  return DEV_TAMER_LINKING_SCHEME;
}
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
var autolink = (opts) => {
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
  const defaultTamerLinkingScheme = resolveDefaultTamerLinkingScheme(config.android, opts?.release === true);
  function updateGeneratedSection(filePath, newContent, startMarker, endMarker) {
    if (!fs12.existsSync(filePath)) {
      console.warn(`\u26A0\uFE0F File not found, skipping update: ${filePath}`);
      return;
    }
    let fileContent = fs12.readFileSync(filePath, "utf8");
    const escapedStartMarker = startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedEndMarker = endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escapedStartMarker}[\\s\\S]*?${escapedEndMarker}`, "g");
    const replacementBlock = `${startMarker}
${newContent}
${endMarker}`;
    if (regex.test(fileContent)) {
      fileContent = fileContent.replace(regex, replacementBlock);
    } else {
      console.warn(`\u26A0\uFE0F Could not find autolink markers in ${path12.basename(filePath)}. Appending to the end of the file.`);
      fileContent += `
${replacementBlock}
`;
    }
    fs12.writeFileSync(filePath, fileContent);
    console.log(`\u2705 Updated autolinked section in ${path12.basename(filePath)}`);
  }
  function updateSettingsGradle(packages) {
    const settingsFilePath = path12.join(appAndroidPath, "settings.gradle.kts");
    let scriptContent = `// This section is automatically generated by Tamer4Lynx.
// Manual edits will be overwritten.`;
    const androidPackages = packages.filter((p) => p.config.android);
    if (androidPackages.length > 0) {
      androidPackages.forEach((pkg) => {
        const gradleProjectName = pkg.name.replace(/^@/, "").replace(/\//g, "_");
        const sourceDir = pkg.config.android?.sourceDir || "android";
        const projectPath = path12.resolve(pkg.packagePath, sourceDir).replace(/\\/g, "/");
        scriptContent += `
include(":${gradleProjectName}")`;
        scriptContent += `
project(":${gradleProjectName}").projectDir = file("${projectPath}")`;
      });
    } else {
      scriptContent += `
println("No native modules found by Tamer4Lynx autolinker.")`;
    }
    updateGeneratedSection(settingsFilePath, scriptContent.trim(), "// GENERATED AUTOLINK START", "// GENERATED AUTOLINK END");
  }
  function updateAppBuildGradle(packages) {
    const appBuildGradlePath = path12.join(appAndroidPath, "app", "build.gradle.kts");
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
    const generatedDir = path12.join(appAndroidPath, "app", "src", "main", "kotlin", packagePath, "generated");
    const kotlinExtensionsPath = path12.join(generatedDir, "GeneratedLynxExtensions.kt");
    const content = `/**
 * This file is generated by the Tamer4Lynx autolinker.
 * Do not edit this file manually.
 */
${generateLynxExtensionsKotlin(packages, projectPackage)}`;
    fs12.mkdirSync(generatedDir, { recursive: true });
    fs12.writeFileSync(kotlinExtensionsPath, content.trimStart());
    console.log(`\u2705 Generated Kotlin extensions at ${kotlinExtensionsPath}`);
  }
  function generateActivityLifecycleFile(packages, projectPackage) {
    const packageKotlinPath = projectPackage.replace(/\./g, "/");
    const generatedDir = path12.join(appAndroidPath, "app", "src", "main", "kotlin", packageKotlinPath, "generated");
    const outputPath = path12.join(generatedDir, "GeneratedActivityLifecycle.kt");
    const content = `/**
 * This file is generated by the Tamer4Lynx autolinker.
 * Do not edit this file manually.
 */
${generateActivityLifecycleKotlin(packages, projectPackage)}`;
    fs12.mkdirSync(generatedDir, { recursive: true });
    fs12.writeFileSync(outputPath, content);
    console.log(`\u2705 Generated activity lifecycle patches at ${outputPath}`);
  }
  function mergeDeepLinksForAutolink(packages) {
    const user = config.android?.deepLinks ?? [];
    const hasTamerLinking = packages.some(
      (p) => p.name === "@tamer4lynx/tamer-linking" || p.name === "tamer-linking"
    );
    if (!hasTamerLinking) return user;
    const hasTamerScheme = user.some((l) => l.scheme === defaultTamerLinkingScheme);
    if (hasTamerScheme) return user;
    console.log(
      `\u2139\uFE0F Merged default Android deep link ${defaultTamerLinkingScheme}:// (tamer-linking / OAuth redirect).`
    );
    return [{ scheme: defaultTamerLinkingScheme }, ...user];
  }
  function ensureProjectActivityExported(openTag) {
    if (openTag.includes("android:exported=")) {
      return openTag.replace(/android:exported="false"/, 'android:exported="true"');
    }
    return openTag.replace(/>$/, ' android:exported="true">');
  }
  function ensureProjectActivityDeepLinkMarkers(manifestPath) {
    let m = fs12.readFileSync(manifestPath, "utf8");
    if (m.includes("GENERATED DEEP LINKS START")) return;
    const re = /(<activity[^>]*\sandroid:name="\.ProjectActivity"[^>]*>)([\s\S]*?)(\n\s*<\/activity>)/;
    const match = m.match(re);
    if (!match) {
      console.warn(
        `\u26A0\uFE0F Could not find <activity android:name=".ProjectActivity"> in AndroidManifest.xml; skipping deep link markers.`
      );
      return;
    }
    const openTag = ensureProjectActivityExported(match[1]);
    const inner = `
        <!-- GENERATED DEEP LINKS START -->
        <!-- GENERATED DEEP LINKS END -->
        `;
    m = m.replace(re, `${openTag}${inner}${match[3]}`);
    fs12.writeFileSync(manifestPath, m);
    console.log(`\u2705 Added deep link markers to ProjectActivity (tamer-linking OAuth redirect).`);
  }
  function syncDeepLinkIntentFilters(packages) {
    const deepLinks = mergeDeepLinksForAutolink(packages);
    if (!deepLinks || deepLinks.length === 0) return;
    const manifestPath = path12.join(appAndroidPath, "app", "src", "main", "AndroidManifest.xml");
    if (!fs12.existsSync(manifestPath)) return;
    ensureProjectActivityDeepLinkMarkers(manifestPath);
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
  function run4() {
    console.log("\u{1F50E} Finding Lynx extension packages (lynx.ext.json / tamer.json)...");
    let packages = discoverModules(projectRoot).filter((p) => p.config.android);
    const includeDevClient = opts?.includeDevClient === true;
    const devClientScoped = path12.join(projectRoot, "node_modules", "@tamer4lynx", "tamer-dev-client");
    const devClientFlat = path12.join(projectRoot, "node_modules", "tamer-dev-client");
    const devClientPath = fs12.existsSync(path12.join(devClientScoped, "android")) ? devClientScoped : fs12.existsSync(path12.join(devClientFlat, "android")) ? devClientFlat : null;
    const hasDevClient = packages.some((p) => p.name === "@tamer4lynx/tamer-dev-client" || p.name === "tamer-dev-client");
    if (includeDevClient && devClientPath && !hasDevClient) {
      packages = [{
        ...TAMER_DEV_CLIENT_FALLBACK,
        packagePath: devClientPath
      }, ...packages];
      console.log("\u2139\uFE0F Added tamer-dev-client (fallback; lynx.ext.json missing in published package).");
    }
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
    syncDeepLinkIntentFilters(packages);
    syncVersionCatalog(packages);
    ensureXElementDeps();
    ensureReleaseSigning();
    runGradleSync();
    invalidateTamerAndroidLibVersionMarker(projectRoot);
    console.log("\u2728 Autolinking complete.");
    runTamerComponentTypesPipeline(projectRoot);
  }
  function runGradleSync() {
    const gradlew = path12.join(appAndroidPath, process.platform === "win32" ? "gradlew.bat" : "gradlew");
    if (!fs12.existsSync(gradlew)) return;
    try {
      console.log("\u2139\uFE0F Running Gradle sync in android directory...");
      execSync2(process.platform === "win32" ? "gradlew.bat projects" : "./gradlew projects", {
        cwd: appAndroidPath,
        stdio: "inherit"
      });
      console.log("\u2705 Gradle sync completed.");
    } catch (e) {
      console.warn("\u26A0\uFE0F Gradle sync failed:", e.message);
      console.log("\u26A0\uFE0F You can run `./gradlew tasks` in the android directory to sync.");
    }
  }
  function syncVersionCatalog(packages) {
    const libsTomlPath = path12.join(appAndroidPath, "gradle", "libs.versions.toml");
    if (!fs12.existsSync(libsTomlPath)) return;
    const requiredAliases = /* @__PURE__ */ new Set();
    const requiredPluginAliases = /* @__PURE__ */ new Set();
    for (const pkg of packages) {
      const buildPath = path12.join(pkg.packagePath, pkg.config.android?.sourceDir || "android", "build.gradle.kts");
      if (!fs12.existsSync(buildPath)) continue;
      const content = fs12.readFileSync(buildPath, "utf8");
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
    let toml = fs12.readFileSync(libsTomlPath, "utf8");
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
      fs12.writeFileSync(libsTomlPath, toml);
      console.log("\u2705 Synced version catalog (libs.versions.toml) for linked modules.");
    }
  }
  function ensureXElementDeps() {
    const libsTomlPath = path12.join(appAndroidPath, "gradle", "libs.versions.toml");
    if (fs12.existsSync(libsTomlPath)) {
      let toml = fs12.readFileSync(libsTomlPath, "utf8");
      let updated = false;
      if (!toml.includes("lynx-xelement =")) {
        toml = toml.replace(
          /(lynx-trace\s*=\s*\{[^\n]*\n)/,
          `$1lynx-xelement = { module = "org.lynxsdk.lynx:xelement", version.ref = "lynx" }
lynx-xelement-input = { module = "org.lynxsdk.lynx:xelement-input", version.ref = "lynx" }
`
        );
        updated = true;
      }
      if (updated) {
        fs12.writeFileSync(libsTomlPath, toml);
        console.log("\u2705 Added XElement entries to version catalog.");
      }
    }
    const appBuildPath = path12.join(appAndroidPath, "app", "build.gradle.kts");
    if (fs12.existsSync(appBuildPath)) {
      let content = fs12.readFileSync(appBuildPath, "utf8");
      if (!content.includes("lynx.xelement")) {
        content = content.replace(
          /(implementation\(libs\.lynx\.service\.http\))/,
          `$1
    implementation(libs.lynx.xelement)
    implementation(libs.lynx.xelement.input)`
        );
        fs12.writeFileSync(appBuildPath, content);
        console.log("\u2705 Added XElement dependencies to app build.gradle.kts.");
      }
    }
  }
  function ensureReleaseSigning() {
    const appBuildPath = path12.join(appAndroidPath, "app", "build.gradle.kts");
    if (!fs12.existsSync(appBuildPath)) return;
    let content = fs12.readFileSync(appBuildPath, "utf8");
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
      fs12.writeFileSync(appBuildPath, content);
      console.log("\u2705 Set release signing to debug so installRelease works without a keystore.");
    }
  }
  function syncManifestPermissions(packages) {
    const manifestPath = path12.join(appAndroidPath, "app", "src", "main", "AndroidManifest.xml");
    if (!fs12.existsSync(manifestPath)) return;
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
    let manifest = fs12.readFileSync(manifestPath, "utf8");
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
    fs12.writeFileSync(manifestPath, manifest);
    console.log(`\u2705 Synced manifest permissions: ${toAdd.map((p) => p.split(".").pop()).join(", ")}`);
  }
  run4();
};
var autolink_default = autolink;

// src/android/bundle.ts
import fs15 from "fs";
import path15 from "path";
import { execSync as execSync3 } from "child_process";

// src/common/copyDistAssets.ts
import fs13 from "fs";
import path13 from "path";
var SKIP = /* @__PURE__ */ new Set([".rspeedy", "stats.json"]);
function copyDistAssets(distDir, destDir, bundleFile) {
  if (!fs13.existsSync(distDir)) return;
  for (const entry of fs13.readdirSync(distDir)) {
    if (SKIP.has(entry)) continue;
    const src = path13.join(distDir, entry);
    const dest = path13.join(destDir, entry);
    const stat = fs13.statSync(src);
    if (stat.isDirectory()) {
      fs13.mkdirSync(dest, { recursive: true });
      copyDistAssets(src, dest, bundleFile);
    } else {
      fs13.copyFileSync(src, dest);
      if (entry !== bundleFile) {
        console.log(`\u2728 Copied asset: ${entry}`);
      }
    }
  }
}

// src/android/syncDevClient.ts
import fs14 from "fs";
import path14 from "path";
function readAndSubstituteTemplate2(templatePath, vars) {
  const raw = fs14.readFileSync(templatePath, "utf-8");
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
    raw
  );
}
function patchAppLogService(appPath) {
  if (!fs14.existsSync(appPath)) return;
  const raw = fs14.readFileSync(appPath, "utf-8");
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
    fs14.writeFileSync(appPath, patched);
  }
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
  const javaDir = path14.join(rootDir, "app", "src", "main", "java", packagePath);
  const kotlinDir = path14.join(rootDir, "app", "src", "main", "kotlin", packagePath);
  if (!fs14.existsSync(javaDir) || !fs14.existsSync(kotlinDir)) {
    console.error("\u274C Android project not found. Run `tamer android create` first.");
    process.exit(1);
  }
  const devClientPkg = findDevClientPackage(resolved.projectRoot);
  const includeDevClient = opts?.includeDevClient ?? (opts?.forceProduction ? false : !!devClientPkg);
  const hasDevClient = includeDevClient && devClientPkg;
  const devMode = hasDevClient ? "embedded" : "standalone";
  const devServer = config.devServer ? {
    host: config.devServer.host ?? "10.0.2.2",
    port: config.devServer.port ?? config.devServer.httpPort ?? 3e3
  } : void 0;
  const vars = { packageName, appName, devMode, devServer, projectRoot: resolved.projectRoot };
  const [templateProviderSource] = await Promise.all([
    fetchAndPatchTemplateProvider(vars)
  ]);
  fs14.writeFileSync(path14.join(javaDir, "TemplateProvider.java"), templateProviderSource);
  fs14.writeFileSync(path14.join(kotlinDir, "MainActivity.kt"), getStandaloneMainActivity(vars));
  patchAppLogService(path14.join(javaDir, "App.java"));
  const appDir = path14.join(rootDir, "app");
  const mainDir = path14.join(appDir, "src", "main");
  const manifestPath = path14.join(mainDir, "AndroidManifest.xml");
  if (hasDevClient) {
    const templateDir = path14.join(devClientPkg, "android", "templates");
    const templateVars = { PACKAGE_NAME: packageName, APP_NAME: appName };
    const devClientFiles = [
      "DevClientManager.kt",
      "DevServerPrefs.kt",
      "ProjectActivity.kt",
      "PortraitCaptureActivity.kt"
    ];
    for (const f of devClientFiles) {
      const src = path14.join(templateDir, f);
      if (fs14.existsSync(src)) {
        const content = readAndSubstituteTemplate2(src, templateVars);
        fs14.writeFileSync(path14.join(kotlinDir, f), content);
      }
    }
    let manifest = fs14.readFileSync(manifestPath, "utf-8");
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
    fs14.writeFileSync(manifestPath, manifest);
    console.log("\u2705 Synced dev client (TemplateProvider, MainActivity, ProjectActivity, DevClientManager)");
  } else {
    for (const f of ["DevClientManager.kt", "DevServerPrefs.kt", "ProjectActivity.kt", "PortraitCaptureActivity.kt", "DevLauncherActivity.kt"]) {
      try {
        fs14.rmSync(path14.join(kotlinDir, f));
      } catch {
      }
    }
    let manifest = fs14.readFileSync(manifestPath, "utf-8");
    manifest = manifest.replace(/\s*<activity android:name="\.ProjectActivity"[^\/]*\/>\n?/g, "");
    manifest = manifest.replace(/\s*<activity android:name="\.PortraitCaptureActivity"[^\/]*\/>\n?/g, "");
    const mainActivityTag = manifest.match(/<activity[^>]*android:name="\.MainActivity"[^>]*>/);
    if (mainActivityTag && !mainActivityTag[0].includes("windowSoftInputMode")) {
      manifest = manifest.replace(
        /(<activity\s+android:name="\.MainActivity"[^>]*)(>)/,
        '$1 android:windowSoftInputMode="adjustResize"$2'
      );
    }
    fs14.writeFileSync(manifestPath, manifest);
    console.log("\u2705 Synced (dev client disabled - use -d for debug build with dev client)");
  }
}
var syncDevClient_default = syncDevClient;

// src/android/bundle.ts
async function bundleAndDeploy(opts = {}) {
  const release = opts.release === true || opts.production === true;
  let resolved;
  try {
    resolved = resolveHostPaths();
  } catch (error) {
    console.error(`\u274C Error loading configuration: ${error.message}`);
    process.exit(1);
  }
  const { projectRoot, lynxProjectDir, lynxBundlePath, lynxBundleFiles, lynxBundleRootRel, androidAssetsDir, devClientBundlePath } = resolved;
  const devClientPkg = findDevClientPackage(projectRoot);
  const includeDevClient = !release && !!devClientPkg;
  const destinationDir = androidAssetsDir;
  autolink_default({ includeDevClient, release });
  await syncDevClient_default({ includeDevClient });
  const iconPaths = resolveIconPaths(projectRoot, resolved.config);
  if (iconPaths) {
    const resDir = path15.join(resolved.androidAppDir, "src", "main", "res");
    if (applyAndroidLauncherIcons(resDir, iconPaths)) {
      console.log("\u2705 Synced Android launcher icon(s) from tamer.config.json");
      ensureAndroidManifestLauncherIcon(path15.join(resolved.androidAppDir, "src", "main", "AndroidManifest.xml"));
    }
  }
  try {
    const lynxTsconfig = path15.join(lynxProjectDir, "tsconfig.json");
    if (fs15.existsSync(lynxTsconfig)) {
      fixTsconfigReferencesForBuild(lynxTsconfig);
    }
    console.log("\u{1F4E6} Building Lynx bundle...");
    execSync3("npm run build", { stdio: "inherit", cwd: lynxProjectDir });
    console.log("\u2705 Build completed successfully.");
  } catch (error) {
    console.error("\u274C Build process failed.");
    process.exit(1);
  }
  if (includeDevClient && devClientBundlePath && !fs15.existsSync(devClientBundlePath)) {
    const devClientDir = path15.dirname(path15.dirname(devClientBundlePath));
    try {
      console.log("\u{1F4E6} Building dev launcher (tamer-dev-client)...");
      execSync3("npm run build", { stdio: "inherit", cwd: devClientDir });
      console.log("\u2705 Dev launcher build completed.");
    } catch (error) {
      console.error("\u274C Dev launcher build failed.");
      process.exit(1);
    }
  }
  try {
    fs15.mkdirSync(destinationDir, { recursive: true });
    if (release) {
      const devClientAsset = path15.join(destinationDir, "dev-client.lynx.bundle");
      if (fs15.existsSync(devClientAsset)) {
        fs15.rmSync(devClientAsset);
        console.log(`\u2728 Removed dev-client.lynx.bundle from assets (production build)`);
      }
    } else if (includeDevClient && devClientBundlePath && fs15.existsSync(devClientBundlePath)) {
      fs15.copyFileSync(devClientBundlePath, path15.join(destinationDir, "dev-client.lynx.bundle"));
      console.log(`\u2728 Copied dev-client.lynx.bundle to assets`);
    }
    for (const name of lynxBundleFiles) {
      const p = path15.join(lynxProjectDir, lynxBundleRootRel, name);
      if (!fs15.existsSync(p)) {
        console.error(`\u274C Build output not found at: ${p}`);
        process.exit(1);
      }
    }
    const distDir = path15.dirname(lynxBundlePath);
    copyDistAssets(distDir, destinationDir, resolved.lynxBundleFile);
    if (lynxBundleFiles.length > 1) {
      console.log(`\u2728 Copied dist assets including: ${lynxBundleFiles.join(", ")}`);
    } else {
      console.log(`\u2728 Copied ${resolved.lynxBundleFile} to assets`);
    }
  } catch (error) {
    console.error(`\u274C Failed to copy bundle: ${error.message}`);
    process.exit(1);
  }
}
var bundle_default = bundleAndDeploy;

// src/android/build.ts
import path16 from "path";
import { execSync as execSync4 } from "child_process";

// src/common/pickOne.tsx
import "react";
import { render } from "ink";

// src/common/tui/components/TextInput.tsx
import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import InkTextInput from "ink-text-input";
import { jsx, jsxs } from "react/jsx-runtime";
function TuiTextInput({
  label,
  value: valueProp,
  defaultValue = "",
  onChange: onChangeProp,
  onSubmitValue,
  onSubmit,
  hint,
  error
}) {
  const controlled = valueProp !== void 0;
  const [internal, setInternal] = useState(defaultValue);
  useEffect(() => {
    if (!controlled) setInternal(defaultValue);
  }, [defaultValue, controlled]);
  const value = controlled ? valueProp : internal;
  const onChange = (v) => {
    if (!controlled) setInternal(v);
    onChangeProp?.(v);
  };
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
    label ? /* @__PURE__ */ jsx(Text, { children: label }) : null,
    /* @__PURE__ */ jsx(
      InkTextInput,
      {
        value,
        onChange,
        onSubmit: () => {
          const r = onSubmitValue?.(value);
          if (r === false) return;
          onSubmit();
        }
      }
    ),
    error ? /* @__PURE__ */ jsx(Text, { color: "red", children: error }) : hint ? /* @__PURE__ */ jsx(Text, { dimColor: true, children: hint }) : null
  ] });
}

// src/common/tui/components/SelectInput.tsx
import "react";
import { Box as Box2, Text as Text2 } from "ink";
import InkSelectInput from "ink-select-input";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function TuiSelectInput({
  label,
  items,
  onSelect,
  hint
}) {
  return /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", children: [
    label ? /* @__PURE__ */ jsx2(Text2, { children: label }) : null,
    /* @__PURE__ */ jsx2(
      InkSelectInput,
      {
        items,
        onSelect: (item) => onSelect(item.value)
      }
    ),
    hint ? /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: hint }) : null
  ] });
}

// src/common/tui/components/PasswordInput.tsx
import "react";
import { Box as Box3, Text as Text3 } from "ink";
import InkTextInput2 from "ink-text-input";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";

// src/common/tui/components/ConfirmInput.tsx
import "react";
import { Box as Box4, Text as Text4 } from "ink";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function TuiConfirmInput({
  label,
  onConfirm,
  defaultYes = false,
  hint
}) {
  const items = defaultYes ? [
    { label: "Yes (default)", value: "yes" },
    { label: "No", value: "no" }
  ] : [
    { label: "No (default)", value: "no" },
    { label: "Yes", value: "yes" }
  ];
  return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", children: [
    label ? /* @__PURE__ */ jsx4(Text4, { children: label }) : null,
    /* @__PURE__ */ jsx4(
      TuiSelectInput,
      {
        items,
        onSelect: (v) => onConfirm(v === "yes"),
        hint
      }
    )
  ] });
}

// src/common/tui/components/Spinner.tsx
import "react";
import { Text as Text5 } from "ink";
import InkSpinner from "ink-spinner";
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
function TuiSpinner({ label, type = "dots" }) {
  return /* @__PURE__ */ jsxs5(Text5, { color: "cyan", children: [
    /* @__PURE__ */ jsx5(InkSpinner, { type }),
    label ? ` ${label}` : ""
  ] });
}

// src/common/tui/components/StatusBox.tsx
import "react";
import { Box as Box5, Text as Text6 } from "ink";
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
var colors = {
  success: "green",
  error: "red",
  warning: "yellow",
  info: "cyan"
};
function StatusBox({ variant, children, title }) {
  const c = colors[variant];
  return /* @__PURE__ */ jsxs6(Box5, { flexDirection: "column", borderStyle: "round", borderColor: c, paddingX: 1, children: [
    title ? /* @__PURE__ */ jsx6(Text6, { bold: true, color: c, children: title }) : null,
    /* @__PURE__ */ jsx6(Box5, { flexDirection: "column", children })
  ] });
}

// src/common/tui/components/Wizard.tsx
import "react";
import { Box as Box6, Text as Text7 } from "ink";
import { jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
function Wizard({ step, total, title, children }) {
  return /* @__PURE__ */ jsxs7(Box6, { flexDirection: "column", children: [
    /* @__PURE__ */ jsxs7(Text7, { dimColor: true, children: [
      "Step ",
      step,
      "/",
      total,
      title ? ` \u2014 ${title}` : ""
    ] }),
    /* @__PURE__ */ jsx7(Box6, { marginTop: 1, flexDirection: "column", children })
  ] });
}

// src/common/tui/components/ServerDashboard.tsx
import "react";
import { Box as Box7, Text as Text8 } from "ink";
import { jsx as jsx8, jsxs as jsxs8 } from "react/jsx-runtime";
var LOG_DISPLAY_MAX = 120;
function ServerDashboard({
  cliVersion,
  projectName,
  port,
  lanIp,
  devUrl,
  wsUrl,
  lynxBundleFile,
  bonjour,
  verbose,
  buildPhase,
  buildError,
  wsConnections,
  logLines,
  qrLines,
  phase,
  startError
}) {
  if (phase === "failed") {
    return /* @__PURE__ */ jsxs8(Box7, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx8(Text8, { color: "red", bold: true, children: "Dev server failed to start" }),
      startError ? /* @__PURE__ */ jsx8(Text8, { color: "red", children: startError }) : null,
      /* @__PURE__ */ jsx8(Box7, { marginTop: 1, children: /* @__PURE__ */ jsx8(Text8, { dimColor: true, children: "Press Ctrl+C or 'q' to quit" }) })
    ] });
  }
  const bundlePath = `${devUrl}/${lynxBundleFile}`;
  return /* @__PURE__ */ jsxs8(Box7, { flexDirection: "column", children: [
    /* @__PURE__ */ jsxs8(Text8, { bold: true, color: "green", children: [
      "Tamer4Lynx dev server (",
      projectName,
      ")"
    ] }),
    /* @__PURE__ */ jsxs8(Text8, { dimColor: true, children: [
      "t4l v",
      cliVersion
    ] }),
    verbose ? /* @__PURE__ */ jsx8(Text8, { dimColor: true, children: "Logs: verbose (native + JS)" }) : null,
    /* @__PURE__ */ jsxs8(Box7, { marginTop: 1, flexDirection: "row", columnGap: 3, alignItems: "flex-start", children: [
      qrLines.length > 0 ? /* @__PURE__ */ jsxs8(Box7, { flexDirection: "column", flexShrink: 0, children: [
        /* @__PURE__ */ jsx8(Text8, { bold: true, children: "Scan" }),
        qrLines.map((line, i) => /* @__PURE__ */ jsx8(Text8, { children: line }, i)),
        /* @__PURE__ */ jsxs8(Box7, { marginTop: 1, flexDirection: "column", children: [
          /* @__PURE__ */ jsx8(Text8, { bold: true, children: "Open" }),
          /* @__PURE__ */ jsx8(Text8, { color: "cyan", wrap: "truncate-end", children: devUrl })
        ] })
      ] }) : /* @__PURE__ */ jsxs8(Box7, { flexDirection: "column", flexShrink: 0, children: [
        /* @__PURE__ */ jsx8(Text8, { bold: true, children: "Open" }),
        /* @__PURE__ */ jsx8(Text8, { color: "cyan", wrap: "truncate-end", children: devUrl })
      ] }),
      /* @__PURE__ */ jsxs8(
        Box7,
        {
          flexDirection: "column",
          flexGrow: 1,
          minWidth: 28,
          marginTop: qrLines.length > 0 ? 2 : 0,
          children: [
            /* @__PURE__ */ jsxs8(Text8, { children: [
              "Port: ",
              /* @__PURE__ */ jsx8(Text8, { color: "cyan", children: port }),
              " \xB7 LAN: ",
              /* @__PURE__ */ jsx8(Text8, { color: "cyan", children: lanIp })
            ] }),
            /* @__PURE__ */ jsx8(Text8, { dimColor: true, wrap: "truncate-end", children: bundlePath }),
            /* @__PURE__ */ jsxs8(Text8, { dimColor: true, wrap: "truncate-end", children: [
              devUrl,
              "/meta.json"
            ] }),
            /* @__PURE__ */ jsx8(Text8, { dimColor: true, wrap: "truncate-end", children: wsUrl }),
            bonjour ? /* @__PURE__ */ jsx8(Text8, { dimColor: true, children: "mDNS: _tamer._tcp" }) : null,
            /* @__PURE__ */ jsxs8(Box7, { marginTop: 1, flexDirection: "column", children: [
              /* @__PURE__ */ jsx8(Text8, { bold: true, children: "Build" }),
              buildPhase === "building" ? /* @__PURE__ */ jsx8(TuiSpinner, { label: "building\u2026" }) : buildPhase === "error" ? /* @__PURE__ */ jsx8(Text8, { color: "red", children: buildError ?? "Build failed" }) : buildPhase === "success" ? /* @__PURE__ */ jsx8(Text8, { color: "green", children: "Lynx bundle ready" }) : /* @__PURE__ */ jsx8(Text8, { dimColor: true, children: "\u2014" })
            ] }),
            /* @__PURE__ */ jsxs8(Box7, { marginTop: 1, flexDirection: "column", children: [
              /* @__PURE__ */ jsx8(Text8, { bold: true, children: "Connections" }),
              /* @__PURE__ */ jsxs8(Text8, { dimColor: true, children: [
                "WebSocket clients: ",
                wsConnections
              ] })
            ] })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx8(Box7, { marginTop: 1, children: /* @__PURE__ */ jsx8(Text8, { dimColor: true, children: "r rebuild \xB7 c clear output \xB7 Ctrl+C or q quit" }) }),
    logLines.length > 0 ? /* @__PURE__ */ jsxs8(Box7, { marginTop: 1, flexDirection: "column", children: [
      logLines.length > LOG_DISPLAY_MAX ? /* @__PURE__ */ jsxs8(Text8, { dimColor: true, children: [
        "\u2026 ",
        logLines.length - LOG_DISPLAY_MAX,
        " earlier lines omitted"
      ] }) : null,
      logLines.slice(-LOG_DISPLAY_MAX).map((line, i) => /* @__PURE__ */ jsx8(Text8, { children: line }, i))
    ] }) : null
  ] });
}

// src/common/tui/hooks/useInputState.ts
import { useState as useState2, useCallback } from "react";

// src/common/tui/hooks/useValidation.ts
function isValidAndroidPackage(name) {
  const s = name.trim();
  if (!s) return false;
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(s);
}
function isValidIosBundleId(id) {
  const s = id.trim();
  if (!s) return false;
  return /^[a-zA-Z][a-zA-Z0-9_-]*(\.[a-zA-Z0-9][a-zA-Z0-9_-]*)+$/.test(s);
}

// src/common/tui/hooks/useServerStatus.ts
import { useState as useState3, useCallback as useCallback2 } from "react";

// src/common/pickOne.tsx
import { jsx as jsx9 } from "react/jsx-runtime";
async function pickOne(label, items) {
  return new Promise((resolve) => {
    let inst;
    const App = () => /* @__PURE__ */ jsx9(
      TuiSelectInput,
      {
        label,
        items,
        onSelect: (value) => {
          inst.unmount();
          resolve(value);
        }
      }
    );
    inst = render(/* @__PURE__ */ jsx9(App, {}));
  });
}
function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

// src/android/build.ts
function listAdbDevices() {
  try {
    const out = execSync4("adb devices -l", { encoding: "utf8" });
    const lines = out.split("\n").slice(1);
    const result = [];
    for (const line of lines) {
      const m = line.match(/^(\S+)\s+device\s/);
      if (m) {
        const serial = m[1];
        const model = line.match(/model:(\S+)/)?.[1];
        result.push({ serial, model });
      }
    }
    return result;
  } catch {
    return [];
  }
}
async function resolveAdbSerial() {
  const devices = listAdbDevices();
  if (devices.length === 0) {
    console.error("\u274C No Android device/emulator connected. Check `adb devices`.");
    process.exit(1);
  }
  if (devices.length === 1) return devices[0].serial;
  if (!isInteractive()) {
    console.error(
      "\u274C Multiple adb devices connected. Connect only one device, or run in an interactive terminal to pick a device."
    );
    process.exit(1);
  }
  return pickOne(
    "Select a device:",
    devices.map((d) => ({
      label: d.model ? `${d.model} \u2014 ${d.serial}` : d.serial,
      value: d.serial
    }))
  );
}
async function buildApk(opts = {}) {
  let resolved;
  try {
    resolved = resolveHostPaths();
  } catch (error) {
    throw error;
  }
  const release = opts.release === true || opts.production === true;
  await bundle_default({ release, production: opts.production });
  const { androidDir, projectRoot } = resolved;
  cleanTamerAndroidLibBuildsIfVersionsChanged(projectRoot);
  const gradlew = path16.join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");
  const variant = release ? "Release" : "Debug";
  let adbSerial;
  if (opts.install) {
    adbSerial = await resolveAdbSerial();
  }
  const task = opts.install ? `install${variant}` : `assemble${variant}`;
  console.log(`
\u{1F528} Building ${variant.toLowerCase()} APK${opts.install ? " and installing" : ""}...`);
  if (opts.clean === true) {
    console.log("\u2139\uFE0F  Running Gradle clean (--clean)...");
    execSync4(`"${gradlew}" clean`, { stdio: "inherit", cwd: androidDir });
  }
  const env = adbSerial !== void 0 ? { ...process.env, ANDROID_SERIAL: adbSerial } : process.env;
  execSync4(`"${gradlew}" ${task}`, { stdio: "inherit", cwd: androidDir, env });
  console.log(`\u2705 APK ${opts.install ? "installed" : "built"} successfully.`);
  if (opts.install && adbSerial) {
    const packageName = resolved.config.android?.packageName;
    if (packageName) {
      try {
        console.log(`\u{1F680} Launching ${packageName}...`);
        execSync4(`adb -s "${adbSerial}" shell am start -n ${packageName}/.MainActivity`, {
          stdio: "inherit"
        });
        console.log("\u2705 App launched.");
      } catch {
        console.warn("\u26A0\uFE0F Could not launch app.");
      }
    } else {
      console.log('\u2139\uFE0F Set "android.packageName" in tamer.config.json to auto-launch.');
    }
  }
}
var build_default = buildApk;

// src/ios/create.ts
import fs18 from "fs";
import path18 from "path";

// src/ios/getPod.ts
import { execSync as execSync5 } from "child_process";
import fs16 from "fs";
import path17 from "path";
function isCocoaPodsInstalled() {
  try {
    execSync5("command -v pod >/dev/null 2>&1");
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
    const podfilePath = path17.join(rootDir, "Podfile");
    if (!fs16.existsSync(podfilePath)) {
      throw new Error(`Podfile not found at ${podfilePath}`);
    }
    console.log(`\u{1F680} Executing pod install in: ${rootDir}`);
    try {
      execSync5("pod install", {
        cwd: rootDir,
        stdio: "inherit"
      });
    } catch {
      console.log("\u2139\uFE0F Retrying CocoaPods install with repo update...");
      execSync5("pod install --repo-update", {
        cwd: rootDir,
        stdio: "inherit"
      });
    }
    console.log("\u2705 CocoaPods dependencies installed successfully.");
  } catch (err) {
    console.error("\u274C Failed to install CocoaPods dependencies.", err.message);
    process.exit(1);
  }
}

// src/ios/create.ts
import { randomBytes } from "crypto";

// src/ios/iosBuildSpeed.ts
import fs17 from "fs";
var PODFILE_POST_INSTALL_BUILD_SPEED_RUBY = [
  "        # TAMER_BUILD_SPEED_START",
  "        if config.name == 'Debug'",
  "          config.build_settings['COMPILER_INDEX_STORE_ENABLE'] = 'NO'",
  "        end",
  "        if ENV['TAMER_CCACHE'] == '1' || ENV['USE_CCACHE'] == '1'",
  "          ccache_bin = `which ccache`.strip",
  "          unless ccache_bin.empty?",
  "            clang_bin = `xcrun -f clang`.strip",
  "            clangxx_bin = `xcrun -f clang++`.strip",
  "            clang_bin = 'clang' if clang_bin.empty?",
  "            clangxx_bin = 'clang++' if clangxx_bin.empty?",
  "            if config.name == 'Debug'",
  `              config.build_settings['CC'] = "#{ccache_bin} #{clang_bin}"`,
  `              config.build_settings['CXX'] = "#{ccache_bin} #{clangxx_bin}"`,
  "            end",
  "          end",
  "        end",
  "        # TAMER_BUILD_SPEED_END"
].join("\n");
var PBXPROJ_DEBUG_SPEED_FROM_TO = [
  '				SWIFT_OPTIMIZATION_LEVEL = "-Onone";\n			};',
  '				SWIFT_OPTIMIZATION_LEVEL = "-Onone";\n				COMPILER_INDEX_STORE_ENABLE = NO;\n				SWIFT_COMPILATION_MODE = incremental;\n			};'
];
function patchPbxprojProjectDebugBuildSpeed(pbxprojPath) {
  if (!fs17.existsSync(pbxprojPath)) return false;
  let c = fs17.readFileSync(pbxprojPath, "utf8");
  if (c.includes("COMPILER_INDEX_STORE_ENABLE")) return false;
  const [from, to] = PBXPROJ_DEBUG_SPEED_FROM_TO;
  if (c.includes(from)) {
    c = c.replace(from, to);
    fs17.writeFileSync(pbxprojPath, c, "utf8");
    return true;
  }
  return false;
}

// src/ios/create.ts
function readAndSubstituteTemplate3(templatePath, vars) {
  const raw = fs18.readFileSync(templatePath, "utf-8");
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
    raw
  );
}
var create2 = () => {
  const generateId = () => randomBytes(12).toString("hex").toUpperCase();
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
  const rootDir = path18.join(process.cwd(), iosDir);
  const projectDir = path18.join(rootDir, appName);
  const xcodeprojDir = path18.join(rootDir, `${appName}.xcodeproj`);
  const bridgingHeader = `${appName}-Bridging-Header.h`;
  function writeFile2(filePath, content) {
    fs18.mkdirSync(path18.dirname(filePath), { recursive: true });
    fs18.writeFileSync(filePath, content.trimStart(), "utf8");
  }
  if (fs18.existsSync(rootDir)) {
    console.log(`\u{1F9F9} Removing existing directory: ${rootDir}`);
    fs18.rmSync(rootDir, { recursive: true, force: true });
  }
  console.log(`\u{1F680} Creating a new Tamer4Lynx project in: ${rootDir}`);
  const ids = {
    project: generateId(),
    mainGroup: generateId(),
    appGroup: generateId(),
    productsGroup: generateId(),
    frameworksGroup: generateId(),
    appFile: generateId(),
    appDelegateRef: generateId(),
    sceneDelegateRef: generateId(),
    sceneDelegateBaseRef: generateId(),
    viewControllerRef: generateId(),
    assetsRef: generateId(),
    lynxProviderRef: generateId(),
    lynxInitRef: generateId(),
    bridgingHeaderRef: generateId(),
    nativeTarget: generateId(),
    appDelegateBuildFile: generateId(),
    sceneDelegateBuildFile: generateId(),
    sceneDelegateSourceBuildFile: generateId(),
    viewControllerBuildFile: generateId(),
    lynxProviderBuildFile: generateId(),
    lynxInitBuildFile: generateId(),
    assetsBuildFile: generateId(),
    frameworksBuildPhase: generateId(),
    resourcesBuildPhase: generateId(),
    sourcesBuildPhase: generateId(),
    projectBuildConfigList: generateId(),
    targetBuildConfigList: generateId(),
    projectDebugConfig: generateId(),
    projectReleaseConfig: generateId(),
    targetDebugConfig: generateId(),
    targetReleaseConfig: generateId()
  };
  writeFile2(path18.join(rootDir, "Podfile"), `
source 'https://cdn.cocoapods.org/'

install! 'cocoapods', :incremental_installation => true, :generate_multiple_pod_projects => true

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

  pod 'XElement', '3.6.0'

  # GENERATED AUTOLINK DEPENDENCIES START
  # This section is automatically generated by Tamer4Lynx.
  # Manual edits will be overwritten.
  # GENERATED AUTOLINK DEPENDENCIES END
end

post_install do |installer|
  pod_xcode_projects = if installer.pods_project
    [installer.pods_project]
  elsif installer.respond_to?(:generated_projects) && !installer.generated_projects.empty?
    installer.generated_projects
  else
    []
  end
  pod_xcode_projects.each do |project|
    project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['ONLY_ACTIVE_ARCH'] = 'YES'
${PODFILE_POST_INSTALL_BUILD_SPEED_RUBY}
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
            '-Wno-enum-conversion',
            '-Wno-error'
          ].join(' ')

          config.build_settings['OTHER_CPLUSPLUSFLAGS'] = "$(inherited) #{flags}"
          config.build_settings['OTHER_CFLAGS'] = "$(inherited) #{flags}"
          config.build_settings['CLANG_WARN_VLA'] = 'NO'
          config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
          config.build_settings['CLANG_WARN_ENUM_CONVERSION'] = 'NO'
        end
      end
      if target.name == 'PrimJS'
        target.build_configurations.each do |config|
          config.build_settings['OTHER_CFLAGS'] = "$(inherited) -Wno-macro-redefined"
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] = "$(inherited) -Wno-macro-redefined"
        end
      end
    end
  end
  Dir.glob(File.join(installer.sandbox.root, 'Target Support Files', 'Lynx', '*.xcconfig')).each do |xcconfig_path|
    next unless File.file?(xcconfig_path)
    content = File.read(xcconfig_path)
    next unless content.include?('-Werror')
    File.write(xcconfig_path, content.gsub('-Werror', ''))
  end
  Dir.glob(File.join(installer.sandbox.root, 'Lynx/platform/darwin/**/*.{m,mm}')).each do |lynx_source|
    next unless File.file?(lynx_source)
    content = File.read(lynx_source)
    next unless content.match?(/\\btypeof\\(/)
    File.chmod(0644, lynx_source) rescue nil
    File.write(lynx_source, content.gsub(/\\btypeof\\(/, '__typeof__('))
  end
end
	`);
  const hostPkg = findTamerHostPackage(process.cwd());
  const templateVars = { PACKAGE_NAME: bundleId, APP_NAME: appName, BUNDLE_ID: bundleId };
  if (hostPkg) {
    const templateDir = path18.join(hostPkg, "ios", "templates");
    for (const f of ["AppDelegate.swift", "SceneDelegate.swift", "ViewController.swift", "LynxProvider.swift", "LynxInitProcessor.swift"]) {
      const srcPath = path18.join(templateDir, f);
      if (fs18.existsSync(srcPath)) {
        writeFile2(path18.join(projectDir, f), readAndSubstituteTemplate3(srcPath, templateVars));
      }
    }
  } else {
    writeFile2(path18.join(projectDir, "AppDelegate.swift"), `
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
    writeFile2(path18.join(projectDir, "SceneDelegate.swift"), `
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
    writeFile2(path18.join(projectDir, "ViewController.swift"), `
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
	if #available(iOS 15.0, *) {
		viewRespectsSystemMinimumLayoutMargins = false
	}
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
	TamerInsetsModule.attachHostView(lv)
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
    writeFile2(path18.join(projectDir, "LynxProvider.swift"), `
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
    writeFile2(path18.join(projectDir, "LynxInitProcessor.swift"), `
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
  writeFile2(path18.join(projectDir, bridgingHeader), `
#import <Lynx/LynxConfig.h>
#import <Lynx/LynxEnv.h>
#import <Lynx/LynxTemplateProvider.h>
#import <Lynx/LynxView.h>
#import <Lynx/LynxModule.h>
#import <SDWebImage/SDWebImage.h>
#import <SDWebImageWebPCoder/SDWebImageWebPCoder.h>
	`);
  writeFile2(path18.join(projectDir, "Info.plist"), `
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
  const appIconDir = path18.join(projectDir, "Assets.xcassets", "AppIcon.appiconset");
  fs18.mkdirSync(appIconDir, { recursive: true });
  const iconPaths = resolveIconPaths(process.cwd(), config);
  if (applyIosAppIconAssets(appIconDir, iconPaths)) {
    console.log(iconPaths?.ios ? "\u2705 Copied iOS icon from tamer.config.json icon.ios" : "\u2705 Copied app icon from tamer.config.json icon.source");
  } else {
    writeFile2(path18.join(appIconDir, "Contents.json"), `
{
  "images" : [ { "idiom" : "universal", "platform" : "ios", "size" : "1024x1024" } ],
  "info" : { "author" : "xcode", "version" : 1 }
}
	`);
  }
  fs18.mkdirSync(xcodeprojDir, { recursive: true });
  writeFile2(path18.join(xcodeprojDir, "project.pbxproj"), `
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
				TargetAttributes = {
					${ids.nativeTarget} = {
						CreatedOnToolsVersion = 15.3;
						ProvisioningStyle = Automatic;
					};
				};
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
				COMPILER_INDEX_STORE_ENABLE = NO;
				SWIFT_COMPILATION_MODE = incremental;
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
				CODE_SIGN_STYLE = Automatic;
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
				CODE_SIGN_STYLE = Automatic;
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
import fs21 from "fs";
import path21 from "path";
import { execSync as execSync7 } from "child_process";

// src/common/hostNativeModulesManifest.ts
var TAMER_HOST_NATIVE_MODULES_FILENAME = "tamer-host-native-modules.json";
function buildHostNativeModulesManifestJson(moduleClassNames) {
  return `${JSON.stringify({ moduleClassNames }, null, 2)}
`;
}

// src/ios/syncHost.ts
import fs20 from "fs";
import path20 from "path";
import crypto from "crypto";

// src/common/iosSigningDiscovery.ts
import fs19 from "fs";
import path19 from "path";
import os3 from "os";
import { execSync as execSync6 } from "child_process";
function run(cmd, opts = {}) {
  return execSync6(cmd, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    cwd: opts.cwd
  }).trim();
}
function listCodeSigningIdentities() {
  try {
    const out = run("security find-identity -v -p codesigning");
    const lines = out.split("\n");
    const result = [];
    for (const line of lines) {
      const m = line.match(/^\s*\d+\)\s+([0-9A-F]{40})\s+"(.+)"\s*$/);
      if (m) {
        result.push({ sha1: m[1], label: m[2] });
      }
    }
    return result;
  } catch {
    return [];
  }
}
function extractTeamIdFromIdentityLabel(label) {
  const m = label.match(/\(([A-Z0-9]{10})\)/);
  return m?.[1] ?? null;
}
function teamIdFromCertificateSha1(sha1) {
  try {
    const pem = execSync6(`security find-certificate -a -Z ${sha1} -p`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    if (!pem.includes("BEGIN CERTIFICATE")) return null;
    const subject = execSync6("openssl x509 -noout -subject -nameopt RFC2253", {
      input: pem,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    for (const m of subject.matchAll(/OU\s*=\s*([A-Z0-9]{10})/g)) {
      if (m[1]) return m[1];
    }
    const legacy = subject.match(/OU=([A-Z0-9]{10})/);
    return legacy?.[1] ?? null;
  } catch {
    return null;
  }
}
function resolveDevelopmentTeamFromIdentity(identity) {
  return teamIdFromCertificateSha1(identity.sha1) ?? extractTeamIdFromIdentityLabel(identity.label) ?? "";
}
function decodeProvisioningProfilePlist(filePath) {
  try {
    const xml = execSync6(`security cms -D -i "${filePath}"`, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const tmp = path19.join(os3.tmpdir(), `t4l-prov-${path19.basename(filePath)}.plist`);
    fs19.writeFileSync(tmp, xml, "utf8");
    const json = execSync6(`plutil -convert json -o - "${tmp}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    fs19.unlinkSync(tmp);
    return JSON.parse(json);
  } catch {
    return null;
  }
}
function listProvisioningProfiles(bundleIdFilter) {
  const dir = path19.join(
    os3.homedir(),
    "Library/MobileDevice/Provisioning Profiles"
  );
  if (!fs19.existsSync(dir)) return [];
  const files = fs19.readdirSync(dir).filter((f) => f.endsWith(".mobileprovision"));
  const out = [];
  for (const f of files) {
    const filePath = path19.join(dir, f);
    const plist = decodeProvisioningProfilePlist(filePath);
    if (!plist) continue;
    const uuid = String(plist.UUID ?? "");
    const name = String(plist.Name ?? uuid);
    const teamIds = Array.isArray(plist.TeamIdentifier) ? plist.TeamIdentifier : [];
    const ent = plist.Entitlements;
    const appId = String(ent?.["application-identifier"] ?? "");
    const parts = appId.split(".");
    const patterns = appId ? [appId, parts.length > 1 ? parts.slice(1).join(".") : appId] : [];
    const exp = plist.ExpirationDate;
    const info = {
      filePath,
      uuid,
      name,
      teamIds,
      applicationIdentifier: appId,
      appIdPatterns: patterns.filter(Boolean),
      expiration: exp
    };
    if (bundleIdFilter?.trim()) {
      const bid = bundleIdFilter.trim();
      const matches = appId === bid || appId.endsWith(`.${bid}`) || appId.includes(`.${bid}`) || patterns.some((p) => p === bid || p.endsWith(bid));
      if (!matches && appId) continue;
    }
    out.push(info);
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

// src/ios/syncHost.ts
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
  let content = fs20.readFileSync(pbxprojPath, "utf8");
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
  fs20.writeFileSync(pbxprojPath, content, "utf8");
  console.log("\u2705 Registered LaunchScreen.storyboard in Xcode project");
}
function addSwiftSourceToXcodeProject(pbxprojPath, appName, filename) {
  let content = fs20.readFileSync(pbxprojPath, "utf8");
  const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`path = "?${escaped}"?;`).test(content)) return;
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
  fs20.writeFileSync(pbxprojPath, content, "utf8");
  console.log(`\u2705 Registered ${filename} in Xcode project sources`);
}
function addResourceToXcodeProject(pbxprojPath, appName, filename) {
  let content = fs20.readFileSync(pbxprojPath, "utf8");
  const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`path = "?${escaped}"?;`).test(content)) return;
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
  fs20.writeFileSync(pbxprojPath, content, "utf8");
  console.log(`\u2705 Registered ${filename} in Xcode project resources`);
}
function writeFile(filePath, content) {
  fs20.mkdirSync(path20.dirname(filePath), { recursive: true });
  fs20.writeFileSync(filePath, content, "utf8");
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
        if #available(iOS 15.0, *) {
            viewRespectsSystemMinimumLayoutMargins = false
        }
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
        TamerInsetsModule.attachHostView(lv)
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
import tamersystemui

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
        if #available(iOS 15.0, *) {
            viewRespectsSystemMinimumLayoutMargins = false
        }
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

    override var preferredStatusBarStyle: UIStatusBarStyle { SystemUIModule.statusBarStyleForHost }

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
        TamerInsetsModule.attachHostView(lv)
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
  if (!fs20.existsSync(infoPlistPath)) return;
  let content = fs20.readFileSync(infoPlistPath, "utf8");
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
  fs20.writeFileSync(infoPlistPath, content, "utf8");
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
    const tplPath = path20.join(devClientPkg, "ios", "templates", templateName);
    if (fs20.existsSync(tplPath)) {
      let content = fs20.readFileSync(tplPath, "utf8");
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
  const release = opts?.release === true;
  const devClientPkg = findDevClientPackage(resolved.projectRoot);
  const useDevClient = opts?.includeDevClient ?? (!release && !!devClientPkg);
  if (!appName) {
    throw new Error('"ios.appName" must be defined in tamer.config.json');
  }
  const projectDir = path20.join(resolved.iosDir, appName);
  const infoPlistPath = path20.join(projectDir, "Info.plist");
  if (!fs20.existsSync(projectDir)) {
    throw new Error(`iOS project not found at ${projectDir}. Run \`tamer ios create\` first.`);
  }
  const pbxprojPath = path20.join(resolved.iosDir, `${appName}.xcodeproj`, "project.pbxproj");
  const baseLprojDir = path20.join(projectDir, "Base.lproj");
  const launchScreenPath = path20.join(baseLprojDir, "LaunchScreen.storyboard");
  if (fs20.existsSync(pbxprojPath)) {
    let pbx = fs20.readFileSync(pbxprojPath, "utf8");
    let changed = false;
    if (!pbx.includes("CODE_SIGN_STYLE")) {
      pbx = pbx.replace(
        /(\bASSETCATALOG_COMPILER_APPICON_NAME\b[^\n]*\n)/g,
        "$1				CODE_SIGN_STYLE = Automatic;\n"
      );
      changed = true;
    }
    const signingCfg = resolved.config.ios?.signing;
    let teamId = signingCfg?.developmentTeam?.trim() || "";
    if (!teamId && signingCfg?.codeSignIdentity?.trim()) {
      const idents = listCodeSigningIdentities();
      const match = idents.find((i) => i.label === signingCfg.codeSignIdentity.trim());
      if (match) teamId = resolveDevelopmentTeamFromIdentity(match);
    }
    if (teamId) {
      if (!pbx.includes("DEVELOPMENT_TEAM")) {
        pbx = pbx.replace(
          /(\bCODE_SIGN_STYLE = Automatic;\n)/g,
          `$1				DEVELOPMENT_TEAM = ${teamId};
`
        );
        changed = true;
      }
      if (!pbx.includes("TargetAttributes")) {
        const nativeTargetMatch = pbx.match(
          /([A-F0-9]{24})\s*\/\*\s*\S+\s*\*\/\s*=\s*\{\s*isa\s*=\s*PBXNativeTarget;/
        );
        if (nativeTargetMatch) {
          pbx = pbx.replace(
            /(LastUpgradeCheck\s*=\s*\d+;)/,
            `$1
				TargetAttributes = {
					${nativeTargetMatch[1]} = {
						DevelopmentTeam = ${teamId};
						ProvisioningStyle = Automatic;
					};
				};`
          );
          changed = true;
        }
      }
    }
    if (changed) {
      fs20.writeFileSync(pbxprojPath, pbx, "utf8");
    }
  }
  patchInfoPlist(infoPlistPath);
  writeFile(path20.join(projectDir, "AppDelegate.swift"), getAppDelegateSwift());
  writeFile(path20.join(projectDir, "SceneDelegate.swift"), getSceneDelegateSwift());
  if (!fs20.existsSync(launchScreenPath)) {
    fs20.mkdirSync(baseLprojDir, { recursive: true });
    writeFile(launchScreenPath, getLaunchScreenStoryboard());
    addLaunchScreenToXcodeProject(pbxprojPath, appName);
  }
  addSwiftSourceToXcodeProject(pbxprojPath, appName, "SceneDelegate.swift");
  if (useDevClient) {
    const devClientPkg2 = findDevClientPackage(resolved.projectRoot);
    const segment = resolved.lynxProjectDir.split("/").filter(Boolean).pop() ?? "";
    const tplVars = { PROJECT_BUNDLE_SEGMENT: segment };
    writeFile(path20.join(projectDir, "ViewController.swift"), getDevViewControllerSwift());
    writeFile(path20.join(projectDir, "LynxProvider.swift"), getSimpleLynxProviderSwift());
    addSwiftSourceToXcodeProject(pbxprojPath, appName, "LynxProvider.swift");
    const devTPContent = readTemplateOrFallback(devClientPkg2, "DevTemplateProvider.swift", "", tplVars);
    if (devTPContent) {
      writeFile(path20.join(projectDir, "DevTemplateProvider.swift"), devTPContent);
      addSwiftSourceToXcodeProject(pbxprojPath, appName, "DevTemplateProvider.swift");
    }
    const projectVCContent = readTemplateOrFallback(devClientPkg2, "ProjectViewController.swift", "", tplVars);
    if (projectVCContent) {
      writeFile(path20.join(projectDir, "ProjectViewController.swift"), projectVCContent);
      addSwiftSourceToXcodeProject(pbxprojPath, appName, "ProjectViewController.swift");
    }
    const devCMContent = readTemplateOrFallback(devClientPkg2, "DevClientManager.swift", "", tplVars);
    if (devCMContent) {
      writeFile(path20.join(projectDir, "DevClientManager.swift"), devCMContent);
      addSwiftSourceToXcodeProject(pbxprojPath, appName, "DevClientManager.swift");
    }
    const qrContent = readTemplateOrFallback(devClientPkg2, "QRScannerViewController.swift", "", tplVars);
    if (qrContent) {
      writeFile(path20.join(projectDir, "QRScannerViewController.swift"), qrContent);
      addSwiftSourceToXcodeProject(pbxprojPath, appName, "QRScannerViewController.swift");
    }
    console.log("\u2705 Synced iOS host app (embedded dev mode) \u2014 ViewController, DevTemplateProvider, ProjectViewController, DevClientManager, QRScannerViewController");
  } else {
    writeFile(path20.join(projectDir, "ViewController.swift"), getViewControllerSwift());
    writeFile(path20.join(projectDir, "LynxProvider.swift"), getSimpleLynxProviderSwift());
    addSwiftSourceToXcodeProject(pbxprojPath, appName, "LynxProvider.swift");
    console.log("\u2705 Synced iOS host app controller files");
  }
}
var syncHost_default = syncHostIos;

// src/ios/autolink.ts
var autolink2 = (syncHostOpts) => {
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
    if (!fs21.existsSync(filePath)) {
      console.warn(`\u26A0\uFE0F File not found, skipping update: ${filePath}`);
      return;
    }
    let fileContent = fs21.readFileSync(filePath, "utf8");
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
      console.warn(`\u26A0\uFE0F Could not find autolink markers in ${path21.basename(filePath)}. Appending to the end of the file.`);
      fileContent += `
${replacementBlock}
`;
    }
    fs21.writeFileSync(filePath, fileContent, "utf8");
    console.log(`\u2705 Updated autolinked section in ${path21.basename(filePath)}`);
  }
  function resolvePodDirectory(pkg) {
    const configuredDir = path21.join(pkg.packagePath, pkg.config.ios?.podspecPath || ".");
    if (fs21.existsSync(configuredDir)) {
      return configuredDir;
    }
    const iosDir = path21.join(pkg.packagePath, "ios");
    if (fs21.existsSync(iosDir)) {
      const stack = [iosDir];
      while (stack.length > 0) {
        const current = stack.pop();
        try {
          const entries = fs21.readdirSync(current, { withFileTypes: true });
          const podspec = entries.find((entry) => entry.isFile() && entry.name.endsWith(".podspec"));
          if (podspec) {
            return current;
          }
          for (const entry of entries) {
            if (entry.isDirectory()) {
              stack.push(path21.join(current, entry.name));
            }
          }
        } catch {
        }
      }
    }
    return configuredDir;
  }
  function resolvePodName(pkg) {
    const fullPodspecDir = resolvePodDirectory(pkg);
    if (fs21.existsSync(fullPodspecDir)) {
      try {
        const files = fs21.readdirSync(fullPodspecDir);
        const podspecFile = files.find((f) => f.endsWith(".podspec"));
        if (podspecFile) return podspecFile.replace(".podspec", "");
      } catch {
      }
    }
    return pkg.name.split("/").pop().replace(/-/g, "");
  }
  function updatePodfile(packages) {
    const podfilePath = path21.join(iosProjectPath, "Podfile");
    let scriptContent = `  # This section is automatically generated by Tamer4Lynx.
  # Manual edits will be overwritten.`;
    const iosPackages = packages.filter((p) => p.config.ios);
    if (iosPackages.length > 0) {
      iosPackages.forEach((pkg) => {
        const relativePath = path21.relative(iosProjectPath, resolvePodDirectory(pkg));
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
  function ensureXElementPod() {
    const podfilePath = path21.join(iosProjectPath, "Podfile");
    if (!fs21.existsSync(podfilePath)) return;
    let content = fs21.readFileSync(podfilePath, "utf8");
    if (content.includes("pod 'XElement'")) return;
    const lynxVersionMatch = content.match(/pod\s+'Lynx',\s*'([^']+)'/);
    const lynxVersion = lynxVersionMatch?.[1] ?? "3.6.0";
    const xelementBlock = `  pod 'XElement', '${lynxVersion}'

  `;
    if (content.includes("# GENERATED AUTOLINK DEPENDENCIES START")) {
      content = content.replace(
        /(# GENERATED AUTOLINK DEPENDENCIES START)/,
        `${xelementBlock}$1`
      );
    } else {
      const insertAfter = /pod\s+'LynxService'[^\n]*(?:\n\s*'[^']*',?\s*)*/;
      const serviceMatch = content.match(insertAfter);
      if (serviceMatch) {
        const idx = serviceMatch.index + serviceMatch[0].length;
        content = content.slice(0, idx) + `
  pod 'XElement', '${lynxVersion}'` + content.slice(idx);
      } else {
        content += `
  pod 'XElement', '${lynxVersion}'
`;
      }
    }
    fs21.writeFileSync(podfilePath, content, "utf8");
    console.log(`\u2705 Added XElement pod (v${lynxVersion}) to Podfile`);
  }
  function ensureLynxDevToolPods(packages) {
    const hasDevClient = packages.some(
      (p) => p.name === "@tamer4lynx/tamer-dev-client" || p.name === "tamer-dev-client"
    );
    if (!hasDevClient) return;
    const podfilePath = path21.join(iosProjectPath, "Podfile");
    if (!fs21.existsSync(podfilePath)) return;
    let content = fs21.readFileSync(podfilePath, "utf8");
    if (content.includes("pod 'LynxDevtool'") || content.includes('pod "LynxDevtool"')) return;
    const lynxVersionMatch = content.match(/pod\s+'Lynx',\s*'([^']+)'/);
    const lynxVersion = lynxVersionMatch?.[1] ?? "3.6.0";
    if (!content.includes("'Devtool'") && !content.includes('"Devtool"')) {
      content = content.replace(
        /(\s+'Http',\s*\n)(\s*\])/,
        "$1    'Devtool',\n$2"
      );
    }
    const devtoolLine = `  pod 'LynxDevtool', '${lynxVersion}'

  `;
    if (content.includes("# GENERATED AUTOLINK DEPENDENCIES START")) {
      content = content.replace(/(# GENERATED AUTOLINK DEPENDENCIES START)/, `${devtoolLine}$1`);
    } else {
      const insertAfter = /pod\s+'LynxService'[^\n]*(?:\n\s*'[^']*',?\s*)*\]\s*/;
      const serviceMatch = content.match(insertAfter);
      if (serviceMatch) {
        const idx = serviceMatch.index + serviceMatch[0].length;
        content = content.slice(0, idx) + `
  pod 'LynxDevtool', '${lynxVersion}'` + content.slice(idx);
      } else {
        content += `
  pod 'LynxDevtool', '${lynxVersion}'
`;
      }
    }
    fs21.writeFileSync(podfilePath, content, "utf8");
    console.log(`\u2705 Added Lynx DevTool pods (v${lynxVersion}) to Podfile`);
  }
  function ensureMultiProjectSafePostInstall() {
    const podfilePath = path21.join(iosProjectPath, "Podfile");
    if (!fs21.existsSync(podfilePath)) return;
    let content = fs21.readFileSync(podfilePath, "utf8");
    if (content.includes("pod_xcode_projects.each do |project|")) return;
    if (!content.includes("installer.pods_project.targets.each do |target|")) return;
    const opening = /post_install do \|installer\|\r?\n\s*installer\.pods_project\.targets\.each do \|target\|/;
    if (!opening.test(content)) return;
    content = content.replace(
      opening,
      `post_install do |installer|
  pod_xcode_projects = if installer.pods_project
    [installer.pods_project]
  elsif installer.respond_to?(:generated_projects) && !installer.generated_projects.empty?
    installer.generated_projects
  else
    []
  end
  pod_xcode_projects.each do |project|
    project.targets.each do |target|`
    );
    const closing = /\n  end\n  Dir\.glob\(File\.join\(installer\.sandbox\.root,/;
    if (!closing.test(content)) {
      console.warn(
        "\u26A0\uFE0F Podfile still uses installer.pods_project.targets; could not auto-fix closing `end` before Dir.glob. Edit post_install manually or regenerate ios/Podfile from a fresh `t4l ios create` template."
      );
      return;
    }
    content = content.replace(closing, `
  end
  end
  Dir.glob(File.join(installer.sandbox.root,`);
    fs21.writeFileSync(podfilePath, content, "utf8");
    console.log("\u2705 Migrated Podfile post_install for generate_multiple_pod_projects (nil pods_project).");
  }
  function ensureLynxPatchInPodfile() {
    const podfilePath = path21.join(iosProjectPath, "Podfile");
    if (!fs21.existsSync(podfilePath)) return;
    let content = fs21.readFileSync(podfilePath, "utf8");
    if (content.includes("content.gsub(/\\btypeof\\(/, '__typeof__(')")) return;
    const patch = `
  Dir.glob(File.join(installer.sandbox.root, 'Lynx/platform/darwin/**/*.{m,mm}')).each do |lynx_source|
    next unless File.file?(lynx_source)
    content = File.read(lynx_source)
    next unless content.match?(/\\btypeof\\(/)
    File.chmod(0644, lynx_source) rescue nil
    File.write(lynx_source, content.gsub(/\\btypeof\\(/, '__typeof__('))
  end`;
    content = content.replace(/(\n  end\s*\n)(end\s*)$/, `$1${patch}
$2`);
    fs21.writeFileSync(podfilePath, content, "utf8");
    console.log("\u2705 Added Lynx typeof patch to Podfile post_install.");
  }
  function ensurePodBuildSettings() {
    const podfilePath = path21.join(iosProjectPath, "Podfile");
    if (!fs21.existsSync(podfilePath)) return;
    let content = fs21.readFileSync(podfilePath, "utf8");
    let changed = false;
    if (!content.includes("CLANG_ENABLE_EXPLICIT_MODULES")) {
      content = content.replace(
        /config\.build_settings\['IPHONEOS_DEPLOYMENT_TARGET'\]\s*=\s*'[^']*'/,
        `$&
      config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
      config.build_settings['ONLY_ACTIVE_ARCH'] = 'YES'`
      );
      changed = true;
    }
    if (!content.includes("gsub('-Werror'")) {
      const xcconfigStrip = `
  Dir.glob(File.join(installer.sandbox.root, 'Target Support Files', 'Lynx', '*.xcconfig')).each do |xcconfig_path|
    next unless File.file?(xcconfig_path)
    content = File.read(xcconfig_path)
    next unless content.include?('-Werror')
    File.write(xcconfig_path, content.gsub('-Werror', ''))
  end`;
      content = content.replace(
        /(Dir\.glob.*?Lynx\/platform\/darwin)/s,
        `${xcconfigStrip}
  $1`
      );
      changed = true;
    }
    if (!content.includes("target.name == 'PrimJS'") && content.includes("target.name == 'Lynx'")) {
      const primjsBlock = `
    if target.name == 'PrimJS'
      target.build_configurations.each do |config|
        config.build_settings['OTHER_CFLAGS'] = "$(inherited) -Wno-macro-redefined"
        config.build_settings['OTHER_CPLUSPLUSFLAGS'] = "$(inherited) -Wno-macro-redefined"
      end
    end`;
      content = content.replace(
        /(    end)\n(  end)\n(  Dir\.glob\(File\.join\(installer\.sandbox\.root,\s*'Target Support Files',\s*'Lynx')/,
        `$1${primjsBlock}
  $2
  $3`
      );
      changed = true;
    }
    if (changed) {
      fs21.writeFileSync(podfilePath, content, "utf8");
      console.log("\u2705 Added Xcode compatibility build settings to Podfile post_install.");
    }
  }
  function ensurePodfileBuildSpeedBlock() {
    const podfilePath = path21.join(iosProjectPath, "Podfile");
    if (!fs21.existsSync(podfilePath)) return;
    let content = fs21.readFileSync(podfilePath, "utf8");
    if (content.includes("# TAMER_BUILD_SPEED_START")) return;
    const needle = "config.build_settings['ONLY_ACTIVE_ARCH'] = 'YES'";
    const idx = content.indexOf(needle);
    if (idx === -1) return;
    const insertAt = idx + needle.length;
    content = `${content.slice(0, insertAt)}
${PODFILE_POST_INSTALL_BUILD_SPEED_RUBY}${content.slice(insertAt)}`;
    fs21.writeFileSync(podfilePath, content, "utf8");
    console.log("\u2705 Added iOS build-speed settings to Podfile (Debug index store + optional ccache).");
  }
  function ensurePbxprojBuildSpeed() {
    const appName = resolved.config.ios?.appName;
    if (!appName) return;
    const pbxPath = path21.join(iosProjectPath, `${appName}.xcodeproj`, "project.pbxproj");
    if (patchPbxprojProjectDebugBuildSpeed(pbxPath)) {
      console.log("\u2705 Added Debug build-speed settings to Xcode project (Swift incremental + index store).");
    }
  }
  function updateLynxInitProcessor(packages) {
    const appNameFromConfig = resolved.config.ios?.appName;
    const candidatePaths = [];
    if (appNameFromConfig) {
      candidatePaths.push(path21.join(iosProjectPath, appNameFromConfig, "LynxInitProcessor.swift"));
    }
    candidatePaths.push(path21.join(iosProjectPath, "LynxInitProcessor.swift"));
    const found = candidatePaths.find((p) => fs21.existsSync(p));
    const lynxInitPath = found ?? candidatePaths[0];
    const iosPackages = packages.filter((p) => getIosModuleClassNames(p.config.ios).length > 0 || Object.keys(getIosElements(p.config.ios)).length > 0);
    const seenModules = /* @__PURE__ */ new Set();
    const seenElements = /* @__PURE__ */ new Set();
    const packagesWithContributions = /* @__PURE__ */ new Set();
    for (const pkg of iosPackages) {
      let hasUnique = false;
      for (const cls of getIosModuleClassNames(pkg.config.ios)) {
        if (!seenModules.has(cls)) {
          seenModules.add(cls);
          hasUnique = true;
        } else {
          console.warn(`\u26A0\uFE0F Skipping duplicate module "${cls}" from ${pkg.name} (already registered by another package)`);
        }
      }
      for (const tag of Object.keys(getIosElements(pkg.config.ios))) {
        if (!seenElements.has(tag)) {
          seenElements.add(tag);
          hasUnique = true;
        } else {
          console.warn(`\u26A0\uFE0F Skipping duplicate element "${tag}" from ${pkg.name} (already registered by another package)`);
        }
      }
      if (hasUnique) packagesWithContributions.add(pkg);
    }
    const importPackages = iosPackages.filter((p) => packagesWithContributions.has(p));
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
      const fileContent = fs21.readFileSync(filePath, "utf8");
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
      fs21.writeFileSync(filePath, newContent, "utf8");
      console.log(`\u2705 Updated imports in ${path21.basename(filePath)}`);
    }
    updateImportsSection(lynxInitPath, importPackages);
    if (importPackages.length === 0) {
      const placeholder = "        // No native modules found by Tamer4Lynx autolinker.";
      updateGeneratedSection(lynxInitPath, placeholder, "// GENERATED AUTOLINK START", "// GENERATED AUTOLINK END");
    } else {
      const seenModules2 = /* @__PURE__ */ new Set();
      const seenElements2 = /* @__PURE__ */ new Set();
      const blocks = importPackages.flatMap((pkg) => {
        const classNames = getIosModuleClassNames(pkg.config.ios);
        const moduleBlocks = classNames.filter((cls) => {
          if (seenModules2.has(cls)) return false;
          seenModules2.add(cls);
          return true;
        }).map((classNameRaw) => [
          `        // Register module from package: ${pkg.name}`,
          `        globalConfig.register(${classNameRaw}.self)`
        ].join("\n"));
        const elementBlocks = Object.entries(getIosElements(pkg.config.ios)).filter(([tagName]) => {
          if (seenElements2.has(tagName)) return false;
          seenElements2.add(tagName);
          return true;
        }).map(([tagName, classNameRaw]) => [
          `        // Register element from package: ${pkg.name}`,
          `        globalConfig.registerUI(${classNameRaw}.self, withName: "${tagName}")`
        ].join("\n"));
        return [...moduleBlocks, ...elementBlocks];
      });
      const content = blocks.join("\n\n");
      updateGeneratedSection(lynxInitPath, content, "// GENERATED AUTOLINK START", "// GENERATED AUTOLINK END");
    }
    const hasDevClient = packages.some((p) => p.name === "@tamer4lynx/tamer-dev-client");
    const androidNames = getDedupedAndroidModuleClassNames(packages);
    let devClientSupportedBody;
    if (hasDevClient && androidNames.length > 0) {
      devClientSupportedBody = `        DevClientModule.attachSupportedModuleClassNames([
${androidNames.map((n) => `            "${n.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",\n")}
        ])`;
    } else if (hasDevClient) {
      devClientSupportedBody = "        DevClientModule.attachSupportedModuleClassNames([])";
    } else {
      devClientSupportedBody = "        // @tamer4lynx/tamer-dev-client not linked";
    }
    if (fs21.readFileSync(lynxInitPath, "utf8").includes("GENERATED DEV_CLIENT_SUPPORTED START")) {
      updateGeneratedSection(lynxInitPath, devClientSupportedBody, "// GENERATED DEV_CLIENT_SUPPORTED START", "// GENERATED DEV_CLIENT_SUPPORTED END");
    }
  }
  function findInfoPlist() {
    const appNameFromConfig = resolved.config.ios?.appName;
    const candidates = [];
    if (appNameFromConfig) {
      candidates.push(path21.join(iosProjectPath, appNameFromConfig, "Info.plist"));
    }
    candidates.push(path21.join(iosProjectPath, "Info.plist"));
    return candidates.find((p) => fs21.existsSync(p)) ?? null;
  }
  function readPlistXml(plistPath) {
    return fs21.readFileSync(plistPath, "utf8");
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
      fs21.writeFileSync(plistPath, plist, "utf8");
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
    fs21.writeFileSync(plistPath, plist, "utf8");
    console.log(`\u2705 Synced ${urlSchemes.length} iOS URL scheme(s) into Info.plist`);
  }
  function runPodInstall(forcePath) {
    const podfilePath = forcePath ?? path21.join(iosProjectPath, "Podfile");
    if (!fs21.existsSync(podfilePath)) {
      console.log("\u2139\uFE0F No Podfile found in ios directory; skipping `pod install`.");
      return;
    }
    const cwd = path21.dirname(podfilePath);
    try {
      console.log(`\u2139\uFE0F Running \`pod install\` in ${cwd}...`);
      try {
        execSync7("pod install", { cwd, stdio: "inherit" });
      } catch {
        console.log("\u2139\uFE0F Retrying `pod install` with repo update...");
        execSync7("pod install --repo-update", { cwd, stdio: "inherit" });
      }
      console.log("\u2705 `pod install` completed successfully.");
    } catch (e) {
      console.warn(`\u26A0\uFE0F 'pod install' failed: ${e.message}`);
      console.log("\u26A0\uFE0F You can run `pod install` manually in the ios directory.");
    }
  }
  function run4() {
    console.log("\u{1F50E} Finding Lynx extension packages (lynx.ext.json / tamer.json)...");
    const packages = discoverModules(projectRoot).filter((p) => p.config.ios);
    if (packages.length > 0) {
      console.log(`Found ${packages.length} package(s): ${packages.map((p) => p.name).join(", ")}`);
    } else {
      console.log("\u2139\uFE0F No Tamer4Lynx native packages found.");
    }
    syncHost_default(syncHostOpts);
    updatePodfile(packages);
    ensureXElementPod();
    ensureLynxDevToolPods(discoverModules(projectRoot));
    ensureMultiProjectSafePostInstall();
    ensureLynxPatchInPodfile();
    ensurePodBuildSettings();
    ensurePodfileBuildSpeedBlock();
    ensurePbxprojBuildSpeed();
    updateLynxInitProcessor(packages);
    writeHostNativeModulesManifest();
    syncInfoPlistPermissions(packages);
    syncInfoPlistUrlSchemes();
    const appNameFromConfig = resolved.config.ios?.appName;
    if (appNameFromConfig) {
      const appPodfile = path21.join(iosProjectPath, appNameFromConfig, "Podfile");
      if (fs21.existsSync(appPodfile)) {
        runPodInstall(appPodfile);
        console.log("\u2728 Autolinking complete for iOS.");
        runTamerComponentTypesPipeline(projectRoot);
        return;
      }
    }
    runPodInstall();
    console.log("\u2728 Autolinking complete for iOS.");
    runTamerComponentTypesPipeline(projectRoot);
  }
  function writeHostNativeModulesManifest() {
    const allPkgs = discoverModules(projectRoot);
    const hasDevClient = allPkgs.some((p) => p.name === "@tamer4lynx/tamer-dev-client");
    const appFolder = resolved.config.ios?.appName;
    if (!hasDevClient || !appFolder) return;
    const androidNames = getDedupedAndroidModuleClassNames(allPkgs);
    const appDir = path21.join(iosProjectPath, appFolder);
    fs21.mkdirSync(appDir, { recursive: true });
    const manifestPath = path21.join(appDir, TAMER_HOST_NATIVE_MODULES_FILENAME);
    fs21.writeFileSync(manifestPath, buildHostNativeModulesManifestJson(androidNames), "utf8");
    console.log(`\u2705 Wrote ${TAMER_HOST_NATIVE_MODULES_FILENAME} (native module ids for dev-client checks)`);
    const pbxprojPath = path21.join(iosProjectPath, `${appFolder}.xcodeproj`, "project.pbxproj");
    if (fs21.existsSync(pbxprojPath)) {
      addResourceToXcodeProject(pbxprojPath, appFolder, TAMER_HOST_NATIVE_MODULES_FILENAME);
    }
  }
  run4();
};
var autolink_default2 = autolink2;

// src/ios/bundle.ts
import fs22 from "fs";
import path22 from "path";
import { execSync as execSync8 } from "child_process";
function bundleAndDeploy2(opts = {}) {
  const release = opts.release === true || opts.production === true;
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
  const devClientPkg = findDevClientPackage(resolved.projectRoot);
  const includeDevClient = !release && !!devClientPkg;
  const appName = resolved.config.ios.appName;
  const { lynxProjectDir, lynxBundleFiles, lynxBundleRootRel } = resolved;
  const sourceBundlePath = resolved.lynxBundlePath;
  const destinationDir = path22.join(resolved.iosDir, appName);
  const destinationBundlePath = path22.join(destinationDir, resolved.lynxBundleFile);
  autolink_default2({ release, includeDevClient });
  const iconPaths = resolveIconPaths(resolved.projectRoot, resolved.config);
  if (iconPaths) {
    const appIconDir = path22.join(destinationDir, "Assets.xcassets", "AppIcon.appiconset");
    if (applyIosAppIconAssets(appIconDir, iconPaths)) {
      console.log("\u2705 Synced iOS AppIcon from tamer.config.json");
    }
  }
  try {
    const lynxTsconfig = path22.join(resolved.lynxProjectDir, "tsconfig.json");
    if (fs22.existsSync(lynxTsconfig)) {
      fixTsconfigReferencesForBuild(lynxTsconfig);
    }
    console.log("\u{1F4E6} Building Lynx bundle...");
    execSync8("npm run build", { stdio: "inherit", cwd: resolved.lynxProjectDir });
    console.log("\u2705 Build completed successfully.");
  } catch (error) {
    console.error("\u274C Build process failed. Please check the errors above.");
    process.exit(1);
  }
  try {
    for (const name of lynxBundleFiles) {
      const p = path22.join(lynxProjectDir, lynxBundleRootRel, name);
      if (!fs22.existsSync(p)) {
        console.error(`\u274C Build output not found at: ${p}`);
        process.exit(1);
      }
    }
    if (!fs22.existsSync(destinationDir)) {
      console.error(`Destination directory not found at: ${destinationDir}`);
      process.exit(1);
    }
    const distDir = path22.dirname(sourceBundlePath);
    console.log(`\u{1F69A} Copying bundle and assets to iOS project...`);
    copyDistAssets(distDir, destinationDir, resolved.lynxBundleFile);
    console.log(`\u2728 Successfully copied bundle to: ${destinationBundlePath}`);
    const pbxprojPath = path22.join(resolved.iosDir, `${appName}.xcodeproj`, "project.pbxproj");
    if (fs22.existsSync(pbxprojPath)) {
      const skip = /* @__PURE__ */ new Set([".rspeedy", "stats.json"]);
      for (const entry of fs22.readdirSync(distDir)) {
        if (skip.has(entry) || fs22.statSync(path22.join(distDir, entry)).isDirectory()) continue;
        addResourceToXcodeProject(pbxprojPath, appName, entry);
      }
    }
    if (includeDevClient && devClientPkg) {
      const devClientBundle = path22.join(destinationDir, "dev-client.lynx.bundle");
      console.log("\u{1F4E6} Building dev-client bundle...");
      try {
        execSync8("npm run build", { stdio: "inherit", cwd: devClientPkg });
      } catch {
        console.warn("\u26A0\uFE0F  dev-client build failed; skipping dev-client bundle");
      }
      const builtBundle = path22.join(devClientPkg, "dist", "dev-client.lynx.bundle");
      if (fs22.existsSync(builtBundle)) {
        fs22.copyFileSync(builtBundle, devClientBundle);
        console.log("\u2728 Copied dev-client.lynx.bundle to iOS project");
        const pbxprojPath2 = path22.join(resolved.iosDir, `${appName}.xcodeproj`, "project.pbxproj");
        if (fs22.existsSync(pbxprojPath2)) {
          addResourceToXcodeProject(pbxprojPath2, appName, "dev-client.lynx.bundle");
        }
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
import fs26 from "fs";
import path26 from "path";
import os6 from "os";
import { randomBytes as randomBytes2 } from "crypto";
import { execSync as execSync11 } from "child_process";

// src/ios/codesign.ts
import fs23 from "fs";
import path23 from "path";
import os4 from "os";
import { execSync as execSync9 } from "child_process";
var SIGNABLE_EXTENSIONS = /* @__PURE__ */ new Set([
  ".app",
  ".framework",
  ".dylib",
  ".appex",
  ".so"
]);
function run2(cmd, opts = {}) {
  return execSync9(cmd, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    ...opts
  }).trim();
}
function extractEntitlementsPlist(profilePath) {
  try {
    const xml = run2(`security cms -D -i "${profilePath}"`);
    const tmp = path23.join(os4.tmpdir(), `t4l-ent-${Date.now()}.plist`);
    fs23.writeFileSync(tmp, xml, "utf8");
    const json = run2(`plutil -convert json -o - "${tmp}"`);
    fs23.unlinkSync(tmp);
    const plist = JSON.parse(json);
    const ent = plist.Entitlements;
    if (!ent) return null;
    let lines = '<?xml version="1.0" encoding="UTF-8"?>\n';
    lines += '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n';
    lines += '<plist version="1.0">\n<dict>\n';
    for (const [k, v] of Object.entries(ent)) {
      lines += `  <key>${k}</key>
`;
      if (typeof v === "boolean") {
        lines += v ? "  <true/>\n" : "  <false/>\n";
      } else if (typeof v === "string") {
        lines += `  <string>${v}</string>
`;
      } else if (Array.isArray(v)) {
        lines += "  <array>\n";
        for (const item of v) lines += `    <string>${item}</string>
`;
        lines += "  </array>\n";
      }
    }
    lines += "</dict>\n</plist>\n";
    return lines;
  } catch {
    return null;
  }
}
function resolveSigningBinary(itemPath) {
  const ext = path23.extname(itemPath);
  if (ext === ".framework") {
    const name = path23.basename(itemPath, ".framework");
    return path23.join(itemPath, name);
  }
  if (ext === ".app" || ext === ".appex") {
    const infoPlist = path23.join(itemPath, "Info.plist");
    if (fs23.existsSync(infoPlist)) {
      try {
        const exe = run2(`/usr/libexec/PlistBuddy -c "Print :CFBundleExecutable" "${infoPlist}"`);
        if (exe) return path23.join(itemPath, exe);
      } catch {
      }
    }
  }
  return itemPath;
}
function signPath(itemPath, identity, entitlementsFile, profilePath) {
  const stat = fs23.statSync(itemPath);
  if (stat.isDirectory()) {
    const children = fs23.readdirSync(itemPath).map((c) => path23.join(itemPath, c));
    for (const child of children) {
      if (fs23.statSync(child).isDirectory()) {
        signPath(child, identity, entitlementsFile, profilePath);
      }
    }
  }
  const ext = path23.extname(itemPath);
  if (!SIGNABLE_EXTENSIONS.has(ext)) return;
  if ((ext === ".app" || ext === ".appex") && profilePath) {
    const dest = path23.join(itemPath, "embedded.mobileprovision");
    try {
      fs23.unlinkSync(dest);
    } catch {
    }
    fs23.copyFileSync(profilePath, dest);
  }
  const target = resolveSigningBinary(itemPath);
  if (!fs23.existsSync(target)) return;
  const useEntitlements = (ext === ".app" || ext === ".appex") && entitlementsFile;
  const entFlag = useEntitlements ? ` --entitlements "${entitlementsFile}"` : "";
  const cmd = `codesign -f -s "${identity}" --generate-entitlement-der${entFlag} "${itemPath}"`;
  execSync9(cmd, { stdio: "inherit" });
}
function findMatchingProfile(bundleId, teamId) {
  if (!bundleId) return null;
  const profiles = listProvisioningProfiles(bundleId);
  const match = profiles.find((p) => p.teamIds.includes(teamId));
  return match ?? profiles[0] ?? null;
}
function resolveIdentitySha1(configuredIdentity) {
  const identities = listCodeSigningIdentities();
  if (identities.length === 0) return null;
  if (configuredIdentity) {
    const exact = identities.find((i) => i.label === configuredIdentity);
    if (exact) return exact.sha1;
    const partial = identities.find((i) => i.label.includes(configuredIdentity));
    if (partial) return partial.sha1;
  }
  const dev = identities.find((i) => i.label.startsWith("Apple Development:"));
  return dev?.sha1 ?? identities[0].sha1;
}
function codesignApp(appPath, opts) {
  if (!fs23.existsSync(appPath)) {
    throw new Error(`App bundle not found: ${appPath}`);
  }
  let entFile = null;
  let tmpEntFile = null;
  if (opts.entitlementsPlist) {
    entFile = opts.entitlementsPlist;
  } else if (opts.profilePath) {
    const xml = extractEntitlementsPlist(opts.profilePath);
    if (xml) {
      tmpEntFile = path23.join(os4.tmpdir(), `t4l-entitlements-${Date.now()}.plist`);
      fs23.writeFileSync(tmpEntFile, xml, "utf8");
      entFile = tmpEntFile;
    }
  }
  try {
    console.log(`\u{1F50F} Signing ${path23.basename(appPath)}...`);
    signPath(appPath, opts.identity, entFile, opts.profilePath ?? null);
    try {
      run2(`codesign -v "${appPath}"`);
      console.log("\u2705 Code signature verified.");
    } catch (e) {
      console.warn(`\u26A0\uFE0F Signature verification warning: ${e.message}`);
    }
  } finally {
    if (tmpEntFile && fs23.existsSync(tmpEntFile)) fs23.unlinkSync(tmpEntFile);
  }
}

// src/ios/macIosRun.ts
import fs24 from "fs";
import path24 from "path";
import os5 from "os";
import { execSync as execSync10 } from "child_process";
var MH_MAGIC_64 = 4277009103;
var MH_CIGAM_64 = 3489328638;
var FAT_MAGIC = 3405691582;
var FAT_MAGIC_64 = 3405691583;
function run3(cmd) {
  return execSync10(cmd, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
}
function vtoolBin() {
  try {
    return run3("xcrun --find vtool");
  } catch {
    return "vtool";
  }
}
function lipoBin() {
  try {
    return run3("xcrun --find lipo");
  } catch {
    return "lipo";
  }
}
function isMachOMagic(buf) {
  if (buf.length < 4) return false;
  const be = buf.readUInt32BE(0);
  const le = buf.readUInt32LE(0);
  return be === MH_MAGIC_64 || le === MH_MAGIC_64 || be === MH_CIGAM_64 || le === MH_CIGAM_64 || be === FAT_MAGIC || le === FAT_MAGIC || be === FAT_MAGIC_64 || le === FAT_MAGIC_64;
}
function isMachOFile(filePath) {
  try {
    const st = fs24.statSync(filePath);
    if (!st.isFile() || st.size < 4) return false;
    const fd = fs24.openSync(filePath, "r");
    const buf = Buffer.alloc(4);
    fs24.readSync(fd, buf, 0, 4, 0);
    fs24.closeSync(fd);
    return isMachOMagic(buf);
  } catch {
    return false;
  }
}
function collectMachOBinaries(root) {
  const out = [];
  function walk(dir) {
    let names;
    try {
      names = fs24.readdirSync(dir);
    } catch {
      return;
    }
    for (const name of names) {
      if (name === "_CodeSignature") continue;
      const p = path24.join(dir, name);
      let st;
      try {
        st = fs24.statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(p);
      } else if (st.isFile() && st.size > 4) {
        const ext = path24.extname(name);
        if (ext && ext !== ".dylib" && ext !== ".so") continue;
        if (isMachOFile(p)) out.push(p);
      }
    }
  }
  walk(root);
  return out;
}
function parseVtoolBuild(binaryPath) {
  const vt = vtoolBin();
  let out;
  try {
    out = execSync10(`"${vt}" -show-build "${binaryPath}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  } catch {
    return null;
  }
  const minM = out.match(/minos\s+([\d.]+)/i);
  const sdkM = out.match(/\bsdk\s+([\d.]+)/i);
  if (!minM || !sdkM) return null;
  return { minos: minM[1], sdk: sdkM[1] };
}
function thinArm64IfNeeded(binaryPath) {
  const lip = lipoBin();
  let info;
  try {
    info = execSync10(`"${lip}" -info "${binaryPath}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  } catch {
    return;
  }
  if (!/\barm64\b/.test(info)) {
    throw new Error(
      `Mach-O file has no arm64 slice (needed for Apple Silicon Mac run): ${binaryPath}`
    );
  }
  if (/Non-fat file/i.test(info)) return;
  const tmp = path24.join(os5.tmpdir(), `t4l-lipo-${Date.now()}-${path24.basename(binaryPath)}`);
  execSync10(`"${lip}" -thin arm64 "${binaryPath}" -output "${tmp}"`, { stdio: "inherit" });
  fs24.renameSync(tmp, binaryPath);
}
function patchSwiftUIKitIfNeeded(binaryPath) {
  let otool;
  try {
    otool = execSync10(`otool -L "${binaryPath}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  } catch {
    return;
  }
  const from = "@rpath/libswiftUIKit.dylib";
  const to = "/System/iOSSupport/usr/lib/swift/libswiftUIKit.dylib";
  if (!otool.includes(from)) return;
  execSync10(`install_name_tool -change "${from}" "${to}" "${binaryPath}"`, { stdio: "inherit" });
}
function convertToMacCatalyst(binaryPath, minos, sdk) {
  const vt = vtoolBin();
  const tmp = `${binaryPath}.vtool-tmp`;
  execSync10(
    `"${vt}" -set-build-version maccatalyst ${minos} ${sdk} -replace -output "${tmp}" "${binaryPath}"`,
    { stdio: "inherit" }
  );
  fs24.renameSync(tmp, binaryPath);
}
function adhocSignMachO(binaryPath) {
  execSync10(`codesign -f -s - "${binaryPath}"`, { stdio: "inherit" });
}
function prepareMacIosBundleLikePlayCover(appPath) {
  if (process.platform !== "darwin" || process.arch !== "arm64") {
    throw new Error("prepareMacIosBundleLikePlayCover requires Apple Silicon macOS");
  }
  const mainPlist = path24.join(appPath, "Info.plist");
  if (!fs24.existsSync(mainPlist)) {
    throw new Error(`Missing Info.plist in ${appPath}`);
  }
  let mainExeName;
  try {
    mainExeName = execSync10(`/usr/libexec/PlistBuddy -c "Print :CFBundleExecutable" "${mainPlist}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
  } catch {
    throw new Error("Could not read CFBundleExecutable from Info.plist");
  }
  const mainExe = path24.join(appPath, mainExeName);
  if (!fs24.existsSync(mainExe)) {
    throw new Error(`Main executable not found: ${mainExe}`);
  }
  const ver = parseVtoolBuild(mainExe);
  if (!ver) {
    throw new Error(
      `Could not read Mach-O build version from ${mainExe}. Is this an iphoneos binary?`
    );
  }
  const mp = path24.join(appPath, "embedded.mobileprovision");
  if (fs24.existsSync(mp)) {
    try {
      fs24.unlinkSync(mp);
    } catch {
    }
  }
  const binaries = collectMachOBinaries(appPath);
  if (binaries.length === 0) {
    throw new Error(`No Mach-O binaries found under ${appPath}`);
  }
  console.log(`\u{1F5A5}\uFE0F  Mac run: converting ${binaries.length} Mach-O slice(s) to Mac Catalyst (vtool), PlayCover-style\u2026`);
  for (const bin of binaries) {
    thinArm64IfNeeded(bin);
    const v = bin === mainExe ? ver : parseVtoolBuild(bin) ?? ver;
    convertToMacCatalyst(bin, v.minos, v.sdk);
    patchSwiftUIKitIfNeeded(bin);
    adhocSignMachO(bin);
  }
  try {
    execSync10(`xattr -cr "${appPath}"`, { stdio: "inherit" });
  } catch {
  }
}

// src/ios/appStoreConnect.ts
import fs25 from "fs";
import path25 from "path";
var DEFAULT_APP_STORE_CONNECT_API_KEY_PATH_ENV = "APP_STORE_CONNECT_API_KEY_PATH";
var DEFAULT_APP_STORE_CONNECT_API_KEY_ID_ENV = "APP_STORE_CONNECT_API_KEY_ID";
var DEFAULT_APP_STORE_CONNECT_ISSUER_ID_ENV = "APP_STORE_CONNECT_ISSUER_ID";
function resolveAppStoreConnectForIpa(config, projectRoot) {
  const asc = config.ios?.appStoreConnect;
  const pathEnv = asc?.apiKeyPathEnv?.trim() || DEFAULT_APP_STORE_CONNECT_API_KEY_PATH_ENV;
  const idEnv = asc?.apiKeyIdEnv?.trim() || DEFAULT_APP_STORE_CONNECT_API_KEY_ID_ENV;
  const issuerEnv = asc?.issuerIdEnv?.trim() || DEFAULT_APP_STORE_CONNECT_ISSUER_ID_ENV;
  const keyPathRaw = process.env[pathEnv]?.trim();
  const keyId = process.env[idEnv]?.trim();
  const issuerId = process.env[issuerEnv]?.trim();
  const any = Boolean(keyPathRaw || keyId || issuerId);
  const all = Boolean(keyPathRaw && keyId && issuerId);
  if (!any) return null;
  if (!all) {
    throw new Error(
      `App Store Connect API: set all of ${pathEnv}, ${idEnv}, ${issuerEnv} (or unset all to use the legacy IPA zip).`
    );
  }
  const keyPath = path25.isAbsolute(keyPathRaw) ? keyPathRaw : path25.join(projectRoot, keyPathRaw);
  if (!fs25.existsSync(keyPath)) {
    throw new Error(`App Store Connect API key file not found: ${keyPath} (${pathEnv})`);
  }
  return { keyPath, keyId, issuerId };
}
function xcodeAppStoreConnectAuthFlags(auth) {
  const kp = auth.keyPath.replace(/"/g, '\\"');
  return ` -allowProvisioningUpdates -authenticationKeyPath "${kp}" -authenticationKeyID "${auth.keyId}" -authenticationKeyIssuerID "${auth.issuerId}"`;
}
function writeAppStoreExportOptionsPlist(outPath, teamId) {
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>teamID</key>
  <string>${teamId}</string>
  <key>compileBitcode</key>
  <false/>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
`;
  fs25.writeFileSync(outPath, plist, "utf8");
}
function findExportedIpa(exportDir) {
  if (!fs25.existsSync(exportDir)) return null;
  const entries = fs25.readdirSync(exportDir);
  const ipa = entries.find((f) => f.endsWith(".ipa"));
  return ipa ? path25.join(exportDir, ipa) : null;
}

// src/ios/build.ts
function hostArch() {
  return os6.arch() === "arm64" ? "arm64" : "x86_64";
}
function isAppleSilicon() {
  return os6.arch() === "arm64" && process.platform === "darwin";
}
function resolvedIosTeamId(config) {
  const s = config.ios?.signing;
  if (!s) return "";
  return s.developmentTeam?.trim() || (s.codeSignIdentity?.trim() ? extractTeamIdFromIdentityLabel(s.codeSignIdentity.trim()) ?? "" : "");
}
function iosSigningXcodeFlags(config) {
  const s = config.ios?.signing;
  if (!s) return { xcodebuildArgs: "", allowProvisioningUpdates: false };
  const team = resolvedIosTeamId(config);
  if (!team) return { xcodebuildArgs: "", allowProvisioningUpdates: false };
  let out = ` DEVELOPMENT_TEAM=${team}`;
  const hasManualProfile = s.provisioningProfileSpecifier?.trim() || s.provisioningProfileUuid?.trim();
  if (hasManualProfile) {
    if (s.codeSignIdentity?.trim()) {
      const id = s.codeSignIdentity.trim().replace(/"/g, '\\"');
      out += ` CODE_SIGN_IDENTITY="${id}"`;
    }
    if (s.provisioningProfileSpecifier?.trim()) {
      const spec = s.provisioningProfileSpecifier.trim().replace(/"/g, '\\"');
      out += ` PROVISIONING_PROFILE_SPECIFIER="${spec}" CODE_SIGN_STYLE=Manual`;
    } else {
      out += ` PROVISIONING_PROFILE=${s.provisioningProfileUuid.trim()} CODE_SIGN_STYLE=Manual`;
    }
    return { xcodebuildArgs: out, allowProvisioningUpdates: false };
  } else {
    out += ' CODE_SIGN_IDENTITY="Apple Development" CODE_SIGN_STYLE=Automatic';
    return { xcodebuildArgs: out, allowProvisioningUpdates: true };
  }
}
function iosSigningXcodeFlagsAppStoreArchive(config) {
  const s = config.ios?.signing;
  if (!s) return { xcodebuildArgs: "", allowProvisioningUpdates: false };
  const team = resolvedIosTeamId(config);
  if (!team) return { xcodebuildArgs: "", allowProvisioningUpdates: false };
  let out = ` DEVELOPMENT_TEAM=${team}`;
  const hasManualProfile = s.provisioningProfileSpecifier?.trim() || s.provisioningProfileUuid?.trim();
  if (hasManualProfile) {
    if (s.codeSignIdentity?.trim()) {
      const id = s.codeSignIdentity.trim().replace(/"/g, '\\"');
      out += ` CODE_SIGN_IDENTITY="${id}"`;
    }
    if (s.provisioningProfileSpecifier?.trim()) {
      const spec = s.provisioningProfileSpecifier.trim().replace(/"/g, '\\"');
      out += ` PROVISIONING_PROFILE_SPECIFIER="${spec}" CODE_SIGN_STYLE=Manual`;
    } else {
      out += ` PROVISIONING_PROFILE=${s.provisioningProfileUuid.trim()} CODE_SIGN_STYLE=Manual`;
    }
    return { xcodebuildArgs: out, allowProvisioningUpdates: true };
  }
  out += ' CODE_SIGN_IDENTITY="Apple Distribution" CODE_SIGN_STYLE=Automatic';
  return { xcodebuildArgs: out, allowProvisioningUpdates: true };
}
function findBootedSimulator() {
  try {
    const out = execSync11("xcrun simctl list devices --json", { encoding: "utf8" });
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
function listPhysicalIosDevices() {
  const jsonPath = path26.join(os6.tmpdir(), `t4l-devicectl-${randomBytes2(8).toString("hex")}.json`);
  try {
    execSync11(`xcrun devicectl list devices --json-output "${jsonPath}"`, {
      stdio: ["pipe", "pipe", "pipe"]
    });
    if (!fs26.existsSync(jsonPath)) return [];
    const raw = fs26.readFileSync(jsonPath, "utf8");
    fs26.unlinkSync(jsonPath);
    const data = JSON.parse(raw);
    const devices = data.result?.devices ?? [];
    const out = [];
    for (const d of devices) {
      const udid = d.hardwareProperties?.udid ?? d.identifier;
      if (typeof udid !== "string" || udid.length < 20) continue;
      const name = d.deviceProperties?.name ?? d.name ?? `Device ${udid.slice(0, 8)}\u2026`;
      out.push({ udid, name });
    }
    return out;
  } catch {
    try {
      if (fs26.existsSync(jsonPath)) fs26.unlinkSync(jsonPath);
    } catch {
    }
  }
  return [];
}
async function buildIpa(opts = {}) {
  const resolved = resolveHostPaths();
  if (!resolved.config.ios?.appName) {
    throw new Error('"ios.appName" must be defined in tamer.config.json');
  }
  const appName = resolved.config.ios.appName;
  const bundleId = resolved.config.ios.bundleId;
  const iosDir = resolved.iosDir;
  const release = opts.release === true || opts.production === true;
  const configuration = release ? "Release" : "Debug";
  bundle_default2({ release, production: opts.production });
  const scheme = appName;
  const workspacePath = path26.join(iosDir, `${appName}.xcworkspace`);
  const projectPath = path26.join(iosDir, `${appName}.xcodeproj`);
  const xcproject = fs26.existsSync(workspacePath) ? workspacePath : projectPath;
  const flag = xcproject.endsWith(".xcworkspace") ? "-workspace" : "-project";
  const derivedDataPath = path26.join(iosDir, "build");
  const signing2 = iosSigningXcodeFlags(resolved.config);
  const signingFlags = signing2.xcodebuildArgs;
  const allowProvisioningUpdates = signing2.allowProvisioningUpdates ? " -allowProvisioningUpdates" : "";
  const production = opts.production === true;
  const mac = opts.mac === true;
  const wantIpa = opts.ipa === true && production;
  if (mac && !isAppleSilicon()) {
    console.error("\u274C --mac requires an Apple Silicon Mac.");
    process.exit(1);
  }
  const sdk = mac ? "iphoneos" : production ? "iphoneos" : opts.install ? "iphonesimulator" : "iphoneos";
  const sdkOrDest = `-sdk ${sdk}`;
  const archFlag = opts.install && !production && !mac ? `-arch ${hostArch()} ` : "";
  const extraSettings = [
    "ONLY_ACTIVE_ARCH=YES",
    "CLANG_ENABLE_EXPLICIT_MODULES=NO",
    ...configuration === "Debug" ? ["COMPILER_INDEX_STORE_ENABLE=NO"] : []
  ].join(" ");
  const archivePath = path26.join(derivedDataPath, `${appName}.xcarchive`);
  const exportDir = path26.join(derivedDataPath, "ipa-export");
  const exportPlist = path26.join(derivedDataPath, "ExportOptions.plist");
  const productsSubdir = `${configuration}-iphoneos`;
  let productionInstallPath;
  if (production) {
    let ascAuth = null;
    if (wantIpa && !mac) {
      try {
        ascAuth = resolveAppStoreConnectForIpa(resolved.config, resolved.projectRoot);
      } catch (e) {
        console.error(`\u274C ${e instanceof Error ? e.message : e}`);
        process.exit(1);
      }
    }
    const useAppStoreExport = Boolean(wantIpa && ascAuth && !mac);
    if (useAppStoreExport) {
      const teamIdAsc = resolvedIosTeamId(resolved.config);
      if (!teamIdAsc) {
        console.error(
          "\u274C ios.signing.developmentTeam is required for App Store IPA export with APP_STORE_CONNECT_* env vars."
        );
        process.exit(1);
      }
      const signingAsc = iosSigningXcodeFlagsAppStoreArchive(resolved.config);
      if (!signingAsc.xcodebuildArgs.trim()) {
        console.error("\u274C Configure ios.signing (e.g. developmentTeam) for App Store archive.");
        process.exit(1);
      }
      const authFlags = xcodeAppStoreConnectAuthFlags(ascAuth);
      const ddBuild = path26.join(derivedDataPath, "Build");
      if (fs26.existsSync(ddBuild)) fs26.rmSync(ddBuild, { recursive: true, force: true });
      if (fs26.existsSync(archivePath)) fs26.rmSync(archivePath, { recursive: true, force: true });
      if (fs26.existsSync(exportDir)) fs26.rmSync(exportDir, { recursive: true, force: true });
      fs26.mkdirSync(exportDir, { recursive: true });
      writeAppStoreExportOptionsPlist(exportPlist, teamIdAsc);
      console.log(`
\u{1F4E6} Archiving for App Store (App Store Connect API key)\u2026`);
      execSync11(
        `xcodebuild archive ${flag} "${xcproject}" -scheme "${scheme}" -configuration ${configuration} -destination "generic/platform=iOS" -archivePath "${archivePath}" -derivedDataPath "${derivedDataPath}" ${extraSettings}${signingAsc.xcodebuildArgs}${authFlags}`,
        { stdio: "inherit", cwd: iosDir }
      );
      console.log("\u2705 Archive completed.");
      console.log(`
\u{1F4E4} Exporting App Store IPA\u2026`);
      execSync11(
        `xcodebuild -exportArchive -archivePath "${archivePath}" -exportPath "${exportDir}" -exportOptionsPlist "${exportPlist}"${authFlags}`,
        { stdio: "inherit", cwd: iosDir }
      );
      const ipaFile = findExportedIpa(exportDir);
      if (!ipaFile) {
        console.error(`\u274C No .ipa found in ${exportDir} after export.`);
        process.exit(1);
      }
      console.log(`\u2705 IPA exported to: ${ipaFile}`);
      productionInstallPath = ipaFile;
    } else {
      const target = mac ? "iphoneos (then Mac Catalyst / PlayCover-style vtool)" : "iphoneos";
      console.log(`
\u{1F528} Building ${configuration} (${target}) without signing...`);
      execSync11(
        `xcodebuild ${flag} "${xcproject}" -scheme "${scheme}" -configuration ${configuration} ${sdkOrDest} -derivedDataPath "${derivedDataPath}" ${extraSettings} CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO`,
        { stdio: "inherit", cwd: iosDir }
      );
      console.log("\u2705 Build completed (unsigned).");
      const appInProductsInner = path26.join(
        derivedDataPath,
        "Build",
        "Products",
        productsSubdir,
        `${appName}.app`
      );
      if (mac) {
        try {
          prepareMacIosBundleLikePlayCover(appInProductsInner);
        } catch (e) {
          console.error(`\u274C Mac run preparation failed: ${e instanceof Error ? e.message : e}`);
          process.exit(1);
        }
      }
      const identitySha1 = resolveIdentitySha1(
        resolved.config.ios?.signing?.codeSignIdentity?.trim()
      );
      if (!identitySha1) {
        console.error(
          "\u274C No code signing identity found in keychain.\n   Run `t4l signing ios` or install an Apple Development certificate in Keychain Access."
        );
        process.exit(1);
      }
      const teamId = resolvedIosTeamId(resolved.config);
      const profile = mac ? null : findMatchingProfile(bundleId, teamId);
      if (mac) {
        console.log("\u2139\uFE0F  --mac: skipping embedded provisioning profile (not used for local Mac run).");
      } else if (profile) {
        console.log(`\u{1F4CB} Using provisioning profile: ${profile.name}`);
      } else {
        console.log("\u2139\uFE0F  No matching provisioning profile found \u2014 signing without one.");
        console.log("   Device installs may fail. Build once from Xcode to create a managed profile,");
        console.log("   or use a paid Apple Developer account with a downloaded profile.");
      }
      codesignApp(appInProductsInner, {
        identity: identitySha1,
        profilePath: profile?.filePath
      });
      productionInstallPath = appInProductsInner;
      if (wantIpa) {
        if (fs26.existsSync(exportDir)) fs26.rmSync(exportDir, { recursive: true, force: true });
        fs26.mkdirSync(exportDir, { recursive: true });
        const ipaPath = path26.join(exportDir, `${appName}.ipa`);
        const payloadDir = path26.join(exportDir, "Payload");
        fs26.mkdirSync(payloadDir, { recursive: true });
        fs26.cpSync(appInProductsInner, path26.join(payloadDir, `${appName}.app`), { recursive: true });
        execSync11(`cd "${exportDir}" && zip -r -q "${ipaPath}" Payload`, { stdio: "inherit" });
        fs26.rmSync(payloadDir, { recursive: true, force: true });
        console.log(`\u2705 IPA exported to: ${ipaPath}`);
      }
    }
  } else {
    const signingArgs = opts.install && !mac ? "" : " CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO";
    const debugTarget = mac ? "iphoneos (unsigned, then Mac Catalyst / PlayCover-style)" : sdk;
    console.log(`
\u{1F528} Building ${configuration} (${debugTarget})...`);
    execSync11(
      `xcodebuild ${flag} "${xcproject}" -scheme "${scheme}" -configuration ${configuration} ${sdkOrDest} ${archFlag}-derivedDataPath "${derivedDataPath}" ${extraSettings}${signingArgs}${signingFlags}${allowProvisioningUpdates}`,
      { stdio: "inherit", cwd: iosDir }
    );
    console.log(`\u2705 Build completed.`);
    const appDbg = path26.join(
      derivedDataPath,
      "Build",
      "Products",
      `${configuration}-iphoneos`,
      `${appName}.app`
    );
    if (mac && fs26.existsSync(appDbg)) {
      try {
        prepareMacIosBundleLikePlayCover(appDbg);
        execSync11(`codesign --force --sign - --deep "${appDbg}"`, { stdio: "inherit" });
      } catch (e) {
        console.error(`\u274C Mac run preparation failed: ${e instanceof Error ? e.message : e}`);
        process.exit(1);
      }
    }
  }
  const debugProductsSubdir = `${configuration}-${sdk === "iphonesimulator" ? "iphonesimulator" : "iphoneos"}`;
  const appInProducts = path26.join(
    derivedDataPath,
    "Build",
    "Products",
    debugProductsSubdir,
    `${appName}.app`
  );
  if (opts.install) {
    if (production) {
      const appPath = productionInstallPath ?? appInProducts;
      if (!fs26.existsSync(appPath)) {
        console.error(`\u274C Built app not found at: ${appPath}`);
        process.exit(1);
      }
      if (mac) {
        console.log("\u{1F4F2} Launching on Mac (Mac Catalyst / PlayCover-style Mach-O conversion)...");
        execSync11(`open "${appPath}"`, { stdio: "inherit" });
        console.log("\u2705 App launched.");
      } else {
        const physicalDevices = listPhysicalIosDevices();
        if (physicalDevices.length === 0) {
          console.error(
            "\u274C No connected physical iOS device found for production install (`-p -i`).\n   Connect an iPhone/iPad (USB), unlock it, and enable Developer Mode (iOS 16+).\n   To run on this Mac instead, add --mac: `t4l build ios -p -i --mac`"
          );
          process.exit(1);
        }
        let udid;
        if (physicalDevices.length === 1) {
          udid = physicalDevices[0].udid;
        } else if (!isInteractive()) {
          console.error("\u274C Multiple iOS devices connected. Run in an interactive terminal to pick one.");
          process.exit(1);
        } else {
          udid = await pickOne(
            "Select a device:",
            physicalDevices.map((d) => ({ label: `${d.name} \u2014 ${d.udid}`, value: d.udid }))
          );
        }
        console.log(`\u{1F4F2} Installing on physical device ${udid}...`);
        execSync11(`xcrun devicectl device install app --device "${udid}" "${appPath}"`, {
          stdio: "inherit"
        });
        if (bundleId) {
          console.log(`\u{1F680} Launching ${bundleId}...`);
          try {
            execSync11(
              `xcrun devicectl device process launch --device "${udid}" "${bundleId}"`,
              { stdio: "inherit" }
            );
            console.log("\u2705 App launched.");
          } catch {
            console.log("\u2705 Installed. Launch manually on the device if auto-launch failed.");
          }
        } else {
          console.log('\u2705 App installed. (Set "ios.bundleId" in tamer.config.json to auto-launch.)');
        }
      }
    } else if (mac) {
      if (!fs26.existsSync(appInProducts)) {
        console.error(`\u274C Built app not found at: ${appInProducts}`);
        process.exit(1);
      }
      console.log("\u{1F4F2} Launching on Mac (Mac Catalyst / PlayCover-style)...");
      execSync11(`open "${appInProducts}"`, { stdio: "inherit" });
      console.log("\u2705 App launched.");
    } else {
      const simProducts = path26.join(
        derivedDataPath,
        "Build",
        "Products",
        `${configuration}-iphonesimulator`,
        `${appName}.app`
      );
      if (!fs26.existsSync(simProducts)) {
        console.error(`\u274C Built app not found at: ${simProducts}`);
        process.exit(1);
      }
      const udid = findBootedSimulator();
      if (!udid) {
        console.error("\u274C No booted simulator found. Start one with: xcrun simctl boot <udid>");
        process.exit(1);
      }
      console.log(`\u{1F4F2} Installing on simulator ${udid}...`);
      execSync11(`xcrun simctl install "${udid}" "${simProducts}"`, { stdio: "inherit" });
      if (bundleId) {
        console.log(`\u{1F680} Launching ${bundleId}...`);
        execSync11(`xcrun simctl launch "${udid}" "${bundleId}"`, { stdio: "inherit" });
        console.log("\u2705 App launched.");
      } else {
        console.log('\u2705 App installed. (Set "ios.bundleId" in tamer.config.json to auto-launch.)');
      }
    }
  }
}
var build_default2 = buildIpa;

// src/common/init.tsx
import fs27 from "fs";
import path27 from "path";
import { useState as useState4, useEffect as useEffect2, useCallback as useCallback3 } from "react";
import { render as render2, Text as Text9, Box as Box8 } from "ink";
import { jsx as jsx10, jsxs as jsxs9 } from "react/jsx-runtime";
function resolveSdkInput(raw) {
  let androidSdk = raw.trim();
  if (androidSdk.startsWith("$") && /^[A-Z0-9_]+$/.test(androidSdk.slice(1))) {
    const envVar = androidSdk.slice(1);
    const envValue = process.env[envVar];
    if (envValue) {
      androidSdk = envValue;
      return { resolved: androidSdk, message: `Using ${androidSdk} from $${envVar}` };
    }
    return {
      resolved: androidSdk,
      message: `Environment variable $${envVar} not found \u2014 path saved as typed.`
    };
  }
  return { resolved: androidSdk };
}
function InitWizard() {
  const [step, setStep] = useState4("welcome");
  const [androidAppName, setAndroidAppName] = useState4("");
  const [androidPackageName, setAndroidPackageName] = useState4("");
  const [androidSdk, setAndroidSdk] = useState4("");
  const [sdkHint, setSdkHint] = useState4();
  const [iosAppName, setIosAppName] = useState4("");
  const [iosBundleId, setIosBundleId] = useState4("");
  const [lynxProject, setLynxProject] = useState4("");
  const [pkgError, setPkgError] = useState4();
  const [bundleError, setBundleError] = useState4();
  const [doneMessage, setDoneMessage] = useState4([]);
  const writeConfigAndTsconfig = useCallback3(() => {
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
      paths: { androidDir: "android", iosDir: "ios" },
      syncTamerComponentTypes: true
    };
    if (lynxProject.trim()) config.lynxProject = lynxProject.trim();
    const configPath = path27.join(process.cwd(), "tamer.config.json");
    fs27.writeFileSync(configPath, JSON.stringify(config, null, 2));
    const lines = [`Generated tamer.config.json at ${configPath}`];
    const tsconfigCandidates = lynxProject.trim() ? [
      path27.join(process.cwd(), lynxProject.trim(), "tsconfig.json"),
      path27.join(process.cwd(), "tsconfig.json")
    ] : [path27.join(process.cwd(), "tsconfig.json")];
    for (const tsconfigPath of tsconfigCandidates) {
      if (!fs27.existsSync(tsconfigPath)) continue;
      try {
        if (fixTsconfigReferencesForBuild(tsconfigPath)) {
          lines.push(`Flattened ${path27.relative(process.cwd(), tsconfigPath)} (fixed TS6310)`);
        }
        break;
      } catch (e) {
        lines.push(`Could not update ${tsconfigPath}: ${e.message}`);
      }
    }
    try {
      runTamerComponentTypesPipeline(process.cwd());
      lines.push("Generated .tamer/tamer-components.d.ts and updated tsconfig include (when applicable)");
    } catch (e) {
      lines.push(`Could not sync tamer component types: ${e.message}`);
    }
    setDoneMessage(lines);
    setStep("done");
    setTimeout(() => process.exit(0), 2e3);
  }, [androidAppName, androidPackageName, androidSdk, iosAppName, iosBundleId, lynxProject]);
  useEffect2(() => {
    if (step !== "saving") return;
    writeConfigAndTsconfig();
  }, [step, writeConfigAndTsconfig]);
  if (step === "welcome") {
    return /* @__PURE__ */ jsxs9(Box8, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx10(Text9, { bold: true, children: "Tamer4Lynx init" }),
      /* @__PURE__ */ jsx10(Text9, { dimColor: true, children: "Set up tamer.config.json for your project." }),
      /* @__PURE__ */ jsx10(Box8, { marginTop: 1, children: /* @__PURE__ */ jsx10(
        TuiSelectInput,
        {
          label: "Continue?",
          items: [{ label: "Start", value: "start" }],
          onSelect: () => setStep("android-app")
        }
      ) })
    ] });
  }
  if (step === "android-app") {
    return /* @__PURE__ */ jsx10(Wizard, { step: 1, total: 6, title: "Android app name", children: /* @__PURE__ */ jsx10(
      TuiTextInput,
      {
        label: "Android app name:",
        defaultValue: androidAppName,
        onSubmitValue: (v) => setAndroidAppName(v),
        onSubmit: () => setStep("android-pkg")
      },
      step
    ) });
  }
  if (step === "android-pkg") {
    return /* @__PURE__ */ jsx10(Wizard, { step: 2, total: 6, title: "Android package name", children: /* @__PURE__ */ jsx10(
      TuiTextInput,
      {
        label: "Android package name (e.g. com.example.app):",
        defaultValue: androidPackageName,
        error: pkgError,
        onChange: () => setPkgError(void 0),
        onSubmitValue: (v) => {
          const t = v.trim();
          if (t && !isValidAndroidPackage(t)) {
            setPkgError("Use reverse-DNS form: com.mycompany.app");
            return false;
          }
          setAndroidPackageName(t);
          setPkgError(void 0);
        },
        onSubmit: () => setStep("android-sdk")
      },
      step
    ) });
  }
  if (step === "android-sdk") {
    return /* @__PURE__ */ jsx10(Wizard, { step: 3, total: 6, title: "Android SDK", children: /* @__PURE__ */ jsx10(
      TuiTextInput,
      {
        label: "Android SDK path (e.g. ~/Library/Android/sdk or $ANDROID_HOME):",
        defaultValue: androidSdk,
        onSubmitValue: (v) => {
          const { resolved, message } = resolveSdkInput(v);
          setAndroidSdk(resolved);
          setSdkHint(message);
        },
        onSubmit: () => setStep("ios-reuse"),
        hint: sdkHint
      },
      step
    ) });
  }
  if (step === "ios-reuse") {
    return /* @__PURE__ */ jsx10(Wizard, { step: 4, total: 6, title: "iOS", children: /* @__PURE__ */ jsx10(
      TuiConfirmInput,
      {
        label: "Use the same app name and bundle ID for iOS as Android?",
        defaultYes: false,
        onConfirm: (yes) => {
          if (yes) {
            setIosAppName(androidAppName);
            setIosBundleId(androidPackageName);
            setStep("lynx-path");
          } else {
            setStep("ios-app");
          }
        },
        hint: "No = enter iOS-specific values next"
      }
    ) });
  }
  if (step === "ios-app") {
    return /* @__PURE__ */ jsx10(Wizard, { step: 4, total: 6, title: "iOS app name", children: /* @__PURE__ */ jsx10(
      TuiTextInput,
      {
        label: "iOS app name:",
        defaultValue: iosAppName,
        onSubmitValue: (v) => setIosAppName(v),
        onSubmit: () => setStep("ios-bundle")
      },
      step
    ) });
  }
  if (step === "ios-bundle") {
    return /* @__PURE__ */ jsx10(Wizard, { step: 5, total: 6, title: "iOS bundle ID", children: /* @__PURE__ */ jsx10(
      TuiTextInput,
      {
        label: "iOS bundle ID (e.g. com.example.app):",
        defaultValue: iosBundleId,
        error: bundleError,
        onChange: () => setBundleError(void 0),
        onSubmitValue: (v) => {
          const t = v.trim();
          if (t && !isValidIosBundleId(t)) {
            setBundleError("Use reverse-DNS form: com.mycompany.App");
            return false;
          }
          setIosBundleId(t);
          setBundleError(void 0);
        },
        onSubmit: () => setStep("lynx-path")
      },
      step
    ) });
  }
  if (step === "lynx-path") {
    return /* @__PURE__ */ jsx10(Wizard, { step: 6, total: 6, title: "Lynx project", children: /* @__PURE__ */ jsx10(
      TuiTextInput,
      {
        label: "Lynx project path relative to project root (optional, e.g. packages/example):",
        defaultValue: lynxProject,
        onSubmitValue: (v) => setLynxProject(v),
        onSubmit: () => setStep("saving"),
        hint: "Press Enter with empty to skip"
      },
      step
    ) });
  }
  if (step === "saving") {
    return /* @__PURE__ */ jsx10(Box8, { children: /* @__PURE__ */ jsx10(TuiSpinner, { label: "Writing tamer.config.json and updating tsconfig\u2026" }) });
  }
  if (step === "done") {
    return /* @__PURE__ */ jsx10(Box8, { flexDirection: "column", children: /* @__PURE__ */ jsx10(StatusBox, { variant: "success", title: "Done", children: doneMessage.map((line, i) => /* @__PURE__ */ jsx10(Text9, { color: "green", children: line }, i)) }) });
  }
  return null;
}
async function init() {
  const { waitUntilExit } = render2(/* @__PURE__ */ jsx10(InitWizard, {}));
  await waitUntilExit();
}

// src/common/create.ts
import fs28 from "fs";
import path28 from "path";
import readline from "readline";
var rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
function ask(question) {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
}
async function create3(opts) {
  console.log("Tamer4Lynx: Create Lynx Extension\n");
  let includeModule;
  let includeElement;
  let includeService;
  if (opts?.type) {
    switch (opts.type) {
      case "module":
        includeModule = true;
        includeElement = false;
        includeService = false;
        break;
      case "element":
        includeModule = false;
        includeElement = true;
        includeService = false;
        break;
      case "service":
        includeModule = false;
        includeElement = false;
        includeService = true;
        break;
      case "combo":
        includeModule = true;
        includeElement = true;
        includeService = true;
        break;
      default:
        includeModule = true;
        includeElement = false;
        includeService = false;
    }
  } else {
    console.log("Select extension types (space to toggle, enter to confirm):");
    console.log("  [ ] Native Module");
    console.log("  [ ] Element");
    console.log("  [ ] Service\n");
    includeModule = /^y(es)?$/i.test(await ask("Include Native Module? (Y/n): ") || "y");
    includeElement = /^y(es)?$/i.test(await ask("Include Element? (y/N): ") || "n");
    includeService = /^y(es)?$/i.test(await ask("Include Service? (y/N): ") || "n");
  }
  if (!includeModule && !includeElement && !includeService) {
    console.error("\u274C At least one extension type is required.");
    rl.close();
    process.exit(1);
  }
  const extName = await ask("Extension package name (e.g. my-lynx-module): ");
  if (!extName || !/^[a-z0-9-_]+$/.test(extName)) {
    console.error("\u274C Invalid package name. Use lowercase letters, numbers, hyphens, underscores.");
    rl.close();
    process.exit(1);
  }
  const packageName = await ask("Android package name (e.g. com.example.mymodule): ") || `com.example.${extName.replace(/-/g, "")}`;
  const simpleModuleName = extName.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("") + "Module";
  const fullModuleClassName = `${packageName}.${simpleModuleName}`;
  const cwd = process.cwd();
  const root = path28.join(cwd, extName);
  if (fs28.existsSync(root)) {
    console.error(`\u274C Directory ${extName} already exists.`);
    rl.close();
    process.exit(1);
  }
  fs28.mkdirSync(root, { recursive: true });
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
  fs28.writeFileSync(path28.join(root, "lynx.ext.json"), JSON.stringify(lynxExt, null, 2));
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
  fs28.writeFileSync(path28.join(root, "package.json"), JSON.stringify(pkg, null, 2));
  const pkgPath = packageName.replace(/\./g, "/");
  const hasSrc = includeModule || includeElement || includeService;
  if (hasSrc) {
    fs28.mkdirSync(path28.join(root, "src"), { recursive: true });
  }
  if (includeModule) {
    fs28.writeFileSync(path28.join(root, "src", "index.d.ts"), `/** @lynxmodule */
export declare class ${simpleModuleName} {
  // Add your module methods here
}
`);
    fs28.mkdirSync(path28.join(root, "android", "src", "main", "kotlin", pkgPath), { recursive: true });
    fs28.writeFileSync(path28.join(root, "android", "build.gradle.kts"), `plugins {
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
    fs28.writeFileSync(path28.join(root, "android", "src", "main", "AndroidManifest.xml"), `<?xml version="1.0" encoding="utf-8"?>
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
    fs28.writeFileSync(path28.join(root, "android", "src", "main", "kotlin", pkgPath, `${simpleModuleName}.kt`), ktContent);
    fs28.mkdirSync(path28.join(root, "ios", extName, extName, "Classes"), { recursive: true });
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
    fs28.writeFileSync(path28.join(root, "ios", extName, `${extName}.podspec`), podspec);
    const swiftContent = `import Foundation

@objc public class ${simpleModuleName}: NSObject {
    @objc public func example() -> String {
        return "Hello from ${extName}"
    }
}
`;
    fs28.writeFileSync(path28.join(root, "ios", extName, extName, "Classes", `${simpleModuleName}.swift`), swiftContent);
  }
  if (includeElement && !includeModule) {
    const elementName = extName.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
    fs28.writeFileSync(path28.join(root, "src", "index.tsx"), `import type { FC } from '@lynx-js/react';

export const ${elementName}: FC = () => {
  return null;
};
`);
  }
  fs28.writeFileSync(path28.join(root, "index.js"), `'use strict';
module.exports = {};
`);
  const tsconfigCompiler = {
    target: "ES2020",
    module: "ESNext",
    moduleResolution: "bundler",
    strict: true
  };
  if (includeElement) {
    tsconfigCompiler.jsx = "preserve";
    tsconfigCompiler.jsxImportSource = "@lynx-js/react";
  }
  fs28.writeFileSync(path28.join(root, "tsconfig.json"), JSON.stringify({
    compilerOptions: tsconfigCompiler,
    include: includeElement ? ["src", "src/**/*.tsx"] : ["src"]
  }, null, 2));
  fs28.writeFileSync(path28.join(root, "README.md"), `# ${extName}

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
  rl.close();
}
var create_default3 = create3;

// src/common/codegen.ts
import fs29 from "fs";
import path29 from "path";
function codegen() {
  const cwd = process.cwd();
  const config = loadExtensionConfig(cwd);
  if (!config) {
    console.error("\u274C No lynx.ext.json or tamer.json found. Run from an extension package root.");
    process.exit(1);
  }
  const srcDir = path29.join(cwd, "src");
  const generatedDir = path29.join(cwd, "generated");
  fs29.mkdirSync(generatedDir, { recursive: true });
  const dtsFiles = findDtsFiles(srcDir);
  const modules = extractLynxModules(dtsFiles);
  if (modules.length === 0) {
    console.log("\u2139\uFE0F No @lynxmodule declarations found in src/. Add /** @lynxmodule */ to your module class.");
    return;
  }
  for (const mod of modules) {
    const tsContent = `export type { ${mod} } from '../src/index.js';
`;
    const outPath = path29.join(generatedDir, `${mod}.ts`);
    fs29.writeFileSync(outPath, tsContent);
    console.log(`\u2705 Generated ${outPath}`);
  }
  if (config.android) {
    const androidGenerated = path29.join(cwd, "android", "src", "main", "kotlin", config.android.moduleClassName.replace(/\./g, "/").replace(/[^/]+$/, ""), "generated");
    fs29.mkdirSync(androidGenerated, { recursive: true });
    console.log(`\u2139\uFE0F Android generated dir: ${androidGenerated} (spec generation coming soon)`);
  }
  if (config.ios) {
    const iosGenerated = path29.join(cwd, "ios", "generated");
    fs29.mkdirSync(iosGenerated, { recursive: true });
    console.log(`\u2139\uFE0F iOS generated dir: ${iosGenerated} (spec generation coming soon)`);
  }
  console.log("\u2728 Codegen complete.");
}
function findDtsFiles(dir) {
  const result = [];
  if (!fs29.existsSync(dir)) return result;
  const entries = fs29.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path29.join(dir, e.name);
    if (e.isDirectory()) result.push(...findDtsFiles(full));
    else if (e.name.endsWith(".d.ts")) result.push(full);
  }
  return result;
}
function extractLynxModules(files) {
  const modules = [];
  const seen = /* @__PURE__ */ new Set();
  for (const file of files) {
    const content = fs29.readFileSync(file, "utf8");
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

// src/common/devServer.tsx
import { useState as useState5, useEffect as useEffect3, useRef, useCallback as useCallback4 } from "react";
import { spawn } from "child_process";
import fs30 from "fs";
import http from "http";
import os7 from "os";
import path30 from "path";
import { render as render3, useInput, useApp } from "ink";
import { WebSocket, WebSocketServer } from "ws";

// src/common/watchRebuild.ts
function createDebouncedSerialRebuild(run4, debounceMs) {
  let debounceTimer = null;
  let chain = Promise.resolve();
  const schedule = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      chain = chain.catch(() => {
      }).then(() => run4().catch(() => {
      }));
    }, debounceMs);
  };
  const cancel = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };
  return { schedule, cancel };
}
var WATCH_REBUILD_DEBOUNCE_MS = 400;

// src/common/devServer.tsx
import { jsx as jsx11 } from "react/jsx-runtime";
var DEFAULT_PORT = 3e3;
var TAMER_CLI_VERSION = getCliVersion();
var MAX_LOG_LINES = 800;
var STATIC_MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf"
};
function sendFileFromDisk(res, absPath) {
  fs30.readFile(absPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path30.extname(absPath).toLowerCase();
    res.setHeader("Content-Type", STATIC_MIME[ext] ?? "application/octet-stream");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(data);
  });
}
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once("error", (err) => {
      resolve(err.code === "EADDRINUSE");
    });
    server.once("listening", () => {
      server.close(() => resolve(false));
    });
    server.listen(port, "127.0.0.1");
  });
}
async function findAvailablePort(preferred, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = preferred + i;
    if (!await isPortInUse(port)) return port;
  }
  throw new Error(`No available port in range ${preferred}-${preferred + maxAttempts - 1}`);
}
function getLanIp() {
  const nets = os7.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const addrs = nets[name];
    if (!addrs) continue;
    for (const a of addrs) {
      if (a.family === "IPv4" && !a.internal) return a.address;
    }
  }
  return "localhost";
}
function detectPackageManager(cwd) {
  const dir = path30.resolve(cwd);
  if (fs30.existsSync(path30.join(dir, "pnpm-lock.yaml"))) return { cmd: "pnpm", args: ["run", "build"] };
  if (fs30.existsSync(path30.join(dir, "bun.lockb")) || fs30.existsSync(path30.join(dir, "bun.lock")))
    return { cmd: "bun", args: ["run", "build"] };
  return { cmd: "npm", args: ["run", "build"] };
}
var initialUi = () => ({
  phase: "starting",
  projectName: "",
  port: 0,
  lanIp: "localhost",
  devUrl: "",
  wsUrl: "",
  lynxBundleFile: "main.lynx.bundle",
  bonjour: false,
  verbose: false,
  buildPhase: "idle",
  wsConnections: 0,
  logLines: [],
  qrLines: []
});
function DevServerApp({ verbose }) {
  const { exit } = useApp();
  const [ui, setUi] = useState5(() => {
    const s = initialUi();
    s.verbose = verbose;
    return s;
  });
  const cleanupRef = useRef(null);
  const rebuildRef = useRef(() => Promise.resolve());
  const quitOnceRef = useRef(false);
  const appendLogLine = useCallback4((line) => {
    setUi((prev) => ({
      ...prev,
      logLines: [...prev.logLines, line].slice(-MAX_LOG_LINES)
    }));
  }, []);
  const appendLog = useCallback4(
    (chunk) => {
      for (const line of chunk.split(/\r?\n/)) {
        appendLogLine(line);
      }
    },
    [appendLogLine]
  );
  const handleQuit = useCallback4(() => {
    if (quitOnceRef.current) return;
    quitOnceRef.current = true;
    void cleanupRef.current?.();
    exit();
  }, [exit]);
  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      handleQuit();
      return;
    }
    if (input === "q") {
      handleQuit();
      return;
    }
    if (input === "r") {
      void rebuildRef.current();
      return;
    }
    if (input === "c") {
      setUi((s) => ({ ...s, logLines: [] }));
      return;
    }
  });
  useEffect3(() => {
    const onSig = () => {
      handleQuit();
    };
    process.on("SIGINT", onSig);
    process.on("SIGTERM", onSig);
    return () => {
      process.off("SIGINT", onSig);
      process.off("SIGTERM", onSig);
    };
  }, [handleQuit]);
  useEffect3(() => {
    let alive = true;
    let buildProcess = null;
    let watcher = null;
    let stopBonjour;
    const run4 = async () => {
      try {
        const resolved = resolveHostPaths();
        const { projectRoot, lynxProjectDir, lynxBundlePath, lynxBundleFile, config } = resolved;
        const distDir = path30.dirname(lynxBundlePath);
        const projectName = path30.basename(lynxProjectDir);
        const basePath = `/${projectName}`;
        setUi((s) => ({ ...s, projectName, lynxBundleFile }));
        const preferredPort = config.devServer?.port ?? config.devServer?.httpPort ?? DEFAULT_PORT;
        const port = await findAvailablePort(preferredPort);
        if (port !== preferredPort) {
          appendLog(`Port ${preferredPort} in use, using ${port}`);
        }
        const iconPaths = resolveIconPaths(projectRoot, config);
        let iconFilePath = null;
        if (iconPaths?.source && fs30.statSync(iconPaths.source).isFile()) {
          iconFilePath = iconPaths.source;
        } else if (iconPaths?.androidAdaptiveForeground && fs30.statSync(iconPaths.androidAdaptiveForeground).isFile()) {
          iconFilePath = iconPaths.androidAdaptiveForeground;
        } else if (iconPaths?.android) {
          const androidIcon = path30.join(iconPaths.android, "mipmap-xxxhdpi", "ic_launcher.png");
          if (fs30.existsSync(androidIcon)) iconFilePath = androidIcon;
        } else if (iconPaths?.ios) {
          const iosIcon = path30.join(iconPaths.ios, "Icon-1024.png");
          if (fs30.existsSync(iosIcon)) iconFilePath = iosIcon;
        }
        const iconExt = iconFilePath ? path30.extname(iconFilePath) || ".png" : "";
        const runBuild = () => {
          return new Promise((resolve, reject) => {
            const { cmd, args } = detectPackageManager(lynxProjectDir);
            buildProcess = spawn(cmd, args, {
              cwd: lynxProjectDir,
              stdio: "pipe",
              shell: process.platform === "win32"
            });
            let stderrRaw = "";
            buildProcess.stdout?.resume();
            buildProcess.stderr?.on("data", (d) => {
              stderrRaw += d.toString();
            });
            buildProcess.on("close", (code) => {
              buildProcess = null;
              if (code === 0) resolve();
              else reject(new Error(stderrRaw.trim() || `Build exited ${code}`));
            });
          });
        };
        const doBuild = async () => {
          setUi((s) => ({ ...s, buildPhase: "building", buildError: void 0 }));
          try {
            await runBuild();
            if (!alive) return;
            setUi((s) => ({ ...s, buildPhase: "success" }));
          } catch (e) {
            if (!alive) return;
            const msg = e.message;
            setUi((s) => ({ ...s, buildPhase: "error", buildError: msg }));
            throw e;
          }
        };
        const httpSrv = http.createServer((req, res) => {
          let reqPath = (req.url || "/").split("?")[0];
          if (reqPath === `${basePath}/status`) {
            res.setHeader("Content-Type", "text/plain");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end("packager-status:running");
            return;
          }
          if (reqPath === `${basePath}/meta.json`) {
            const lanIp2 = getLanIp();
            const nativeModules = discoverNativeExtensions(projectRoot);
            const androidPackageName = config.android?.packageName?.trim();
            const iosBundleId = config.ios?.bundleId?.trim();
            const idParts = [androidPackageName?.toLowerCase(), iosBundleId?.toLowerCase()].filter(
              (x) => Boolean(x)
            );
            const meta = {
              name: projectName,
              slug: projectName,
              bundleUrl: `http://${lanIp2}:${port}${basePath}/${lynxBundleFile}`,
              bundleFile: lynxBundleFile,
              hostUri: `http://${lanIp2}:${port}${basePath}`,
              debuggerHost: `${lanIp2}:${port}`,
              developer: { tool: "tamer4lynx" },
              packagerStatus: "running",
              nativeModules: nativeModules.map((m) => ({
                packageName: m.packageName,
                moduleClassName: m.moduleClassName
              }))
            };
            if (androidPackageName) meta.androidPackageName = androidPackageName;
            if (iosBundleId) meta.iosBundleId = iosBundleId;
            if (idParts.length > 0) meta.tamerAppKey = idParts.join("|");
            const rawIcon = config.icon;
            if (rawIcon && typeof rawIcon === "object" && "source" in rawIcon && typeof rawIcon.source === "string") {
              meta.iconSource = rawIcon.source;
            } else if (typeof rawIcon === "string") {
              meta.iconSource = rawIcon;
            }
            if (iconFilePath) {
              meta.icon = `http://${lanIp2}:${port}${basePath}/icon${iconExt}`;
            }
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end(JSON.stringify(meta, null, 2));
            return;
          }
          if (iconFilePath && (reqPath === `${basePath}/icon` || reqPath === `${basePath}/icon${iconExt}`)) {
            fs30.readFile(iconFilePath, (err, data) => {
              if (err) {
                res.writeHead(404);
                res.end();
                return;
              }
              res.setHeader("Content-Type", STATIC_MIME[iconExt] ?? "image/png");
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.end(data);
            });
            return;
          }
          const lynxStaticMounts = [
            { prefix: `${basePath}/src/assets/`, rootSub: "src/assets" },
            { prefix: `${basePath}/assets/`, rootSub: "assets" }
          ];
          for (const { prefix, rootSub } of lynxStaticMounts) {
            if (!reqPath.startsWith(prefix)) continue;
            let rel = reqPath.slice(prefix.length);
            try {
              rel = decodeURIComponent(rel);
            } catch {
              res.writeHead(400);
              res.end();
              return;
            }
            const safe = path30.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
            if (path30.isAbsolute(safe) || safe.startsWith("..")) {
              res.writeHead(403);
              res.end();
              return;
            }
            const allowedRoot = path30.resolve(lynxProjectDir, rootSub);
            const abs = path30.resolve(allowedRoot, safe);
            if (!abs.startsWith(allowedRoot + path30.sep) && abs !== allowedRoot) {
              res.writeHead(403);
              res.end();
              return;
            }
            if (!fs30.existsSync(abs) || !fs30.statSync(abs).isFile()) {
              res.writeHead(404);
              res.end("Not found");
              return;
            }
            sendFileFromDisk(res, abs);
            return;
          }
          if (reqPath === "/" || reqPath === basePath || reqPath === `${basePath}/`) {
            reqPath = `${basePath}/${lynxBundleFile}`;
          } else if (!reqPath.startsWith(basePath)) {
            reqPath = basePath + (reqPath.startsWith("/") ? reqPath : "/" + reqPath);
          }
          const relPath = reqPath.replace(basePath, "").replace(/^\//, "") || lynxBundleFile;
          const filePath = path30.resolve(distDir, relPath);
          const distResolved = path30.resolve(distDir);
          if (!filePath.startsWith(distResolved + path30.sep) && filePath !== distResolved) {
            res.writeHead(403);
            res.end();
            return;
          }
          fs30.readFile(filePath, (err, data) => {
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
        const wssInst = new WebSocketServer({ noServer: true });
        const syncWsClientCount = () => {
          if (!alive) return;
          let n = 0;
          wssInst.clients.forEach((c) => {
            if (c.readyState === WebSocket.OPEN) n++;
          });
          setUi((s) => ({ ...s, wsConnections: n }));
        };
        rebuildRef.current = async () => {
          try {
            await doBuild();
            if (!alive) return;
            wssInst.clients.forEach((client) => {
              if (client.readyState === 1) client.send(JSON.stringify({ type: "reload" }));
            });
            appendLog("Rebuilt, clients notified");
          } catch {
          }
        };
        const watchRebuild = createDebouncedSerialRebuild(
          () => rebuildRef.current(),
          WATCH_REBUILD_DEBOUNCE_MS
        );
        httpSrv.on("upgrade", (request, socket, head) => {
          const p = (request.url || "").split("?")[0];
          if (p === `${basePath}/__hmr` || p === "/__hmr" || p.endsWith("/__hmr")) {
            wssInst.handleUpgrade(request, socket, head, (ws) => wssInst.emit("connection", ws, request));
          } else {
            socket.destroy();
          }
        });
        wssInst.on("connection", (ws, req) => {
          const clientIp = req.socket.remoteAddress ?? "unknown";
          appendLog(`[WS] connected: ${clientIp}`);
          ws.send(JSON.stringify({ type: "connected" }));
          syncWsClientCount();
          ws.on("close", () => {
            appendLog(`[WS] disconnected: ${clientIp}`);
            queueMicrotask(() => syncWsClientCount());
          });
          ws.on("error", () => {
            queueMicrotask(() => syncWsClientCount());
          });
          ws.on("message", (data) => {
            try {
              const msg = JSON.parse(data.toString());
              if (msg?.type === "console_log" && Array.isArray(msg.message)) {
                const skip = msg.message.includes("[rspeedy-dev-server]") || msg.message.includes("[HMR]");
                if (skip) return;
                const isJs = msg.tag === "lynx-console" || msg.tag == null;
                if (!verbose && !isJs) return;
                appendLog(`${isJs ? "[APP]" : "[NATIVE]"} ${msg.message.join(" ")}`);
              }
            } catch {
            }
          });
        });
        let chokidar = null;
        try {
          chokidar = await import("chokidar");
        } catch {
        }
        if (chokidar) {
          const watchPaths = [
            path30.join(lynxProjectDir, "src"),
            path30.join(lynxProjectDir, "lynx.config.ts"),
            path30.join(lynxProjectDir, "lynx.config.js")
          ].filter((p) => fs30.existsSync(p));
          if (watchPaths.length > 0) {
            const w = chokidar.watch(watchPaths, {
              ignoreInitial: true,
              awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
            });
            w.on("change", () => {
              watchRebuild.schedule();
            });
            watcher = {
              close: async () => {
                watchRebuild.cancel();
                await w.close();
              }
            };
          }
        }
        await doBuild();
        if (!alive) return;
        await new Promise((listenResolve, listenReject) => {
          httpSrv.listen(port, "0.0.0.0", () => {
            listenResolve();
          });
          httpSrv.once("error", (err) => listenReject(err));
        });
        if (!alive) return;
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
          setUi((s) => ({ ...s, bonjour: true }));
        }).catch(() => {
        });
        const lanIp = getLanIp();
        const devUrl = `http://${lanIp}:${port}${basePath}`;
        const wsUrl = `ws://${lanIp}:${port}${basePath}/__hmr`;
        setUi((s) => ({
          ...s,
          phase: "running",
          port,
          lanIp,
          devUrl,
          wsUrl
        }));
        void import("qrcode-terminal").then((mod) => {
          const qrcode = mod.default ?? mod;
          qrcode.generate(devUrl, { small: true }, (qr) => {
            if (!alive) return;
            setUi((s) => ({ ...s, qrLines: qr.split("\n").filter(Boolean) }));
          });
        }).catch(() => {
        });
        cleanupRef.current = async () => {
          buildProcess?.kill();
          await watcher?.close().catch(() => {
          });
          await stopBonjour?.();
          httpSrv.close();
          wssInst.close();
        };
      } catch (e) {
        if (!alive) return;
        setUi((s) => ({
          ...s,
          phase: "failed",
          startError: e.message
        }));
      }
    };
    void run4();
    return () => {
      alive = false;
      void cleanupRef.current?.();
    };
  }, [appendLog, appendLogLine, verbose]);
  return /* @__PURE__ */ jsx11(
    ServerDashboard,
    {
      cliVersion: TAMER_CLI_VERSION,
      projectName: ui.projectName,
      port: ui.port,
      lanIp: ui.lanIp,
      devUrl: ui.devUrl,
      wsUrl: ui.wsUrl,
      lynxBundleFile: ui.lynxBundleFile,
      bonjour: ui.bonjour,
      verbose: ui.verbose,
      buildPhase: ui.buildPhase,
      buildError: ui.buildError,
      wsConnections: ui.wsConnections,
      logLines: ui.logLines,
      qrLines: ui.qrLines,
      phase: ui.phase,
      startError: ui.startError
    }
  );
}
async function startDevServer(opts) {
  const verbose = opts?.verbose ?? false;
  const { waitUntilExit } = render3(/* @__PURE__ */ jsx11(DevServerApp, { verbose }), {
    exitOnCtrlC: false,
    patchConsole: false
  });
  await waitUntilExit();
}
var devServer_default = startDevServer;

// src/common/start.ts
async function start(opts) {
  await devServer_default({ verbose: opts?.verbose });
}
var start_default = start;

// src/common/injectHost.ts
import fs31 from "fs";
import path31 from "path";
function readAndSubstitute(templatePath, vars) {
  const raw = fs31.readFileSync(templatePath, "utf-8");
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
  const rootDir = path31.join(projectRoot, androidDir);
  const packagePath = packageName.replace(/\./g, "/");
  const javaDir = path31.join(rootDir, "app", "src", "main", "java", packagePath);
  const kotlinDir = path31.join(rootDir, "app", "src", "main", "kotlin", packagePath);
  if (!fs31.existsSync(javaDir) || !fs31.existsSync(kotlinDir)) {
    console.error("\u274C Android project not found. Run `t4l android create` first or ensure android/ exists.");
    process.exit(1);
  }
  const templateDir = path31.join(hostPkg, "android", "templates");
  const vars = { PACKAGE_NAME: packageName, APP_NAME: appName };
  const files = [
    { src: "App.java", dst: path31.join(javaDir, "App.java") },
    { src: "TemplateProvider.java", dst: path31.join(javaDir, "TemplateProvider.java") },
    { src: "MainActivity.kt", dst: path31.join(kotlinDir, "MainActivity.kt") }
  ];
  for (const { src, dst } of files) {
    const srcPath = path31.join(templateDir, src);
    if (!fs31.existsSync(srcPath)) continue;
    if (fs31.existsSync(dst) && !opts?.force) {
      console.log(`\u23ED\uFE0F  Skipping ${path31.basename(dst)} (use --force to overwrite)`);
      continue;
    }
    const content = readAndSubstitute(srcPath, vars);
    fs31.mkdirSync(path31.dirname(dst), { recursive: true });
    fs31.writeFileSync(dst, content);
    console.log(`\u2705 Injected ${path31.basename(dst)}`);
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
  const rootDir = path31.join(projectRoot, iosDir);
  const projectDir = path31.join(rootDir, appName);
  if (!fs31.existsSync(projectDir)) {
    console.error("\u274C iOS project not found. Run `t4l ios create` first or ensure ios/ exists.");
    process.exit(1);
  }
  const templateDir = path31.join(hostPkg, "ios", "templates");
  const vars = { PACKAGE_NAME: bundleId, APP_NAME: appName, BUNDLE_ID: bundleId };
  const files = [
    "AppDelegate.swift",
    "SceneDelegate.swift",
    "ViewController.swift",
    "LynxProvider.swift",
    "LynxInitProcessor.swift"
  ];
  for (const f of files) {
    const srcPath = path31.join(templateDir, f);
    const dstPath = path31.join(projectDir, f);
    if (!fs31.existsSync(srcPath)) continue;
    if (fs31.existsSync(dstPath) && !opts?.force) {
      console.log(`\u23ED\uFE0F  Skipping ${f} (use --force to overwrite)`);
      continue;
    }
    const content = readAndSubstitute(srcPath, vars);
    fs31.writeFileSync(dstPath, content);
    console.log(`\u2705 Injected ${f}`);
  }
}

// src/common/buildEmbeddable.ts
import fs32 from "fs";
import path32 from "path";
import { execSync as execSync12 } from "child_process";
var EMBEDDABLE_DIR = "embeddable";
var LIB_PACKAGE = "com.tamer.embeddable";
var GRADLE_VERSION = "8.14.2";
var LIBS_VERSIONS_TOML = `[versions]
agp = "8.9.1"
lynx = "3.6.0"
kotlin = "2.0.21"
primjs = "3.6.1"

[libraries]
lynx = { module = "org.lynxsdk.lynx:lynx", version.ref = "lynx" }
lynx-jssdk = { module = "org.lynxsdk.lynx:lynx-jssdk", version.ref = "lynx" }
lynx-processor = { module = "org.lynxsdk.lynx:lynx-processor", version.ref = "lynx" }
lynx-trace = { module = "org.lynxsdk.lynx:lynx-trace", version.ref = "lynx" }
lynx-xelement = { module = "org.lynxsdk.lynx:xelement", version.ref = "lynx" }
lynx-xelement-input = { module = "org.lynxsdk.lynx:xelement-input", version.ref = "lynx" }
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
function generateAndroidLibrary(outDir, androidDir, projectRoot, lynxBundleFile, distDir, modules, abiFilters) {
  const libDir = path32.join(androidDir, "lib");
  const libSrcMain = path32.join(libDir, "src", "main");
  const assetsDir = path32.join(libSrcMain, "assets");
  const kotlinDir = path32.join(libSrcMain, "kotlin", LIB_PACKAGE.replace(/\./g, "/"));
  const generatedDir = path32.join(kotlinDir, "generated");
  fs32.mkdirSync(path32.join(androidDir, "gradle"), { recursive: true });
  fs32.mkdirSync(generatedDir, { recursive: true });
  fs32.mkdirSync(assetsDir, { recursive: true });
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
    const absPath = path32.join(p.packagePath, sourceDir).replace(/\\/g, "/");
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
    implementation(libs.lynx.xelement)
    implementation(libs.lynx.xelement.input)
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
  fs32.writeFileSync(path32.join(androidDir, "gradle", "libs.versions.toml"), LIBS_VERSIONS_TOML);
  fs32.writeFileSync(path32.join(androidDir, "settings.gradle.kts"), settingsContent);
  fs32.writeFileSync(
    path32.join(androidDir, "build.gradle.kts"),
    `plugins {
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.kapt) apply false
}
`
  );
  fs32.writeFileSync(
    path32.join(androidDir, "gradle.properties"),
    `org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
kotlin.code.style=official
`
  );
  fs32.writeFileSync(path32.join(libDir, "build.gradle.kts"), libBuildContent);
  fs32.writeFileSync(
    path32.join(libSrcMain, "AndroidManifest.xml"),
    '<?xml version="1.0" encoding="utf-8"?>\n<manifest />'
  );
  copyDistAssets(distDir, assetsDir, lynxBundleFile);
  fs32.writeFileSync(path32.join(kotlinDir, "LynxEmbeddable.kt"), LYNX_EMBEDDABLE_KT);
  fs32.writeFileSync(
    path32.join(generatedDir, "GeneratedLynxExtensions.kt"),
    generateLynxExtensionsKotlin(modules, LIB_PACKAGE)
  );
  fs32.writeFileSync(
    path32.join(generatedDir, "GeneratedActivityLifecycle.kt"),
    generateActivityLifecycleKotlin(modules, LIB_PACKAGE)
  );
}
async function buildEmbeddable(opts = {}) {
  const resolved = resolveHostPaths();
  const { lynxProjectDir, lynxBundlePath, lynxBundleFile, lynxBundleFiles, lynxBundleRootRel, projectRoot, config } = resolved;
  console.log("\u{1F4E6} Building Lynx project (release)...");
  execSync12("npm run build", { stdio: "inherit", cwd: lynxProjectDir });
  for (const name of lynxBundleFiles) {
    const p = path32.join(lynxProjectDir, lynxBundleRootRel, name);
    if (!fs32.existsSync(p)) {
      console.error(`\u274C Bundle not found at ${p}`);
      process.exit(1);
    }
  }
  const outDir = path32.join(projectRoot, EMBEDDABLE_DIR);
  fs32.mkdirSync(outDir, { recursive: true });
  const distDir = path32.dirname(lynxBundlePath);
  copyDistAssets(distDir, outDir, lynxBundleFile);
  const modules = discoverModules(projectRoot);
  const androidModules = modules.filter((m) => m.config.android);
  const abiFilters = resolveAbiFilters(config);
  const androidDir = path32.join(outDir, "android");
  if (fs32.existsSync(androidDir)) fs32.rmSync(androidDir, { recursive: true });
  fs32.mkdirSync(androidDir, { recursive: true });
  generateAndroidLibrary(outDir, androidDir, projectRoot, lynxBundleFile, distDir, modules, abiFilters);
  const gradlewPath = path32.join(androidDir, "gradlew");
  const devAppDir = findDevAppPackage(projectRoot);
  const existingGradleDirs = [
    path32.join(projectRoot, "android"),
    devAppDir ? path32.join(devAppDir, "android") : null
  ].filter(Boolean);
  let hasWrapper = false;
  for (const d of existingGradleDirs) {
    if (fs32.existsSync(path32.join(d, "gradlew"))) {
      for (const name of ["gradlew", "gradlew.bat", "gradle"]) {
        const src = path32.join(d, name);
        if (fs32.existsSync(src)) {
          const dest = path32.join(androidDir, name);
          if (fs32.statSync(src).isDirectory()) {
            fs32.cpSync(src, dest, { recursive: true });
          } else {
            fs32.copyFileSync(src, dest);
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
    execSync12("./gradlew :lib:assembleRelease", { cwd: androidDir, stdio: "inherit" });
  } catch (e) {
    console.error("\u274C Android AAR build failed. Run manually: cd embeddable/android && ./gradlew :lib:assembleRelease");
    throw e;
  }
  const aarSrc = path32.join(androidDir, "lib", "build", "outputs", "aar", "lib-release.aar");
  const aarDest = path32.join(outDir, "tamer-embeddable.aar");
  if (fs32.existsSync(aarSrc)) {
    fs32.copyFileSync(aarSrc, aarDest);
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
  fs32.writeFileSync(path32.join(outDir, "snippet-android.kt"), snippetAndroid);
  generateIosPod(outDir, projectRoot, lynxBundleFile, distDir, modules);
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
  fs32.writeFileSync(path32.join(outDir, "README.md"), readme);
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
function generateIosPod(outDir, projectRoot, lynxBundleFile, distDir, modules) {
  const iosDir = path32.join(outDir, "ios");
  const podDir = path32.join(iosDir, "TamerEmbeddable");
  const resourcesDir = path32.join(podDir, "Resources");
  fs32.mkdirSync(resourcesDir, { recursive: true });
  copyDistAssets(distDir, resourcesDir, lynxBundleFile);
  const iosModules = modules.filter((m) => m.config.ios);
  const podDeps = iosModules.map((p) => {
    const podspecPath = p.config.ios?.podspecPath || ".";
    const podspecDir = path32.join(p.packagePath, podspecPath);
    if (!fs32.existsSync(podspecDir)) return null;
    const files = fs32.readdirSync(podspecDir);
    const podspecFile = files.find((f) => f.endsWith(".podspec"));
    const podName = podspecFile ? podspecFile.replace(".podspec", "") : p.name.split("/").pop().replace(/-/g, "");
    const absPath = path32.resolve(podspecDir);
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
    const podspecDir = path32.join(p.packagePath, podspecPath);
    if (!fs32.existsSync(podspecDir)) return null;
    const files = fs32.readdirSync(podspecDir);
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
  fs32.writeFileSync(path32.join(iosDir, "TamerEmbeddable.podspec"), podspecContent);
  fs32.writeFileSync(path32.join(podDir, "LynxEmbeddable.swift"), lynxEmbeddableSwift);
  const absIosDir = path32.resolve(iosDir);
  const podfileSnippet = `# Paste into your app target in Podfile:

pod 'TamerEmbeddable', :path => '${absIosDir}'
${podDeps.map((d) => `pod '${d.podName}', :path => '${d.absPath}'`).join("\n")}
`;
  fs32.writeFileSync(path32.join(iosDir, "Podfile.snippet"), podfileSnippet);
  fs32.writeFileSync(
    path32.join(outDir, "snippet-ios.swift"),
    `// Add LynxEmbeddable.initEnvironment() in your AppDelegate/SceneDelegate before presenting LynxView.
// Then create LynxView with your bundle URL (main.lynx.bundle is in the pod resources).
`
  );
}

// src/common/add.ts
import fs33 from "fs";
import path33 from "path";
import { execFile, execSync as execSync13 } from "child_process";
import { promisify } from "util";
import semver from "semver";
var execFileAsync = promisify(execFile);
var CORE_PACKAGES = [
  "@tamer4lynx/tamer-app-shell",
  "@tamer4lynx/tamer-screen",
  "@tamer4lynx/tamer-router",
  "@tamer4lynx/tamer-insets",
  "@tamer4lynx/tamer-transports",
  "@tamer4lynx/tamer-system-ui",
  "@tamer4lynx/tamer-icons",
  "@tamer4lynx/tamer-env"
];
var DEV_STACK_PACKAGES = [
  "@tamer4lynx/tamer-dev-app",
  "@tamer4lynx/tamer-dev-client",
  "@tamer4lynx/tamer-app-shell",
  "@tamer4lynx/tamer-icons",
  "@tamer4lynx/tamer-insets",
  "@tamer4lynx/tamer-plugin",
  "@tamer4lynx/tamer-router",
  "@tamer4lynx/tamer-screen",
  "@tamer4lynx/tamer-system-ui"
];
var PACKAGE_JSON_DEP_SECTIONS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
function isNonRegistryTamerDep(versionSpec) {
  const v = versionSpec.trim();
  if (!v) return true;
  return v.startsWith("file:") || v.startsWith("link:") || v.startsWith("portal:") || v.includes("workspace:");
}
function collectTamerPackagesFromPackageJson(cwd) {
  const pkgPath = path33.join(cwd, "package.json");
  if (!fs33.existsSync(pkgPath)) {
    console.warn(`\u26A0\uFE0F  No package.json at ${pkgPath}`);
    return [];
  }
  let pkg;
  try {
    pkg = JSON.parse(fs33.readFileSync(pkgPath, "utf8"));
  } catch {
    console.warn(`\u26A0\uFE0F  Could not parse ${pkgPath}`);
    return [];
  }
  const names = /* @__PURE__ */ new Set();
  for (const section of PACKAGE_JSON_DEP_SECTIONS) {
    const deps = pkg[section];
    if (!deps || typeof deps !== "object" || Array.isArray(deps)) continue;
    for (const [name, spec] of Object.entries(deps)) {
      if (!name.startsWith("@tamer4lynx/")) continue;
      if (typeof spec !== "string") continue;
      if (isNonRegistryTamerDep(spec)) continue;
      names.add(name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
var PACKAGE_ALIASES = {};
async function getHighestPublishedVersion(fullName) {
  try {
    const { stdout } = await execFileAsync("npm", ["view", fullName, "versions", "--json"], {
      maxBuffer: 10 * 1024 * 1024
    });
    const parsed = JSON.parse(stdout.trim());
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const valid = list.filter((v) => typeof v === "string" && !!semver.valid(v));
    if (valid.length === 0) return null;
    return semver.rsort(valid)[0] ?? null;
  } catch {
    return null;
  }
}
async function normalizeTamerInstallSpec(pkg) {
  if (!pkg.startsWith("@tamer4lynx/")) return pkg;
  if (/^@[^/]+\/[^@]+@/.test(pkg)) return pkg;
  const highest = await getHighestPublishedVersion(pkg);
  if (highest) {
    return `${pkg}@${highest}`;
  }
  console.warn(`\u26A0\uFE0F  Could not resolve published versions for ${pkg}; using @prerelease`);
  return `${pkg}@prerelease`;
}
function detectPackageManager2(cwd) {
  const dir = path33.resolve(cwd);
  if (fs33.existsSync(path33.join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs33.existsSync(path33.join(dir, "bun.lockb"))) return "bun";
  return "npm";
}
function runInstall(cwd, packages, pm) {
  if (pm === "npm") {
    execSync13(`npm install --legacy-peer-deps ${packages.join(" ")}`, { stdio: "inherit", cwd });
    return;
  }
  const args = ["add", ...packages];
  const cmd = pm === "pnpm" ? "pnpm" : "bun";
  execSync13(`${cmd} ${args.join(" ")}`, { stdio: "inherit", cwd });
}
async function addCore() {
  const { lynxProjectDir } = resolveHostPaths();
  const pm = detectPackageManager2(lynxProjectDir);
  console.log(`Resolving latest published versions (npm)\u2026`);
  const resolved = await Promise.all(CORE_PACKAGES.map(normalizeTamerInstallSpec));
  console.log(`Adding core packages to ${lynxProjectDir} (using ${pm})\u2026`);
  runInstall(lynxProjectDir, resolved, pm);
  console.log("\u2705 Core packages installed. Run `t4l link` to link native modules.");
}
async function addDev() {
  const { lynxProjectDir } = resolveHostPaths();
  const pm = detectPackageManager2(lynxProjectDir);
  console.log(`Resolving latest published versions (npm)\u2026`);
  const resolved = await Promise.all([...DEV_STACK_PACKAGES].map(normalizeTamerInstallSpec));
  console.log(`Adding dev stack (${DEV_STACK_PACKAGES.length} @tamer4lynx packages) to ${lynxProjectDir} (using ${pm})\u2026`);
  runInstall(lynxProjectDir, resolved, pm);
  console.log("\u2705 Dev stack installed. Run `t4l link` to link native modules.");
}
async function updateTamerPackages() {
  const { lynxProjectDir } = resolveHostPaths();
  const tamerPkgs = collectTamerPackagesFromPackageJson(lynxProjectDir);
  if (tamerPkgs.length === 0) {
    console.log(
      "No @tamer4lynx packages to update (none found in package.json, or only file:/workspace: links). Add packages with `t4l add` first."
    );
    return;
  }
  const pm = detectPackageManager2(lynxProjectDir);
  console.log(`Resolving latest published versions (npm)\u2026`);
  const resolved = await Promise.all(tamerPkgs.map(normalizeTamerInstallSpec));
  console.log(`Updating ${tamerPkgs.length} @tamer4lynx packages in ${lynxProjectDir} (using ${pm})\u2026`);
  runInstall(lynxProjectDir, resolved, pm);
  console.log("\u2705 Tamer packages updated. Run `t4l link` to link native modules.");
}
async function add(packages = []) {
  const list = Array.isArray(packages) ? packages : [];
  if (list.length === 0) {
    console.log("Usage: t4l add <package> [package...]");
    console.log("Example: t4l add @tamer4lynx/tamer-auth");
    console.log("");
    console.log("Future: t4l add will track installed versions for compatibility (Expo-style).");
    return;
  }
  const { lynxProjectDir } = resolveHostPaths();
  const pm = detectPackageManager2(lynxProjectDir);
  console.log(`Resolving latest published versions (npm)\u2026`);
  const normalized = await Promise.all(
    list.map(async (p) => {
      const spec = p.startsWith("@") ? p : PACKAGE_ALIASES[p] ?? `@tamer4lynx/${p}`;
      return normalizeTamerInstallSpec(spec);
    })
  );
  console.log(`Adding ${normalized.join(", ")} to ${lynxProjectDir} (using ${pm})\u2026`);
  runInstall(lynxProjectDir, normalized, pm);
  console.log("\u2705 Packages installed. Run `t4l link` to link native modules.");
}

// src/common/signing.tsx
import { useState as useState6, useEffect as useEffect4, useRef as useRef2, useMemo } from "react";
import { render as render4, Text as Text10, Box as Box9 } from "ink";
import fs36 from "fs";
import path36 from "path";

// src/common/androidKeystore.ts
import { execFileSync } from "child_process";
import fs34 from "fs";
import path34 from "path";
function normalizeJavaHome(raw) {
  if (!raw) return void 0;
  const t = raw.trim().replace(/^["']|["']$/g, "");
  return t || void 0;
}
function discoverJavaHomeMacOs() {
  if (process.platform !== "darwin") return void 0;
  try {
    const out = execFileSync("/usr/libexec/java_home", [], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim().split("\n")[0]?.trim();
    if (out && fs34.existsSync(path34.join(out, "bin", "keytool"))) return out;
  } catch {
  }
  return void 0;
}
function resolveKeytoolPath() {
  const jh = normalizeJavaHome(process.env.JAVA_HOME);
  const win = process.platform === "win32";
  const keytoolName = win ? "keytool.exe" : "keytool";
  if (jh) {
    const p = path34.join(jh, "bin", keytoolName);
    if (fs34.existsSync(p)) return p;
  }
  const mac = discoverJavaHomeMacOs();
  if (mac) {
    const p = path34.join(mac, "bin", keytoolName);
    if (fs34.existsSync(p)) return p;
  }
  return "keytool";
}
function keytoolAvailable() {
  const tryRun = (cmd) => {
    try {
      execFileSync(cmd, ["-help"], { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  };
  if (tryRun("keytool")) return true;
  const fromJavaHome = resolveKeytoolPath();
  if (fromJavaHome !== "keytool" && fs34.existsSync(fromJavaHome)) {
    return tryRun(fromJavaHome);
  }
  return false;
}
function generateReleaseKeystore(opts) {
  const keytool = resolveKeytoolPath();
  const dir = path34.dirname(opts.keystoreAbsPath);
  fs34.mkdirSync(dir, { recursive: true });
  if (fs34.existsSync(opts.keystoreAbsPath)) {
    throw new Error(`Keystore already exists: ${opts.keystoreAbsPath}`);
  }
  if (!opts.storePassword || !opts.keyPassword) {
    throw new Error(
      "JDK keytool requires a keystore and key password of at least 6 characters for -genkeypair. Enter a password or use an existing keystore."
    );
  }
  const args = [
    "-genkeypair",
    "-v",
    "-keystore",
    opts.keystoreAbsPath,
    "-alias",
    opts.alias,
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    "10000",
    "-storepass",
    opts.storePassword,
    "-keypass",
    opts.keyPassword,
    "-dname",
    opts.dname
  ];
  try {
    execFileSync(keytool, args, { stdio: ["pipe", "pipe", "pipe"] });
  } catch (e) {
    const err = e;
    const fromKeytool = [err.stdout, err.stderr].filter(Boolean).map((b) => Buffer.from(b).toString("utf8")).join("\n").trim();
    throw new Error(fromKeytool || err.message || "keytool failed");
  }
}

// src/common/appendEnvFile.ts
import fs35 from "fs";
import path35 from "path";
import { parse as parse2 } from "dotenv";
function keysDefinedInFile(filePath) {
  if (!fs35.existsSync(filePath)) return /* @__PURE__ */ new Set();
  try {
    return new Set(Object.keys(parse2(fs35.readFileSync(filePath, "utf8"))));
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function formatEnvLine(key, value) {
  if (/[\r\n]/.test(value) || /^\s|\s$/.test(value) || /[#"'\\=]/.test(value)) {
    const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `${key}="${escaped}"`;
  }
  return `${key}=${value}`;
}
function appendEnvVarsIfMissing(projectRoot, vars) {
  const entries = Object.entries(vars).filter(([, v]) => v !== void 0 && v !== "");
  if (entries.length === 0) return null;
  const envLocal = path35.join(projectRoot, ".env.local");
  const envDefault = path35.join(projectRoot, ".env");
  let target;
  if (fs35.existsSync(envLocal)) target = envLocal;
  else if (fs35.existsSync(envDefault)) target = envDefault;
  else target = envLocal;
  const existing = keysDefinedInFile(target);
  const lines = [];
  const appendedKeys = [];
  for (const [k, v] of entries) {
    if (existing.has(k)) continue;
    lines.push(formatEnvLine(k, v));
    appendedKeys.push(k);
  }
  if (lines.length === 0) {
    return {
      file: path35.basename(target),
      keys: [],
      skippedAll: entries.length > 0
    };
  }
  let prefix = "";
  if (fs35.existsSync(target)) {
    const cur = fs35.readFileSync(target, "utf8");
    prefix = cur.length === 0 ? "" : cur.endsWith("\n") ? cur : `${cur}
`;
  }
  const block = lines.join("\n") + "\n";
  fs35.writeFileSync(target, prefix + block, "utf8");
  return { file: path35.basename(target), keys: appendedKeys };
}

// src/common/signing.tsx
import { Fragment, jsx as jsx12, jsxs as jsxs10 } from "react/jsx-runtime";
function AndroidKeystoreModeSelect({
  onSelect
}) {
  const canGen = keytoolAvailable();
  const items = canGen ? [
    { label: "Generate a new release keystore (JDK keytool)", value: "generate" },
    { label: "Use an existing keystore file", value: "existing" }
  ] : [
    {
      label: "Use an existing keystore file (install a JDK for keytool to generate)",
      value: "existing"
    }
  ];
  return /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx12(
      TuiSelectInput,
      {
        label: "Android release keystore:",
        items,
        onSelect
      }
    ),
    !canGen && /* @__PURE__ */ jsx12(Text10, { dimColor: true, children: "keytool not found on PATH / JAVA_HOME. Install a JDK or set JAVA_HOME, then run signing again to generate." })
  ] });
}
function IosIdentitySelectStep({
  onPick
}) {
  const identities = useMemo(() => listCodeSigningIdentities(), []);
  const items = useMemo(() => {
    const rows = identities.map((id) => ({
      label: `${id.label}`,
      value: id.sha1
    }));
    rows.push({ label: "Enter team / identity / profile manually\u2026", value: "__manual__" });
    return rows;
  }, [identities]);
  if (identities.length === 0) {
    return /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx12(Text10, { color: "yellow", children: "No code signing identities found in Keychain." }),
      /* @__PURE__ */ jsx12(Text10, { dimColor: true, children: "Install a certificate or sign in to Xcode with your Apple ID." }),
      /* @__PURE__ */ jsx12(
        TuiSelectInput,
        {
          label: "Continue:",
          items: [{ label: "Enter signing details manually\u2026", value: "manual" }],
          onSelect: () => onPick("manual")
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsx12(
    TuiSelectInput,
    {
      label: "Code signing identity:",
      items,
      onSelect: (sha1) => {
        if (sha1 === "__manual__") onPick("manual");
        else {
          const id = identities.find((i) => i.sha1 === sha1);
          if (id) onPick(id);
        }
      }
    }
  );
}
function IosProfileSelectStep({
  bundleId,
  onPick
}) {
  const profiles = useMemo(() => listProvisioningProfiles(bundleId?.trim()), [bundleId]);
  const items = useMemo(() => {
    const rows = [
      { label: "Skip (automatic signing / Xcode defaults)", value: "__skip__" },
      ...profiles.map((p) => ({
        label: `${p.name}${p.expiration ? ` \u2014 exp ${p.expiration}` : ""}`,
        value: p.uuid
      }))
    ];
    return rows;
  }, [profiles]);
  return /* @__PURE__ */ jsx12(
    TuiSelectInput,
    {
      label: "Provisioning profile (optional):",
      items,
      onSelect: (uuid) => {
        if (uuid === "__skip__") onPick(null);
        else {
          const p = profiles.find((x) => x.uuid === uuid);
          onPick(p ?? null);
        }
      }
    }
  );
}
function IosManualStep({
  onDone
}) {
  const [phase, setPhase] = useState6("team");
  const [team, setTeam] = useState6("");
  const [identity, setIdentity] = useState6("");
  if (phase === "team") {
    return /* @__PURE__ */ jsx12(
      TuiTextInput,
      {
        label: "iOS Development Team ID:",
        defaultValue: team,
        onSubmitValue: (v) => setTeam(v),
        onSubmit: () => setPhase("identity"),
        hint: "10-character Team ID (Membership page in Apple Developer)"
      }
    );
  }
  if (phase === "identity") {
    return /* @__PURE__ */ jsx12(
      TuiTextInput,
      {
        label: "Code sign identity (optional, Enter to skip):",
        defaultValue: identity,
        onSubmitValue: (v) => setIdentity(v),
        onSubmit: () => setPhase("profile"),
        hint: 'e.g. "Apple Development" or full name from Keychain'
      }
    );
  }
  return /* @__PURE__ */ jsx12(
    TuiTextInput,
    {
      label: "Provisioning profile name or UUID (optional, Enter to skip):",
      defaultValue: "",
      onSubmitValue: (v) => {
        onDone({
          developmentTeam: team.trim(),
          codeSignIdentity: identity.trim(),
          provisioningProfileSpecifier: v.trim()
        });
      },
      onSubmit: () => {
      },
      hint: "Profile name as in Xcode, or UUID"
    }
  );
}
function firstStepForPlatform(p) {
  if (p === "ios") return "ios-identity-select";
  if (p === "android" || p === "both") return "android-keystore-mode";
  return "platform";
}
function SigningWizard({ platform: initialPlatform }) {
  const iosBundleId = useMemo(() => {
    try {
      return resolveHostPaths().config.ios?.bundleId;
    } catch {
      return void 0;
    }
  }, []);
  const [state, setState] = useState6({
    platform: initialPlatform || null,
    android: {
      keystoreFile: "",
      keyAlias: "release",
      storePasswordEnv: "ANDROID_KEYSTORE_PASSWORD",
      keyPasswordEnv: "ANDROID_KEY_PASSWORD",
      keystoreMode: null,
      genKeystorePath: "android/release.keystore",
      genPassword: ""
    },
    ios: {
      developmentTeam: "",
      codeSignIdentity: "",
      provisioningProfileSpecifier: "",
      provisioningProfileUuid: ""
    },
    step: initialPlatform ? firstStepForPlatform(initialPlatform) : "platform",
    generateError: null,
    androidEnvAppend: null
  });
  const nextStep = () => {
    setState((s) => {
      if (s.step === "android-gen-path") {
        return { ...s, step: "android-gen-alias" };
      }
      if (s.step === "android-gen-alias") {
        return { ...s, step: "android-gen-password" };
      }
      if (s.step === "android-keystore") {
        return { ...s, step: "android-alias" };
      }
      if (s.step === "android-alias") {
        return { ...s, step: "android-password-env" };
      }
      if (s.step === "android-password-env") {
        return { ...s, step: "android-key-password-env" };
      }
      if (s.step === "android-key-password-env") {
        if (s.platform === "both") {
          return { ...s, step: "ios-identity-select" };
        }
        return { ...s, step: "saving" };
      }
      return s;
    });
  };
  useEffect4(() => {
    if (state.step === "saving") {
      saveConfig();
    }
  }, [state.step]);
  const generateRunId = useRef2(0);
  useEffect4(() => {
    if (state.step !== "android-generating") return;
    const runId = ++generateRunId.current;
    let cancelled = false;
    const run4 = () => {
      let abs = "";
      try {
        const resolved = resolveHostPaths();
        const rel = state.android.genKeystorePath.trim() || "android/release.keystore";
        abs = path36.isAbsolute(rel) ? rel : path36.join(resolved.projectRoot, rel);
        const alias = state.android.keyAlias.trim() || "release";
        const pw = state.android.genPassword;
        const pkg = resolved.config.android?.packageName ?? "com.example.app";
        const safeOU = pkg.replace(/[,=+]/g, "_");
        const dname = `CN=Android Release, OU=${safeOU}, O=Android, C=US`;
        generateReleaseKeystore({
          keystoreAbsPath: abs,
          alias,
          storePassword: pw,
          keyPassword: pw,
          dname
        });
        if (cancelled || runId !== generateRunId.current) return;
        setState((s) => ({
          ...s,
          android: {
            ...s.android,
            keystoreFile: rel,
            keyAlias: alias,
            keystoreMode: "generate"
          },
          step: "android-password-env",
          generateError: null
        }));
      } catch (e) {
        const msg = e.message;
        if (abs && fs36.existsSync(abs) && (msg.includes("already exists") || msg.includes("Keystore already exists"))) {
          if (cancelled || runId !== generateRunId.current) return;
          const rel = state.android.genKeystorePath.trim() || "android/release.keystore";
          const alias = state.android.keyAlias.trim() || "release";
          setState((s) => ({
            ...s,
            android: {
              ...s.android,
              keystoreFile: rel,
              keyAlias: alias,
              keystoreMode: "generate"
            },
            step: "android-password-env",
            generateError: null
          }));
          return;
        }
        if (cancelled || runId !== generateRunId.current) return;
        setState((s) => ({
          ...s,
          step: "android-gen-password",
          generateError: msg
        }));
      }
    };
    run4();
    return () => {
      cancelled = true;
    };
  }, [state.step, state.android.genKeystorePath, state.android.keyAlias, state.android.genPassword]);
  useEffect4(() => {
    if (state.step === "done") {
      setTimeout(() => {
        process.exit(0);
      }, 3e3);
    }
  }, [state.step]);
  const saveConfig = async () => {
    try {
      const resolved = resolveHostPaths();
      const configPath = path36.join(resolved.projectRoot, "tamer.config.json");
      let config = {};
      let androidEnvAppend = null;
      if (fs36.existsSync(configPath)) {
        config = JSON.parse(fs36.readFileSync(configPath, "utf8"));
      }
      if (state.platform === "android" || state.platform === "both") {
        config.android = config.android || {};
        config.android.signing = {
          keystoreFile: state.android.keystoreFile,
          keyAlias: state.android.keyAlias,
          storePasswordEnv: state.android.storePasswordEnv,
          keyPasswordEnv: state.android.keyPasswordEnv
        };
        if (state.android.keystoreMode === "generate" && state.android.genPassword) {
          const storeEnv = state.android.storePasswordEnv.trim() || "ANDROID_KEYSTORE_PASSWORD";
          const keyEnv = state.android.keyPasswordEnv.trim() || "ANDROID_KEY_PASSWORD";
          androidEnvAppend = appendEnvVarsIfMissing(resolved.projectRoot, {
            [storeEnv]: state.android.genPassword,
            [keyEnv]: state.android.genPassword
          });
        }
      }
      if (state.platform === "ios" || state.platform === "both") {
        config.ios = config.ios || {};
        config.ios.signing = {
          developmentTeam: state.ios.developmentTeam,
          ...state.ios.codeSignIdentity && { codeSignIdentity: state.ios.codeSignIdentity },
          ...state.ios.provisioningProfileSpecifier && {
            provisioningProfileSpecifier: state.ios.provisioningProfileSpecifier
          },
          ...state.ios.provisioningProfileUuid && {
            provisioningProfileUuid: state.ios.provisioningProfileUuid
          }
        };
      }
      fs36.writeFileSync(configPath, JSON.stringify(config, null, 2));
      const gitignorePath = path36.join(resolved.projectRoot, ".gitignore");
      if (fs36.existsSync(gitignorePath)) {
        let gitignore = fs36.readFileSync(gitignorePath, "utf8");
        const additions = [
          ".env.local",
          "*.jks",
          "*.keystore"
        ];
        for (const addition of additions) {
          if (!gitignore.includes(addition)) {
            gitignore += `
${addition}
`;
          }
        }
        fs36.writeFileSync(gitignorePath, gitignore);
      }
      setState((s) => ({
        ...s,
        step: "done",
        androidEnvAppend: state.platform === "android" || state.platform === "both" ? androidEnvAppend : null
      }));
    } catch (error) {
      console.error("Error saving config:", error);
      process.exit(1);
    }
  };
  if (state.step === "done") {
    return /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx12(Text10, { color: "green", children: "\u2705 Signing configuration saved to tamer.config.json" }),
      (state.platform === "android" || state.platform === "both") && /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", marginTop: 1, children: [
        /* @__PURE__ */ jsx12(Text10, { children: "Android signing configured:" }),
        /* @__PURE__ */ jsxs10(Text10, { dimColor: true, children: [
          "  Keystore: ",
          state.android.keystoreFile
        ] }),
        /* @__PURE__ */ jsxs10(Text10, { dimColor: true, children: [
          "  Alias: ",
          state.android.keyAlias
        ] }),
        state.androidEnvAppend?.keys.length ? /* @__PURE__ */ jsxs10(Text10, { children: [
          "Appended ",
          state.androidEnvAppend.keys.join(", "),
          " to ",
          state.androidEnvAppend.file,
          " (existing keys left unchanged)."
        ] }) : state.androidEnvAppend?.skippedAll ? /* @__PURE__ */ jsxs10(Text10, { dimColor: true, children: [
          state.androidEnvAppend.file,
          " already defines the signing env vars; left unchanged."
        ] }) : /* @__PURE__ */ jsxs10(Fragment, { children: [
          /* @__PURE__ */ jsx12(Text10, { children: "Set environment variables (or add them to .env / .env.local):" }),
          /* @__PURE__ */ jsxs10(Text10, { dimColor: true, children: [
            "  export ",
            state.android.storePasswordEnv,
            '="your-keystore-password"'
          ] }),
          /* @__PURE__ */ jsxs10(Text10, { dimColor: true, children: [
            "  export ",
            state.android.keyPasswordEnv,
            '="your-key-password"'
          ] })
        ] })
      ] }),
      (state.platform === "ios" || state.platform === "both") && /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", marginTop: 1, children: [
        /* @__PURE__ */ jsx12(Text10, { children: "iOS signing configured:" }),
        /* @__PURE__ */ jsxs10(Text10, { dimColor: true, children: [
          "  Team ID: ",
          state.ios.developmentTeam
        ] }),
        state.ios.codeSignIdentity ? /* @__PURE__ */ jsxs10(Text10, { dimColor: true, children: [
          "  Identity: ",
          state.ios.codeSignIdentity
        ] }) : null,
        state.ios.provisioningProfileSpecifier ? /* @__PURE__ */ jsxs10(Text10, { dimColor: true, children: [
          "  Provisioning profile: ",
          state.ios.provisioningProfileSpecifier
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", marginTop: 1, children: [
        state.platform === "android" && /* @__PURE__ */ jsx12(Text10, { children: "Run `t4l build android -p` to build with signing." }),
        state.platform === "ios" && /* @__PURE__ */ jsx12(Text10, { children: "Run `t4l build ios -p` to build with signing." }),
        state.platform === "both" && /* @__PURE__ */ jsx12(Fragment, { children: /* @__PURE__ */ jsx12(Text10, { children: "Run `t4l build android -p` and `t4l build ios -p` separately (one platform per command)." }) })
      ] })
    ] });
  }
  if (state.step === "saving") {
    return /* @__PURE__ */ jsx12(Box9, { children: /* @__PURE__ */ jsx12(TuiSpinner, { label: "Saving configuration..." }) });
  }
  if (state.step === "android-generating") {
    return /* @__PURE__ */ jsx12(Box9, { flexDirection: "column", children: /* @__PURE__ */ jsx12(TuiSpinner, { label: "Running keytool to create release keystore..." }) });
  }
  return /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", children: [
    state.step === "platform" && /* @__PURE__ */ jsx12(
      TuiSelectInput,
      {
        label: "Select platform(s) to configure signing:",
        items: [
          { label: "Android", value: "android" },
          { label: "iOS", value: "ios" },
          { label: "Both", value: "both" }
        ],
        onSelect: (platform) => {
          setState((s) => ({ ...s, platform, step: firstStepForPlatform(platform) }));
        }
      }
    ),
    state.step === "android-keystore-mode" && /* @__PURE__ */ jsx12(
      AndroidKeystoreModeSelect,
      {
        onSelect: (mode) => {
          setState((s) => ({
            ...s,
            android: { ...s.android, keystoreMode: mode },
            step: mode === "generate" ? "android-gen-path" : "android-keystore",
            generateError: null
          }));
        }
      }
    ),
    state.step === "android-gen-path" && /* @__PURE__ */ jsx12(
      TuiTextInput,
      {
        label: "Keystore output path (relative to project root):",
        defaultValue: state.android.genKeystorePath,
        onSubmitValue: (v) => {
          const p = v.trim() || "android/release.keystore";
          setState((s) => ({ ...s, android: { ...s.android, genKeystorePath: p } }));
        },
        onSubmit: nextStep,
        hint: "Default: android/release.keystore (gitignored pattern *.keystore)"
      }
    ),
    state.step === "android-gen-alias" && /* @__PURE__ */ jsx12(
      TuiTextInput,
      {
        label: "Android key alias:",
        defaultValue: state.android.keyAlias,
        onSubmitValue: (v) => {
          setState((s) => ({ ...s, android: { ...s.android, keyAlias: v } }));
        },
        onSubmit: nextStep
      }
    ),
    state.step === "android-gen-password" && /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", children: [
      state.generateError ? /* @__PURE__ */ jsx12(Text10, { color: "red", children: state.generateError }) : null,
      /* @__PURE__ */ jsx12(
        TuiTextInput,
        {
          label: "Keystore and key password (same for both; shown as you type):",
          value: state.android.genPassword,
          onChange: (v) => setState((s) => ({ ...s, android: { ...s.android, genPassword: v } })),
          onSubmitValue: (pw) => {
            setState((s) => ({
              ...s,
              android: { ...s.android, genPassword: pw.trim() },
              step: "android-generating",
              generateError: null
            }));
          },
          onSubmit: () => {
          },
          hint: "At least 6 characters (JDK keytool). Same value used for -storepass and -keypass."
        }
      )
    ] }),
    state.step === "android-keystore" && /* @__PURE__ */ jsx12(
      TuiTextInput,
      {
        label: "Android keystore file path (relative to project root or android/):",
        defaultValue: state.android.keystoreFile,
        onSubmitValue: (v) => {
          setState((s) => ({ ...s, android: { ...s.android, keystoreFile: v } }));
        },
        onSubmit: nextStep,
        hint: "Example: android/app/my-release-key.keystore or ./my-release-key.keystore"
      }
    ),
    state.step === "android-alias" && /* @__PURE__ */ jsx12(
      TuiTextInput,
      {
        label: "Android key alias:",
        defaultValue: state.android.keyAlias,
        onSubmitValue: (v) => {
          setState((s) => ({ ...s, android: { ...s.android, keyAlias: v } }));
        },
        onSubmit: nextStep
      }
    ),
    state.step === "android-password-env" && /* @__PURE__ */ jsx12(
      TuiTextInput,
      {
        label: "Keystore password environment variable name:",
        defaultValue: state.android.storePasswordEnv || "ANDROID_KEYSTORE_PASSWORD",
        onSubmitValue: (v) => {
          setState((s) => ({ ...s, android: { ...s.android, storePasswordEnv: v } }));
        },
        onSubmit: () => {
          setState((s) => ({ ...s, step: "android-key-password-env" }));
        },
        hint: "Default: ANDROID_KEYSTORE_PASSWORD (will be written to .env / .env.local)"
      }
    ),
    state.step === "android-key-password-env" && /* @__PURE__ */ jsx12(
      TuiTextInput,
      {
        label: "Key password environment variable name:",
        defaultValue: state.android.keyPasswordEnv || "ANDROID_KEY_PASSWORD",
        onSubmitValue: (v) => {
          setState((s) => ({ ...s, android: { ...s.android, keyPasswordEnv: v } }));
        },
        onSubmit: () => {
          if (state.platform === "both") {
            setState((s) => ({ ...s, step: "ios-identity-select" }));
          } else {
            setState((s) => ({ ...s, step: "saving" }));
          }
        },
        hint: "Default: ANDROID_KEY_PASSWORD (will be written to .env / .env.local)"
      }
    ),
    state.step === "ios-identity-select" && /* @__PURE__ */ jsx12(
      IosIdentitySelectStep,
      {
        onPick: (id) => {
          if (id === "manual") {
            setState((s) => ({ ...s, step: "ios-manual" }));
            return;
          }
          const team = resolveDevelopmentTeamFromIdentity(id);
          setState((s) => ({
            ...s,
            ios: {
              ...s.ios,
              developmentTeam: team,
              codeSignIdentity: id.label
            },
            step: "ios-profile-select"
          }));
        }
      }
    ),
    state.step === "ios-profile-select" && /* @__PURE__ */ jsx12(
      IosProfileSelectStep,
      {
        bundleId: iosBundleId,
        onPick: (profile) => {
          setState((s) => {
            let team = s.ios.developmentTeam.trim();
            if (!team && profile?.teamIds?.[0]) team = profile.teamIds[0];
            return {
              ...s,
              ios: {
                ...s.ios,
                developmentTeam: team,
                provisioningProfileSpecifier: profile?.name ?? "",
                provisioningProfileUuid: profile?.uuid ?? ""
              },
              step: "saving"
            };
          });
        }
      }
    ),
    state.step === "ios-manual" && /* @__PURE__ */ jsx12(
      IosManualStep,
      {
        onDone: (v) => {
          setState((s) => ({
            ...s,
            ios: {
              ...s.ios,
              developmentTeam: v.developmentTeam,
              codeSignIdentity: v.codeSignIdentity,
              provisioningProfileSpecifier: v.provisioningProfileSpecifier,
              provisioningProfileUuid: ""
            },
            step: "saving"
          }));
        }
      }
    )
  ] });
}
async function signing(platform) {
  const { waitUntilExit } = render4(/* @__PURE__ */ jsx12(SigningWizard, { platform }));
  await waitUntilExit();
}

// src/common/productionSigning.ts
import fs37 from "fs";
import path37 from "path";
function isAndroidSigningConfigured(resolved) {
  const signing2 = resolved.config.android?.signing;
  const hasConfig = Boolean(signing2?.keystoreFile?.trim() && signing2?.keyAlias?.trim());
  const signingProps = path37.join(resolved.androidDir, "signing.properties");
  const hasProps = fs37.existsSync(signingProps);
  return hasConfig || hasProps;
}
function isIosSigningConfigured(resolved) {
  const signing2 = resolved.config.ios?.signing;
  const team = signing2?.developmentTeam?.trim();
  if (team) return true;
  const id = signing2?.codeSignIdentity?.trim();
  if (id && extractTeamIdFromIdentityLabel(id)) return true;
  return false;
}
function assertProductionSigningReady(filter) {
  const resolved = resolveHostPaths();
  const missing = [];
  if (filter === "android" && !isAndroidSigningConfigured(resolved)) {
    missing.push("Android: run `t4l signing android`, then `t4l build android -p`.");
  }
  if (filter === "ios" && !isIosSigningConfigured(resolved)) {
    missing.push("iOS: run `t4l signing ios`, then `t4l build ios -p`.");
  }
  if (missing.length === 0) return;
  console.error("\n\u274C Production build (`-p`) needs signing configured for this platform.");
  for (const line of missing) {
    console.error(`   ${line}`);
  }
  console.error("");
  process.exit(1);
}

// index.ts
loadProjectEnv();
var version = getCliVersion();
function validateBuildMode(debug, release, production) {
  const modes = [debug, release, production].filter(Boolean).length;
  if (modes > 1) {
    console.error("Cannot use --debug, --release, and --production together. Use only one.");
    process.exit(1);
  }
}
function parsePlatform(value) {
  const p = value?.toLowerCase();
  if (p === "ios" || p === "android") return p;
  if (p === "all" || p === "both") return "all";
  return null;
}
function parseBuildPlatform(value) {
  const p = value?.toLowerCase()?.trim();
  if (p === "ios" || p === "android") return p;
  return null;
}
program.version(version).description("Tamer4Lynx CLI - A tool for managing Lynx projects");
program.command("init").description("Initialize tamer.config.json interactively").action(() => {
  init();
});
program.command("create <target>").description("Create a project or extension. Target: ios | android | module | element | service | combo").option("-d, --debug", "For android: create host project (default)").option("-r, --release", "For android: create dev-app project").action(async (target, opts) => {
  const t = target.toLowerCase();
  if (t === "ios") {
    create_default2();
    return;
  }
  if (t === "android") {
    if (opts.debug && opts.release) {
      console.error("Cannot use --debug and --release together.");
      process.exit(1);
    }
    await create_default({ target: opts.release ? "dev-app" : "host" });
    return;
  }
  if (["module", "element", "service", "combo"].includes(t)) {
    await create_default3({ type: t });
    return;
  }
  console.error(`Invalid create target: ${target}. Use ios | android | module | element | service | combo`);
  process.exit(1);
});
program.command("build <platform>").description("Build app. Platform: ios | android (required; one at a time)").option("-e, --embeddable", "Output embeddable bundle + code for existing apps (release-style; no separate --release needed).").option("-d, --debug", "Debug build with dev client embedded (default)").option("-r, --release", "Release build without dev client (unsigned)").option("-p, --production", "Production build for app store (signed)").option(
  "-i, --install",
  "Install after build (iOS: simulator with -d; physical device only with -p, never simulator)"
).option("--ipa", "iOS only: after production build, archive and export a signed IPA").option(
  "--mac",
  "iOS only: after build, convert Mach-O for Mac Catalyst (vtool) and run on Apple Silicon like PlayCover"
).option("-C, --clean", "Run Gradle clean before Android build (fixes stubborn caches)").action(async (platform, opts) => {
  validateBuildMode(opts.debug, opts.release, opts.production);
  const release = opts.release === true || opts.production === true;
  const production = opts.production === true;
  if (opts.embeddable) {
    const ep = parseBuildPlatform(platform);
    if (!ep) {
      console.error("Embeddable build requires a platform: t4l build android --embeddable");
      process.exit(1);
    }
    if (ep !== "android") {
      console.error("Embeddable output is only supported for Android. Use: t4l build android --embeddable");
      process.exit(1);
    }
    await buildEmbeddable({ release: true });
    return;
  }
  const p = parseBuildPlatform(platform);
  if (!p) {
    console.error(`Invalid or missing platform: "${platform ?? ""}". Use: t4l build ios | t4l build android`);
    process.exit(1);
  }
  if (opts.ipa && p !== "ios") {
    console.error("--ipa is only valid with: t4l build ios -p");
    process.exit(1);
  }
  if (opts.ipa && !production) {
    console.error("--ipa requires production signing: add -p");
    process.exit(1);
  }
  if (opts.mac && p !== "ios") {
    console.error("--mac is only valid with: t4l build ios");
    process.exit(1);
  }
  if (opts.mac && opts.ipa) {
    console.error(
      "--mac cannot be combined with --ipa (IPA targets device/App Store; --mac uses Mac Catalyst / PlayCover-style conversion)."
    );
    process.exit(1);
  }
  if (production) {
    assertProductionSigningReady(p);
  }
  if (p === "android") {
    await build_default({ install: opts.install, release, production, clean: opts.clean });
  } else {
    await build_default2({
      install: opts.install,
      release,
      production,
      ipa: opts.ipa === true,
      mac: opts.mac === true
    });
  }
});
program.command("link [platform]").description("Link native modules. Platform: ios | android | both (default: both)").option("-s, --silent", "Run without output").action((platform, opts) => {
  if (opts.silent) {
    console.log = () => {
    };
    console.error = () => {
    };
    console.warn = () => {
    };
  }
  const p = parsePlatform(platform ?? "both") ?? "both";
  if (p === "ios") {
    autolink_default2();
    return;
  }
  if (p === "android") {
    autolink_default();
    return;
  }
  autolink_default2();
  autolink_default();
});
program.command("bundle [platform]").description("Build Lynx bundle and copy to native project. Platform: ios | android (default: both)").option("-d, --debug", "Debug bundle with dev client embedded (default)").option("-r, --release", "Release bundle without dev client (unsigned)").option("-p, --production", "Production bundle for app store (signed)").action(async (platform, opts) => {
  validateBuildMode(opts.debug, opts.release, opts.production);
  const release = opts.release === true || opts.production === true;
  const production = opts.production === true;
  const p = parsePlatform(platform ?? "both") ?? "both";
  if (p === "android" || p === "all") await bundle_default({ release, production });
  if (p === "ios" || p === "all") bundle_default2({ release, production });
});
program.command("inject <platform>").description("Inject host templates into an existing project. Platform: ios | android").option("-f, --force", "Overwrite existing files").action(async (platform, opts) => {
  const p = platform?.toLowerCase();
  if (p === "ios") {
    await injectHostIos({ force: opts.force });
    return;
  }
  if (p === "android") {
    await injectHostAndroid({ force: opts.force });
    return;
  }
  console.error(`Invalid inject platform: ${platform}. Use ios | android`);
  process.exit(1);
});
program.command("sync [platform]").description("Sync dev client. Platform: android (default)").action(async (platform) => {
  const p = (platform ?? "android").toLowerCase();
  if (p !== "android") {
    console.error("sync only supports android.");
    process.exit(1);
  }
  await syncDevClient_default();
});
program.command("start").option("-v, --verbose", "Show all logs (native + JS); default shows JS only").description("Start dev server with HMR and WebSocket support (Expo-like)").action(async (opts) => {
  await start_default({ verbose: opts.verbose });
});
program.command("build-dev-app").option("-p, --platform <platform>", "Platform: android, ios, or all (default)", "all").option("-i, --install", "Install APK to connected device and launch app after building").description("Build with dev client embedded (same as t4l build -d)").action(async (opts) => {
  const p = parsePlatform(opts.platform ?? "all") ?? "all";
  if (p === "android" || p === "all") {
    await build_default({ install: opts.install, release: false });
  }
  if (p === "ios" || p === "all") {
    await build_default2({ install: opts.install, release: false });
  }
});
program.command("add [packages...]").description("Add @tamer4lynx packages to the Lynx project").action(async (packages) => {
  await add(packages);
});
program.command("add-core").description("Add core packages").action(async () => {
  await addCore();
});
program.command("add-dev").description("Add dev-app, dev-client, and their dependencies").action(async () => {
  await addDev();
});
program.command("update").description("Update every @tamer4lynx/* dependency in package.json to the latest published versions").action(async () => {
  await updateTamerPackages();
});
program.command("signing [platform]").description("Configure Android and iOS signing interactively").action(async (platform) => {
  const p = platform?.toLowerCase();
  if (p === "android" || p === "ios") {
    await signing(p);
  } else {
    await signing();
  }
});
program.command("codegen").description("Generate code from @lynxmodule declarations").action(() => {
  codegen_default();
});
program.command("android <subcommand>").description("Android: create | link | bundle | build | sync | inject (alias for t4l <command> android)").option("-d, --debug", "Create: host project. Bundle/build: debug with dev client.").option("-r, --release", "Create: dev-app project. Bundle/build: release without dev client.").option("-p, --production", "Bundle/build: production for app store (signed)").option("-i, --install", "Install after build").option("-C, --clean", "Run Gradle clean before Android build").option("-e, --embeddable", "Build embeddable").option("-f, --force", "Force (inject)").action(async (subcommand, opts) => {
  const sub = subcommand?.toLowerCase();
  if (sub === "create") {
    if (opts.debug && opts.release) {
      console.error("Cannot use --debug and --release together.");
      process.exit(1);
    }
    await create_default({ target: opts.release ? "dev-app" : "host" });
    return;
  }
  if (sub === "link") {
    const release = opts.release === true || opts.production === true;
    autolink_default({ release });
    return;
  }
  if (sub === "bundle") {
    validateBuildMode(opts.debug, opts.release, opts.production);
    const release = opts.release === true || opts.production === true;
    await bundle_default({ release, production: opts.production === true });
    return;
  }
  if (sub === "build") {
    validateBuildMode(opts.debug, opts.release, opts.production);
    const release = opts.release === true || opts.production === true;
    if (opts.embeddable) await buildEmbeddable({ release: true });
    else {
      if (opts.production === true) assertProductionSigningReady("android");
      await build_default({
        install: opts.install,
        release,
        production: opts.production === true,
        clean: opts.clean
      });
    }
    return;
  }
  if (sub === "sync") {
    await syncDevClient_default();
    return;
  }
  if (sub === "inject") {
    await injectHostAndroid({ force: opts.force });
    return;
  }
  console.error(`Unknown android subcommand: ${subcommand}. Use: create | link | bundle | build | sync | inject`);
  process.exit(1);
});
program.command("ios <subcommand>").description("iOS: create | link | bundle | build | sync | inject (alias for t4l <command> ios)").option("-d, --debug", "Debug (bundle/build)").option("-r, --release", "Release (bundle/build)").option("-p, --production", "Production for app store (signed)").option("-i, --install", "Install after build").option("--ipa", "After production build, archive and export IPA").option("--mac", "Convert Mach-O for Mac Catalyst (vtool) and run on Apple Silicon (PlayCover-style)").option("-e, --embeddable", "Build embeddable").option("-f, --force", "Force (inject)").action(async (subcommand, opts) => {
  const sub = subcommand?.toLowerCase();
  if (sub === "create") {
    create_default2();
    return;
  }
  if (sub === "link") {
    autolink_default2();
    return;
  }
  if (sub === "bundle") {
    validateBuildMode(opts.debug, opts.release, opts.production);
    const release = opts.release === true || opts.production === true;
    bundle_default2({ release, production: opts.production === true });
    return;
  }
  if (sub === "build") {
    validateBuildMode(opts.debug, opts.release, opts.production);
    const release = opts.release === true || opts.production === true;
    const production = opts.production === true;
    if (opts.embeddable) await buildEmbeddable({ release: true });
    else {
      if (opts.ipa && !production) {
        console.error("--ipa requires production signing: add -p");
        process.exit(1);
      }
      if (opts.mac && opts.ipa) {
        console.error("--mac cannot be combined with --ipa");
        process.exit(1);
      }
      if (production) assertProductionSigningReady("ios");
      await build_default2({
        install: opts.install,
        release,
        production,
        ipa: opts.ipa === true,
        mac: opts.mac === true
      });
    }
    return;
  }
  if (sub === "inject") {
    await injectHostIos({ force: opts.force });
    return;
  }
  console.error(`Unknown ios subcommand: ${subcommand}. Use: create | link | bundle | build | inject`);
  process.exit(1);
});
program.command("autolink-toggle").alias("autolink").description("Toggle autolink on/off in tamer.config.json (controls postinstall linking)").action(async () => {
  const configPath = path38.join(process.cwd(), "tamer.config.json");
  let config = {};
  if (fs38.existsSync(configPath)) {
    config = JSON.parse(fs38.readFileSync(configPath, "utf8"));
  }
  if (config.autolink) {
    delete config.autolink;
    console.log("Autolink disabled in tamer.config.json");
  } else {
    config.autolink = true;
    console.log("Autolink enabled in tamer.config.json");
  }
  fs38.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Updated ${configPath}`);
});
if (process.argv.length <= 2 || process.argv.length === 3 && process.argv[2] === "init") {
  Promise.resolve(init()).then(() => process.exit(0));
} else {
  program.parseAsync().then(() => process.exit(0)).catch(() => process.exit(1));
}
