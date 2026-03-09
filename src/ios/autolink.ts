import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { loadExtensionConfig, hasExtensionConfig, type NormalizedExtensionConfig } from '../common/config';
import { resolveHostPaths } from '../common/hostConfig';

const autolink = () => {
    interface DiscoveredPackage {
        name: string;
        config: NormalizedExtensionConfig;
        packagePath: string;
    }

    let resolved: ReturnType<typeof resolveHostPaths>;
    try {
        resolved = resolveHostPaths();
    } catch (error: any) {
        console.error(`❌ Error loading configuration: ${error.message}`);
        process.exit(1);
    }

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
    const iosProjectPath = resolved.iosDir;

    // --- Core Logic ---

    function updateGeneratedSection(filePath: string, newContent: string, startMarker: string, endMarker: string): void {
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ File not found, skipping update: ${filePath}`);
            return;
        }

        let fileContent = fs.readFileSync(filePath, 'utf8');
        const escapedStartMarker = startMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedEndMarker = endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const regex = new RegExp(`${escapedStartMarker}[\\s\\S]*?${escapedEndMarker}`, 'g');
        const replacementBlock = `${startMarker}\n${newContent}\n${endMarker}`;

        if (regex.test(fileContent)) {
            // Remove all existing generated blocks first to avoid creating duplicates,
            // then insert a single replacement at the position of the first found start marker.
            const firstStartIdx = fileContent.indexOf(startMarker);
            // Remove all occurrences
            fileContent = fileContent.replace(regex, '');

            if (firstStartIdx !== -1) {
                const before = fileContent.slice(0, firstStartIdx);
                const after = fileContent.slice(firstStartIdx);
                fileContent = `${before}${replacementBlock}${after}`;
            } else {
                // Fallback: append at end
                fileContent += `\n${replacementBlock}\n`;
            }
        } else {
            // If markers aren't present at all — append at end and warn so user can add markers to control placement.
            console.warn(`⚠️ Could not find autolink markers in ${path.basename(filePath)}. Appending to the end of the file.`);
            fileContent += `\n${replacementBlock}\n`;
        }

        fs.writeFileSync(filePath, fileContent, 'utf8');
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
                if (config?.ios) {
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

    function updatePodfile(packages: DiscoveredPackage[]): void {
        const podfilePath = path.join(iosProjectPath, 'Podfile');
        let scriptContent = `  # This section is automatically generated by Tamer4Lynx.\n  # Manual edits will be overwritten.`;

        const iosPackages = packages.filter(p => p.config.ios);

        if (iosPackages.length > 0) {
            iosPackages.forEach(pkg => {
                const podspecPath = pkg.config.ios?.podspecPath || '.';
                const relativePath = path.relative(iosProjectPath, path.join(pkg.packagePath, podspecPath));
                scriptContent += `\n  pod '${pkg.name}', :path => '${relativePath}'`;
            });
        } else {
            scriptContent += `\n  # No native modules found by Tamer4Lynx autolinker.`;
        }

        updateGeneratedSection(podfilePath, scriptContent.trim(), '# GENERATED AUTOLINK DEPENDENCIES START', '# GENERATED AUTOLINK DEPENDENCIES END');
    }

    /**
     * Update LynxInitProcessor.swift with module registrations.
     * Emits runtime-safe registrations using NSClassFromString to avoid compile-time
     * dependency issues when modules are provided by CocoaPods.
     */
    function updateLynxInitProcessor(packages: DiscoveredPackage[]): void {
        const appNameFromConfig = resolved.config.ios?.appName;
        const candidatePaths: string[] = [];
        if (appNameFromConfig) {
            candidatePaths.push(path.join(iosProjectPath, appNameFromConfig, 'LynxInitProcessor.swift'));
        }
        candidatePaths.push(path.join(iosProjectPath, 'LynxInitProcessor.swift'));

        const found = candidatePaths.find(p => fs.existsSync(p));
        const lynxInitPath: string = (found ?? candidatePaths[0]) as string;

        const iosPackages = packages.filter(p => p.config.ios?.moduleClassName);

        // --- Generate import statements for discovered native packages ---
        function updateImportsSection(filePath: string, pkgs: DiscoveredPackage[]) {
            const startMarker = '// GENERATED IMPORTS START';
            const endMarker = '// GENERATED IMPORTS END';

            if (pkgs.length === 0) {
                const placeholder = '// No native imports found by Tamer4Lynx autolinker.';
                // If markers exist, replace the block, otherwise try to insert after existing imports
                updateGeneratedSection(filePath, placeholder, startMarker, endMarker);
                return;
            }

            const imports = pkgs.map(pkg => {
                // Use the last path segment as the Swift module name (handle scoped packages)
                const raw = pkg.name.split('/').pop() || pkg.name;
                const moduleName = raw.replace(/[^A-Za-z0-9_]/g, '_');
                return `import ${moduleName}`;
            }).join('\n');

            // If the file already contains markers, let updateGeneratedSection handle replacement.
            const fileContent = fs.readFileSync(filePath, 'utf8');
            if (fileContent.indexOf(startMarker) !== -1) {
                updateGeneratedSection(filePath, imports, startMarker, endMarker);
                return;
            }

            // Otherwise insert the generated imports after the last existing import statement (if any),
            // or after `import Foundation` specifically, or at the top as a fallback.
            const importRegex = /^(import\s+[^\r\n]+)\r?\n/gm;
            let match: RegExpExecArray | null = null;
            let lastMatchEnd = -1;
            while ((match = importRegex.exec(fileContent)) !== null) {
                lastMatchEnd = importRegex.lastIndex;
            }

            const block = `${startMarker}\n${imports}\n${endMarker}`;
            let newContent: string;

            if (lastMatchEnd !== -1) {
                const before = fileContent.slice(0, lastMatchEnd);
                const after = fileContent.slice(lastMatchEnd);
                newContent = `${before}\n${block}\n${after}`;
            } else {
                const foundationIdx = fileContent.indexOf('import Foundation');
                if (foundationIdx !== -1) {
                    const lineEnd = fileContent.indexOf('\n', foundationIdx);
                    const insertPos = lineEnd !== -1 ? lineEnd + 1 : foundationIdx + 'import Foundation'.length;
                    const before = fileContent.slice(0, insertPos);
                    const after = fileContent.slice(insertPos);
                    newContent = `${before}\n${block}\n${after}`;
                } else {
                    // Prepend at top
                    newContent = `${block}\n\n${fileContent}`;
                }
            }

            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`✅ Updated imports in ${path.basename(filePath)}`);
        }

        // Update imports first so registration lines can reference imported modules if needed
        updateImportsSection(lynxInitPath, iosPackages);

        if (iosPackages.length === 0) {
            const placeholder = '        // No native modules found by Tamer4Lynx autolinker.';
            updateGeneratedSection(lynxInitPath, placeholder, '// GENERATED AUTOLINK START', '// GENERATED AUTOLINK END');
            return;
        }

        const blocks = iosPackages.map((pkg) => {
            const classNameRaw = pkg.config.ios!.moduleClassName;

            return [
                `        // Register module from package: ${pkg.name}`,
                `        globalConfig.register(${classNameRaw}.self)`,
            ].join('\n');
        });

        const content = blocks.join('\n\n');
        updateGeneratedSection(lynxInitPath, content, '// GENERATED AUTOLINK START', '// GENERATED AUTOLINK END');
    }

    // --- Pod install helper ---
    function runPodInstall(forcePath?: string) {
        const podfilePath = forcePath ?? path.join(iosProjectPath, 'Podfile');
        if (!fs.existsSync(podfilePath)) {
            console.log('ℹ️ No Podfile found in ios directory; skipping `pod install`.');
            return;
        }

        const cwd = path.dirname(podfilePath);
        try {
            console.log(`ℹ️ Running ` + '`pod install`' + ` in ${cwd}...`);
            execSync('pod install', { cwd, stdio: 'inherit' });
            console.log('✅ `pod install` completed successfully.');
        } catch (e: any) {
            console.warn(`⚠️ 'pod install' failed: ${e.message}`);
            console.log('⚠️ You can run `pod install` manually in the ios directory.');
        }
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

        updatePodfile(packages);
        updateLynxInitProcessor(packages);

        const appNameFromConfig = resolved.config.ios?.appName;
        if (appNameFromConfig) {
            const appPodfile = path.join(iosProjectPath, appNameFromConfig, 'Podfile');
            if (fs.existsSync(appPodfile)) {
                runPodInstall(appPodfile);
                console.log('✨ Autolinking complete for iOS.');
                return;
            }
        }

        runPodInstall();
        console.log('✨ Autolinking complete for iOS.');
    }

    run();
}

export default autolink;