export interface DocsImplementationContext {
    projectRoot: string;
    docsDir: string;
    changeCount: number;
    changedBlocks: Array<{
        type: string;
        file: string;
        titlePath: string[];
        startLine: number;
        endLine: number;
        kind: string;
        similarity?: number;
        reasons?: string[];
        text?: string;
        previous?: {
            file: string;
            titlePath: string[];
            startLine: number;
            endLine: number;
            kind: string;
        };
    }>;
    nearbyContext: Array<{
        file: string;
        titlePath: string[];
        startLine: number;
        endLine: number;
        kind: string;
        text: string;
    }>;
    codeSearch: {
        keywords: string[];
        candidateFiles: string[];
        suggestedAreas: string[];
    };
    testGuidance: string[];
    implementationInstructions: string[];
    markdown: string;
}
export declare function createModelContext(input: {
    projectRoot: string;
    docsDir?: string;
    maxBlocks?: number;
    maxBlockChars?: number;
    candidateFileLimit?: number;
    includeFullText?: boolean;
}): Promise<DocsImplementationContext>;
