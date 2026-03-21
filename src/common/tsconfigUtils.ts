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

export function addTamerTypesInclude(tsconfigPath: string, tamerTypesInclude: string): boolean {
	const tsconfig = readTsconfig(tsconfigPath);
	if (!tsconfig) return false;

	const include = tsconfig.include ?? [];
	const arr = Array.isArray(include) ? include : [include];
	if (arr.some((p) => (typeof p === "string" ? p : "").includes("tamer-"))) return false;

	arr.push(tamerTypesInclude);
	tsconfig.include = arr;
	fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
	return true;
}
