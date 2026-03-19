import fs from "fs";
import path from "path";
import os from "os";
import { setupGradleWrapper } from "./getGradle";
import { loadHostConfig, resolveAbiFilters, resolveDevMode, resolveHostPaths, resolveIconPaths, findTamerHostPackage, findDevClientPackage, findDevAppPackage, findRepoRoot } from "../common/hostConfig";
import {
  fetchAndPatchApplication,
  fetchAndPatchTemplateProvider,
  getDevClientManager,
  getProjectActivity,
  getStandaloneMainActivity,
} from "../explorer/patches";
import { getDevServerPrefs } from "../explorer/devLauncher";

function readAndSubstituteTemplate(templatePath: string, vars: Record<string, string>): string {
  const raw = fs.readFileSync(templatePath, "utf-8");
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
    raw
  );
}

const create = async (opts: { target?: string } = {}) => {
    const target = opts.target ?? "host";
    const origCwd = process.cwd();
    if (target === "dev-app") {
      const devAppDir = findDevAppPackage(origCwd) ?? findDevAppPackage(findRepoRoot(origCwd));
      if (!devAppDir || !fs.existsSync(path.join(devAppDir, "tamer.config.json"))) {
        console.error("❌ tamer-dev-app not found. Add @tamer4lynx/tamer-dev-app to dependencies.");
        process.exit(1);
      }
      process.chdir(devAppDir);
    }

    let appName: string;
    let packageName: string;
    let androidSdk: string | undefined;
    let config: ReturnType<typeof loadHostConfig>;

    try {
        config = loadHostConfig();
        packageName = config.android?.packageName!;
        appName = config.android?.appName!;
        androidSdk = config.android?.sdk;

        if (androidSdk && androidSdk.startsWith("~")) {
            androidSdk = androidSdk.replace(/^~/, os.homedir());
        }

        if (!appName || !packageName) {
            throw new Error(
                '"android.appName" and "android.packageName" must be defined in tamer.config.json'
            );
        }
    } catch (error: any) {
        console.error(`❌ Error loading configuration: ${error.message}`);
        process.exit(1);
    }

    const packagePath = packageName.replace(/\./g, "/");
    const gradleVersion = "8.14.2";
    const androidDir = config.paths?.androidDir ?? "android";
    const rootDir = path.join(process.cwd(), androidDir);
    const appDir = path.join(rootDir, "app");
    const mainDir = path.join(appDir, "src", "main");
    const javaDir = path.join(mainDir, "java", packagePath);
    const kotlinDir = path.join(mainDir, "kotlin", packagePath);
    const kotlinGeneratedDir = path.join(kotlinDir, "generated");
    const assetsDir = path.join(mainDir, "assets");
    const themesDir = path.join(mainDir, "res", "values");
    const gradleDir = path.join(rootDir, "gradle");

    interface WriteFileOptions {
        encoding?: BufferEncoding;
        mode?: number;
        flag?: string;
    }

    function writeFile(
        filePath: string,
        content: string,
        options?: WriteFileOptions
    ): void {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(
            filePath,
            content.trimStart(),
            options?.encoding ?? "utf8"
        );
    }

    // Clean up previous generation if it exists
    if (fs.existsSync(rootDir)) {
        console.log(`🧹 Removing existing directory: ${rootDir}`);
        fs.rmSync(rootDir, { recursive: true, force: true });
    }

    console.log(`🚀 Creating a new Tamer4Lynx project in: ${rootDir}`);

    // --- Start File Generation ---

    // gradle/libs.versions.toml
    writeFile(
        path.join(gradleDir, "libs.versions.toml"),
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

    // settings.gradle.kts (with GENERATED block)
    writeFile(
        path.join(rootDir, "settings.gradle.kts"),
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

    // Root build.gradle
    writeFile(
        path.join(rootDir, "build.gradle.kts"),
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

    // gradle.properties
    writeFile(
        path.join(rootDir, "gradle.properties"),
        `
org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
kotlin.code.style=official
android.enableJetifier=true
`
    );

    // app/build.gradle.kts (UPDATED)
    writeFile(
        path.join(appDir, "build.gradle.kts"),
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
            abiFilters += listOf(${resolveAbiFilters(config).map((a) => `"${a}"`).join(', ')})
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

    // themes.xml
    writeFile(
        path.join(themesDir, "themes.xml"),
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
    const manifestActivities = hasDevLauncher
      ? `
        <activity android:name=".MainActivity" android:exported="true" android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        <activity android:name=".ProjectActivity" android:exported="false" android:taskAffinity="" android:launchMode="singleTask" android:documentLaunchMode="always" android:windowSoftInputMode="adjustResize" />
`
      : `
        <activity android:name=".MainActivity" android:exported="true" android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
`;
    const manifestPermissions = hasDevLauncher
      ? `    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />`
      : `    <uses-permission android:name="android.permission.INTERNET" />`;
    const iconPaths = resolveIconPaths(process.cwd(), config);
    const manifestIconAttrs = iconPaths
      ? "        android:icon=\"@mipmap/ic_launcher\"\n        android:roundIcon=\"@mipmap/ic_launcher\"\n"
      : "";
    writeFile(
        path.join(mainDir, "AndroidManifest.xml"),
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

    // Placeholder GeneratedLynxExtensions.kt
    writeFile(
        path.join(kotlinGeneratedDir, "GeneratedLynxExtensions.kt"),
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

    const devServer = config.devServer
      ? {
          host: config.devServer.host ?? "10.0.2.2",
          port: config.devServer.port ?? config.devServer.httpPort ?? 3000,
        }
      : undefined;
    const resolved = resolveHostPaths(process.cwd());
    const vars = { packageName, appName, devMode, devServer, projectRoot: resolved.lynxProjectDir };
    const templateVars = { PACKAGE_NAME: packageName, APP_NAME: appName };
    const hostPkg = findTamerHostPackage(process.cwd());
    const devClientPkg = findDevClientPackage(process.cwd());

    if (!hasDevLauncher && hostPkg) {
      const templateDir = path.join(hostPkg, "android", "templates");
      for (const [src, dst] of [
        ["App.java", path.join(javaDir, "App.java")],
        ["TemplateProvider.java", path.join(javaDir, "TemplateProvider.java")],
        ["MainActivity.kt", path.join(kotlinDir, "MainActivity.kt")],
      ] as [string, string][]) {
        const srcPath = path.join(templateDir, src);
        if (fs.existsSync(srcPath)) {
          writeFile(dst, readAndSubstituteTemplate(srcPath, templateVars));
        }
      }
    } else {
      const [applicationSource, templateProviderSource] = await Promise.all([
        fetchAndPatchApplication(vars),
        fetchAndPatchTemplateProvider(vars),
      ]);
      writeFile(path.join(javaDir, "App.java"), applicationSource);
      writeFile(path.join(javaDir, "TemplateProvider.java"), templateProviderSource);
      writeFile(path.join(kotlinDir, "MainActivity.kt"), getStandaloneMainActivity(vars));
      if (hasDevLauncher) {
        if (devClientPkg) {
          const templateDir = path.join(devClientPkg, "android", "templates");
          for (const [src, dst] of [
            ["ProjectActivity.kt", path.join(kotlinDir, "ProjectActivity.kt")],
            ["DevClientManager.kt", path.join(kotlinDir, "DevClientManager.kt")],
            ["DevServerPrefs.kt", path.join(kotlinDir, "DevServerPrefs.kt")],
          ] as [string, string][]) {
            const srcPath = path.join(templateDir, src);
            if (fs.existsSync(srcPath)) {
              writeFile(dst, readAndSubstituteTemplate(srcPath, templateVars));
            }
          }
        } else {
          writeFile(path.join(kotlinDir, "ProjectActivity.kt"), getProjectActivity(vars));
          const devClientManagerSource = getDevClientManager(vars);
          if (devClientManagerSource) {
            writeFile(path.join(kotlinDir, "DevClientManager.kt"), devClientManagerSource);
            writeFile(path.join(kotlinDir, "DevServerPrefs.kt"), getDevServerPrefs(vars));
          }
        }
      }
    }

    if (iconPaths) {
      const resDir = path.join(mainDir, "res");
      if (iconPaths.android) {
        const src = iconPaths.android;
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const e of entries) {
          const dest = path.join(resDir, e.name);
          if (e.isDirectory()) {
            fs.cpSync(path.join(src, e.name), dest, { recursive: true });
          } else {
            fs.mkdirSync(resDir, { recursive: true });
            fs.copyFileSync(path.join(src, e.name), dest);
          }
        }
        console.log("✅ Copied Android icon from tamer.config.json icon.android");
      } else if (iconPaths.source) {
        const mipmapDensities = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
        for (const d of mipmapDensities) {
          const dir = path.join(resDir, `mipmap-${d}`);
          fs.mkdirSync(dir, { recursive: true });
          fs.copyFileSync(iconPaths.source, path.join(dir, "ic_launcher.png"));
        }
        console.log("✅ Copied app icon from tamer.config.json icon.source");
      }
    }

    // Create an empty assets directory so the project builds correctly
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, ".gitkeep"), "");

    console.log(`✅ Android Kotlin project created at ${rootDir}`);

    async function finalizeProjectSetup() {
        if (androidSdk) {
            try {
                const sdkDirContent = `sdk.dir=${androidSdk.replace(/\\/g, "/")}`;
                writeFile(path.join(rootDir, "local.properties"), sdkDirContent);
                console.log("📦 Created local.properties from tamer.config.json.");
            } catch (err: any) {
                console.error(`❌ Failed to create local.properties: ${err.message}`);
            }
        } else {
            const localPropsPath = path.join(process.cwd(), "local.properties");
            if (fs.existsSync(localPropsPath)) {
                try {
                    fs.copyFileSync(localPropsPath, path.join(rootDir, "local.properties"));
                    console.log("📦 Copied existing local.properties to the android project.");
                } catch (err) {
                    console.error("❌ Failed to copy local.properties:", err);
                }
            } else {
                console.warn(
                    "⚠️ `android.sdk` not found in tamer.config.json. You may need to create local.properties manually."
                );
            }
        }

        // The Gradle wrapper setup logic is now handled by the imported function
        await setupGradleWrapper(rootDir, gradleVersion);
    }

    await finalizeProjectSetup();
    if (target === "dev-app") process.chdir(origCwd);
};
export default create;