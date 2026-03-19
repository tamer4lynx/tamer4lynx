import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
    resolveHostPaths,
    resolveAbiFilters,
    findDevAppPackage,
} from './hostConfig';
import { copyDistAssets } from './copyDistAssets';
import { discoverModules } from './discoverModules';
import { generateActivityLifecycleKotlin, generateLynxExtensionsKotlin } from './generateExtCode';
import { setupGradleWrapper } from '../android/getGradle';

const EMBEDDABLE_DIR = 'embeddable';
const LIB_PACKAGE = 'com.tamer.embeddable';
const GRADLE_VERSION = '8.14.2';

const LIBS_VERSIONS_TOML = `[versions]
agp = "8.9.1"
lynx = "3.3.1"
kotlin = "2.0.21"
primjs = "2.12.0"

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

const LYNX_EMBEDDABLE_KT = `package ${LIB_PACKAGE}

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

function generateAndroidLibrary(
    outDir: string,
    androidDir: string,
    projectRoot: string,
    lynxBundlePath: string,
    lynxBundleFile: string,
    modules: { name: string; config: { android?: unknown }; packagePath: string }[],
    abiFilters: string[]
): void {
    const libDir = path.join(androidDir, 'lib');
    const libSrcMain = path.join(libDir, 'src', 'main');
    const assetsDir = path.join(libSrcMain, 'assets');
    const kotlinDir = path.join(libSrcMain, 'kotlin', LIB_PACKAGE.replace(/\./g, '/'));
    const generatedDir = path.join(kotlinDir, 'generated');

    fs.mkdirSync(path.join(androidDir, 'gradle'), { recursive: true });
    fs.mkdirSync(generatedDir, { recursive: true });
    fs.mkdirSync(assetsDir, { recursive: true });

    const androidModules = modules.filter((m) => m.config.android);
    const abiList = abiFilters.map((a) => `"${a}"`).join(', ');

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
${androidModules
    .map((p) => {
        const gradleName = p.name.replace(/^@/, '').replace(/\//g, '_');
        const sourceDir = (p.config.android as { sourceDir?: string })?.sourceDir || 'android';
        const absPath = path.join(p.packagePath, sourceDir).replace(/\\/g, '/');
        return `include(":${gradleName}")\nproject(":${gradleName}").projectDir = file("${absPath}")`;
    })
    .join('\n')}
`;

    const libDeps = androidModules
        .map((p) => {
            const gradleName = p.name.replace(/^@/, '').replace(/\//g, '_');
            return `    implementation(project(":${gradleName}"))`;
        })
        .join('\n');

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

    fs.writeFileSync(path.join(androidDir, 'gradle', 'libs.versions.toml'), LIBS_VERSIONS_TOML);
    fs.writeFileSync(path.join(androidDir, 'settings.gradle.kts'), settingsContent);
    fs.writeFileSync(
        path.join(androidDir, 'build.gradle.kts'),
        `plugins {
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.kapt) apply false
}
`
    );
    fs.writeFileSync(
        path.join(androidDir, 'gradle.properties'),
        `org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
kotlin.code.style=official
`
    );
    fs.writeFileSync(path.join(libDir, 'build.gradle.kts'), libBuildContent);
    fs.writeFileSync(
        path.join(libSrcMain, 'AndroidManifest.xml'),
        '<?xml version="1.0" encoding="utf-8"?>\n<manifest />'
    );
    fs.copyFileSync(lynxBundlePath, path.join(assetsDir, lynxBundleFile));
    fs.writeFileSync(path.join(kotlinDir, 'LynxEmbeddable.kt'), LYNX_EMBEDDABLE_KT);
    fs.writeFileSync(
        path.join(generatedDir, 'GeneratedLynxExtensions.kt'),
        generateLynxExtensionsKotlin(modules, LIB_PACKAGE)
    );
    fs.writeFileSync(
        path.join(generatedDir, 'GeneratedActivityLifecycle.kt'),
        generateActivityLifecycleKotlin(modules, LIB_PACKAGE)
    );
}

export default async function buildEmbeddable(opts: { release?: boolean } = {}) {
    const resolved = resolveHostPaths();
    const { lynxProjectDir, lynxBundlePath, lynxBundleFile, projectRoot, config } = resolved;

    console.log('📦 Building Lynx project (release)...');
    execSync('npm run build', { stdio: 'inherit', cwd: lynxProjectDir });

    if (!fs.existsSync(lynxBundlePath)) {
        console.error(`❌ Bundle not found at ${lynxBundlePath}`);
        process.exit(1);
    }

    const outDir = path.join(projectRoot, EMBEDDABLE_DIR);
    fs.mkdirSync(outDir, { recursive: true });

    const distDir = path.dirname(lynxBundlePath);
    copyDistAssets(distDir, outDir, lynxBundleFile);

    const modules = discoverModules(projectRoot);
    const androidModules = modules.filter((m) => m.config.android);
    const abiFilters = resolveAbiFilters(config);

    const androidDir = path.join(outDir, 'android');
    if (fs.existsSync(androidDir)) fs.rmSync(androidDir, { recursive: true });
    fs.mkdirSync(androidDir, { recursive: true });

    generateAndroidLibrary(
        outDir,
        androidDir,
        projectRoot,
        lynxBundlePath,
        lynxBundleFile,
        modules,
        abiFilters
    );

    const gradlewPath = path.join(androidDir, 'gradlew');
    const devAppDir = findDevAppPackage(projectRoot);
    const existingGradleDirs = [
        path.join(projectRoot, 'android'),
        devAppDir ? path.join(devAppDir, 'android') : null,
    ].filter(Boolean) as string[];

    let hasWrapper = false;
    for (const d of existingGradleDirs) {
        if (fs.existsSync(path.join(d, 'gradlew'))) {
            for (const name of ['gradlew', 'gradlew.bat', 'gradle']) {
                const src = path.join(d, name);
                if (fs.existsSync(src)) {
                    const dest = path.join(androidDir, name);
                    if (fs.statSync(src).isDirectory()) {
                        fs.cpSync(src, dest, { recursive: true });
                    } else {
                        fs.copyFileSync(src, dest);
                    }
                }
            }
            hasWrapper = true;
            break;
        }
    }

    if (!hasWrapper) {
        console.log('📦 Setting up Gradle wrapper...');
        await setupGradleWrapper(androidDir, GRADLE_VERSION);
    }

    try {
        console.log('📦 Building Android AAR...');
        execSync('./gradlew :lib:assembleRelease', { cwd: androidDir, stdio: 'inherit' });
    } catch (e) {
        console.error('❌ Android AAR build failed. Run manually: cd embeddable/android && ./gradlew :lib:assembleRelease');
        throw e;
    }

    const aarSrc = path.join(androidDir, 'lib', 'build', 'outputs', 'aar', 'lib-release.aar');
    const aarDest = path.join(outDir, 'tamer-embeddable.aar');
    if (fs.existsSync(aarSrc)) {
        fs.copyFileSync(aarSrc, aarDest);
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
    fs.writeFileSync(path.join(outDir, 'snippet-android.kt'), snippetAndroid);

    generateIosPod(outDir, projectRoot, lynxBundlePath, lynxBundleFile, modules);

    const readme = `# Embeddable Lynx Bundle

Production-ready Lynx bundle and native artifacts to add LynxView to your existing app.

## Contents

- \`main.lynx.bundle\` — Built Lynx bundle
- \`tamer-embeddable.aar\` — Android library (Lynx + native modules + bundle)
- \`android/\` — Gradle project source (for reference or local dependency)
- \`ios/\` — CocoaPod (podspec + Swift init + bundle)
- \`snippet-android.kt\` — Android integration snippet
- \`Podfile.snippet\` — iOS Podfile entries

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
    fs.writeFileSync(path.join(outDir, 'README.md'), readme);

    console.log(`\n✅ Embeddable output at ${outDir}/`);
    console.log('   - main.lynx.bundle');
    console.log('   - tamer-embeddable.aar');
    console.log('   - android/');
    console.log('   - ios/');
    console.log('   - snippet-android.kt');
    console.log('   - Podfile.snippet');
    console.log('   - README.md');
}

function generateIosPod(
    outDir: string,
    projectRoot: string,
    lynxBundlePath: string,
    lynxBundleFile: string,
    modules: { name: string; config: { ios?: unknown }; packagePath: string }[]
): void {
    const iosDir = path.join(outDir, 'ios');
    const podDir = path.join(iosDir, 'TamerEmbeddable');
    const resourcesDir = path.join(podDir, 'Resources');
    fs.mkdirSync(resourcesDir, { recursive: true });

    fs.copyFileSync(lynxBundlePath, path.join(resourcesDir, lynxBundleFile));

    const iosModules = modules.filter((m) => m.config.ios);
    const podDeps = iosModules
        .map((p) => {
            const podspecPath = (p.config.ios as { podspecPath?: string })?.podspecPath || '.';
            const podspecDir = path.join(p.packagePath, podspecPath);
            if (!fs.existsSync(podspecDir)) return null;
            const files = fs.readdirSync(podspecDir);
            const podspecFile = files.find((f) => f.endsWith('.podspec'));
            const podName = podspecFile ? podspecFile.replace('.podspec', '') : p.name.split('/').pop()!.replace(/-/g, '');
            const absPath = path.resolve(podspecDir);
            return { podName, absPath };
        })
        .filter(Boolean) as { podName: string; absPath: string }[];

    const podDepLines = podDeps.map((d) => `  s.dependency '${d.podName}'`).join('\n');
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
        const blocks: string[] = [];
        const iosConfig = pkg.config.ios as { moduleClassName?: string; moduleClassNames?: string[]; elements?: Record<string, string> } | undefined;
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

    const swiftImports = iosModules
        .map((p) => {
            const podspecPath = (p.config.ios as { podspecPath?: string })?.podspecPath || '.';
            const podspecDir = path.join(p.packagePath, podspecPath);
            if (!fs.existsSync(podspecDir)) return null;
            const files = fs.readdirSync(podspecDir);
            const podspecFile = files.find((f) => f.endsWith('.podspec'));
            return podspecFile ? podspecFile.replace('.podspec', '') : null;
        })
        .filter(Boolean) as string[];

    const importBlock = swiftImports.length > 0 ? swiftImports.map((i) => `import ${i}`).join('\n') + '\n' : '';
    const regBlock = swiftRegistrations.length > 0 ? swiftRegistrations.map((r) => `        ${r}`).join('\n') + '\n' : '        // no native modules\n';
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

    fs.writeFileSync(path.join(iosDir, 'TamerEmbeddable.podspec'), podspecContent);
    fs.writeFileSync(path.join(podDir, 'LynxEmbeddable.swift'), lynxEmbeddableSwift);

    const absIosDir = path.resolve(iosDir);
    const podfileSnippet = `# Paste into your app target in Podfile:

pod 'TamerEmbeddable', :path => '${absIosDir}'
${podDeps.map((d) => `pod '${d.podName}', :path => '${d.absPath}'`).join('\n')}
`;
    fs.writeFileSync(path.join(iosDir, 'Podfile.snippet'), podfileSnippet);

    fs.writeFileSync(
        path.join(outDir, 'snippet-ios.swift'),
        `// Add LynxEmbeddable.initEnvironment() in your AppDelegate/SceneDelegate before presenting LynxView.
// Then create LynxView with your bundle URL (main.lynx.bundle is in the pod resources).
`
    );
}
