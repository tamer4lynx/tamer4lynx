/**
 * Apple Silicon Mac run path inspired by PlayCover’s installer: thin fat binaries to arm64,
 * rewrite LC_BUILD_VERSION to maccatalyst via Xcode’s `vtool`, patch Swift UIKit @rpath if needed,
 * then ad-hoc sign each Mach-O. Implemented with public CLI tools only (no PlayCover source).
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const MH_MAGIC_64 = 0xfeedfacf;
const MH_CIGAM_64 = 0xcffaedfe;
const FAT_MAGIC = 0xcafebabe;
const FAT_MAGIC_64 = 0xcafebabf;

function run(cmd: string): string {
    return execSync(cmd, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
}

function vtoolBin(): string {
    try {
        return run('xcrun --find vtool');
    } catch {
        return 'vtool';
    }
}

function lipoBin(): string {
    try {
        return run('xcrun --find lipo');
    } catch {
        return 'lipo';
    }
}

function isMachOMagic(buf: Buffer): boolean {
    if (buf.length < 4) return false;
    const be = buf.readUInt32BE(0);
    const le = buf.readUInt32LE(0);
    return (
        be === MH_MAGIC_64 ||
        le === MH_MAGIC_64 ||
        be === MH_CIGAM_64 ||
        le === MH_CIGAM_64 ||
        be === FAT_MAGIC ||
        le === FAT_MAGIC ||
        be === FAT_MAGIC_64 ||
        le === FAT_MAGIC_64
    );
}

function isMachOFile(filePath: string): boolean {
    try {
        const st = fs.statSync(filePath);
        if (!st.isFile() || st.size < 4) return false;
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(4);
        fs.readSync(fd, buf, 0, 4, 0);
        fs.closeSync(fd);
        return isMachOMagic(buf);
    } catch {
        return false;
    }
}

function collectMachOBinaries(root: string): string[] {
    const out: string[] = [];
    function walk(dir: string) {
        let names: string[];
        try {
            names = fs.readdirSync(dir);
        } catch {
            return;
        }
        for (const name of names) {
            if (name === '_CodeSignature') continue;
            const p = path.join(dir, name);
            let st: fs.Stats;
            try {
                st = fs.statSync(p);
            } catch {
                continue;
            }
            if (st.isDirectory()) {
                walk(p);
            } else if (st.isFile() && st.size > 4) {
                const ext = path.extname(name);
                if (ext && ext !== '.dylib' && ext !== '.so') continue;
                if (isMachOFile(p)) out.push(p);
            }
        }
    }
    walk(root);
    return out;
}

function parseVtoolBuild(binaryPath: string): { minos: string; sdk: string } | null {
    const vt = vtoolBin();
    let out: string;
    try {
        out = execSync(`"${vt}" -show-build "${binaryPath}"`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        });
    } catch {
        return null;
    }
    const minM = out.match(/minos\s+([\d.]+)/i);
    const sdkM = out.match(/\bsdk\s+([\d.]+)/i);
    if (!minM || !sdkM) return null;
    return { minos: minM[1], sdk: sdkM[1] };
}

function thinArm64IfNeeded(binaryPath: string): void {
    const lip = lipoBin();
    let info: string;
    try {
        info = execSync(`"${lip}" -info "${binaryPath}"`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
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
    const tmp = path.join(os.tmpdir(), `t4l-lipo-${Date.now()}-${path.basename(binaryPath)}`);
    execSync(`"${lip}" -thin arm64 "${binaryPath}" -output "${tmp}"`, { stdio: 'inherit' });
    fs.renameSync(tmp, binaryPath);
}

function patchSwiftUIKitIfNeeded(binaryPath: string): void {
    let otool: string;
    try {
        otool = execSync(`otool -L "${binaryPath}"`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        });
    } catch {
        return;
    }
    const from = '@rpath/libswiftUIKit.dylib';
    const to = '/System/iOSSupport/usr/lib/swift/libswiftUIKit.dylib';
    if (!otool.includes(from)) return;
    execSync(`install_name_tool -change "${from}" "${to}" "${binaryPath}"`, { stdio: 'inherit' });
}

function convertToMacCatalyst(binaryPath: string, minos: string, sdk: string): void {
    const vt = vtoolBin();
    const tmp = `${binaryPath}.vtool-tmp`;
    execSync(
        `"${vt}" -set-build-version maccatalyst ${minos} ${sdk} -replace -output "${tmp}" "${binaryPath}"`,
        { stdio: 'inherit' }
    );
    fs.renameSync(tmp, binaryPath);
}

function adhocSignMachO(binaryPath: string): void {
    execSync(`codesign -f -s - "${binaryPath}"`, { stdio: 'inherit' });
}

/**
 * Prepare an iphoneos .app for running on Apple Silicon macOS using the same Mach-O approach as
 * PlayCover: thin to arm64, set LC_BUILD_VERSION platform to maccatalyst via vtool, patch Swift
 * UIKit rpath, ad-hoc sign each Mach-O, strip quarantine. Caller should then apply a full
 * codesign pass (development identity) on the .app bundle.
 */
export function prepareMacIosBundleLikePlayCover(appPath: string): void {
    if (process.platform !== 'darwin' || process.arch !== 'arm64') {
        throw new Error('prepareMacIosBundleLikePlayCover requires Apple Silicon macOS');
    }

    const mainPlist = path.join(appPath, 'Info.plist');
    if (!fs.existsSync(mainPlist)) {
        throw new Error(`Missing Info.plist in ${appPath}`);
    }
    let mainExeName: string;
    try {
        mainExeName = execSync(`/usr/libexec/PlistBuddy -c "Print :CFBundleExecutable" "${mainPlist}"`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
    } catch {
        throw new Error('Could not read CFBundleExecutable from Info.plist');
    }
    const mainExe = path.join(appPath, mainExeName);
    if (!fs.existsSync(mainExe)) {
        throw new Error(`Main executable not found: ${mainExe}`);
    }

    const ver = parseVtoolBuild(mainExe);
    if (!ver) {
        throw new Error(
            `Could not read Mach-O build version from ${mainExe}. Is this an iphoneos binary?`
        );
    }

    const mp = path.join(appPath, 'embedded.mobileprovision');
    if (fs.existsSync(mp)) {
        try {
            fs.unlinkSync(mp);
        } catch {
            /* ok */
        }
    }

    const binaries = collectMachOBinaries(appPath);
    if (binaries.length === 0) {
        throw new Error(`No Mach-O binaries found under ${appPath}`);
    }

    console.log(`🖥️  Mac run: converting ${binaries.length} Mach-O slice(s) to Mac Catalyst (vtool), PlayCover-style…`);

    for (const bin of binaries) {
        thinArm64IfNeeded(bin);
        const v = bin === mainExe ? ver : parseVtoolBuild(bin) ?? ver;
        convertToMacCatalyst(bin, v.minos, v.sdk);
        patchSwiftUIKitIfNeeded(bin);
        adhocSignMachO(bin);
    }

    try {
        execSync(`xattr -cr "${appPath}"`, { stdio: 'inherit' });
    } catch {
        /* ok */
    }
}
