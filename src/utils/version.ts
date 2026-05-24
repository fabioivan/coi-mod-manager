export interface ParsedVersion {
	major: number;
	minor: number;
	patch: number;
	suffix: string;
}

export function parseVersion(v: string): ParsedVersion | null {
	const m = v.trim().match(/^(\d+)\.(\d+)\.(\d+)([a-z]*)$/);
	if (!m) return null;
	return {
		major: parseInt(m[1], 10),
		minor: parseInt(m[2], 10),
		patch: parseInt(m[3], 10),
		suffix: m[4] || "",
	};
}

export function compareVersions(a: string, b: string): number {
	const va = parseVersion(a);
	const vb = parseVersion(b);
	if (!va || !vb) return a.localeCompare(b);
	if (va.major !== vb.major) return va.major - vb.major;
	if (va.minor !== vb.minor) return va.minor - vb.minor;
	if (va.patch !== vb.patch) return va.patch - vb.patch;
	if (!va.suffix && vb.suffix) return -1;
	if (va.suffix && !vb.suffix) return 1;
	return va.suffix.localeCompare(vb.suffix);
}

export function expandGameVersionRange(range: string): string[] {
	const parts = range.split("\u2013").map((s) => s.trim());
	if (parts.length === 1) return [parts[0]];
	if (parts.length !== 2) return [];

	const start = parseVersion(parts[0]);
	const end = parseVersion(parts[1]);
	if (!start || !end) return [range];

	const result: string[] = [];
	for (let patch = start.patch; patch <= end.patch; patch++) {
		const base = `${start.major}.${start.minor}.${patch}`;
		result.push(base);
		if (patch === end.patch && end.suffix) {
			for (const letter of "abcdefghijklmnopqrstuvwxyz") {
				const sv = `${base}${letter}`;
				result.push(sv);
				if (letter === end.suffix) break;
			}
		}
	}
	return result;
}

export function versionInRange(version: string, range: string): boolean {
	const parts = range.split("\u2013").map((s) => s.trim());
	if (parts.length === 1) return version === parts[0];
	if (parts.length !== 2) return false;
	return (
		compareVersions(version, parts[0]) >= 0 &&
		compareVersions(version, parts[1]) <= 0
	);
}
