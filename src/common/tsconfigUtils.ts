import fs from "fs";
import path from "path";

type TsConfig = {
	compilerOptions?: Record<string, unknown>;
	include?: string | string[];
	exclude?: string | string[];
	references?: { path: string }[];
	files?: string[];
	extends?: string;
};

function stripJsonCommentsAndTrailingCommas(str: string): string {
	return str
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*$/gm, "")
		.replace(/,\s*([\]}])/g, "$1");
}

function parseTsconfigJson(raw: string): TsConfig {
	try {
		return JSON.parse(raw) as TsConfig;
	} catch {
		return JSON.parse(stripJsonCommentsAndTrailingCommas(raw)) as TsConfig;
	}
}

function readTsconfig(filePath: string): TsConfig | null {
	if (!fs.existsSync(filePath)) return null;
	try {
		return parseTsconfigJson(fs.readFileSync(filePath, "utf-8"));
	} catch {
		return null;
	}
}

function resolveExtends(tsconfig: TsConfig, dir: string): TsConfig {
	if (!tsconfig.extends) return tsconfig;
	const basePath = path.resolve(dir, tsconfig.extends);
	const base = readTsconfig(basePath);
	if (!base) return tsconfig;
	const baseDir = path.dirname(basePath);
	const resolved = resolveExtends(base, baseDir);
	return {
		...resolved,
		...tsconfig,
		compilerOptions: { ...resolved.compilerOptions, ...tsconfig.compilerOptions },
	};
}

export function fixTsconfigReferencesForBuild(tsconfigPath: string): boolean {
	const dir = path.dirname(tsconfigPath);
	const tsconfig = readTsconfig(tsconfigPath);
	if (!tsconfig?.references?.length) return false;

	const refsWithNoEmit: string[] = [];
	for (const ref of tsconfig.references) {
		const refPath = path.resolve(dir, ref.path);
		const refConfigPath = refPath.endsWith(".json")
			? refPath
			: path.join(refPath, "tsconfig.json");
		const refConfig = readTsconfig(refConfigPath);
		if (refConfig?.compilerOptions?.noEmit === true) {
			refsWithNoEmit.push(refConfigPath);
		}
	}
	if (refsWithNoEmit.length === 0) return false;

	const merged: TsConfig = {
		...tsconfig,
		references: undefined,
		files: undefined,
	};

	const includes: string[] = [];
	const compilerOpts = { ...tsconfig.compilerOptions };

	for (const ref of tsconfig.references) {
		const refPath = path.resolve(dir, ref.path);
		const refConfigPath = refPath.endsWith(".json")
			? refPath
			: path.join(refPath, "tsconfig.json");
		const refConfig = readTsconfig(refConfigPath);
		if (!refConfig) continue;

		const refDir = path.dirname(refConfigPath);
		const resolved = resolveExtends(refConfig, refDir);

		const inc = resolved.include;
		if (inc) {
			const arr = Array.isArray(inc) ? inc : [inc];
			const baseDir = path.relative(dir, refDir);
			for (const p of arr) {
				const clean = (typeof p === "string" && p.startsWith("./") ? p.slice(2) : p) as string;
				includes.push(!baseDir || baseDir === "." ? clean : `${baseDir}/${clean}`);
			}
		}

		const opts = resolved.compilerOptions;
		if (opts) {
			for (const [k, v] of Object.entries(opts)) {
				if (k !== "composite" && k !== "noEmit" && compilerOpts![k] === undefined) {
					compilerOpts![k] = v;
				}
			}
		}
	}

	if (includes.length > 0) merged.include = [...new Set(includes)];
	compilerOpts.noEmit = true;
	merged.compilerOptions = compilerOpts;

	fs.writeFileSync(tsconfigPath, JSON.stringify(merged, null, 2));
	return true;
}

const OLD_TAMER_GLOB_PATTERNS = [
	"node_modules/@tamer4lynx/tamer-*/src/**/*.d.ts",
	"node_modules/@tamer4lynx/tamer-*/**/*.d.ts",
];

const TAMER_COMPONENTS_MARKERS = [".tamer/tamer-components.d.ts", "../.tamer/tamer-components.d.ts"];

/** Paths relative to project root: lynx/tsconfig.json, optional lynx/src/tsconfig.json, src/tsconfig.json, root tsconfig.json. */
export function findTsconfigCandidates(projectRoot: string, lynxProjectRelative?: string): string[] {
	const out: string[] = [];
	if (lynxProjectRelative?.trim()) {
		const lp = lynxProjectRelative.trim();
		out.push(path.join(projectRoot, lp, "tsconfig.json"));
		const lynxSrc = path.join(projectRoot, lp, "src", "tsconfig.json");
		if (fs.existsSync(lynxSrc)) out.push(lynxSrc);
	}
	const rootSrc = path.join(projectRoot, "src", "tsconfig.json");
	if (fs.existsSync(rootSrc)) out.push(rootSrc);
	out.push(path.join(projectRoot, "tsconfig.json"));
	return [...new Set(out)];
}

function normalizeIncludePathForCompare(p: string): string {
	return p.replace(/\\/g, "/");
}

/** Remove old tamer glob includes from tsconfig. */
export function migrateOldTamerGlobIncludes(tsconfigPath: string): boolean {
	const tsconfig = readTsconfig(tsconfigPath);
	if (!tsconfig?.include) return false;

	const include = tsconfig.include;
	const arr = Array.isArray(include) ? include : [include];
	const oldSet = new Set(OLD_TAMER_GLOB_PATTERNS.map(normalizeIncludePathForCompare));
	const next = arr.filter((p) => {
		if (typeof p !== "string") return true;
		const n = normalizeIncludePathForCompare(p);
		return !oldSet.has(n);
	});
	if (next.length === arr.length) return false;

	tsconfig.include = next;
	fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
	return true;
}

/** Ensure `.tamer/tamer-components.d.ts` is in `include` (path relative to this tsconfig). */
export function ensureTamerComponentsIncludeForProject(tsconfigPath: string, projectRoot: string): boolean {
	const tsconfig = readTsconfig(tsconfigPath);
	if (!tsconfig) return false;

	const tsDir = path.dirname(path.resolve(tsconfigPath));
	const target = path.join(projectRoot, ".tamer", "tamer-components.d.ts");
	let rel = path.relative(tsDir, target);
	if (!rel.startsWith(".")) {
		rel = `./${rel}`;
	}
	rel = rel.split(path.sep).join("/");

	const include = tsconfig.include ?? [];
	const arr = Array.isArray(include) ? [...include] : [include];

	const hasMarker = arr.some((p) => {
		if (typeof p !== "string") return false;
		const n = normalizeIncludePathForCompare(p);
		return TAMER_COMPONENTS_MARKERS.some((m) => n.endsWith(m) || n.includes(".tamer/tamer-components.d.ts"));
	});
	if (hasMarker) return false;

	arr.push(rel);
	tsconfig.include = arr;
	fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
	return true;
}
