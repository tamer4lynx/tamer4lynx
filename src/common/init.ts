import fs from "fs";
import path from "path";
import readline from "readline";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

function ask(question: string): Promise<string> {
    return new Promise(resolve => {
        rl.question(question, answer => resolve(answer.trim()));
    });
}

async function init() {
    console.log("Tamer4Lynx Init: Let's set up your tamer.config.json\n");

    // Android
    const androidAppName = await ask("Android app name: ");
    const androidPackageName = await ask("Android package name (e.g. com.example.app): ");
    let androidSdk = await ask("Android SDK path (e.g. ~/Library/Android/sdk or $ANDROID_HOME): ");

    // Normalize SDK path if starts with $ and is all caps
    if (androidSdk.startsWith("$") && /^[A-Z0-9_]+$/.test(androidSdk.slice(1))) {
        const envVar = androidSdk.slice(1);
        const envValue = process.env[envVar];
        if (envValue) {
            androidSdk = envValue;
            console.log(`Resolved ${androidSdk} from $${envVar}`);
        } else {
            console.warn(`Environment variable $${envVar} not found. SDK path will be left as-is.`);
        }
    }

    // Ask if user wants to use same name/bundle id for iOS as Android
    const useSame = await ask("Use same name and bundle ID for iOS as Android? (y/N): ");
    let iosAppName: string | undefined;
    let iosBundleId: string | undefined;
    if (/^y(es)?$/i.test(useSame)) {
        iosAppName = androidAppName;
        iosBundleId = androidPackageName;
    } else {
        iosAppName = await ask("iOS app name: ");
        iosBundleId = await ask("iOS bundle ID (e.g. com.example.app): ");
    }

    // Ask for lynxProject path
    const lynxProject = await ask("Lynx project path (relative to project root, e.g. packages/example) [optional]: ");

    const config: any = {
        android: {
            appName: androidAppName || undefined,
            packageName: androidPackageName || undefined,
            sdk: androidSdk || undefined
        },
        ios: {
            appName: iosAppName || undefined,
            bundleId: iosBundleId || undefined
        },
        paths: { androidDir: "android", iosDir: "ios" }
    };
    if (lynxProject) config.lynxProject = lynxProject;

    const configPath = path.join(process.cwd(), "tamer.config.json");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`\n✅ Generated tamer.config.json at ${configPath}`);

    const tamerTypesInclude = "node_modules/@tamer4lynx/tamer-*/src/**/*.d.ts";
    const tsconfigCandidates = lynxProject
        ? [path.join(process.cwd(), lynxProject, "tsconfig.json"), path.join(process.cwd(), "tsconfig.json")]
        : [path.join(process.cwd(), "tsconfig.json")];
    function parseTsconfigJson(raw: string): { include?: string | string[] } {
        try {
            return JSON.parse(raw) as { include?: string | string[] };
        } catch {
            const noTrailingCommas = raw.replace(/,\s*([\]}])/g, "$1");
            return JSON.parse(noTrailingCommas) as { include?: string | string[] };
        }
    }

    for (const tsconfigPath of tsconfigCandidates) {
        if (!fs.existsSync(tsconfigPath)) continue;
        try {
            const raw = fs.readFileSync(tsconfigPath, "utf-8");
            const tsconfig = parseTsconfigJson(raw);
            const include = tsconfig.include ?? [];
            const arr = Array.isArray(include) ? include : [include];
            if (arr.some((p) => (typeof p === "string" ? p : "").includes("tamer-"))) continue;
            arr.push(tamerTypesInclude);
            tsconfig.include = arr;
            fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
            console.log(`✅ Updated ${path.relative(process.cwd(), tsconfigPath)} to include tamer type declarations`);
            break;
        } catch (e) {
            console.warn(`⚠ Could not update ${tsconfigPath}:`, (e as Error).message);
        }
    }

    rl.close();
}

export default init;
