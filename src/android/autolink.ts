import fs from 'fs';
import path from 'path';
import { loadExtensionConfig, hasExtensionConfig, type NormalizedExtensionConfig } from '../common/config';
import { resolveHostPaths } from '../common/hostConfig';
import { getLynxExplorerInputSource } from './coreElements';

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

        const modulePackages = packages.filter(p => p.config.android?.moduleClassName);
        const elementPackages = packages.filter(p => p.config.android?.elements && Object.keys(p.config.android.elements).length > 0)
            .map(p => ({
                ...p,
                config: {
                    ...p.config,
                    android: {
                        ...p.config.android,
                        elements: Object.fromEntries(
                            Object.entries(p.config.android!.elements!).filter(([tag]) => tag !== 'explorer-input' && tag !== 'input')
                        ),
                    },
                },
            }))
            .filter(p => Object.keys(p.config.android?.elements ?? {}).length > 0);

        const builtinElementImport = `import ${projectPackage}.core.LynxExplorerInput`;
        const builtinElementRegistration = `        LynxEnv.inst().addBehavior(object : com.lynx.tasm.behavior.Behavior("input") {
            override fun createUI(context: com.lynx.tasm.behavior.LynxContext): com.lynx.tasm.behavior.ui.LynxUI<*> {
                return LynxExplorerInput(context)
            }
        })
        LynxEnv.inst().addBehavior(object : com.lynx.tasm.behavior.Behavior("explorer-input") {
            override fun createUI(context: com.lynx.tasm.behavior.LynxContext): com.lynx.tasm.behavior.ui.LynxUI<*> {
                return LynxExplorerInput(context)
            }
        })`;

        const moduleImports = modulePackages
            .map(p => `import ${p.config.android!.moduleClassName}`)
            .join('\n');

        const elementImports = elementPackages.flatMap(p =>
            Object.values(p.config.android!.elements!).map(cls => `import ${cls}`)
        ).filter((v, i, a) => a.indexOf(v) === i).join('\n');

        const moduleRegistrations = modulePackages
            .map(p => {
                const fullClassName = p.config.android!.moduleClassName!;
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

        const allRegistrations = [moduleRegistrations, behaviorRegistrations, builtinElementRegistration].filter(Boolean).join('\n');

        const kotlinContent = `package ${projectPackage}.generated

import android.content.Context
import com.lynx.tasm.LynxEnv
${builtinElementImport}
${moduleImports}
${elementImports}

/**
 * This file is generated by the Tamer4Lynx autolinker.
 * Do not edit this file manually.
 */
object GeneratedLynxExtensions {
    fun register(context: Context) {
${allRegistrations}
    }
}
`;
        // Ensure the `generated` directory exists before writing the file
        fs.mkdirSync(generatedDir, { recursive: true });
        fs.writeFileSync(kotlinExtensionsPath, kotlinContent.trimStart());
        console.log(`✅ Generated Kotlin extensions at ${kotlinExtensionsPath}`);
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

        const coreDir = path.join(appAndroidPath, 'app', 'src', 'main', 'kotlin', packageName.replace(/\./g, '/'), 'core');
        fs.mkdirSync(coreDir, { recursive: true });
        fs.writeFileSync(path.join(coreDir, 'LynxExplorerInput.kt'), getLynxExplorerInputSource(packageName));
        for (const name of ['ScreenElement', 'SafeAreaElement', 'AvoidKeyboardElement', 'AppBarElement']) {
            const p = path.join(coreDir, `${name}.kt`);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        console.log('✅ Synced built-in element (explorer-input)');

        generateKotlinExtensionsFile(packages, packageName);

        syncManifestPermissions(packages);

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