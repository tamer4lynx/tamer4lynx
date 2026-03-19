import fs from 'fs';
import path from 'path';
import type { ResolvedIconPaths } from './hostConfig';

function purgeAdaptiveForegroundArtifacts(drawableDir: string) {
    for (const base of ['ic_launcher_fg_src', 'ic_launcher_fg_bm', 'ic_launcher_fg_sc']) {
        for (const ext of ['.png', '.webp', '.jpg', '.jpeg', '.xml']) {
            try {
                fs.unlinkSync(path.join(drawableDir, base + ext));
            } catch {
                /* noop */
            }
        }
    }
    try {
        fs.unlinkSync(path.join(drawableDir, 'ic_launcher_foreground.xml'));
    } catch {
        /* noop */
    }
}

/**
 * Converts a padding/scale value string like "6%", "8dp", or "0%" to dp.
 * The adaptive icon layer canvas is 108dp; percentages are relative to that.
 */
function parsePadDp(v: string): number {
    if (v.endsWith('dp')) return Math.max(0, Math.min(54, parseFloat(v)));
    if (v.endsWith('%')) return Math.max(0, Math.min(54, (parseFloat(v) / 100) * 108));
    return 0;
}

function writeAdaptiveForegroundLayer(
    drawableDir: string,
    fgSourcePath: string,
    fgExt: string,
    layout: ResolvedIconPaths['androidAdaptiveForegroundLayout']
) {
    purgeAdaptiveForegroundArtifacts(drawableDir);
    for (const ext of ['.png', '.webp', '.jpg', '.jpeg']) {
        try {
            fs.unlinkSync(path.join(drawableDir, `ic_launcher_foreground${ext}`));
        } catch {
            /* noop */
        }
    }

    if (!layout) {
        fs.copyFileSync(fgSourcePath, path.join(drawableDir, `ic_launcher_foreground${fgExt}`));
        return;
    }

    fs.copyFileSync(fgSourcePath, path.join(drawableDir, `ic_launcher_fg_src${fgExt}`));

    // Convert scale + padding into dp insets.
    // Adaptive icon canvas is 108dp; scale=0.62 → (1-0.62)/2 * 108 = ~20.5dp per side.
    const CANVAS_DP = 108;
    const scale = layout.scale ?? 1;
    const shrinkDp = ((1 - scale) / 2) * CANVAS_DP;

    const pad = layout.padding;
    const parsedPad = {
        left: pad ? parsePadDp(pad.left) : 0,
        top: pad ? parsePadDp(pad.top) : 0,
        right: pad ? parsePadDp(pad.right) : 0,
        bottom: pad ? parsePadDp(pad.bottom) : 0,
    };

    const insetLeft = Math.round(shrinkDp + parsedPad.left);
    const insetTop = Math.round(shrinkDp + parsedPad.top);
    const insetRight = Math.round(shrinkDp + parsedPad.right);
    const insetBottom = Math.round(shrinkDp + parsedPad.bottom);

    // <layer-list> item with dp insets — valid for all API levels.
    // android:left/top/right/bottom on <item> require dp, not %.
    const layerXml = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item
        android:left="${insetLeft}dp"
        android:top="${insetTop}dp"
        android:right="${insetRight}dp"
        android:bottom="${insetBottom}dp"
        android:drawable="@drawable/ic_launcher_fg_src" />
</layer-list>`;

    fs.writeFileSync(path.join(drawableDir, 'ic_launcher_foreground.xml'), layerXml);
}

export function ensureAndroidManifestLauncherIcon(manifestPath: string): void {
    if (!fs.existsSync(manifestPath)) return;
    let content = fs.readFileSync(manifestPath, 'utf8');
    if (content.includes('android:icon=')) return;
    const next = content.replace(/<application(\s[^>]*)>/, (full, attrs) => {
        if (String(attrs).includes('android:icon')) return full;
        return `<application${attrs}\n        android:icon="@mipmap/ic_launcher"\n        android:roundIcon="@mipmap/ic_launcher">`;
    });
    if (next !== content) {
        fs.writeFileSync(manifestPath, next, 'utf8');
        console.log('✅ Added android:icon / roundIcon to AndroidManifest.xml');
    }
}

export function applyAndroidLauncherIcons(resDir: string, iconPaths: ResolvedIconPaths | null): boolean {
    if (!iconPaths) return false;
    fs.mkdirSync(resDir, { recursive: true });
    const fgAd = iconPaths.androidAdaptiveForeground;
    const bgAd = iconPaths.androidAdaptiveBackground;
    const bgColor = iconPaths.androidAdaptiveBackgroundColor;
    if (fgAd && (bgAd || bgColor)) {
        const drawableDir = path.join(resDir, 'drawable');
        fs.mkdirSync(drawableDir, { recursive: true });
        const fgExt = path.extname(fgAd) || '.png';
        writeAdaptiveForegroundLayer(drawableDir, fgAd, fgExt, iconPaths.androidAdaptiveForegroundLayout);
        if (bgColor) {
            for (const ext of ['.png', '.webp', '.jpg', '.jpeg']) {
                try {
                    fs.unlinkSync(path.join(drawableDir, `ic_launcher_background${ext}`));
                } catch {
                    /* noop */
                }
            }
            try {
                fs.unlinkSync(path.join(drawableDir, 'ic_launcher_background.xml'));
            } catch {
                /* noop */
            }
            const shapeXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="${bgColor}" />
</shape>
`;
            fs.writeFileSync(path.join(drawableDir, 'ic_launcher_background.xml'), shapeXml);
        } else {
            try {
                fs.unlinkSync(path.join(drawableDir, 'ic_launcher_background.xml'));
            } catch {
                /* noop */
            }
            const bgExt = path.extname(bgAd!) || '.png';
            fs.copyFileSync(bgAd!, path.join(drawableDir, `ic_launcher_background${bgExt}`));
        }
        const anyDpi = path.join(resDir, 'mipmap-anydpi-v26');
        fs.mkdirSync(anyDpi, { recursive: true });
        const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;
        fs.writeFileSync(path.join(anyDpi, 'ic_launcher.xml'), adaptiveXml);
        fs.writeFileSync(path.join(anyDpi, 'ic_launcher_round.xml'), adaptiveXml);
        const legacySrc = iconPaths.source ?? fgAd;
        const legacyExt = path.extname(legacySrc) || '.png';
        const mipmapDensities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
        for (const d of mipmapDensities) {
            const dir = path.join(resDir, `mipmap-${d}`);
            fs.mkdirSync(dir, { recursive: true });
            fs.copyFileSync(legacySrc, path.join(dir, `ic_launcher${legacyExt}`));
        }
        return true;
    }
    if (iconPaths.android) {
        const src = iconPaths.android;
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const e of entries) {
            const dest = path.join(resDir, e.name);
            if (e.isDirectory()) {
                fs.cpSync(path.join(src, e.name), dest, { recursive: true });
            } else {
                fs.copyFileSync(path.join(src, e.name), dest);
            }
        }
        return true;
    }
    if (iconPaths.source) {
        const mipmapDensities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
        for (const d of mipmapDensities) {
            const dir = path.join(resDir, `mipmap-${d}`);
            fs.mkdirSync(dir, { recursive: true });
            fs.copyFileSync(iconPaths.source, path.join(dir, 'ic_launcher.png'));
        }
        return true;
    }
    return false;
}

export function applyIosAppIconAssets(appIconDir: string, iconPaths: ResolvedIconPaths | null): boolean {
    if (!iconPaths) return false;
    fs.mkdirSync(appIconDir, { recursive: true });
    if (iconPaths.ios) {
        const entries = fs.readdirSync(iconPaths.ios, { withFileTypes: true });
        for (const e of entries) {
            const dest = path.join(appIconDir, e.name);
            if (e.isDirectory()) {
                fs.cpSync(path.join(iconPaths.ios, e.name), dest, { recursive: true });
            } else {
                fs.copyFileSync(path.join(iconPaths.ios, e.name), dest);
            }
        }
        return true;
    }
    if (iconPaths.source) {
        const ext = path.extname(iconPaths.source) || '.png';
        const icon1024 = `Icon-1024${ext}`;
        fs.copyFileSync(iconPaths.source, path.join(appIconDir, icon1024));
        fs.writeFileSync(
            path.join(appIconDir, 'Contents.json'),
            JSON.stringify(
                {
                    images: [{ filename: icon1024, idiom: 'universal', platform: 'ios', size: '1024x1024' }],
                    info: { author: 'xcode', version: 1 },
                },
                null,
                2
            )
        );
        return true;
    }
    return false;
}
