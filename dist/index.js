#!/usr/bin/env node

// src/suppress-punycode-warning.ts
process.on("warning", (w) => {
  if (w.name === "DeprecationWarning" && /punycode/i.test(w.message)) return;
  console.warn(w.toString());
});

// index.ts
import fs28 from "fs";
import path29 from "path";
import { fileURLToPath } from "url";
import { program } from "commander";

// src/android/create.ts
import fs4 from "fs";
import path4 from "path";
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
    path2.join(projectRoot, "node_modules", "@tamer4lynx", "tamer-dev-app"),
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
    path2.join(projectRoot, "node_modules", "@tamer4lynx", "tamer-dev-client"),
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
  const devClientPkg = findDevClientPackage(projectRoot);
  const devClientBundlePath = devClientPkg ? path2.join(devClientPkg, DEFAULT_BUNDLE_ROOT, "dev-client.lynx.bundle") : void 0;
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
  const ad = raw.androidAdaptive;
  if (ad?.foreground) {
    const fg = join(ad.foreground);
    if (fs2.existsSync(fg)) {
      let usedAdaptive = false;
      if (ad.background) {
        const bg = join(ad.background);
        if (fs2.existsSync(bg)) {
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
import fs3 from "fs";
import path3 from "path";
function purgeAdaptiveForegroundArtifacts(drawableDir) {
  for (const base of ["ic_launcher_fg_src", "ic_launcher_fg_bm", "ic_launcher_fg_sc"]) {
    for (const ext of [".png", ".webp", ".jpg", ".jpeg", ".xml"]) {
      try {
        fs3.unlinkSync(path3.join(drawableDir, base + ext));
      } catch {
      }
    }
  }
  try {
    fs3.unlinkSync(path3.join(drawableDir, "ic_launcher_foreground.xml"));
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
      fs3.unlinkSync(path3.join(drawableDir, `ic_launcher_foreground${ext}`));
    } catch {
    }
  }
  if (!layout) {
    fs3.copyFileSync(fgSourcePath, path3.join(drawableDir, `ic_launcher_foreground${fgExt}`));
    return;
  }
  fs3.copyFileSync(fgSourcePath, path3.join(drawableDir, `ic_launcher_fg_src${fgExt}`));
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
  fs3.writeFileSync(path3.join(drawableDir, "ic_launcher_foreground.xml"), layerXml);
}
function ensureAndroidManifestLauncherIcon(manifestPath) {
  if (!fs3.existsSync(manifestPath)) return;
  let content = fs3.readFileSync(manifestPath, "utf8");
  if (content.includes("android:icon=")) return;
  const next = content.replace(/<application(\s[^>]*)>/, (full, attrs) => {
    if (String(attrs).includes("android:icon")) return full;
    return `<application${attrs}
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher">`;
  });
  if (next !== content) {
    fs3.writeFileSync(manifestPath, next, "utf8");
    console.log("\u2705 Added android:icon / roundIcon to AndroidManifest.xml");
  }
}
function applyAndroidLauncherIcons(resDir, iconPaths) {
  if (!iconPaths) return false;
  fs3.mkdirSync(resDir, { recursive: true });
  const fgAd = iconPaths.androidAdaptiveForeground;
  const bgAd = iconPaths.androidAdaptiveBackground;
  const bgColor = iconPaths.androidAdaptiveBackgroundColor;
  if (fgAd && (bgAd || bgColor)) {
    const drawableDir = path3.join(resDir, "drawable");
    fs3.mkdirSync(drawableDir, { recursive: true });
    const fgExt = path3.extname(fgAd) || ".png";
    writeAdaptiveForegroundLayer(drawableDir, fgAd, fgExt, iconPaths.androidAdaptiveForegroundLayout);
    if (bgColor) {
      for (const ext of [".png", ".webp", ".jpg", ".jpeg"]) {
        try {
          fs3.unlinkSync(path3.join(drawableDir, `ic_launcher_background${ext}`));
        } catch {
        }
      }
      try {
        fs3.unlinkSync(path3.join(drawableDir, "ic_launcher_background.xml"));
      } catch {
      }
      const shapeXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="${bgColor}" />
</shape>
`;
      fs3.writeFileSync(path3.join(drawableDir, "ic_launcher_background.xml"), shapeXml);
    } else {
      try {
        fs3.unlinkSync(path3.join(drawableDir, "ic_launcher_background.xml"));
      } catch {
      }
      const bgExt = path3.extname(bgAd) || ".png";
      fs3.copyFileSync(bgAd, path3.join(drawableDir, `ic_launcher_background${bgExt}`));
    }
    const anyDpi = path3.join(resDir, "mipmap-anydpi-v26");
    fs3.mkdirSync(anyDpi, { recursive: true });
    const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;
    fs3.writeFileSync(path3.join(anyDpi, "ic_launcher.xml"), adaptiveXml);
    fs3.writeFileSync(path3.join(anyDpi, "ic_launcher_round.xml"), adaptiveXml);
    const legacySrc = iconPaths.source ?? fgAd;
    const legacyExt = path3.extname(legacySrc) || ".png";
    const mipmapDensities = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
    for (const d of mipmapDensities) {
      const dir = path3.join(resDir, `mipmap-${d}`);
      fs3.mkdirSync(dir, { recursive: true });
      fs3.copyFileSync(legacySrc, path3.join(dir, `ic_launcher${legacyExt}`));
    }
    return true;
  }
  if (iconPaths.android) {
    const src = iconPaths.android;
    const entries = fs3.readdirSync(src, { withFileTypes: true });
    for (const e of entries) {
      const dest = path3.join(resDir, e.name);
      if (e.isDirectory()) {
        fs3.cpSync(path3.join(src, e.name), dest, { recursive: true });
      } else {
        fs3.copyFileSync(path3.join(src, e.name), dest);
      }
    }
    return true;
  }
  if (iconPaths.source) {
    const mipmapDensities = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
    for (const d of mipmapDensities) {
      const dir = path3.join(resDir, `mipmap-${d}`);
      fs3.mkdirSync(dir, { recursive: true });
      fs3.copyFileSync(iconPaths.source, path3.join(dir, "ic_launcher.png"));
    }
    return true;
  }
  return false;
}
function applyIosAppIconAssets(appIconDir, iconPaths) {
  if (!iconPaths) return false;
  fs3.mkdirSync(appIconDir, { recursive: true });
  if (iconPaths.ios) {
    const entries = fs3.readdirSync(iconPaths.ios, { withFileTypes: true });
    for (const e of entries) {
      const dest = path3.join(appIconDir, e.name);
      if (e.isDirectory()) {
        fs3.cpSync(path3.join(iconPaths.ios, e.name), dest, { recursive: true });
      } else {
        fs3.copyFileSync(path3.join(iconPaths.ios, e.name), dest);
      }
    }
    return true;
  }
  if (iconPaths.source) {
    const ext = path3.extname(iconPaths.source) || ".png";
    const icon1024 = `Icon-1024${ext}`;
    fs3.copyFileSync(iconPaths.source, path3.join(appIconDir, icon1024));
    fs3.writeFileSync(
      path3.join(appIconDir, "Contents.json"),
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
  const raw = fs4.readFileSync(templatePath, "utf-8");
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
    if (!devAppDir || !fs4.existsSync(path4.join(devAppDir, "tamer.config.json"))) {
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
  const rootDir = path4.join(process.cwd(), androidDir);
  const appDir = path4.join(rootDir, "app");
  const mainDir = path4.join(appDir, "src", "main");
  const javaDir = path4.join(mainDir, "java", packagePath);
  const kotlinDir = path4.join(mainDir, "kotlin", packagePath);
  const kotlinGeneratedDir = path4.join(kotlinDir, "generated");
  const assetsDir = path4.join(mainDir, "assets");
  const themesDir = path4.join(mainDir, "res", "values");
  const gradleDir = path4.join(rootDir, "gradle");
  function writeFile2(filePath, content, options) {
    fs4.mkdirSync(path4.dirname(filePath), { recursive: true });
    fs4.writeFileSync(
      filePath,
      content.trimStart(),
      options?.encoding ?? "utf8"
    );
  }
  if (fs4.existsSync(rootDir)) {
    console.log(`\u{1F9F9} Removing existing directory: ${rootDir}`);
    fs4.rmSync(rootDir, { recursive: true, force: true });
  }
  console.log(`\u{1F680} Creating a new Tamer4Lynx project in: ${rootDir}`);
  writeFile2(
    path4.join(gradleDir, "libs.versions.toml"),
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
    path4.join(rootDir, "settings.gradle.kts"),
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
    path4.join(rootDir, "build.gradle.kts"),
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
    path4.join(rootDir, "gradle.properties"),
    `
org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
kotlin.code.style=official
android.enableJetifier=true
`
  );
  writeFile2(
    path4.join(appDir, "build.gradle.kts"),
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
    path4.join(themesDir, "themes.xml"),
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
  writeFile2(
    path4.join(mainDir, "AndroidManifest.xml"),
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
    path4.join(kotlinGeneratedDir, "GeneratedLynxExtensions.kt"),
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
    const templateDir = path4.join(hostPkg, "android", "templates");
    for (const [src, dst] of [
      ["App.java", path4.join(javaDir, "App.java")],
      ["TemplateProvider.java", path4.join(javaDir, "TemplateProvider.java")],
      ["MainActivity.kt", path4.join(kotlinDir, "MainActivity.kt")]
    ]) {
      const srcPath = path4.join(templateDir, src);
      if (fs4.existsSync(srcPath)) {
        writeFile2(dst, readAndSubstituteTemplate(srcPath, templateVars));
      }
    }
  } else {
    const [applicationSource, templateProviderSource] = await Promise.all([
      fetchAndPatchApplication(vars),
      fetchAndPatchTemplateProvider(vars)
    ]);
    writeFile2(path4.join(javaDir, "App.java"), applicationSource);
    writeFile2(path4.join(javaDir, "TemplateProvider.java"), templateProviderSource);
    writeFile2(path4.join(kotlinDir, "MainActivity.kt"), getStandaloneMainActivity(vars));
    if (hasDevLauncher) {
      if (devClientPkg) {
        const templateDir = path4.join(devClientPkg, "android", "templates");
        for (const [src, dst] of [
          ["ProjectActivity.kt", path4.join(kotlinDir, "ProjectActivity.kt")],
          ["DevClientManager.kt", path4.join(kotlinDir, "DevClientManager.kt")],
          ["DevServerPrefs.kt", path4.join(kotlinDir, "DevServerPrefs.kt")]
        ]) {
          const srcPath = path4.join(templateDir, src);
          if (fs4.existsSync(srcPath)) {
            writeFile2(dst, readAndSubstituteTemplate(srcPath, templateVars));
          }
        }
      } else {
        writeFile2(path4.join(kotlinDir, "ProjectActivity.kt"), getProjectActivity(vars));
        const devClientManagerSource = getDevClientManager(vars);
        if (devClientManagerSource) {
          writeFile2(path4.join(kotlinDir, "DevClientManager.kt"), devClientManagerSource);
          writeFile2(path4.join(kotlinDir, "DevServerPrefs.kt"), getDevServerPrefs(vars));
        }
      }
    }
  }
  if (iconPaths) {
    const resDir = path4.join(mainDir, "res");
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
  fs4.mkdirSync(assetsDir, { recursive: true });
  fs4.writeFileSync(path4.join(assetsDir, ".gitkeep"), "");
  console.log(`\u2705 Android Kotlin project created at ${rootDir}`);
  async function finalizeProjectSetup() {
    if (androidSdk) {
      try {
        const sdkDirContent = `sdk.dir=${androidSdk.replace(/\\/g, "/")}`;
        writeFile2(path4.join(rootDir, "local.properties"), sdkDirContent);
        console.log("\u{1F4E6} Created local.properties from tamer.config.json.");
      } catch (err) {
        console.error(`\u274C Failed to create local.properties: ${err.message}`);
      }
    } else {
      const localPropsPath = path4.join(process.cwd(), "local.properties");
      if (fs4.existsSync(localPropsPath)) {
        try {
          fs4.copyFileSync(localPropsPath, path4.join(rootDir, "local.properties"));
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
import fs7 from "fs";
import path7 from "path";
import { execSync as execSync2 } from "child_process";

// src/common/discoverModules.ts
import fs6 from "fs";
import path6 from "path";

// src/common/config.ts
import fs5 from "fs";
import path5 from "path";
var LYNX_EXT_JSON = "lynx.ext.json";
var TAMER_JSON = "tamer.json";
function loadLynxExtJson(packagePath) {
  const p = path5.join(packagePath, LYNX_EXT_JSON);
  if (!fs5.existsSync(p)) return null;
  try {
    return JSON.parse(fs5.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}
function loadTamerJson(packagePath) {
  const p = path5.join(packagePath, TAMER_JSON);
  if (!fs5.existsSync(p)) return null;
  try {
    return JSON.parse(fs5.readFileSync(p, "utf8"));
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
  return fs5.existsSync(path5.join(packagePath, LYNX_EXT_JSON)) || fs5.existsSync(path5.join(packagePath, TAMER_JSON));
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
function discoverNativeExtensions(projectRoot) {
  const nodeModulesPath = getNodeModulesPath(projectRoot);
  const result = [];
  if (!fs5.existsSync(nodeModulesPath)) return result;
  const packageDirs = fs5.readdirSync(nodeModulesPath);
  const check = (name, packagePath) => {
    if (!hasExtensionConfig(packagePath)) return;
    const config = loadExtensionConfig(packagePath);
    const classes = getAndroidModuleClassNames(config?.android);
    for (const className of classes) {
      result.push({ packageName: name, moduleClassName: className, attachHostView: config?.android?.attachHostView });
    }
  };
  for (const dirName of packageDirs) {
    const fullPath = path5.join(nodeModulesPath, dirName);
    if (dirName.startsWith("@")) {
      try {
        for (const scopedDirName of fs5.readdirSync(fullPath)) {
          check(`${dirName}/${scopedDirName}`, path5.join(fullPath, scopedDirName));
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
  let nodeModulesPath = path6.join(projectRoot, "node_modules");
  const workspaceRoot = path6.join(projectRoot, "..", "..");
  const rootNodeModules = path6.join(workspaceRoot, "node_modules");
  if (fs6.existsSync(path6.join(workspaceRoot, "package.json")) && fs6.existsSync(rootNodeModules) && path6.basename(path6.dirname(projectRoot)) === "packages") {
    nodeModulesPath = rootNodeModules;
  } else if (!fs6.existsSync(nodeModulesPath)) {
    const altRoot = path6.join(projectRoot, "..", "..");
    const altNodeModules = path6.join(altRoot, "node_modules");
    if (fs6.existsSync(path6.join(altRoot, "package.json")) && fs6.existsSync(altNodeModules)) {
      nodeModulesPath = altNodeModules;
    }
  }
  return nodeModulesPath;
}
function discoverModules(projectRoot) {
  const nodeModulesPath = resolveNodeModulesPath(projectRoot);
  const packages = [];
  if (!fs6.existsSync(nodeModulesPath)) {
    return [];
  }
  const packageDirs = fs6.readdirSync(nodeModulesPath);
  for (const dirName of packageDirs) {
    const fullPath = path6.join(nodeModulesPath, dirName);
    const checkPackage = (name, packagePath) => {
      if (!hasExtensionConfig(packagePath)) return;
      const config = loadExtensionConfig(packagePath);
      if (!config || !config.android && !config.ios) return;
      packages.push({ name, config, packagePath });
    };
    if (dirName.startsWith("@")) {
      try {
        const scopedDirs = fs6.readdirSync(fullPath);
        for (const scopedDirName of scopedDirs) {
          const scopedPackagePath = path6.join(fullPath, scopedDirName);
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
  return `package ${projectPackage}.generated

import android.content.Context
import com.lynx.tasm.LynxEnv
import com.lynx.tasm.LynxViewBuilder
import com.lynx.xelement.XElementBehaviors
${moduleImports}
${elementImports}

object GeneratedLynxExtensions {
    fun register(context: Context) {
${allRegistrations}${devClientSupportedBlock}
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
  function updateGeneratedSection(filePath, newContent, startMarker, endMarker) {
    if (!fs7.existsSync(filePath)) {
      console.warn(`\u26A0\uFE0F File not found, skipping update: ${filePath}`);
      return;
    }
    let fileContent = fs7.readFileSync(filePath, "utf8");
    const escapedStartMarker = startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedEndMarker = endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escapedStartMarker}[\\s\\S]*?${escapedEndMarker}`, "g");
    const replacementBlock = `${startMarker}
${newContent}
${endMarker}`;
    if (regex.test(fileContent)) {
      fileContent = fileContent.replace(regex, replacementBlock);
    } else {
      console.warn(`\u26A0\uFE0F Could not find autolink markers in ${path7.basename(filePath)}. Appending to the end of the file.`);
      fileContent += `
${replacementBlock}
`;
    }
    fs7.writeFileSync(filePath, fileContent);
    console.log(`\u2705 Updated autolinked section in ${path7.basename(filePath)}`);
  }
  function updateSettingsGradle(packages) {
    const settingsFilePath = path7.join(appAndroidPath, "settings.gradle.kts");
    let scriptContent = `// This section is automatically generated by Tamer4Lynx.
// Manual edits will be overwritten.`;
    const androidPackages = packages.filter((p) => p.config.android);
    if (androidPackages.length > 0) {
      androidPackages.forEach((pkg) => {
        const gradleProjectName = pkg.name.replace(/^@/, "").replace(/\//g, "_");
        const sourceDir = pkg.config.android?.sourceDir || "android";
        const projectPath = path7.resolve(pkg.packagePath, sourceDir).replace(/\\/g, "/");
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
    const appBuildGradlePath = path7.join(appAndroidPath, "app", "build.gradle.kts");
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
    const generatedDir = path7.join(appAndroidPath, "app", "src", "main", "kotlin", packagePath, "generated");
    const kotlinExtensionsPath = path7.join(generatedDir, "GeneratedLynxExtensions.kt");
    const content = `/**
 * This file is generated by the Tamer4Lynx autolinker.
 * Do not edit this file manually.
 */
${generateLynxExtensionsKotlin(packages, projectPackage)}`;
    fs7.mkdirSync(generatedDir, { recursive: true });
    fs7.writeFileSync(kotlinExtensionsPath, content.trimStart());
    console.log(`\u2705 Generated Kotlin extensions at ${kotlinExtensionsPath}`);
  }
  function generateActivityLifecycleFile(packages, projectPackage) {
    const packageKotlinPath = projectPackage.replace(/\./g, "/");
    const generatedDir = path7.join(appAndroidPath, "app", "src", "main", "kotlin", packageKotlinPath, "generated");
    const outputPath = path7.join(generatedDir, "GeneratedActivityLifecycle.kt");
    const content = `/**
 * This file is generated by the Tamer4Lynx autolinker.
 * Do not edit this file manually.
 */
${generateActivityLifecycleKotlin(packages, projectPackage)}`;
    fs7.mkdirSync(generatedDir, { recursive: true });
    fs7.writeFileSync(outputPath, content);
    console.log(`\u2705 Generated activity lifecycle patches at ${outputPath}`);
  }
  function syncDeepLinkIntentFilters() {
    const deepLinks = config.android?.deepLinks;
    if (!deepLinks || deepLinks.length === 0) return;
    const manifestPath = path7.join(appAndroidPath, "app", "src", "main", "AndroidManifest.xml");
    if (!fs7.existsSync(manifestPath)) return;
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
    let packages = discoverModules(projectRoot).filter((p) => p.config.android);
    const includeDevClient = opts?.includeDevClient === true;
    const devClientScoped = path7.join(projectRoot, "node_modules", "@tamer4lynx", "tamer-dev-client");
    const devClientFlat = path7.join(projectRoot, "node_modules", "tamer-dev-client");
    const devClientPath = fs7.existsSync(path7.join(devClientScoped, "android")) ? devClientScoped : fs7.existsSync(path7.join(devClientFlat, "android")) ? devClientFlat : null;
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
    syncDeepLinkIntentFilters();
    syncVersionCatalog(packages);
    ensureXElementDeps();
    ensureReleaseSigning();
    runGradleSync();
    console.log("\u2728 Autolinking complete.");
  }
  function runGradleSync() {
    const gradlew = path7.join(appAndroidPath, process.platform === "win32" ? "gradlew.bat" : "gradlew");
    if (!fs7.existsSync(gradlew)) return;
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
    const libsTomlPath = path7.join(appAndroidPath, "gradle", "libs.versions.toml");
    if (!fs7.existsSync(libsTomlPath)) return;
    const requiredAliases = /* @__PURE__ */ new Set();
    const requiredPluginAliases = /* @__PURE__ */ new Set();
    for (const pkg of packages) {
      const buildPath = path7.join(pkg.packagePath, pkg.config.android?.sourceDir || "android", "build.gradle.kts");
      if (!fs7.existsSync(buildPath)) continue;
      const content = fs7.readFileSync(buildPath, "utf8");
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
    let toml = fs7.readFileSync(libsTomlPath, "utf8");
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
      fs7.writeFileSync(libsTomlPath, toml);
      console.log("\u2705 Synced version catalog (libs.versions.toml) for linked modules.");
    }
  }
  function ensureXElementDeps() {
    const libsTomlPath = path7.join(appAndroidPath, "gradle", "libs.versions.toml");
    if (fs7.existsSync(libsTomlPath)) {
      let toml = fs7.readFileSync(libsTomlPath, "utf8");
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
        fs7.writeFileSync(libsTomlPath, toml);
        console.log("\u2705 Added XElement entries to version catalog.");
      }
    }
    const appBuildPath = path7.join(appAndroidPath, "app", "build.gradle.kts");
    if (fs7.existsSync(appBuildPath)) {
      let content = fs7.readFileSync(appBuildPath, "utf8");
      if (!content.includes("lynx.xelement")) {
        content = content.replace(
          /(implementation\(libs\.lynx\.service\.http\))/,
          `$1
    implementation(libs.lynx.xelement)
    implementation(libs.lynx.xelement.input)`
        );
        fs7.writeFileSync(appBuildPath, content);
        console.log("\u2705 Added XElement dependencies to app build.gradle.kts.");
      }
    }
  }
  function ensureReleaseSigning() {
    const appBuildPath = path7.join(appAndroidPath, "app", "build.gradle.kts");
    if (!fs7.existsSync(appBuildPath)) return;
    let content = fs7.readFileSync(appBuildPath, "utf8");
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
      fs7.writeFileSync(appBuildPath, content);
      console.log("\u2705 Set release signing to debug so installRelease works without a keystore.");
    }
  }
  function syncManifestPermissions(packages) {
    const manifestPath = path7.join(appAndroidPath, "app", "src", "main", "AndroidManifest.xml");
    if (!fs7.existsSync(manifestPath)) return;
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
    let manifest = fs7.readFileSync(manifestPath, "utf8");
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
    fs7.writeFileSync(manifestPath, manifest);
    console.log(`\u2705 Synced manifest permissions: ${toAdd.map((p) => p.split(".").pop()).join(", ")}`);
  }
  run();
};
var autolink_default = autolink;

// src/android/bundle.ts
import fs10 from "fs";
import path10 from "path";
import { execSync as execSync3 } from "child_process";

// src/common/copyDistAssets.ts
import fs8 from "fs";
import path8 from "path";
var SKIP = /* @__PURE__ */ new Set([".rspeedy", "stats.json"]);
function copyDistAssets(distDir, destDir, bundleFile) {
  if (!fs8.existsSync(distDir)) return;
  for (const entry of fs8.readdirSync(distDir)) {
    if (SKIP.has(entry)) continue;
    const src = path8.join(distDir, entry);
    const dest = path8.join(destDir, entry);
    const stat = fs8.statSync(src);
    if (stat.isDirectory()) {
      fs8.mkdirSync(dest, { recursive: true });
      copyDistAssets(src, dest, bundleFile);
    } else {
      fs8.copyFileSync(src, dest);
      if (entry !== bundleFile) {
        console.log(`\u2728 Copied asset: ${entry}`);
      }
    }
  }
}

// src/android/syncDevClient.ts
import fs9 from "fs";
import path9 from "path";
function readAndSubstituteTemplate2(templatePath, vars) {
  const raw = fs9.readFileSync(templatePath, "utf-8");
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
    raw
  );
}
function patchAppLogService(appPath) {
  if (!fs9.existsSync(appPath)) return;
  const raw = fs9.readFileSync(appPath, "utf-8");
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
    fs9.writeFileSync(appPath, patched);
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
  const javaDir = path9.join(rootDir, "app", "src", "main", "java", packagePath);
  const kotlinDir = path9.join(rootDir, "app", "src", "main", "kotlin", packagePath);
  if (!fs9.existsSync(javaDir) || !fs9.existsSync(kotlinDir)) {
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
  fs9.writeFileSync(path9.join(javaDir, "TemplateProvider.java"), templateProviderSource);
  fs9.writeFileSync(path9.join(kotlinDir, "MainActivity.kt"), getStandaloneMainActivity(vars));
  patchAppLogService(path9.join(javaDir, "App.java"));
  const appDir = path9.join(rootDir, "app");
  const mainDir = path9.join(appDir, "src", "main");
  const manifestPath = path9.join(mainDir, "AndroidManifest.xml");
  if (hasDevClient) {
    const templateDir = path9.join(devClientPkg, "android", "templates");
    const templateVars = { PACKAGE_NAME: packageName, APP_NAME: appName };
    const devClientFiles = [
      "DevClientManager.kt",
      "DevServerPrefs.kt",
      "ProjectActivity.kt",
      "PortraitCaptureActivity.kt"
    ];
    for (const f of devClientFiles) {
      const src = path9.join(templateDir, f);
      if (fs9.existsSync(src)) {
        const content = readAndSubstituteTemplate2(src, templateVars);
        fs9.writeFileSync(path9.join(kotlinDir, f), content);
      }
    }
    let manifest = fs9.readFileSync(manifestPath, "utf-8");
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
    fs9.writeFileSync(manifestPath, manifest);
    console.log("\u2705 Synced dev client (TemplateProvider, MainActivity, ProjectActivity, DevClientManager)");
  } else {
    for (const f of ["DevClientManager.kt", "DevServerPrefs.kt", "ProjectActivity.kt", "PortraitCaptureActivity.kt", "DevLauncherActivity.kt"]) {
      try {
        fs9.rmSync(path9.join(kotlinDir, f));
      } catch {
      }
    }
    let manifest = fs9.readFileSync(manifestPath, "utf-8");
    manifest = manifest.replace(/\s*<activity android:name="\.ProjectActivity"[^\/]*\/>\n?/g, "");
    manifest = manifest.replace(/\s*<activity android:name="\.PortraitCaptureActivity"[^\/]*\/>\n?/g, "");
    const mainActivityTag = manifest.match(/<activity[^>]*android:name="\.MainActivity"[^>]*>/);
    if (mainActivityTag && !mainActivityTag[0].includes("windowSoftInputMode")) {
      manifest = manifest.replace(
        /(<activity\s+android:name="\.MainActivity"[^>]*)(>)/,
        '$1 android:windowSoftInputMode="adjustResize"$2'
      );
    }
    fs9.writeFileSync(manifestPath, manifest);
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
  const { projectRoot, lynxProjectDir, lynxBundlePath, androidAssetsDir, devClientBundlePath } = resolved;
  const devClientPkg = findDevClientPackage(projectRoot);
  const includeDevClient = !release && !!devClientPkg;
  const destinationDir = androidAssetsDir;
  autolink_default({ includeDevClient });
  await syncDevClient_default({ includeDevClient });
  const iconPaths = resolveIconPaths(projectRoot, resolved.config);
  if (iconPaths) {
    const resDir = path10.join(resolved.androidAppDir, "src", "main", "res");
    if (applyAndroidLauncherIcons(resDir, iconPaths)) {
      console.log("\u2705 Synced Android launcher icon(s) from tamer.config.json");
      ensureAndroidManifestLauncherIcon(path10.join(resolved.androidAppDir, "src", "main", "AndroidManifest.xml"));
    }
  }
  try {
    console.log("\u{1F4E6} Building Lynx bundle...");
    execSync3("npm run build", { stdio: "inherit", cwd: lynxProjectDir });
    console.log("\u2705 Build completed successfully.");
  } catch (error) {
    console.error("\u274C Build process failed.");
    process.exit(1);
  }
  if (includeDevClient && devClientBundlePath && !fs10.existsSync(devClientBundlePath)) {
    const devClientDir = path10.dirname(path10.dirname(devClientBundlePath));
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
    fs10.mkdirSync(destinationDir, { recursive: true });
    if (release) {
      const devClientAsset = path10.join(destinationDir, "dev-client.lynx.bundle");
      if (fs10.existsSync(devClientAsset)) {
        fs10.rmSync(devClientAsset);
        console.log(`\u2728 Removed dev-client.lynx.bundle from assets (production build)`);
      }
    } else if (includeDevClient && devClientBundlePath && fs10.existsSync(devClientBundlePath)) {
      fs10.copyFileSync(devClientBundlePath, path10.join(destinationDir, "dev-client.lynx.bundle"));
      console.log(`\u2728 Copied dev-client.lynx.bundle to assets`);
    }
    if (!fs10.existsSync(lynxBundlePath)) {
      console.error(`\u274C Build output not found at: ${lynxBundlePath}`);
      process.exit(1);
    }
    const distDir = path10.dirname(lynxBundlePath);
    copyDistAssets(distDir, destinationDir, resolved.lynxBundleFile);
    console.log(`\u2728 Copied ${resolved.lynxBundleFile} to assets`);
  } catch (error) {
    console.error(`\u274C Failed to copy bundle: ${error.message}`);
    process.exit(1);
  }
}
var bundle_default = bundleAndDeploy;

// src/android/build.ts
import path11 from "path";
import { execSync as execSync4 } from "child_process";
async function buildApk(opts = {}) {
  let resolved;
  try {
    resolved = resolveHostPaths();
  } catch (error) {
    throw error;
  }
  const release = opts.release === true || opts.production === true;
  await bundle_default({ release, production: opts.production });
  const androidDir = resolved.androidDir;
  const gradlew = path11.join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");
  const variant = release ? "Release" : "Debug";
  const task = opts.install ? `install${variant}` : `assemble${variant}`;
  console.log(`
\u{1F528} Building ${variant.toLowerCase()} APK${opts.install ? " and installing" : ""}...`);
  execSync4(`"${gradlew}" ${task}`, { stdio: "inherit", cwd: androidDir });
  console.log(`\u2705 APK ${opts.install ? "installed" : "built"} successfully.`);
  if (opts.install) {
    const packageName = resolved.config.android?.packageName;
    if (packageName) {
      try {
        console.log(`\u{1F680} Launching ${packageName}...`);
        execSync4(`adb shell am start -n ${packageName}/.MainActivity`, { stdio: "inherit" });
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
import path13 from "path";

// src/ios/getPod.ts
import { execSync as execSync5 } from "child_process";
import fs11 from "fs";
import path12 from "path";
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
    const podfilePath = path12.join(rootDir, "Podfile");
    if (!fs11.existsSync(podfilePath)) {
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
function readAndSubstituteTemplate3(templatePath, vars) {
  const raw = fs12.readFileSync(templatePath, "utf-8");
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
  const rootDir = path13.join(process.cwd(), iosDir);
  const projectDir = path13.join(rootDir, appName);
  const xcodeprojDir = path13.join(rootDir, `${appName}.xcodeproj`);
  const bridgingHeader = `${appName}-Bridging-Header.h`;
  function writeFile2(filePath, content) {
    fs12.mkdirSync(path13.dirname(filePath), { recursive: true });
    fs12.writeFileSync(filePath, content.trimStart(), "utf8");
  }
  if (fs12.existsSync(rootDir)) {
    console.log(`\u{1F9F9} Removing existing directory: ${rootDir}`);
    fs12.rmSync(rootDir, { recursive: true, force: true });
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
  writeFile2(path13.join(rootDir, "Podfile"), `
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

  pod 'XElement', '3.6.0'

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
      config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
      config.build_settings['ONLY_ACTIVE_ARCH'] = 'YES'
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
    const templateDir = path13.join(hostPkg, "ios", "templates");
    for (const f of ["AppDelegate.swift", "SceneDelegate.swift", "ViewController.swift", "LynxProvider.swift", "LynxInitProcessor.swift"]) {
      const srcPath = path13.join(templateDir, f);
      if (fs12.existsSync(srcPath)) {
        writeFile2(path13.join(projectDir, f), readAndSubstituteTemplate3(srcPath, templateVars));
      }
    }
  } else {
    writeFile2(path13.join(projectDir, "AppDelegate.swift"), `
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
    writeFile2(path13.join(projectDir, "SceneDelegate.swift"), `
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
    writeFile2(path13.join(projectDir, "ViewController.swift"), `
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
    writeFile2(path13.join(projectDir, "LynxProvider.swift"), `
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
    writeFile2(path13.join(projectDir, "LynxInitProcessor.swift"), `
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
  writeFile2(path13.join(projectDir, bridgingHeader), `
#import <Lynx/LynxConfig.h>
#import <Lynx/LynxEnv.h>
#import <Lynx/LynxTemplateProvider.h>
#import <Lynx/LynxView.h>
#import <Lynx/LynxModule.h>
#import <SDWebImage/SDWebImage.h>
#import <SDWebImageWebPCoder/SDWebImageWebPCoder.h>
	`);
  writeFile2(path13.join(projectDir, "Info.plist"), `
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
  const appIconDir = path13.join(projectDir, "Assets.xcassets", "AppIcon.appiconset");
  fs12.mkdirSync(appIconDir, { recursive: true });
  const iconPaths = resolveIconPaths(process.cwd(), config);
  if (applyIosAppIconAssets(appIconDir, iconPaths)) {
    console.log(iconPaths?.ios ? "\u2705 Copied iOS icon from tamer.config.json icon.ios" : "\u2705 Copied app icon from tamer.config.json icon.source");
  } else {
    writeFile2(path13.join(appIconDir, "Contents.json"), `
{
  "images" : [ { "idiom" : "universal", "platform" : "ios", "size" : "1024x1024" } ],
  "info" : { "author" : "xcode", "version" : 1 }
}
	`);
  }
  fs12.mkdirSync(xcodeprojDir, { recursive: true });
  writeFile2(path13.join(xcodeprojDir, "project.pbxproj"), `
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
import fs14 from "fs";
import path15 from "path";
import { execSync as execSync6 } from "child_process";

// src/common/hostNativeModulesManifest.ts
var TAMER_HOST_NATIVE_MODULES_FILENAME = "tamer-host-native-modules.json";
function buildHostNativeModulesManifestJson(moduleClassNames) {
  return `${JSON.stringify({ moduleClassNames }, null, 2)}
`;
}

// src/ios/syncHost.ts
import fs13 from "fs";
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
  let content = fs13.readFileSync(pbxprojPath, "utf8");
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
  fs13.writeFileSync(pbxprojPath, content, "utf8");
  console.log("\u2705 Registered LaunchScreen.storyboard in Xcode project");
}
function addSwiftSourceToXcodeProject(pbxprojPath, appName, filename) {
  let content = fs13.readFileSync(pbxprojPath, "utf8");
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
  fs13.writeFileSync(pbxprojPath, content, "utf8");
  console.log(`\u2705 Registered ${filename} in Xcode project sources`);
}
function addResourceToXcodeProject(pbxprojPath, appName, filename) {
  let content = fs13.readFileSync(pbxprojPath, "utf8");
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
  fs13.writeFileSync(pbxprojPath, content, "utf8");
  console.log(`\u2705 Registered ${filename} in Xcode project resources`);
}
function writeFile(filePath, content) {
  fs13.mkdirSync(path14.dirname(filePath), { recursive: true });
  fs13.writeFileSync(filePath, content, "utf8");
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

    override var preferredStatusBarStyle: UIStatusBarStyle { TamerPreferredStatusBar.style }

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
  if (!fs13.existsSync(infoPlistPath)) return;
  let content = fs13.readFileSync(infoPlistPath, "utf8");
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
  fs13.writeFileSync(infoPlistPath, content, "utf8");
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
    if (fs13.existsSync(tplPath)) {
      let content = fs13.readFileSync(tplPath, "utf8");
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
  const projectDir = path14.join(resolved.iosDir, appName);
  const infoPlistPath = path14.join(projectDir, "Info.plist");
  if (!fs13.existsSync(projectDir)) {
    throw new Error(`iOS project not found at ${projectDir}. Run \`tamer ios create\` first.`);
  }
  const pbxprojPath = path14.join(resolved.iosDir, `${appName}.xcodeproj`, "project.pbxproj");
  const baseLprojDir = path14.join(projectDir, "Base.lproj");
  const launchScreenPath = path14.join(baseLprojDir, "LaunchScreen.storyboard");
  patchInfoPlist(infoPlistPath);
  writeFile(path14.join(projectDir, "AppDelegate.swift"), getAppDelegateSwift());
  writeFile(path14.join(projectDir, "SceneDelegate.swift"), getSceneDelegateSwift());
  if (!fs13.existsSync(launchScreenPath)) {
    fs13.mkdirSync(baseLprojDir, { recursive: true });
    writeFile(launchScreenPath, getLaunchScreenStoryboard());
    addLaunchScreenToXcodeProject(pbxprojPath, appName);
  }
  addSwiftSourceToXcodeProject(pbxprojPath, appName, "SceneDelegate.swift");
  if (useDevClient) {
    const devClientPkg2 = findDevClientPackage(resolved.projectRoot);
    const segment = resolved.lynxProjectDir.split("/").filter(Boolean).pop() ?? "";
    const tplVars = { PROJECT_BUNDLE_SEGMENT: segment };
    writeFile(path14.join(projectDir, "ViewController.swift"), getDevViewControllerSwift());
    writeFile(path14.join(projectDir, "LynxProvider.swift"), getSimpleLynxProviderSwift());
    addSwiftSourceToXcodeProject(pbxprojPath, appName, "LynxProvider.swift");
    const devTPContent = readTemplateOrFallback(devClientPkg2, "DevTemplateProvider.swift", "", tplVars);
    if (devTPContent) {
      writeFile(path14.join(projectDir, "DevTemplateProvider.swift"), devTPContent);
      addSwiftSourceToXcodeProject(pbxprojPath, appName, "DevTemplateProvider.swift");
    }
    const projectVCContent = readTemplateOrFallback(devClientPkg2, "ProjectViewController.swift", "", tplVars);
    if (projectVCContent) {
      writeFile(path14.join(projectDir, "ProjectViewController.swift"), projectVCContent);
      addSwiftSourceToXcodeProject(pbxprojPath, appName, "ProjectViewController.swift");
    }
    const devCMContent = readTemplateOrFallback(devClientPkg2, "DevClientManager.swift", "", tplVars);
    if (devCMContent) {
      writeFile(path14.join(projectDir, "DevClientManager.swift"), devCMContent);
      addSwiftSourceToXcodeProject(pbxprojPath, appName, "DevClientManager.swift");
    }
    const qrContent = readTemplateOrFallback(devClientPkg2, "QRScannerViewController.swift", "", tplVars);
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

// src/ios/autolink.ts
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
    if (!fs14.existsSync(filePath)) {
      console.warn(`\u26A0\uFE0F File not found, skipping update: ${filePath}`);
      return;
    }
    let fileContent = fs14.readFileSync(filePath, "utf8");
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
      console.warn(`\u26A0\uFE0F Could not find autolink markers in ${path15.basename(filePath)}. Appending to the end of the file.`);
      fileContent += `
${replacementBlock}
`;
    }
    fs14.writeFileSync(filePath, fileContent, "utf8");
    console.log(`\u2705 Updated autolinked section in ${path15.basename(filePath)}`);
  }
  function resolvePodDirectory(pkg) {
    const configuredDir = path15.join(pkg.packagePath, pkg.config.ios?.podspecPath || ".");
    if (fs14.existsSync(configuredDir)) {
      return configuredDir;
    }
    const iosDir = path15.join(pkg.packagePath, "ios");
    if (fs14.existsSync(iosDir)) {
      const stack = [iosDir];
      while (stack.length > 0) {
        const current = stack.pop();
        try {
          const entries = fs14.readdirSync(current, { withFileTypes: true });
          const podspec = entries.find((entry) => entry.isFile() && entry.name.endsWith(".podspec"));
          if (podspec) {
            return current;
          }
          for (const entry of entries) {
            if (entry.isDirectory()) {
              stack.push(path15.join(current, entry.name));
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
    if (fs14.existsSync(fullPodspecDir)) {
      try {
        const files = fs14.readdirSync(fullPodspecDir);
        const podspecFile = files.find((f) => f.endsWith(".podspec"));
        if (podspecFile) return podspecFile.replace(".podspec", "");
      } catch {
      }
    }
    return pkg.name.split("/").pop().replace(/-/g, "");
  }
  function updatePodfile(packages) {
    const podfilePath = path15.join(iosProjectPath, "Podfile");
    let scriptContent = `  # This section is automatically generated by Tamer4Lynx.
  # Manual edits will be overwritten.`;
    const iosPackages = packages.filter((p) => p.config.ios);
    if (iosPackages.length > 0) {
      iosPackages.forEach((pkg) => {
        const relativePath = path15.relative(iosProjectPath, resolvePodDirectory(pkg));
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
    const podfilePath = path15.join(iosProjectPath, "Podfile");
    if (!fs14.existsSync(podfilePath)) return;
    let content = fs14.readFileSync(podfilePath, "utf8");
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
    fs14.writeFileSync(podfilePath, content, "utf8");
    console.log(`\u2705 Added XElement pod (v${lynxVersion}) to Podfile`);
  }
  function ensureLynxPatchInPodfile() {
    const podfilePath = path15.join(iosProjectPath, "Podfile");
    if (!fs14.existsSync(podfilePath)) return;
    let content = fs14.readFileSync(podfilePath, "utf8");
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
    fs14.writeFileSync(podfilePath, content, "utf8");
    console.log("\u2705 Added Lynx typeof patch to Podfile post_install.");
  }
  function ensurePodBuildSettings() {
    const podfilePath = path15.join(iosProjectPath, "Podfile");
    if (!fs14.existsSync(podfilePath)) return;
    let content = fs14.readFileSync(podfilePath, "utf8");
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
      fs14.writeFileSync(podfilePath, content, "utf8");
      console.log("\u2705 Added Xcode compatibility build settings to Podfile post_install.");
    }
  }
  function updateLynxInitProcessor(packages) {
    const appNameFromConfig = resolved.config.ios?.appName;
    const candidatePaths = [];
    if (appNameFromConfig) {
      candidatePaths.push(path15.join(iosProjectPath, appNameFromConfig, "LynxInitProcessor.swift"));
    }
    candidatePaths.push(path15.join(iosProjectPath, "LynxInitProcessor.swift"));
    const found = candidatePaths.find((p) => fs14.existsSync(p));
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
      const fileContent = fs14.readFileSync(filePath, "utf8");
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
      fs14.writeFileSync(filePath, newContent, "utf8");
      console.log(`\u2705 Updated imports in ${path15.basename(filePath)}`);
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
    if (fs14.readFileSync(lynxInitPath, "utf8").includes("GENERATED DEV_CLIENT_SUPPORTED START")) {
      updateGeneratedSection(lynxInitPath, devClientSupportedBody, "// GENERATED DEV_CLIENT_SUPPORTED START", "// GENERATED DEV_CLIENT_SUPPORTED END");
    }
  }
  function findInfoPlist() {
    const appNameFromConfig = resolved.config.ios?.appName;
    const candidates = [];
    if (appNameFromConfig) {
      candidates.push(path15.join(iosProjectPath, appNameFromConfig, "Info.plist"));
    }
    candidates.push(path15.join(iosProjectPath, "Info.plist"));
    return candidates.find((p) => fs14.existsSync(p)) ?? null;
  }
  function readPlistXml(plistPath) {
    return fs14.readFileSync(plistPath, "utf8");
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
      fs14.writeFileSync(plistPath, plist, "utf8");
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
    fs14.writeFileSync(plistPath, plist, "utf8");
    console.log(`\u2705 Synced ${urlSchemes.length} iOS URL scheme(s) into Info.plist`);
  }
  function runPodInstall(forcePath) {
    const podfilePath = forcePath ?? path15.join(iosProjectPath, "Podfile");
    if (!fs14.existsSync(podfilePath)) {
      console.log("\u2139\uFE0F No Podfile found in ios directory; skipping `pod install`.");
      return;
    }
    const cwd = path15.dirname(podfilePath);
    try {
      console.log(`\u2139\uFE0F Running \`pod install\` in ${cwd}...`);
      try {
        execSync6("pod install", { cwd, stdio: "inherit" });
      } catch {
        console.log("\u2139\uFE0F Retrying `pod install` with repo update...");
        execSync6("pod install --repo-update", { cwd, stdio: "inherit" });
      }
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
    syncHost_default();
    updatePodfile(packages);
    ensureXElementPod();
    ensureLynxPatchInPodfile();
    ensurePodBuildSettings();
    updateLynxInitProcessor(packages);
    writeHostNativeModulesManifest();
    syncInfoPlistPermissions(packages);
    syncInfoPlistUrlSchemes();
    const appNameFromConfig = resolved.config.ios?.appName;
    if (appNameFromConfig) {
      const appPodfile = path15.join(iosProjectPath, appNameFromConfig, "Podfile");
      if (fs14.existsSync(appPodfile)) {
        runPodInstall(appPodfile);
        console.log("\u2728 Autolinking complete for iOS.");
        return;
      }
    }
    runPodInstall();
    console.log("\u2728 Autolinking complete for iOS.");
  }
  function writeHostNativeModulesManifest() {
    const allPkgs = discoverModules(projectRoot);
    const hasDevClient = allPkgs.some((p) => p.name === "@tamer4lynx/tamer-dev-client");
    const appFolder = resolved.config.ios?.appName;
    if (!hasDevClient || !appFolder) return;
    const androidNames = getDedupedAndroidModuleClassNames(allPkgs);
    const appDir = path15.join(iosProjectPath, appFolder);
    fs14.mkdirSync(appDir, { recursive: true });
    const manifestPath = path15.join(appDir, TAMER_HOST_NATIVE_MODULES_FILENAME);
    fs14.writeFileSync(manifestPath, buildHostNativeModulesManifestJson(androidNames), "utf8");
    console.log(`\u2705 Wrote ${TAMER_HOST_NATIVE_MODULES_FILENAME} (native module ids for dev-client checks)`);
    const pbxprojPath = path15.join(iosProjectPath, `${appFolder}.xcodeproj`, "project.pbxproj");
    if (fs14.existsSync(pbxprojPath)) {
      addResourceToXcodeProject(pbxprojPath, appFolder, TAMER_HOST_NATIVE_MODULES_FILENAME);
    }
  }
  run();
};
var autolink_default2 = autolink2;

// src/ios/bundle.ts
import fs15 from "fs";
import path16 from "path";
import { execSync as execSync7 } from "child_process";
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
  const sourceBundlePath = resolved.lynxBundlePath;
  const destinationDir = path16.join(resolved.iosDir, appName);
  const destinationBundlePath = path16.join(destinationDir, resolved.lynxBundleFile);
  syncHost_default({ release, includeDevClient });
  autolink_default2();
  const iconPaths = resolveIconPaths(resolved.projectRoot, resolved.config);
  if (iconPaths) {
    const appIconDir = path16.join(destinationDir, "Assets.xcassets", "AppIcon.appiconset");
    if (applyIosAppIconAssets(appIconDir, iconPaths)) {
      console.log("\u2705 Synced iOS AppIcon from tamer.config.json");
    }
  }
  try {
    console.log("\u{1F4E6} Building Lynx bundle...");
    execSync7("npm run build", { stdio: "inherit", cwd: resolved.lynxProjectDir });
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
    const distDir = path16.dirname(sourceBundlePath);
    console.log(`\u{1F69A} Copying bundle and assets to iOS project...`);
    copyDistAssets(distDir, destinationDir, resolved.lynxBundleFile);
    console.log(`\u2728 Successfully copied bundle to: ${destinationBundlePath}`);
    const pbxprojPath = path16.join(resolved.iosDir, `${appName}.xcodeproj`, "project.pbxproj");
    if (fs15.existsSync(pbxprojPath)) {
      const skip = /* @__PURE__ */ new Set([".rspeedy", "stats.json"]);
      for (const entry of fs15.readdirSync(distDir)) {
        if (skip.has(entry) || fs15.statSync(path16.join(distDir, entry)).isDirectory()) continue;
        addResourceToXcodeProject(pbxprojPath, appName, entry);
      }
    }
    if (includeDevClient && devClientPkg) {
      const devClientBundle = path16.join(destinationDir, "dev-client.lynx.bundle");
      console.log("\u{1F4E6} Building dev-client bundle...");
      try {
        execSync7("npm run build", { stdio: "inherit", cwd: devClientPkg });
      } catch {
        console.warn("\u26A0\uFE0F  dev-client build failed; skipping dev-client bundle");
      }
      const builtBundle = path16.join(devClientPkg, "dist", "dev-client.lynx.bundle");
      if (fs15.existsSync(builtBundle)) {
        fs15.copyFileSync(builtBundle, devClientBundle);
        console.log("\u2728 Copied dev-client.lynx.bundle to iOS project");
        const pbxprojPath2 = path16.join(resolved.iosDir, `${appName}.xcodeproj`, "project.pbxproj");
        if (fs15.existsSync(pbxprojPath2)) {
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
import fs16 from "fs";
import path17 from "path";
import os3 from "os";
import { execSync as execSync8 } from "child_process";
function hostArch() {
  return os3.arch() === "arm64" ? "arm64" : "x86_64";
}
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
  const workspacePath = path17.join(iosDir, `${appName}.xcworkspace`);
  const projectPath = path17.join(iosDir, `${appName}.xcodeproj`);
  const xcproject = fs16.existsSync(workspacePath) ? workspacePath : projectPath;
  const flag = xcproject.endsWith(".xcworkspace") ? "-workspace" : "-project";
  const derivedDataPath = path17.join(iosDir, "build");
  const sdk = opts.install ? "iphonesimulator" : "iphoneos";
  const signingArgs = opts.install ? "" : " CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO";
  const archFlag = opts.install ? `-arch ${hostArch()} ` : "";
  const extraSettings = [
    "ONLY_ACTIVE_ARCH=YES",
    "CLANG_ENABLE_EXPLICIT_MODULES=NO"
  ].join(" ");
  console.log(`
\u{1F528} Building ${configuration} (${sdk})...`);
  execSync8(
    `xcodebuild ${flag} "${xcproject}" -scheme "${scheme}" -configuration ${configuration} -sdk ${sdk} ${archFlag}-derivedDataPath "${derivedDataPath}" ${extraSettings}${signingArgs}`,
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
    if (!fs16.existsSync(appGlob)) {
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
var build_default2 = buildIpa;

// src/common/init.tsx
import fs17 from "fs";
import path18 from "path";
import { useState as useState4, useEffect as useEffect2, useCallback as useCallback3 } from "react";
import { render, Text as Text9, Box as Box8 } from "ink";

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
function ServerDashboard({
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
  showLogs,
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
              buildPhase === "building" ? /* @__PURE__ */ jsx8(TuiSpinner, { label: "Building\u2026" }) : buildPhase === "error" ? /* @__PURE__ */ jsx8(Text8, { color: "red", children: buildError ?? "Build failed" }) : /* @__PURE__ */ jsx8(Text8, { color: "green", children: "Ready" })
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
    showLogs && logLines.length > 0 ? /* @__PURE__ */ jsxs8(Box7, { marginTop: 1, flexDirection: "column", borderStyle: "single", paddingX: 1, children: [
      /* @__PURE__ */ jsxs8(Text8, { dimColor: true, children: [
        "Build / output (last ",
        logLines.length,
        " lines)"
      ] }),
      logLines.slice(-12).map((line, i) => /* @__PURE__ */ jsx8(Text8, { dimColor: true, children: line }, i))
    ] }) : null,
    /* @__PURE__ */ jsx8(Box7, { marginTop: 1, children: /* @__PURE__ */ jsx8(Text8, { dimColor: true, children: "r rebuild \xB7 l toggle logs \xB7 q quit" }) })
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

// src/common/init.tsx
import { jsx as jsx9, jsxs as jsxs9 } from "react/jsx-runtime";
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
      paths: { androidDir: "android", iosDir: "ios" }
    };
    if (lynxProject.trim()) config.lynxProject = lynxProject.trim();
    const configPath = path18.join(process.cwd(), "tamer.config.json");
    fs17.writeFileSync(configPath, JSON.stringify(config, null, 2));
    const lines = [`Generated tamer.config.json at ${configPath}`];
    const tamerTypesInclude = "node_modules/@tamer4lynx/tamer-*/src/**/*.d.ts";
    const tsconfigCandidates = lynxProject.trim() ? [
      path18.join(process.cwd(), lynxProject.trim(), "tsconfig.json"),
      path18.join(process.cwd(), "tsconfig.json")
    ] : [path18.join(process.cwd(), "tsconfig.json")];
    function parseTsconfigJson(raw) {
      try {
        return JSON.parse(raw);
      } catch {
        const noTrailingCommas = raw.replace(/,\s*([\]}])/g, "$1");
        return JSON.parse(noTrailingCommas);
      }
    }
    for (const tsconfigPath of tsconfigCandidates) {
      if (!fs17.existsSync(tsconfigPath)) continue;
      try {
        const raw = fs17.readFileSync(tsconfigPath, "utf-8");
        const tsconfig = parseTsconfigJson(raw);
        const include = tsconfig.include ?? [];
        const arr = Array.isArray(include) ? include : [include];
        if (arr.some((p) => (typeof p === "string" ? p : "").includes("tamer-"))) continue;
        arr.push(tamerTypesInclude);
        tsconfig.include = arr;
        fs17.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
        lines.push(`Updated ${path18.relative(process.cwd(), tsconfigPath)} for tamer types`);
        break;
      } catch (e) {
        lines.push(`Could not update ${tsconfigPath}: ${e.message}`);
      }
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
      /* @__PURE__ */ jsx9(Text9, { bold: true, children: "Tamer4Lynx init" }),
      /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "Set up tamer.config.json for your project." }),
      /* @__PURE__ */ jsx9(Box8, { marginTop: 1, children: /* @__PURE__ */ jsx9(
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
    return /* @__PURE__ */ jsx9(Wizard, { step: 1, total: 6, title: "Android app name", children: /* @__PURE__ */ jsx9(
      TuiTextInput,
      {
        label: "Android app name:",
        defaultValue: androidAppName,
        onSubmitValue: (v) => setAndroidAppName(v),
        onSubmit: () => setStep("android-pkg")
      }
    ) });
  }
  if (step === "android-pkg") {
    return /* @__PURE__ */ jsx9(Wizard, { step: 2, total: 6, title: "Android package name", children: /* @__PURE__ */ jsx9(
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
      }
    ) });
  }
  if (step === "android-sdk") {
    return /* @__PURE__ */ jsx9(Wizard, { step: 3, total: 6, title: "Android SDK", children: /* @__PURE__ */ jsx9(
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
      }
    ) });
  }
  if (step === "ios-reuse") {
    return /* @__PURE__ */ jsx9(Wizard, { step: 4, total: 6, title: "iOS", children: /* @__PURE__ */ jsx9(
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
    return /* @__PURE__ */ jsx9(Wizard, { step: 4, total: 6, title: "iOS app name", children: /* @__PURE__ */ jsx9(
      TuiTextInput,
      {
        label: "iOS app name:",
        defaultValue: iosAppName,
        onSubmitValue: (v) => setIosAppName(v),
        onSubmit: () => setStep("ios-bundle")
      }
    ) });
  }
  if (step === "ios-bundle") {
    return /* @__PURE__ */ jsx9(Wizard, { step: 5, total: 6, title: "iOS bundle ID", children: /* @__PURE__ */ jsx9(
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
      }
    ) });
  }
  if (step === "lynx-path") {
    return /* @__PURE__ */ jsx9(Wizard, { step: 6, total: 6, title: "Lynx project", children: /* @__PURE__ */ jsx9(
      TuiTextInput,
      {
        label: "Lynx project path relative to project root (optional, e.g. packages/example):",
        defaultValue: lynxProject,
        onSubmitValue: (v) => setLynxProject(v),
        onSubmit: () => setStep("saving"),
        hint: "Press Enter with empty to skip"
      }
    ) });
  }
  if (step === "saving") {
    return /* @__PURE__ */ jsx9(Box8, { children: /* @__PURE__ */ jsx9(TuiSpinner, { label: "Writing tamer.config.json and updating tsconfig\u2026" }) });
  }
  if (step === "done") {
    return /* @__PURE__ */ jsx9(Box8, { flexDirection: "column", children: /* @__PURE__ */ jsx9(StatusBox, { variant: "success", title: "Done", children: doneMessage.map((line, i) => /* @__PURE__ */ jsx9(Text9, { color: "green", children: line }, i)) }) });
  }
  return null;
}
async function init() {
  const { waitUntilExit } = render(/* @__PURE__ */ jsx9(InitWizard, {}));
  await waitUntilExit();
}

// src/common/create.ts
import fs18 from "fs";
import path19 from "path";
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
  const root = path19.join(cwd, extName);
  if (fs18.existsSync(root)) {
    console.error(`\u274C Directory ${extName} already exists.`);
    rl.close();
    process.exit(1);
  }
  fs18.mkdirSync(root, { recursive: true });
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
  fs18.writeFileSync(path19.join(root, "lynx.ext.json"), JSON.stringify(lynxExt, null, 2));
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
  fs18.writeFileSync(path19.join(root, "package.json"), JSON.stringify(pkg, null, 2));
  const pkgPath = packageName.replace(/\./g, "/");
  const hasSrc = includeModule || includeElement || includeService;
  if (hasSrc) {
    fs18.mkdirSync(path19.join(root, "src"), { recursive: true });
  }
  if (includeModule) {
    fs18.writeFileSync(path19.join(root, "src", "index.d.ts"), `/** @lynxmodule */
export declare class ${simpleModuleName} {
  // Add your module methods here
}
`);
    fs18.mkdirSync(path19.join(root, "android", "src", "main", "kotlin", pkgPath), { recursive: true });
    fs18.writeFileSync(path19.join(root, "android", "build.gradle.kts"), `plugins {
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
    fs18.writeFileSync(path19.join(root, "android", "src", "main", "AndroidManifest.xml"), `<?xml version="1.0" encoding="utf-8"?>
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
    fs18.writeFileSync(path19.join(root, "android", "src", "main", "kotlin", pkgPath, `${simpleModuleName}.kt`), ktContent);
    fs18.mkdirSync(path19.join(root, "ios", extName, extName, "Classes"), { recursive: true });
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
    fs18.writeFileSync(path19.join(root, "ios", extName, `${extName}.podspec`), podspec);
    const swiftContent = `import Foundation

@objc public class ${simpleModuleName}: NSObject {
    @objc public func example() -> String {
        return "Hello from ${extName}"
    }
}
`;
    fs18.writeFileSync(path19.join(root, "ios", extName, extName, "Classes", `${simpleModuleName}.swift`), swiftContent);
  }
  if (includeElement && !includeModule) {
    const elementName = extName.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
    fs18.writeFileSync(path19.join(root, "src", "index.tsx"), `import type { FC } from '@lynx-js/react';

export const ${elementName}: FC = () => {
  return null;
};
`);
  }
  fs18.writeFileSync(path19.join(root, "index.js"), `'use strict';
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
  fs18.writeFileSync(path19.join(root, "tsconfig.json"), JSON.stringify({
    compilerOptions: tsconfigCompiler,
    include: includeElement ? ["src", "src/**/*.tsx"] : ["src"]
  }, null, 2));
  fs18.writeFileSync(path19.join(root, "README.md"), `# ${extName}

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
import fs19 from "fs";
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
  fs19.mkdirSync(generatedDir, { recursive: true });
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
    fs19.writeFileSync(outPath, tsContent);
    console.log(`\u2705 Generated ${outPath}`);
  }
  if (config.android) {
    const androidGenerated = path20.join(cwd, "android", "src", "main", "kotlin", config.android.moduleClassName.replace(/\./g, "/").replace(/[^/]+$/, ""), "generated");
    fs19.mkdirSync(androidGenerated, { recursive: true });
    console.log(`\u2139\uFE0F Android generated dir: ${androidGenerated} (spec generation coming soon)`);
  }
  if (config.ios) {
    const iosGenerated = path20.join(cwd, "ios", "generated");
    fs19.mkdirSync(iosGenerated, { recursive: true });
    console.log(`\u2139\uFE0F iOS generated dir: ${iosGenerated} (spec generation coming soon)`);
  }
  console.log("\u2728 Codegen complete.");
}
function findDtsFiles(dir) {
  const result = [];
  if (!fs19.existsSync(dir)) return result;
  const entries = fs19.readdirSync(dir, { withFileTypes: true });
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
    const content = fs19.readFileSync(file, "utf8");
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
import fs20 from "fs";
import http from "http";
import os4 from "os";
import path21 from "path";
import { render as render2, useInput, useApp } from "ink";
import { WebSocketServer } from "ws";
import { jsx as jsx10 } from "react/jsx-runtime";
var DEFAULT_PORT = 3e3;
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
  fs20.readFile(absPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path21.extname(absPath).toLowerCase();
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
  const nets = os4.networkInterfaces();
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
  const dir = path21.resolve(cwd);
  if (fs20.existsSync(path21.join(dir, "pnpm-lock.yaml"))) return { cmd: "pnpm", args: ["run", "build"] };
  if (fs20.existsSync(path21.join(dir, "bun.lockb")) || fs20.existsSync(path21.join(dir, "bun.lock")))
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
  showLogs: false,
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
  const appendLog = useCallback4((chunk) => {
    const lines = chunk.split(/\r?\n/).filter(Boolean);
    setUi((prev) => ({
      ...prev,
      logLines: [...prev.logLines, ...lines].slice(-400)
    }));
  }, []);
  const handleQuit = useCallback4(() => {
    if (quitOnceRef.current) return;
    quitOnceRef.current = true;
    void cleanupRef.current?.();
    exit();
  }, [exit]);
  useInput((input, key) => {
    if (key.ctrl && key.name === "c") {
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
    if (input === "l") {
      setUi((s) => ({ ...s, showLogs: !s.showLogs }));
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
    const run = async () => {
      try {
        const resolved = resolveHostPaths();
        const { projectRoot, lynxProjectDir, lynxBundlePath, lynxBundleFile, config } = resolved;
        const distDir = path21.dirname(lynxBundlePath);
        const projectName = path21.basename(lynxProjectDir);
        const basePath = `/${projectName}`;
        setUi((s) => ({ ...s, projectName, lynxBundleFile }));
        const preferredPort = config.devServer?.port ?? config.devServer?.httpPort ?? DEFAULT_PORT;
        const port = await findAvailablePort(preferredPort);
        if (port !== preferredPort) {
          appendLog(`Port ${preferredPort} in use, using ${port}`);
        }
        const iconPaths = resolveIconPaths(projectRoot, config);
        let iconFilePath = null;
        if (iconPaths?.source && fs20.statSync(iconPaths.source).isFile()) {
          iconFilePath = iconPaths.source;
        } else if (iconPaths?.androidAdaptiveForeground && fs20.statSync(iconPaths.androidAdaptiveForeground).isFile()) {
          iconFilePath = iconPaths.androidAdaptiveForeground;
        } else if (iconPaths?.android) {
          const androidIcon = path21.join(iconPaths.android, "mipmap-xxxhdpi", "ic_launcher.png");
          if (fs20.existsSync(androidIcon)) iconFilePath = androidIcon;
        } else if (iconPaths?.ios) {
          const iosIcon = path21.join(iconPaths.ios, "Icon-1024.png");
          if (fs20.existsSync(iosIcon)) iconFilePath = iosIcon;
        }
        const iconExt = iconFilePath ? path21.extname(iconFilePath) || ".png" : "";
        const runBuild = () => {
          return new Promise((resolve, reject) => {
            const { cmd, args } = detectPackageManager(lynxProjectDir);
            buildProcess = spawn(cmd, args, {
              cwd: lynxProjectDir,
              stdio: "pipe",
              shell: process.platform === "win32"
            });
            let stderr = "";
            buildProcess.stdout?.on("data", (d) => {
              appendLog(d.toString());
            });
            buildProcess.stderr?.on("data", (d) => {
              const t = d.toString();
              stderr += t;
              appendLog(t);
            });
            buildProcess.on("close", (code) => {
              buildProcess = null;
              if (code === 0) resolve();
              else reject(new Error(stderr || `Build exited ${code}`));
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
            fs20.readFile(iconFilePath, (err, data) => {
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
            const safe = path21.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
            if (path21.isAbsolute(safe) || safe.startsWith("..")) {
              res.writeHead(403);
              res.end();
              return;
            }
            const allowedRoot = path21.resolve(lynxProjectDir, rootSub);
            const abs = path21.resolve(allowedRoot, safe);
            if (!abs.startsWith(allowedRoot + path21.sep) && abs !== allowedRoot) {
              res.writeHead(403);
              res.end();
              return;
            }
            if (!fs20.existsSync(abs) || !fs20.statSync(abs).isFile()) {
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
          const filePath = path21.resolve(distDir, relPath);
          const distResolved = path21.resolve(distDir);
          if (!filePath.startsWith(distResolved + path21.sep) && filePath !== distResolved) {
            res.writeHead(403);
            res.end();
            return;
          }
          fs20.readFile(filePath, (err, data) => {
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
          setUi((s) => ({ ...s, wsConnections: s.wsConnections + 1 }));
          appendLog(`[WS] connected: ${clientIp}`);
          ws.send(JSON.stringify({ type: "connected" }));
          ws.on("close", () => {
            setUi((s) => ({ ...s, wsConnections: Math.max(0, s.wsConnections - 1) }));
            appendLog(`[WS] disconnected: ${clientIp}`);
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
            path21.join(lynxProjectDir, "src"),
            path21.join(lynxProjectDir, "lynx.config.ts"),
            path21.join(lynxProjectDir, "lynx.config.js")
          ].filter((p) => fs20.existsSync(p));
          if (watchPaths.length > 0) {
            const w = chokidar.watch(watchPaths, { ignoreInitial: true });
            w.on("change", async () => {
              try {
                await rebuildRef.current();
              } catch {
              }
            });
            watcher = {
              close: async () => {
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
    void run();
    return () => {
      alive = false;
      void cleanupRef.current?.();
    };
  }, [appendLog, verbose]);
  return /* @__PURE__ */ jsx10(
    ServerDashboard,
    {
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
      showLogs: ui.showLogs,
      qrLines: ui.qrLines,
      phase: ui.phase,
      startError: ui.startError
    }
  );
}
async function startDevServer(opts) {
  const verbose = opts?.verbose ?? false;
  const { waitUntilExit } = render2(/* @__PURE__ */ jsx10(DevServerApp, { verbose }), {
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
import fs21 from "fs";
import path22 from "path";
function readAndSubstitute(templatePath, vars) {
  const raw = fs21.readFileSync(templatePath, "utf-8");
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
  if (!fs21.existsSync(javaDir) || !fs21.existsSync(kotlinDir)) {
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
    if (!fs21.existsSync(srcPath)) continue;
    if (fs21.existsSync(dst) && !opts?.force) {
      console.log(`\u23ED\uFE0F  Skipping ${path22.basename(dst)} (use --force to overwrite)`);
      continue;
    }
    const content = readAndSubstitute(srcPath, vars);
    fs21.mkdirSync(path22.dirname(dst), { recursive: true });
    fs21.writeFileSync(dst, content);
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
  if (!fs21.existsSync(projectDir)) {
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
    if (!fs21.existsSync(srcPath)) continue;
    if (fs21.existsSync(dstPath) && !opts?.force) {
      console.log(`\u23ED\uFE0F  Skipping ${f} (use --force to overwrite)`);
      continue;
    }
    const content = readAndSubstitute(srcPath, vars);
    fs21.writeFileSync(dstPath, content);
    console.log(`\u2705 Injected ${f}`);
  }
}

// src/common/buildEmbeddable.ts
import fs22 from "fs";
import path23 from "path";
import { execSync as execSync9 } from "child_process";
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
function generateAndroidLibrary(outDir, androidDir, projectRoot, lynxBundlePath, lynxBundleFile, modules, abiFilters) {
  const libDir = path23.join(androidDir, "lib");
  const libSrcMain = path23.join(libDir, "src", "main");
  const assetsDir = path23.join(libSrcMain, "assets");
  const kotlinDir = path23.join(libSrcMain, "kotlin", LIB_PACKAGE.replace(/\./g, "/"));
  const generatedDir = path23.join(kotlinDir, "generated");
  fs22.mkdirSync(path23.join(androidDir, "gradle"), { recursive: true });
  fs22.mkdirSync(generatedDir, { recursive: true });
  fs22.mkdirSync(assetsDir, { recursive: true });
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
  fs22.writeFileSync(path23.join(androidDir, "gradle", "libs.versions.toml"), LIBS_VERSIONS_TOML);
  fs22.writeFileSync(path23.join(androidDir, "settings.gradle.kts"), settingsContent);
  fs22.writeFileSync(
    path23.join(androidDir, "build.gradle.kts"),
    `plugins {
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.kapt) apply false
}
`
  );
  fs22.writeFileSync(
    path23.join(androidDir, "gradle.properties"),
    `org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
kotlin.code.style=official
`
  );
  fs22.writeFileSync(path23.join(libDir, "build.gradle.kts"), libBuildContent);
  fs22.writeFileSync(
    path23.join(libSrcMain, "AndroidManifest.xml"),
    '<?xml version="1.0" encoding="utf-8"?>\n<manifest />'
  );
  fs22.copyFileSync(lynxBundlePath, path23.join(assetsDir, lynxBundleFile));
  fs22.writeFileSync(path23.join(kotlinDir, "LynxEmbeddable.kt"), LYNX_EMBEDDABLE_KT);
  fs22.writeFileSync(
    path23.join(generatedDir, "GeneratedLynxExtensions.kt"),
    generateLynxExtensionsKotlin(modules, LIB_PACKAGE)
  );
  fs22.writeFileSync(
    path23.join(generatedDir, "GeneratedActivityLifecycle.kt"),
    generateActivityLifecycleKotlin(modules, LIB_PACKAGE)
  );
}
async function buildEmbeddable(opts = {}) {
  const resolved = resolveHostPaths();
  const { lynxProjectDir, lynxBundlePath, lynxBundleFile, projectRoot, config } = resolved;
  console.log("\u{1F4E6} Building Lynx project (release)...");
  execSync9("npm run build", { stdio: "inherit", cwd: lynxProjectDir });
  if (!fs22.existsSync(lynxBundlePath)) {
    console.error(`\u274C Bundle not found at ${lynxBundlePath}`);
    process.exit(1);
  }
  const outDir = path23.join(projectRoot, EMBEDDABLE_DIR);
  fs22.mkdirSync(outDir, { recursive: true });
  const distDir = path23.dirname(lynxBundlePath);
  copyDistAssets(distDir, outDir, lynxBundleFile);
  const modules = discoverModules(projectRoot);
  const androidModules = modules.filter((m) => m.config.android);
  const abiFilters = resolveAbiFilters(config);
  const androidDir = path23.join(outDir, "android");
  if (fs22.existsSync(androidDir)) fs22.rmSync(androidDir, { recursive: true });
  fs22.mkdirSync(androidDir, { recursive: true });
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
    if (fs22.existsSync(path23.join(d, "gradlew"))) {
      for (const name of ["gradlew", "gradlew.bat", "gradle"]) {
        const src = path23.join(d, name);
        if (fs22.existsSync(src)) {
          const dest = path23.join(androidDir, name);
          if (fs22.statSync(src).isDirectory()) {
            fs22.cpSync(src, dest, { recursive: true });
          } else {
            fs22.copyFileSync(src, dest);
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
  if (fs22.existsSync(aarSrc)) {
    fs22.copyFileSync(aarSrc, aarDest);
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
  fs22.writeFileSync(path23.join(outDir, "snippet-android.kt"), snippetAndroid);
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
  fs22.writeFileSync(path23.join(outDir, "README.md"), readme);
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
  fs22.mkdirSync(resourcesDir, { recursive: true });
  fs22.copyFileSync(lynxBundlePath, path23.join(resourcesDir, lynxBundleFile));
  const iosModules = modules.filter((m) => m.config.ios);
  const podDeps = iosModules.map((p) => {
    const podspecPath = p.config.ios?.podspecPath || ".";
    const podspecDir = path23.join(p.packagePath, podspecPath);
    if (!fs22.existsSync(podspecDir)) return null;
    const files = fs22.readdirSync(podspecDir);
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
    if (!fs22.existsSync(podspecDir)) return null;
    const files = fs22.readdirSync(podspecDir);
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
  fs22.writeFileSync(path23.join(iosDir, "TamerEmbeddable.podspec"), podspecContent);
  fs22.writeFileSync(path23.join(podDir, "LynxEmbeddable.swift"), lynxEmbeddableSwift);
  const absIosDir = path23.resolve(iosDir);
  const podfileSnippet = `# Paste into your app target in Podfile:

pod 'TamerEmbeddable', :path => '${absIosDir}'
${podDeps.map((d) => `pod '${d.podName}', :path => '${d.absPath}'`).join("\n")}
`;
  fs22.writeFileSync(path23.join(iosDir, "Podfile.snippet"), podfileSnippet);
  fs22.writeFileSync(
    path23.join(outDir, "snippet-ios.swift"),
    `// Add LynxEmbeddable.initEnvironment() in your AppDelegate/SceneDelegate before presenting LynxView.
// Then create LynxView with your bundle URL (main.lynx.bundle is in the pod resources).
`
  );
}

// src/common/add.ts
import fs23 from "fs";
import path24 from "path";
import { execFile, execSync as execSync10 } from "child_process";
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
  "@tamer4lynx/tamer-icons"
];
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
  const dir = path24.resolve(cwd);
  if (fs23.existsSync(path24.join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs23.existsSync(path24.join(dir, "bun.lockb"))) return "bun";
  return "npm";
}
function runInstall(cwd, packages, pm) {
  const args = pm === "npm" ? ["install", ...packages] : ["add", ...packages];
  const cmd = pm === "npm" ? "npm" : pm === "pnpm" ? "pnpm" : "bun";
  execSync10(`${cmd} ${args.join(" ")}`, { stdio: "inherit", cwd });
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
  const DEV_PACKAGES = ["@tamer4lynx/tamer-dev-app", "@tamer4lynx/tamer-dev-client"];
  console.log(`Resolving latest published versions (npm)\u2026`);
  const resolved = await Promise.all(DEV_PACKAGES.map(normalizeTamerInstallSpec));
  console.log(`Adding dev packages to ${lynxProjectDir} (using ${pm})\u2026`);
  runInstall(lynxProjectDir, resolved, pm);
  console.log("\u2705 Dev packages installed. Run `t4l link` to link native modules.");
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
import { useState as useState6, useEffect as useEffect4, useRef as useRef2 } from "react";
import { render as render3, Text as Text10, Box as Box9 } from "ink";
import fs26 from "fs";
import path27 from "path";

// src/common/androidKeystore.ts
import { execFileSync } from "child_process";
import fs24 from "fs";
import path25 from "path";
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
    if (out && fs24.existsSync(path25.join(out, "bin", "keytool"))) return out;
  } catch {
  }
  return void 0;
}
function resolveKeytoolPath() {
  const jh = normalizeJavaHome(process.env.JAVA_HOME);
  const win = process.platform === "win32";
  const keytoolName = win ? "keytool.exe" : "keytool";
  if (jh) {
    const p = path25.join(jh, "bin", keytoolName);
    if (fs24.existsSync(p)) return p;
  }
  const mac = discoverJavaHomeMacOs();
  if (mac) {
    const p = path25.join(mac, "bin", keytoolName);
    if (fs24.existsSync(p)) return p;
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
  if (fromJavaHome !== "keytool" && fs24.existsSync(fromJavaHome)) {
    return tryRun(fromJavaHome);
  }
  return false;
}
function generateReleaseKeystore(opts) {
  const keytool = resolveKeytoolPath();
  const dir = path25.dirname(opts.keystoreAbsPath);
  fs24.mkdirSync(dir, { recursive: true });
  if (fs24.existsSync(opts.keystoreAbsPath)) {
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
import fs25 from "fs";
import path26 from "path";
import { parse } from "dotenv";
function keysDefinedInFile(filePath) {
  if (!fs25.existsSync(filePath)) return /* @__PURE__ */ new Set();
  try {
    return new Set(Object.keys(parse(fs25.readFileSync(filePath, "utf8"))));
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
  const envLocal = path26.join(projectRoot, ".env.local");
  const envDefault = path26.join(projectRoot, ".env");
  let target;
  if (fs25.existsSync(envLocal)) target = envLocal;
  else if (fs25.existsSync(envDefault)) target = envDefault;
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
      file: path26.basename(target),
      keys: [],
      skippedAll: entries.length > 0
    };
  }
  let prefix = "";
  if (fs25.existsSync(target)) {
    const cur = fs25.readFileSync(target, "utf8");
    prefix = cur.length === 0 ? "" : cur.endsWith("\n") ? cur : `${cur}
`;
  }
  const block = lines.join("\n") + "\n";
  fs25.writeFileSync(target, prefix + block, "utf8");
  return { file: path26.basename(target), keys: appendedKeys };
}

// src/common/signing.tsx
import { Fragment, jsx as jsx11, jsxs as jsxs10 } from "react/jsx-runtime";
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
    /* @__PURE__ */ jsx11(
      TuiSelectInput,
      {
        label: "Android release keystore:",
        items,
        onSelect
      }
    ),
    !canGen && /* @__PURE__ */ jsx11(Text10, { dimColor: true, children: "keytool not found on PATH / JAVA_HOME. Install a JDK or set JAVA_HOME, then run signing again to generate." })
  ] });
}
function firstStepForPlatform(p) {
  if (p === "ios") return "ios-team";
  if (p === "android" || p === "both") return "android-keystore-mode";
  return "platform";
}
function SigningWizard({ platform: initialPlatform }) {
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
      provisioningProfileSpecifier: ""
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
          return { ...s, step: "ios-team" };
        }
        return { ...s, step: "saving" };
      }
      if (s.step === "ios-team") {
        return { ...s, step: "ios-identity" };
      }
      if (s.step === "ios-identity") {
        return { ...s, step: "ios-profile" };
      }
      if (s.step === "ios-profile") {
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
    const run = () => {
      let abs = "";
      try {
        const resolved = resolveHostPaths();
        const rel = state.android.genKeystorePath.trim() || "android/release.keystore";
        abs = path27.isAbsolute(rel) ? rel : path27.join(resolved.projectRoot, rel);
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
        if (abs && fs26.existsSync(abs) && (msg.includes("already exists") || msg.includes("Keystore already exists"))) {
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
    run();
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
      const configPath = path27.join(resolved.projectRoot, "tamer.config.json");
      let config = {};
      let androidEnvAppend = null;
      if (fs26.existsSync(configPath)) {
        config = JSON.parse(fs26.readFileSync(configPath, "utf8"));
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
          ...state.ios.provisioningProfileSpecifier && { provisioningProfileSpecifier: state.ios.provisioningProfileSpecifier }
        };
      }
      fs26.writeFileSync(configPath, JSON.stringify(config, null, 2));
      const gitignorePath = path27.join(resolved.projectRoot, ".gitignore");
      if (fs26.existsSync(gitignorePath)) {
        let gitignore = fs26.readFileSync(gitignorePath, "utf8");
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
        fs26.writeFileSync(gitignorePath, gitignore);
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
      /* @__PURE__ */ jsx11(Text10, { color: "green", children: "\u2705 Signing configuration saved to tamer.config.json" }),
      (state.platform === "android" || state.platform === "both") && /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", marginTop: 1, children: [
        /* @__PURE__ */ jsx11(Text10, { children: "Android signing configured:" }),
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
          /* @__PURE__ */ jsx11(Text10, { children: "Set environment variables (or add them to .env / .env.local):" }),
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
        /* @__PURE__ */ jsx11(Text10, { children: "iOS signing configured:" }),
        /* @__PURE__ */ jsxs10(Text10, { dimColor: true, children: [
          "  Team ID: ",
          state.ios.developmentTeam
        ] }),
        state.ios.codeSignIdentity && /* @__PURE__ */ jsxs10(Text10, { dimColor: true, children: [
          "  Identity: ",
          state.ios.codeSignIdentity
        ] })
      ] }),
      /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", marginTop: 1, children: [
        state.platform === "android" && /* @__PURE__ */ jsxs10(Fragment, { children: [
          /* @__PURE__ */ jsx11(Text10, { children: "Run `t4l build android -p` to build this platform with signing." }),
          /* @__PURE__ */ jsx11(Text10, { dimColor: true, children: "`t4l build -p` (no platform) builds both Android and iOS." })
        ] }),
        state.platform === "ios" && /* @__PURE__ */ jsxs10(Fragment, { children: [
          /* @__PURE__ */ jsx11(Text10, { children: "Run `t4l build ios -p` to build this platform with signing." }),
          /* @__PURE__ */ jsx11(Text10, { dimColor: true, children: "`t4l build -p` (no platform) builds both Android and iOS." })
        ] }),
        state.platform === "both" && /* @__PURE__ */ jsxs10(Fragment, { children: [
          /* @__PURE__ */ jsx11(Text10, { children: "Run `t4l build -p` to build both platforms with signing." }),
          /* @__PURE__ */ jsx11(Text10, { dimColor: true, children: "Or: `t4l build android -p` / `t4l build ios -p` for one platform." })
        ] })
      ] })
    ] });
  }
  if (state.step === "saving") {
    return /* @__PURE__ */ jsx11(Box9, { children: /* @__PURE__ */ jsx11(TuiSpinner, { label: "Saving configuration..." }) });
  }
  if (state.step === "android-generating") {
    return /* @__PURE__ */ jsx11(Box9, { flexDirection: "column", children: /* @__PURE__ */ jsx11(TuiSpinner, { label: "Running keytool to create release keystore..." }) });
  }
  return /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", children: [
    state.step === "platform" && /* @__PURE__ */ jsx11(
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
    state.step === "android-keystore-mode" && /* @__PURE__ */ jsx11(
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
    state.step === "android-gen-path" && /* @__PURE__ */ jsx11(
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
    state.step === "android-gen-alias" && /* @__PURE__ */ jsx11(
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
      state.generateError ? /* @__PURE__ */ jsx11(Text10, { color: "red", children: state.generateError }) : null,
      /* @__PURE__ */ jsx11(
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
    state.step === "android-keystore" && /* @__PURE__ */ jsx11(
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
    state.step === "android-alias" && /* @__PURE__ */ jsx11(
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
    state.step === "android-password-env" && /* @__PURE__ */ jsx11(
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
    state.step === "android-key-password-env" && /* @__PURE__ */ jsx11(
      TuiTextInput,
      {
        label: "Key password environment variable name:",
        defaultValue: state.android.keyPasswordEnv || "ANDROID_KEY_PASSWORD",
        onSubmitValue: (v) => {
          setState((s) => ({ ...s, android: { ...s.android, keyPasswordEnv: v } }));
        },
        onSubmit: () => {
          if (state.platform === "both") {
            setState((s) => ({ ...s, step: "ios-team" }));
          } else {
            setState((s) => ({ ...s, step: "saving" }));
          }
        },
        hint: "Default: ANDROID_KEY_PASSWORD (will be written to .env / .env.local)"
      }
    ),
    state.step === "ios-team" && /* @__PURE__ */ jsx11(
      TuiTextInput,
      {
        label: "iOS Development Team ID:",
        defaultValue: state.ios.developmentTeam,
        onSubmitValue: (v) => {
          setState((s) => ({ ...s, ios: { ...s.ios, developmentTeam: v } }));
        },
        onSubmit: nextStep,
        hint: "Example: ABC123DEF4 (found in Apple Developer account)"
      }
    ),
    state.step === "ios-identity" && /* @__PURE__ */ jsx11(
      TuiTextInput,
      {
        label: "iOS Code Sign Identity (optional, press Enter to skip):",
        defaultValue: state.ios.codeSignIdentity,
        onSubmitValue: (v) => {
          setState((s) => ({ ...s, ios: { ...s.ios, codeSignIdentity: v } }));
        },
        onSubmit: () => {
          setState((s) => ({ ...s, step: "ios-profile" }));
        },
        hint: 'Example: "iPhone Developer" or "Apple Development"'
      }
    ),
    state.step === "ios-profile" && /* @__PURE__ */ jsx11(
      TuiTextInput,
      {
        label: "iOS Provisioning Profile Specifier (optional, press Enter to skip):",
        defaultValue: state.ios.provisioningProfileSpecifier,
        onSubmitValue: (v) => {
          setState((s) => ({ ...s, ios: { ...s.ios, provisioningProfileSpecifier: v } }));
        },
        onSubmit: () => {
          setState((s) => ({ ...s, step: "saving" }));
        },
        hint: "UUID of the provisioning profile"
      }
    )
  ] });
}
async function signing(platform) {
  const { waitUntilExit } = render3(/* @__PURE__ */ jsx11(SigningWizard, { platform }));
  await waitUntilExit();
}

// src/common/productionSigning.ts
import fs27 from "fs";
import path28 from "path";
function isAndroidSigningConfigured(resolved) {
  const signing2 = resolved.config.android?.signing;
  const hasConfig = Boolean(signing2?.keystoreFile?.trim() && signing2?.keyAlias?.trim());
  const signingProps = path28.join(resolved.androidDir, "signing.properties");
  const hasProps = fs27.existsSync(signingProps);
  return hasConfig || hasProps;
}
function isIosSigningConfigured(resolved) {
  const team = resolved.config.ios?.signing?.developmentTeam?.trim();
  return Boolean(team);
}
function assertProductionSigningReady(filter) {
  const resolved = resolveHostPaths();
  const needAndroid = filter === "android" || filter === "all";
  const needIos = filter === "ios" || filter === "all";
  const missing = [];
  if (needAndroid && !isAndroidSigningConfigured(resolved)) {
    missing.push("Android: run `t4l signing android`, then `t4l build android -p`.");
  }
  if (needIos && !isIosSigningConfigured(resolved)) {
    missing.push("iOS: run `t4l signing ios`, then `t4l build ios -p`.");
  }
  if (missing.length === 0) return;
  console.error("\n\u274C Production build (`-p`) needs signing configured for the platform(s) you are building.");
  for (const line of missing) {
    console.error(`   ${line}`);
  }
  console.error(
    "\n   `t4l build -p` (no platform) builds both Android and iOS; use `t4l build android -p` or `t4l build ios -p` for one platform only.\n"
  );
  process.exit(1);
}

// index.ts
function readCliVersion() {
  const root = path29.dirname(fileURLToPath(import.meta.url));
  const here = path29.join(root, "package.json");
  const parent = path29.join(root, "..", "package.json");
  const pkgPath = fs28.existsSync(here) ? here : parent;
  return JSON.parse(fs28.readFileSync(pkgPath, "utf8")).version;
}
var version = readCliVersion();
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
program.command("build [platform]").description("Build app. Platform: ios | android (default: both)").option("-e, --embeddable", "Output embeddable bundle + code for existing apps. Use with --release.").option("-d, --debug", "Debug build with dev client embedded (default)").option("-r, --release", "Release build without dev client (unsigned)").option("-p, --production", "Production build for app store (signed)").option("-i, --install", "Install after building").action(async (platform, opts) => {
  validateBuildMode(opts.debug, opts.release, opts.production);
  const release = opts.release === true || opts.production === true;
  const production = opts.production === true;
  if (opts.embeddable) {
    await buildEmbeddable({ release: true });
    return;
  }
  const p = parsePlatform(platform ?? "all") ?? "all";
  if (production) {
    assertProductionSigningReady(p);
  }
  if (p === "android" || p === "all") {
    await build_default({ install: opts.install, release, production });
  }
  if (p === "ios" || p === "all") {
    await build_default2({ install: opts.install, release, production });
  }
});
program.command("link [platform]").description("Link native modules. Platform: ios | android | both (default: both)").option("-s, --silent", "Run in silent mode (e.g. for postinstall)").action((platform, opts) => {
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
program.command("inject <platform>").description("Inject tamer-host templates into an existing project. Platform: ios | android").option("-f, --force", "Overwrite existing files").action(async (platform, opts) => {
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
program.command("sync [platform]").description("Sync dev client files from tamer.config.json. Platform: android (default)").action(async (platform) => {
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
program.command("build-dev-app").option("-p, --platform <platform>", "Platform: android, ios, or all (default)", "all").option("-i, --install", "Install APK to connected device and launch app after building").description("(Deprecated) Use: t4l build android -d [--install]").action(async (opts) => {
  console.warn("\u26A0\uFE0F  build-dev-app is deprecated. Use: t4l build android -d [--install]");
  const p = parsePlatform(opts.platform ?? "all") ?? "all";
  if (p === "android" || p === "all") {
    await build_default({ install: opts.install, release: false });
  }
  if (p === "ios" || p === "all") {
    await build_default2({ install: opts.install, release: false });
  }
});
program.command("add [packages...]").description("Add @tamer4lynx packages to the Lynx project. Future: will track versions for compatibility (Expo-style).").action(async (packages) => {
  await add(packages);
});
program.command("add-core").description("Add core packages (app-shell, screen, router, insets, transports, system-ui, icons)").action(async () => {
  await addCore();
});
program.command("add-dev").description("Add dev packages (dev-app, dev-client, and all their dependencies)").action(async () => {
  await addDev();
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
program.command("android <subcommand>").description("(Legacy) Use: t4l <command> android. e.g. t4l create android").option("-d, --debug", "Create: host project. Bundle/build: debug with dev client.").option("-r, --release", "Create: dev-app project. Bundle/build: release without dev client.").option("-p, --production", "Bundle/build: production for app store (signed)").option("-i, --install", "Install after build").option("-e, --embeddable", "Build embeddable").option("-f, --force", "Force (inject)").action(async (subcommand, opts) => {
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
    autolink_default();
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
      await build_default({ install: opts.install, release, production: opts.production === true });
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
program.command("ios <subcommand>").description("(Legacy) Use: t4l <command> ios. e.g. t4l create ios").option("-d, --debug", "Debug (bundle/build)").option("-r, --release", "Release (bundle/build)").option("-p, --production", "Production for app store (signed)").option("-i, --install", "Install after build").option("-e, --embeddable", "Build embeddable").option("-f, --force", "Force (inject)").action(async (subcommand, opts) => {
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
    if (opts.embeddable) await buildEmbeddable({ release: true });
    else {
      if (opts.production === true) assertProductionSigningReady("ios");
      await build_default2({ install: opts.install, release, production: opts.production === true });
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
  const configPath = path29.join(process.cwd(), "tamer.config.json");
  let config = {};
  if (fs28.existsSync(configPath)) {
    config = JSON.parse(fs28.readFileSync(configPath, "utf8"));
  }
  if (config.autolink) {
    delete config.autolink;
    console.log("Autolink disabled in tamer.config.json");
  } else {
    config.autolink = true;
    console.log("Autolink enabled in tamer.config.json");
  }
  fs28.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Updated ${configPath}`);
});
if (process.argv.length <= 2 || process.argv.length === 3 && process.argv[2] === "init") {
  Promise.resolve(init()).then(() => process.exit(0));
} else {
  program.parseAsync().then(() => process.exit(0)).catch(() => process.exit(1));
}
