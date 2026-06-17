export declare function toPosix(value: string): string;
export declare function normalizeText(value: string): string;
export declare function semanticText(value: string): string;
export declare function sha256(value: string): string;
export declare function unique<T>(items: T[]): T[];
export declare function pathExists(target: string): Promise<boolean>;
export declare function ensureDir(target: string): Promise<void>;
export declare function listMarkdownFiles(root: string): Promise<string[]>;
export interface ListTextFilesOptions {
    maxFiles?: number;
    excludeDirs?: string[];
    extensions?: Set<string>;
    includeNames?: Set<string>;
}
export declare function listTextFiles(root: string, options?: ListTextFilesOptions): Promise<string[]>;
export declare function runGit(root: string, args: string[]): Promise<string[]>;
export declare function jaccard(a: string[], b: string[]): number;
export declare function nowIso(): string;
export declare function relativePosix(root: string, target: string): string;
export declare function slugifyAscii(value: string, fallback?: string): string;
