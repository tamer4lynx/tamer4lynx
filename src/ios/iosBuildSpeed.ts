import fs from 'fs';

/**
 * Podfile `post_install` fragment: applied to every CocoaPods target for each build configuration.
 * - Debug: `COMPILER_INDEX_STORE_ENABLE = NO` — skips per-build index store writes (faster repeat compiles; Xcode still indexes in the background).
 * - Optional ccache: run `TAMER_CCACHE=1 pod install` (or `USE_CCACHE=1`) after `brew install ccache` to cache C/C++/ObjC compiles across clean builds (all pods, not only PrimJS).
 */
export const PODFILE_POST_INSTALL_BUILD_SPEED_RUBY = [
    '        # TAMER_BUILD_SPEED_START',
    '        if config.name == \'Debug\'',
    '          config.build_settings[\'COMPILER_INDEX_STORE_ENABLE\'] = \'NO\'',
    '        end',
    '        if ENV[\'TAMER_CCACHE\'] == \'1\' || ENV[\'USE_CCACHE\'] == \'1\'',
    '          ccache_bin = `which ccache`.strip',
    '          unless ccache_bin.empty?',
    '            clang_bin = `xcrun -f clang`.strip',
    '            clangxx_bin = `xcrun -f clang++`.strip',
    '            clang_bin = \'clang\' if clang_bin.empty?',
    '            clangxx_bin = \'clang++\' if clangxx_bin.empty?',
    '            if config.name == \'Debug\'',
    '              config.build_settings[\'CC\'] = "#{ccache_bin} #{clang_bin}"',
    '              config.build_settings[\'CXX\'] = "#{ccache_bin} #{clangxx_bin}"',
    '            end',
    '          end',
    '        end',
    '        # TAMER_BUILD_SPEED_END',
].join('\n');

const PBXPROJ_DEBUG_SPEED_FROM_TO: [string, string] = [
    '\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-Onone";\n\t\t\t};',
    '\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-Onone";\n\t\t\t\tCOMPILER_INDEX_STORE_ENABLE = NO;\n\t\t\t\tSWIFT_COMPILATION_MODE = incremental;\n\t\t\t};',
];

/**
 * Injects Debug build-speed flags into the app/project `project.pbxproj` (project-level Debug config).
 * No-op if already present or if the expected Debug block shape is not found.
 */
export function patchPbxprojProjectDebugBuildSpeed(pbxprojPath: string): boolean {
    if (!fs.existsSync(pbxprojPath)) return false;
    let c = fs.readFileSync(pbxprojPath, 'utf8');
    if (c.includes('COMPILER_INDEX_STORE_ENABLE')) return false;
    const [from, to] = PBXPROJ_DEBUG_SPEED_FROM_TO;
    if (c.includes(from)) {
        c = c.replace(from, to);
        fs.writeFileSync(pbxprojPath, c, 'utf8');
        return true;
    }
    return false;
}
