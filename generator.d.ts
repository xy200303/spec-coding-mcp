export interface GeneratedSpecFile {
    path: string;
    status: "created" | "updated" | "skipped";
    reason?: string;
}
export interface GenerateSpecsResult {
    projectRoot: string;
    docsDir: string;
    mode: "prompt" | "source";
    files: GeneratedSpecFile[];
    featureDocs: string[];
    nextSteps: string[];
}
export interface SourceScanSummary {
    totalFiles: number;
    manifests: string[];
    apiFiles: string[];
    uiFiles: string[];
    dataFiles: string[];
    testFiles: string[];
    routeHints: string[];
    componentHints: string[];
    modelHints: string[];
}
export declare function generateSpecsFromPrompt(input: {
    projectRoot: string;
    docsDir?: string;
    prompt: string;
    projectName?: string;
    overwrite?: boolean;
}): Promise<GenerateSpecsResult>;
export declare function generateSpecsFromSource(input: {
    projectRoot: string;
    docsDir?: string;
    projectName?: string;
    overwrite?: boolean;
    includePatterns?: string[];
    excludePatterns?: string[];
    maxFiles?: number;
}): Promise<GenerateSpecsResult & {
    source: SourceScanSummary;
}>;
