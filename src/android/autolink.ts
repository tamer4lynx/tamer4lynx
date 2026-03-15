import fs from 'fs';
import path from 'path';
import { loadExtensionConfig, hasExtensionConfig, getAndroidModuleClassNames, type NormalizedExtensionConfig } from '../common/config';
import { resolveHostPaths, type DeepLinkConfig } from '../common/hostConfig';

const autolink = () => {
    interface DiscoveredPackage {
        name: string;
        config: NormalizedExtensionConfig;
        packagePath: string;
    }

    let resolved: ReturnType<typeof resolveHostPaths>;
    try {
        resolved = resolveHostPaths();
        if (!resolved.config.android?.packageName) {
            throw new Error('"android.packageName" must be defined in tamer.config.json');
        }
    } catch (error: any) {
        console.error(`❌ Error loading configuration: ${error.message}`);
        process.exit(1);
    }

    const { androidDir: appAndroidPath, config } = resolved;
    const packageName = config.android!.packageName!;
    const projectRoot = resolved.projectRoot;
    let nodeModulesPath = path.join(projectRoot, 'node_modules');
    const workspaceRoot = path.join(projectRoot, '..', '..');
    const rootNodeModules = path.join(workspaceRoot, 'node_modules');
    if (fs.existsSync(path.join(workspaceRoot, 'package.json')) && fs.existsSync(rootNodeModules) && path.basename(path.dirname(projectRoot)) === 'packages') {
        nodeModulesPath = rootNodeModules;
    } else if (!fs.existsSync(nodeModulesPath)) {
        const altRoot = path.join(projectRoot, '..', '..');
        const altNodeModules = path.join(altRoot, 'node_modules');
        if (fs.existsSync(path.join(altRoot, 'package.json')) && fs.existsSync(altNodeModules)) {
            nodeModulesPath = altNodeModules;
        }
    }

    // --- Core Logic ---

    /**
     * Replaces the content of a file between specified start and end markers.
     * @param filePath The path to the file to update.
     * @param newContent The new content to insert between the markers.
     * @param startMarker The starting delimiter.
     * @param endMarker The ending delimiter.
     */
    function updateGeneratedSection(filePath: string, newContent: string, startMarker: string, endMarker: string): void {
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ File not found, skipping update: ${filePath}`);
            return;
        }

        let fileContent = fs.readFileSync(filePath, 'utf8');
        // Escape special characters in markers for RegExp
        const escapedStartMarker = startMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedEndMarker = endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const regex = new RegExp(`${escapedStartMarker}[\\s\\S]*?${escapedEndMarker}`, 'g');
        const replacementBlock = `${startMarker}\n${newContent}\n${endMarker}`;

        if (regex.test(fileContent)) {
            fileContent = fileContent.replace(regex, replacementBlock);
        } else {
            console.warn(`⚠️ Could not find autolink markers in ${path.basename(filePath)}. Appending to the end of the file.`);
            fileContent += `\n${replacementBlock}\n`;
        }

        fs.writeFileSync(filePath, fileContent);
        console.log(`✅ Updated autolinked section in ${path.basename(filePath)}`);
    }

    function findExtensionPackages(): DiscoveredPackage[] {
        const packages: DiscoveredPackage[] = [];
        if (!fs.existsSync(nodeModulesPath)) {
            console.warn('⚠️ node_modules directory not found. Skipping autolinking.');
            return [];
        }

        const packageDirs = fs.readdirSync(nodeModulesPath);

        for (const dirName of packageDirs) {
            const fullPath = path.join(nodeModulesPath, dirName);
            const checkPackage = (name: string, packagePath: string) => {
                if (!hasExtensionConfig(packagePath)) return;
                const config = loadExtensionConfig(packagePath);
                if (config?.android) {
                    packages.push({ name, config, packagePath });
                }
            };

            if (dirName.startsWith('@')) {
                try {
                    const scopedDirs = fs.readdirSync(fullPath);
                    for (const scopedDirName of scopedDirs) {
                        const scopedPackagePath = path.join(fullPath, scopedDirName);
                        checkPackage(`${dirName}/${scopedDirName}`, scopedPackagePath);
                    }
                } catch (e: any) {
                    console.warn(`⚠️ Could not read scoped package directory ${fullPath}: ${e.message}`);
                }
            } else {
                checkPackage(dirName, fullPath);
            }
        }

        return packages;
    }

    /**
     * Generates the Gradle settings script content and updates settings.gradle.kts.
     * @param packages The list of discovered native packages.
     */
    function updateSettingsGradle(packages: DiscoveredPackage[]): void {
        const settingsFilePath = path.join(appAndroidPath, 'settings.gradle.kts');
        let scriptContent = `// This section is automatically generated by Tamer4Lynx.\n// Manual edits will be overwritten.`;

        const androidPackages = packages.filter(p => p.config.android);

        if (androidPackages.length > 0) {
            androidPackages.forEach(pkg => {
                // Sanitize package name for Gradle: @org/name -> org_name
                const gradleProjectName = pkg.name.replace(/^@/, '').replace(/\//g, '_');
                const sourceDir = pkg.config.android?.sourceDir || 'android';
                // Use forward slashes for Gradle paths, even on Windows
                const projectPath = path.join(pkg.packagePath, sourceDir).replace(/\\/g, '/');
                const relativePath = path.relative(appAndroidPath, projectPath).replace(/\\/g, '/');

                scriptContent += `\ninclude(":${gradleProjectName}")`;
                scriptContent += `\nproject(":${gradleProjectName}").projectDir = file("${relativePath}")`;
            });
        } else {
            scriptContent += `\nprintln("No native modules found by Tamer4Lynx autolinker.")`;
        }

        updateGeneratedSection(settingsFilePath, scriptContent.trim(), '// GENERATED AUTOLINK START', '// GENERATED AUTOLINK END');
    }

    /**
     * Generates the app-level dependencies and updates app/build.gradle.kts.
     * @param packages The list of discovered native packages.
     */
    function updateAppBuildGradle(packages: DiscoveredPackage[]) {
        const appBuildGradlePath = path.join(appAndroidPath, 'app', 'build.gradle.kts');
        const androidPackages = packages.filter(p => p.config.android);

        const implementationLines = androidPackages
            .map(p => {
                // Sanitize package name for Gradle: @org/name -> org_name
                const gradleProjectName = p.name.replace(/^@/, '').replace(/\//g, '_');
                return `    implementation(project(":${gradleProjectName}"))`;
            })
            .join('\n');

        const scriptContent = `// This section is automatically generated by Tamer4Lynx.\n    // Manual edits will be overwritten.\n${implementationLines || '    // No native dependencies found to link.'}`;

        updateGeneratedSection(
            appBuildGradlePath,
            scriptContent,
            '// GENERATED AUTOLINK DEPENDENCIES START',
            '// GENERATED AUTOLINK DEPENDENCIES END'
        );
    }

    /**
     * Generates a self-contained GeneratedLynxExtensions.kt file with all necessary imports and registrations.
     * @param packages The list of discovered native packages.
     * @param projectPackage The package name of the main Android app, from tamer.config.json.
     */
    function generateKotlinExtensionsFile(packages: DiscoveredPackage[], projectPackage: string): void {
        const packagePath = projectPackage.replace(/\./g, '/');
        const generatedDir = path.join(appAndroidPath, 'app', 'src', 'main', 'kotlin', packagePath, 'generated');
        const kotlinExtensionsPath = path.join(generatedDir, 'GeneratedLynxExtensions.kt');

        const modulePackages = packages.filter(p => getAndroidModuleClassNames(p.config.android).length > 0);
        const elementPackages = packages.filter(p => p.config.android?.elements && Object.keys(p.config.android.elements).length > 0);

        const allModuleClasses = modulePackages.flatMap(p => getAndroidModuleClassNames(p.config.android));
        const moduleImports = allModuleClasses.map(c => `import ${c}`).join('\n');

        const elementImports = elementPackages.flatMap(p =>
            Object.values(p.config.android!.elements!).map(cls => `import ${cls}`)
        ).filter((v, i, a) => a.indexOf(v) === i).join('\n');

        const moduleRegistrations = allModuleClasses
            .map(fullClassName => {
                const simpleClassName = fullClassName.split('.').pop()!;
                return `        LynxEnv.inst().registerModule("${simpleClassName}", ${simpleClassName}::class.java)`;
            })
            .join('\n');

        const behaviorRegistrations = elementPackages.flatMap(p =>
            Object.entries(p.config.android!.elements!).map(([tag, fullClassName]) => {
                const simpleClassName = fullClassName.split('.').pop()!;
                return `        LynxEnv.inst().addBehavior(object : com.lynx.tasm.behavior.Behavior("${tag}") {
            override fun createUI(context: com.lynx.tasm.behavior.LynxContext): com.lynx.tasm.behavior.ui.LynxUI<*> {
                return ${simpleClassName}(context)
            }
        })`;
            })
        ).join('\n');

        const allRegistrations = [moduleRegistrations, behaviorRegistrations].filter(Boolean).join('\n');

        const hostViewPackages = modulePackages.filter(p => p.config.android?.attachHostView);
        const hostViewLines = hostViewPackages.flatMap(p =>
            getAndroidModuleClassNames(p.config.android).map(fullClassName => {
                const simpleClassName = fullClassName.split('.').pop()!;
                return `        ${simpleClassName}.attachHostView(view)`;
            })
        ).join('\n');
        const hostViewMethod = hostViewPackages.length > 0
            ? `\n    fun onHostViewChanged(view: android.view.View?) {\n${hostViewLines}\n    }`
            : '';

        const kotlinContent = `package ${projectPackage}.generated

import android.content.Context
import com.lynx.tasm.LynxEnv
${moduleImports}
${elementImports}

/**
 * This file is generated by the Tamer4Lynx autolinker.
 * Do not edit this file manually.
 */
object GeneratedLynxExtensions {
    fun register(context: Context) {
${allRegistrations}
    }${hostViewMethod}
}
`;
        // Ensure the `generated` directory exists before writing the file
        fs.mkdirSync(generatedDir, { recursive: true });
        fs.writeFileSync(kotlinExtensionsPath, kotlinContent.trimStart());
        console.log(`✅ Generated Kotlin extensions at ${kotlinExtensionsPath}`);
    }


    /**
     * Generates GeneratedActivityLifecycle.kt by collecting activityPatches from all packages.
     */
    function generateActivityLifecycleFile(packages: DiscoveredPackage[], projectPackage: string): void {
        const packageKotlinPath = projectPackage.replace(/\./g, '/');
        const generatedDir = path.join(appAndroidPath, 'app', 'src', 'main', 'kotlin', packageKotlinPath, 'generated');
        const outputPath = path.join(generatedDir, 'GeneratedActivityLifecycle.kt');

        const hooks = {
            onCreate: [] as string[],
            onNewIntent: [] as string[],
            onResume: [] as string[],
            onPause: [] as string[],
            onDestroy: [] as string[],
            onViewAttached: [] as string[],
            onViewDetached: [] as string[],
            onBackPressed: [] as string[],
            onWindowFocusChanged: [] as string[],
            onCreateDelayed: [] as string[],
        };

        for (const pkg of packages) {
            const patches = pkg.config.android?.activityPatches;
            if (!patches) continue;
            for (const [hook, call] of Object.entries(patches)) {
                if (hook in hooks) (hooks as Record<string, string[]>)[hook]!.push(call);
            }
        }

        const bodyLines = (arr: string[]) =>
            arr.length > 0
                ? arr.map(c => `        ${c}`).join('\n')
                : '        // no patches';

        const backPressedBody = hooks.onBackPressed.length > 0
            ? hooks.onBackPressed.map(c => `        ${c}(fallback)`).join('\n')
            : '        fallback(false)';

        const windowFocusBody = hooks.onWindowFocusChanged.length > 0
            ? `        if (hasFocus) {\n${hooks.onWindowFocusChanged.map(c => `            ${c}`).join('\n')}\n        }`
            : '        // no patches';

        const createDelayedBody = hooks.onCreateDelayed.length > 0
            ? `        listOf(150L, 400L, 800L).forEach { delay ->\n            handler.postDelayed({\n${hooks.onCreateDelayed.map(c => `                ${c}`).join('\n')}\n            }, delay)\n        }`
            : '        // no patches';

        const kotlinContent = `package ${projectPackage}.generated

import android.content.Intent
import com.lynx.tasm.LynxView

/**
 * This file is generated by the Tamer4Lynx autolinker.
 * Do not edit this file manually.
 */
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
        fs.mkdirSync(generatedDir, { recursive: true });
        fs.writeFileSync(outputPath, kotlinContent);
        console.log(`✅ Generated activity lifecycle patches at ${outputPath}`);
    }

    /**
     * Merges deep link intent filters from the host tamer.config.json into AndroidManifest.xml
     * between <!-- GENERATED DEEP LINKS START --> and <!-- GENERATED DEEP LINKS END --> markers.
     */
    function syncDeepLinkIntentFilters(): void {
        const deepLinks = config.android?.deepLinks;
        if (!deepLinks || deepLinks.length === 0) return;

        const manifestPath = path.join(appAndroidPath, 'app', 'src', 'main', 'AndroidManifest.xml');
        if (!fs.existsSync(manifestPath)) return;

        const intentFilters = deepLinks.map((link: DeepLinkConfig) => {
            const dataAttrs = [
                `android:scheme="${link.scheme}"`,
                link.host ? `android:host="${link.host}"` : '',
                link.pathPrefix ? `android:pathPrefix="${link.pathPrefix}"` : '',
            ].filter(Boolean).join(' ');
            return `        <intent-filter>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data ${dataAttrs} />
        </intent-filter>`;
        }).join('\n');

        updateGeneratedSection(
            manifestPath,
            intentFilters,
            '        <!-- GENERATED DEEP LINKS START -->',
            '        <!-- GENERATED DEEP LINKS END -->'
        );
    }

    // --- Main Execution ---

    function run() {
        console.log('🔎 Finding Lynx extension packages (lynx.ext.json / tamer.json)...');
        const packages = findExtensionPackages();

        if (packages.length > 0) {
            console.log(`Found ${packages.length} package(s): ${packages.map(p => p.name).join(', ')}`);
        } else {
            console.log('ℹ️ No Tamer4Lynx native packages found.');
        }

        updateSettingsGradle(packages);
        updateAppBuildGradle(packages);

        generateKotlinExtensionsFile(packages, packageName);
        generateActivityLifecycleFile(packages, packageName);

        syncManifestPermissions(packages);
        syncDeepLinkIntentFilters();

        console.log('✨ Autolinking complete.');
    }

    function syncManifestPermissions(packages: DiscoveredPackage[]): void {
        const manifestPath = path.join(appAndroidPath, 'app', 'src', 'main', 'AndroidManifest.xml');
        if (!fs.existsSync(manifestPath)) return;

        const allPermissions = new Set<string>();
        for (const pkg of packages) {
            const perms = pkg.config.android?.permissions;
            if (Array.isArray(perms)) {
                for (const p of perms) {
                    const name = p.startsWith('android.permission.') ? p : `android.permission.${p}`;
                    allPermissions.add(name);
                }
            }
        }
        if (allPermissions.size === 0) return;

        let manifest = fs.readFileSync(manifestPath, 'utf8');
        const existingMatch = [...manifest.matchAll(/<uses-permission android:name="(android\.permission\.\w+)"\s*\/>/g)];
        const existing = new Set(existingMatch.map((m) => m[1]));
        const toAdd = [...allPermissions].filter((p) => !existing.has(p));
        if (toAdd.length === 0) return;

        const newLines = toAdd.map((p) => `    <uses-permission android:name="${p}" />`).join('\n');
        manifest = manifest.replace(
            /(\s*)(<application)/,
            `${newLines}\n$1$2`
        );
        fs.writeFileSync(manifestPath, manifest);
        console.log(`✅ Synced manifest permissions: ${toAdd.map((p) => p.split('.').pop()).join(', ')}`);
    }

    run();
}
export default autolink;