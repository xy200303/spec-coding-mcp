import type { ScanResult } from "./types.js";
export declare function initProject(projectRoot: string, docsDir?: string): Promise<Record<string, unknown>>;
export declare function scanProject(projectRoot: string, docsDir?: string): Promise<ScanResult>;
export declare function planImplementation(projectRoot: string, docsDir?: string, writePlan?: boolean): Promise<Record<string, unknown>>;
export declare function markProjectSynced(projectRoot: string, docsDir?: string): Promise<Record<string, unknown>>;
export declare function resetState(projectRoot: string, docsDir?: string): Promise<Record<string, unknown>>;
