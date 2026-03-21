import fs from 'fs';
import path from 'path';

const MARKER_REL = path.join('.tamer', 'android-lib-versions.json');

function readTamerPackageVersions(projectRoot: string): Record<string, string> {
    const out: Record<string, string> = {};
    const nm = path.join(projectRoot, 'node_modules', '@tamer4lynx');
    if (!fs.existsSync(nm)) return out;
    for (const name of fs.readdirSync(nm, { withFileTypes: true })) {
        if (!name.isDirectory()) continue;
        const pj = path.join(nm, name.name, 'package.json');
        if (!fs.existsSync(pj)) continue;
        try {
            const v = JSON.parse(fs.readFileSync(pj, 'utf-8')).version;
            if (typeof v === 'string') out[name.name] = v;
        } catch {
            /* ignore */
        }
    }
    return out;
}

function versionsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
        if (a[k] !== b[k]) return false;
    }
    return true;
}

/**
 * Removes `android/build` under each linked `@tamer4lynx/*` package when
 * package versions change vs `.tamer/android-lib-versions.json`, or on first run.
 * Avoids stale Gradle intermediates (e.g. duplicate .class after moving sources between variants).
 */
export function cleanTamerAndroidLibBuildsIfVersionsChanged(projectRoot: string): void {
    const markerPath = path.join(projectRoot, MARKER_REL);
    let previous: Record<string, string> = {};
    if (fs.existsSync(markerPath)) {
        try {
            previous = JSON.parse(fs.readFileSync(markerPath, 'utf-8')) as Record<string, string>;
        } catch {
            previous = {};
        }
    }
    const current = readTamerPackageVersions(projectRoot);
    if (versionsEqual(previous, current)) return;

    const nm = path.join(projectRoot, 'node_modules', '@tamer4lynx');
    if (fs.existsSync(nm)) {
        for (const name of fs.readdirSync(nm, { withFileTypes: true })) {
            if (!name.isDirectory()) continue;
            const buildDir = path.join(nm, name.name, 'android', 'build');
            if (fs.existsSync(buildDir)) {
                fs.rmSync(buildDir, { recursive: true, force: true });
            }
        }
    }
    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    fs.writeFileSync(markerPath, JSON.stringify(current, null, 0), 'utf-8');
    console.log(
        'ℹ️  Cleared @tamer4lynx Android library build dirs (linked package versions changed).',
    );
}

/** Call after autolink so the next Android build clears native module Gradle outputs. */
export function invalidateTamerAndroidLibVersionMarker(projectRoot: string): void {
    const markerPath = path.join(projectRoot, MARKER_REL);
    try {
        if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath);
    } catch {
        /* ignore */
    }
}
